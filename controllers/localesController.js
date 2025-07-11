const path = require('path')
const pool = require('../database/connection')
const multer = require('multer')
const fs = require('fs')

// Configuración de almacenamiento para imágenes de locales
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/locales')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    cb(null, dir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
  }
})

const upload = multer({ storage })

// Crear local
const crearLocal = (req, res) => {
  const { nombre, direccion, telefono } = req.body
  const id_tatuador = req.session.usuario.id_tatuador

  if (!id_tatuador) {
    return res.status(400).json({ exito: false, mensaje: 'Falta el id_tatuador.' })
  }

  const sql = 'INSERT INTO locales (id_tatuador, nombre, direccion, telefono, imagen_fachada) VALUES ($1, $2, $3, $4, $5) RETURNING id_local'
  pool.query(sql, [id_tatuador, nombre, direccion, telefono, req.file ? req.file.filename : null], (err, result) => {
    if (err) {
      console.error('Error al crear local:', err)
      return res.status(500).json({ exito: false, mensaje: 'Error al crear el local.' })
    }
    const id_local = result.rows[0].id_local
    res.json({ exito: true, mensaje: 'Local creado correctamente', id_local })
  })
}

// Obtener estado del local de un tatuador
const obtenerEstadoLocal = (req, res) => {
  const { id_tatuador } = req.params
  if (!id_tatuador) {
    return res.status(400).json({ exito: false, mensaje: 'Falta el id_tatuador.' })
  }
  const sql = 'SELECT estado FROM locales WHERE id_tatuador = $1 ORDER BY id_local DESC LIMIT 1'
  pool.query(sql, [id_tatuador], (err, results) => {
    if (err) {
      console.error('Error al consultar el estado del local:', err)
      return res.status(500).json({ exito: false, mensaje: 'Error al consultar el estado del local.' })
    }
    if (results.rows.length === 0) {
      return res.json({ exito: true, estado: null })
    }
    res.json({ exito: true, estado: results.rows[0].estado })
  })
}

// Obtener todas las solicitudes de locales (para admin)
const obtenerSolicitudesLocales = (req, res) => {
  const sql = `
    SELECT l.id_local, l.nombre, l.direccion, l.telefono, l.imagen_fachada, l.estado, l.id_tatuador,
           t.id_usuario, u.nombre AS nombre_tatuador, u.correo
    FROM locales l
    LEFT JOIN tatuadores t ON l.id_tatuador = t.id_tatuador
    LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
    ORDER BY l.estado = 'pendiente' DESC, l.id_local DESC
  `
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener solicitudes de locales:', err)
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener solicitudes de locales.' })
    }
    res.json({ exito: true, solicitudes: results.rows })
  })
}

// Aprobar o rechazar solicitud de local
const actualizarEstadoLocal = (req, res) => {
  const { id_local } = req.params
  const { estado, comentario } = req.body
  if (!id_local || !estado) {
    return res.status(400).json({ exito: false, mensaje: 'Faltan datos requeridos.' })
  }
  // Actualizar estado y comentario_admin (si existe la columna)
  const sql = comentario
    ? 'UPDATE locales SET estado = ?, comentario_admin = ? WHERE id_local = ?'
    : 'UPDATE locales SET estado = ? WHERE id_local = ?'
  const params = comentario ? [estado, comentario, id_local] : [estado, id_local]
  pool.query(sql, params, (err, result) => {
    if (err) {
      console.error('Error al actualizar estado del local:', err)
      return res.status(500).json({ exito: false, mensaje: 'Error al actualizar estado del local.' })
    }
    res.json({ exito: true, mensaje: 'Estado actualizado correctamente.' })
  })
}

// Obtener imágenes secundarias de un local
const obtenerImagenesLocal = (req, res) => {
  const { id_local } = req.params;
  if (!id_local) {
    return res.status(400).json({ exito: false, mensaje: 'Falta el id_local.' });
  }
  const sql = 'SELECT url_imagen FROM imagenes_local WHERE id_local = $1';
  pool.query(sql, [id_local], (err, results) => {
    if (err) {
      console.error('Error al obtener imágenes del local:', err);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener imágenes del local.' });
    }
    res.json({ exito: true, imagenes: results.rows });
  });
};

// Obtener todos los locales aprobados
const obtenerLocalesAprobados = (req, res) => {
  const sql = `
    SELECT l.id_local, l.nombre, l.direccion, l.telefono, l.imagen_fachada, l.id_tatuador,
           u.nombre AS nombre_tatuador, u.correo
    FROM locales l
    LEFT JOIN tatuadores t ON l.id_tatuador = t.id_tatuador
    LEFT JOIN usuarios u ON t.id_usuario = u.id_usuario
    WHERE l.estado = 'aprobado'
    ORDER BY l.id_local DESC
  `;
  pool.query(sql, (err, results) => {
    if (err) {
      console.error('Error al obtener locales aprobados:', err);
      return res.status(500).json({ exito: false, mensaje: 'Error al obtener locales.' });
    }
    res.json({ exito: true, locales: results.rows });
  });
};

module.exports = {
  upload,
  crearLocal,
  obtenerEstadoLocal,
  obtenerSolicitudesLocales,
  actualizarEstadoLocal,
  obtenerImagenesLocal,
  obtenerLocalesAprobados
}
