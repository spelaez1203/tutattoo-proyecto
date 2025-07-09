const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs').promises
const { verificarAutenticacion, verificarRolTatuador, verificarTatuador } = require('../middlewares/authMiddleware')
const pool = require('../database/connection')
const notificacionesController = require('../controllers/notificacionesController')

// Configuración de multer para el almacenamiento de archivos
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.env.UPLOAD_DIR_BASE || path.join(__dirname, '../imagenes_pagina'), 'tatuajes')
    try {
      await fs.mkdir(uploadDir, { recursive: true })
      cb(null, uploadDir)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, `tatuaje-${uniqueSuffix}${extension}`)
  }
})

// Filtro de archivos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo se permiten JPG, PNG y WEBP'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
})

// Rutas
router.get('/publicar', verificarAutenticacion, verificarRolTatuador, verificarTatuador, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/html/publicar.html'))
})

// Publicar nuevo tatuaje
router.post('/publicar', verificarAutenticacion, verificarRolTatuador, verificarTatuador, upload.fields([
  { name: 'imagenPrincipal', maxCount: 1 },
  { name: 'imagenesAdicionales', maxCount: 10 } // Permitir hasta 10 imágenes adicionales
]), async (req, res) => {
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    // Validar que se haya subido una imagen principal
    if (!req.files.imagenPrincipal) {
      throw new Error('Debes subir una imagen principal')
    }
    // Validar que el usuario tiene id_tatuador
    if (!req.session.usuario.id_tatuador) {
      throw new Error('No tienes id_tatuador en la sesión. Vuelve a iniciar sesión o verifica tu cuenta.')
    }
    // Log de sesión
    console.log('Publicando tatuaje con sesión:', req.session.usuario)
    // Insertar el tatuaje en la tabla principal
    const { rows: result } = await connection.query(
      'INSERT INTO tatuajes (id_tatuador, titulo, descripcion, imagen, votos) VALUES ($1, $2, $3, $4, 0) RETURNING id_tatuaje',
      [
        req.session.usuario.id_tatuador,
        req.body.titulo,
        req.body.descripcion,
        path.relative(process.env.UPLOAD_DIR_BASE || path.join(__dirname, '../imagenes_pagina'), req.files.imagenPrincipal[0].path)
      ]
    )
    const idTatuaje = result[0].id_tatuaje

    console.log('Archivos adicionales recibidos:', req.files.imagenesAdicionales)

    // Insertar imágenes adicionales en la tabla imagenes_tatuaje
    if (req.files.imagenesAdicionales && req.files.imagenesAdicionales.length > 0) {
      for (const img of req.files.imagenesAdicionales) {
        console.log('Insertando imagen secundaria:', img.path)
        await connection.query(
          'INSERT INTO imagenes_tatuaje (id_tatuaje, url_imagen, es_principal) VALUES ($1, $2, false)',
          [idTatuaje, path.relative(process.env.UPLOAD_DIR_BASE || path.join(__dirname, '../imagenes_pagina'), img.path)]
        )
      }
    }

    await connection.commit()
    res.json({
      exito: true,
      mensaje: 'Tatuaje publicado exitosamente',
      id_tatuaje: idTatuaje
    })
  } catch (error) {
    await connection.rollback()
    console.error('Error al publicar tatuaje:', error)
    // Eliminar archivos subidos en caso de error
    if (req.files) {
      const archivos = Object.values(req.files).flat()
      for (const archivo of archivos) {
        try {
          await fs.unlink(archivo.path)
        } catch (unlinkError) {
          console.error('Error al eliminar archivo:', unlinkError)
        }
      }
    }
    res.status(500).json({
      exito: false,
      mensaje: error.message || 'Error al publicar el tatuaje'
    })
  } finally {
    connection.release()
  }
})

// Ruta para verificar estado del tatuador
router.get('/verificar-estado', verificarAutenticacion, verificarRolTatuador, async (req, res) => {
  console.log('=== Verificando estado del tatuador ===')
  console.log('Session ID:', req.sessionID)
  console.log('Session antes de verificación:', {
    id: req.session.id,
    usuario: req.session.usuario
  })

  try {
    // Verificar si ya existe en la tabla tatuadores
    const { rows: tatuadores } = await pool.query(
      'SELECT id_tatuador FROM tatuadores WHERE id_usuario = $1',
      [req.session.usuario.id_usuario]
    )

    console.log('Resultado de búsqueda en tatuadores:', tatuadores)

    if (tatuadores.length > 0) {
      // Si ya existe, actualizar la sesión y retornar el id_tatuador
      req.session.usuario.id_tatuador = tatuadores[0].id_tatuador

      // Guardar la sesión explícitamente
      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('Error al guardar sesión:', err)
            reject(err)
          } else {
            console.log('Sesión guardada exitosamente')
            resolve()
          }
        })
      })

      console.log('Session después de actualizar:', {
        id: req.session.id,
        usuario: req.session.usuario
      })

      return res.json({
        exito: true,
        mensaje: 'Tatuador ya sincronizado',
        id_tatuador: tatuadores[0].id_tatuador
      })
    }

    // Si no existe, verificar si tiene una solicitud aprobada
    const { rows: solicitudes } = await pool.query(
      "SELECT * FROM solicitudes_verificacion WHERE id_usuario = $1 AND estado = 'aprobada'",
      [req.session.usuario.id_usuario]
    )

    console.log('Resultado de búsqueda en solicitudes:', solicitudes)

    if (solicitudes.length === 0) {
      return res.status(400).json({
        exito: false,
        mensaje: 'No tienes una solicitud de verificación aprobada'
      })
    }

    // Si tiene solicitud aprobada, crear el registro en tatuadores
    const solicitud = solicitudes[0]
    const { rows: result } = await pool.query(
      'INSERT INTO tatuadores (id_usuario, ciudad, hace_domicilio, tiene_local) VALUES ($1, $2, $3, $4) RETURNING id_tatuador',
      [
        req.session.usuario.id_usuario,
        solicitud.ciudad,
        solicitud.hace_domicilio,
        solicitud.tiene_local
      ]
    )

    // Actualizar la sesión con el nuevo id_tatuador
    req.session.usuario.id_tatuador = result[0].id_tatuador

    // Guardar la sesión explícitamente
    await new Promise((resolve, reject) => {
      req.session.save((err) => {
        if (err) {
          console.error('Error al guardar sesión:', err)
          reject(err)
        } else {
          console.log('Sesión guardada exitosamente')
          resolve()
        }
      })
    })

    console.log('Session después de crear nuevo tatuador:', {
      id: req.session.id,
      usuario: req.session.usuario
    })

    res.json({
      exito: true,
      mensaje: 'Tatuador sincronizado correctamente',
      id_tatuador: result[0].id_tatuador
    })
  } catch (error) {
    console.error('Error al verificar estado del tatuador:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al verificar estado del tatuador'
    })
  }
})

// Obtener publicaciones del usuario
router.get('/publicaciones', verificarAutenticacion, verificarRolTatuador, verificarTatuador, async (req, res) => {
  try {
    const sessionInfo = {
      id_usuario: req.session.usuario.id_usuario,
      id_tatuador: req.session.usuario.id_tatuador,
      rol: req.session.usuario.rol
    }

    console.log('Obteniendo publicaciones. Sesión:', sessionInfo)

    if (!sessionInfo.id_tatuador) {
      console.log('Usuario no tiene id_tatuador en la sesión')
      return res.status(403).json({
        exito: false,
        mensaje: 'Tu cuenta no está completamente configurada como tatuador'
      })
    }

    const { rows: publicaciones } = await pool.query(
            `SELECT 
                t.id_tatuaje, 
                t.titulo, 
                t.descripcion, 
                '/uploads/' || replace(t.imagen, '\\', '/') AS imagen_url,
                u.nombre AS nombre_tatuador,
                COALESCE(v.promedio_votos, 0) AS promedio_votos,
                COALESCE(g.total_guardados, 0) AS total_guardados,
                COALESCE(cm.total_comentarios, 0) AS total_comentarios,
                (COALESCE(v.promedio_votos, 0) * 0.7 + COALESCE(g.total_guardados, 0) * 0.3) AS promedio_final
            FROM tatuajes t
            JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
            JOIN usuarios u ON ta.id_usuario = u.id_usuario
            LEFT JOIN (
                SELECT id_tatuaje, AVG(puntuacion) AS promedio_votos
                FROM comentarios_tatuajes
                GROUP BY id_tatuaje
            ) v ON t.id_tatuaje = v.id_tatuaje
            LEFT JOIN (
                SELECT id_tatuaje, COUNT(*) AS total_guardados
                FROM guardados
                GROUP BY id_tatuaje
            ) g ON t.id_tatuaje = g.id_tatuaje
            LEFT JOIN (
                SELECT id_tatuaje, COUNT(*) AS total_comentarios
                FROM comentarios_tatuajes
                GROUP BY id_tatuaje
            ) cm ON t.id_tatuaje = cm.id_tatuaje
            WHERE t.id_tatuador = $1
            ORDER BY t.fecha_subida DESC`,
            [sessionInfo.id_tatuador]
    )

    res.json(publicaciones)
  } catch (error) {
    console.error('Error al obtener publicaciones:', error)
    res.status(500).json({ error: 'Error al obtener publicaciones' })
  }
})

// Obtener tatuajes guardados del usuario
router.get('/guardados', verificarAutenticacion, async (req, res) => {
  try {
    const { rows: tatuajes } = await pool.query(
      `SELECT 
          t.id_tatuaje, 
          t.titulo, 
          t.descripcion, 
          '/uploads/' || replace(t.imagen, '\\', '/') AS imagen_url,
          u.nombre AS nombre_tatuador,
          COALESCE(v.promedio_votos, 0) AS promedio_votos,
          COALESCE(g.total_guardados, 0) AS total_guardados,
          COALESCE(cm.total_comentarios, 0) AS total_comentarios,
          (COALESCE(v.promedio_votos, 0) * 0.7 + COALESCE(g.total_guardados, 0) * 0.3) AS promedio_final
      FROM guardados gt
      JOIN tatuajes t ON gt.id_tatuaje = t.id_tatuaje
      JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
      JOIN usuarios u ON ta.id_usuario = u.id_usuario
      LEFT JOIN (
          SELECT id_tatuaje, AVG(puntuacion) AS promedio_votos
          FROM comentarios_tatuajes
          GROUP BY id_tatuaje
      ) v ON t.id_tatuaje = v.id_tatuaje
      LEFT JOIN (
          SELECT id_tatuaje, COUNT(*) AS total_guardados
          FROM guardados
          GROUP BY id_tatuaje
      ) g ON t.id_tatuaje = g.id_tatuaje
      LEFT JOIN (
          SELECT id_tatuaje, COUNT(*) AS total_comentarios
          FROM comentarios_tatuajes
          GROUP BY id_tatuaje
      ) cm ON t.id_tatuaje = cm.id_tatuaje
      WHERE gt.id_usuario = $1`,
      [req.session.usuario.id_usuario]
    )
    res.json(tatuajes)
  } catch (error) {
    console.error('Error al obtener tatuajes guardados:', error)
    res.status(500).json({ mensaje: 'Error al obtener los tatuajes guardados' })
  }
})

// Obtener tatuajes del tatuador
router.get('/mis-tatuajes', verificarAutenticacion, verificarRolTatuador, async (req, res) => {
  const sessionInfo = {
    id_usuario: req.session.usuario.id_usuario,
    id_tatuador: req.session.usuario.id_tatuador,
    rol: req.session.usuario.rol
  }
  console.log('Obteniendo mis tatuajes. Sesión:', sessionInfo)

  try {
    // Verificar si el usuario tiene id_tatuador
    if (!sessionInfo.id_tatuador) {
      console.log('Usuario no tiene id_tatuador asignado')
      return res.status(400).json({
        mensaje: 'Tu cuenta de tatuador aún no está completamente configurada'
      })
    }

    const query = `
            SELECT t.id_tatuaje, t.id_tatuador, t.titulo, t.descripcion, t.fecha_subida, 
                   '/uploads/' || replace(t.imagen, '\\', '/') as imagen_url, 
                   u.nombre as nombre_tatuador,
                   -- Calcular promedio real de puntuaciones de comentarios
                   COALESCE(AVG(ct.puntuacion), 0) as promedio_votos,
                   -- Contar total de votos
                   COUNT(ct.id_comentario) as total_guardados,
                   -- El promedio final es directamente el promedio de comentarios
                   COALESCE(AVG(ct.puntuacion), 0) as promedio_final
            FROM tatuajes t 
            JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador 
            JOIN usuarios u ON ta.id_usuario = u.id_usuario 
            LEFT JOIN comentarios_tatuajes ct ON t.id_tatuaje = ct.id_tatuaje
            WHERE t.id_tatuador = $1 
            GROUP BY t.id_tatuaje, t.id_tatuador, t.titulo, t.descripcion, t.fecha_subida, t.imagen, u.nombre
            ORDER BY t.fecha_subida DESC
        `
    console.log('Ejecutando query:', query, 'con parámetros:', [sessionInfo.id_tatuador])

    const { rows: tatuajes } = await pool.query(query, [sessionInfo.id_tatuador])
    console.log('Tatuajes encontrados:', tatuajes)
    res.json(tatuajes)
  } catch (error) {
    console.error('Error al obtener mis tatuajes:', error)
    res.status(500).json({ mensaje: 'Error al obtener los tatuajes' })
  }
})

// Guardar/desguardar tatuaje
router.post('/:id/guardar', verificarAutenticacion, async (req, res) => {
  try {
    const { id } = req.params
    const idUsuario = req.session.usuario.id_usuario

    // Verificar si ya está guardado
    const { rows: guardados } = await pool.query(
      'SELECT * FROM guardados WHERE id_tatuaje = $1 AND id_usuario = $2',
      [id, idUsuario]
    )

    if (guardados.length > 0) {
      // Si ya está guardado, lo quitamos
      await pool.query(
        'DELETE FROM guardados WHERE id_tatuaje = $1 AND id_usuario = $2',
        [id, idUsuario]
      )
      res.json({ guardado: false })
    } else {
      // Si no está guardado, lo agregamos
      await pool.query(
        'INSERT INTO guardados (id_tatuaje, id_usuario) VALUES ($1, $2)',
        [id, idUsuario]
      )
      res.json({ guardado: true })
    }
  } catch (error) {
    console.error('Error al guardar tatuaje:', error)
    res.status(500).json({ mensaje: 'Error al guardar el tatuaje' })
  }
})

// Eliminar tatuaje (unificado para admin y tatuador)
router.delete('/:id', verificarAutenticacion, async (req, res) => {
  const { id: idTatuaje } = req.params
  const { rol, id_usuario, id_tatuador } = req.session.usuario
  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    if (rol === 'admin') {
      const { razon } = req.body
      if (!razon) {
        await connection.rollback()
        return res.status(400).json({ exito: false, mensaje: 'La razón de eliminación es obligatoria para administradores.' })
      }

      // 1. Registrar el reporte de eliminación por admin
      await connection.query(
        'INSERT INTO reportes (id_tatuaje, id_admin, razon) VALUES ($1, $2, $3)',
        [idTatuaje, id_usuario, razon]
      )

      // 2. Eliminar el tatuaje
      const { rows: result } = await connection.query(
        'DELETE FROM tatuajes WHERE id_tatuaje = $1 RETURNING id_tatuaje',
        [idTatuaje]
      )

      if (result.length === 0) {
        throw new Error('No se encontró el tatuaje a eliminar.')
      }

      await connection.commit()
      res.json({ exito: true, mensaje: 'Publicación eliminada y reporte registrado correctamente.' })
    } else if (rol === 'tatuador') {
      // Verificar que el tatuaje pertenece al tatuador
      const { rows: tatuaje } = await connection.query(
        'SELECT * FROM tatuajes WHERE id_tatuaje = $1 AND id_tatuador = $2',
        [idTatuaje, id_tatuador]
      )

      if (tatuaje.length === 0) {
        await connection.rollback()
        return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para eliminar esta publicación.' })
      }

      // Eliminar el tatuaje
      await connection.query('DELETE FROM tatuajes WHERE id_tatuaje = $1', [idTatuaje])

      await connection.commit()
      res.json({ exito: true, mensaje: 'Tatuaje eliminado correctamente.' })
    } else {
      await connection.rollback()
      res.status(403).json({ exito: false, mensaje: 'No tienes permisos para realizar esta acción.' })
    }
  } catch (error) {
    await connection.rollback()
    console.error('Error al eliminar la publicación:', error)
    res.status(500).json({ exito: false, mensaje: 'Error interno al eliminar la publicación.' })
  } finally {
    connection.release()
  }
})

// Obtener comentarios de un tatuaje
router.get('/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params
    const { rows: comentarios } = await pool.query(
            `SELECT 
                ct.id_comentario,
                ct.comentario,
                ct.puntuacion,
                ct.fecha,
                u.nombre AS nombre_usuario, 
                u.imagen_perfil AS foto_perfil 
             FROM comentarios_tatuajes ct 
             JOIN usuarios u ON ct.id_usuario = u.id_usuario 
             WHERE ct.id_tatuaje = $1
             ORDER BY ct.fecha DESC`,
            [id]
    )

    res.json(comentarios || [])
  } catch (error) {
    console.error('Error en la ruta /tatuajes/:id/comentarios:', error)
    res.status(500).json({ mensaje: 'Error al obtener los comentarios' })
  }
})

// Obtener comentarios de un usuario sobre un tatuaje específico
router.get('/:id/comentarios-usuario', verificarAutenticacion, async (req, res) => {
  try {
    const idTatuaje = req.params.id
    const idUsuario = req.session.usuario.id_usuario
    const { rows: comentarios } = await pool.query(
      'SELECT id_comentario FROM comentarios_tatuajes WHERE id_tatuaje = $1 AND id_usuario = $2',
      [idTatuaje, idUsuario]
    )

    if (comentarios.length > 0) {
      res.json({ haComentado: true, comentariosRestantes: 3 - comentarios.length })
    } else {
      res.json({ haComentado: false, comentariosRestantes: 3 })
    }
  } catch (error) {
    console.error('Error al verificar comentario de usuario:', error)
    res.status(500).json({ mensaje: 'Error al verificar el estado del comentario' })
  }
})

// Agregar comentario a un tatuaje
router.post('/:id/comentar', verificarAutenticacion, async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { comentario, puntuacion } = req.body
    const idUsuario = req.session.usuario.id_usuario

    if (!comentario || comentario.trim() === '') {
      throw new Error('El comentario no puede estar vacío')
    }

    if (!puntuacion || puntuacion < 1 || puntuacion > 5) {
      throw new Error('La puntuación debe estar entre 1 y 5')
    }

    // Contar cuántos comentarios ya tiene el usuario en esta publicación
    const { rows: comentariosUsuario } = await client.query(
      'SELECT COUNT(*) as total FROM comentarios_tatuajes WHERE id_tatuaje = $1 AND id_usuario = $2',
      [id, idUsuario]
    )

    const totalComentarios = parseInt(comentariosUsuario[0].total, 10)

    if (totalComentarios >= 3) {
      throw new Error('Has alcanzado el límite de 3 comentarios para esta publicación')
    }

    // Crear un nuevo comentario
    await client.query(
      'INSERT INTO comentarios_tatuajes (id_tatuaje, id_usuario, comentario, puntuacion, fecha) VALUES ($1, $2, $3, $4, NOW())',
      [id, idUsuario, comentario.trim(), puntuacion]
    )

    await client.query('COMMIT')

    res.json({
      mensaje: 'Comentario agregado exitosamente',
      comentariosRestantes: 3 - (totalComentarios + 1)
    })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error al comentar:', error)
    res.status(500).json({ mensaje: error.message || 'Error al agregar el comentario' })
  } finally {
    client.release()
  }
})

// Obtener recomendaciones de tatuajes
router.get('/:id/recomendaciones', async (req, res) => {
  try {
    const tatuajeId = parseInt(req.params.id)
    if (isNaN(tatuajeId)) {
      return res.status(400).json({ error: 'ID de tatuaje inválido' })
    }

    // Primero obtenemos el tatuaje actual para saber el tatuador
    const { rows: tatuajeActual } = await pool.query(
      `SELECT t.id_tatuador, ta.id_usuario
       FROM tatuajes t
       JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
       WHERE t.id_tatuaje = $1`,
      [tatuajeId]
    )

    if (!tatuajeActual || tatuajeActual.length === 0) {
      return res.status(404).json({ error: 'Tatuaje no encontrado' })
    }

    const idTatuador = tatuajeActual[0].id_tatuador

    // Obtenemos otros tatuajes del mismo artista
    const { rows } = await pool.query(
      `SELECT t.*, u.nombre as nombre_usuario
       FROM tatuajes t
       JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
       JOIN usuarios u ON ta.id_usuario = u.id_usuario
       WHERE t.id_tatuaje != $1
       AND t.id_tatuador = $2
       ORDER BY t.fecha_subida DESC
       LIMIT 6`,
      [tatuajeId, idTatuador]
    )

    const recomendaciones = rows.map(tatuaje => ({
      ...tatuaje,
      imagen_url: `/uploads/${tatuaje.imagen.replace(/\\/g, '/')}`
    }))

    res.json(recomendaciones)
  } catch (error) {
    console.error('Error al obtener recomendaciones:', error)
    res.status(500).json({ error: 'Error al obtener recomendaciones' })
  }
})

// Obtener publicaciones más votadas de la semana
router.get('/mas-votadas-semana', async (req, res) => {
  try {
    const unaSemanaAtras = new Date();
    unaSemanaAtras.setDate(unaSemanaAtras.getDate() - 7);
    const fechaISO = unaSemanaAtras.toISOString().slice(0, 19).replace('T', ' ');

    const { rows: publicaciones } = await pool.query(
      `SELECT 
          t.id_tatuaje, 
          t.id_tatuador,
          t.titulo, 
          t.descripcion, 
          '/uploads/' || replace(t.imagen, '\\', '/') AS imagen_url,
          u.nombre AS nombre_tatuador,
          COALESCE(v.promedio_votos, 0) AS promedio_votos,
          COALESCE(g.total_guardados, 0) AS total_guardados,
          COALESCE(cm.total_comentarios, 0) AS total_comentarios,
          (COALESCE(v.promedio_votos, 0) * 0.7 + COALESCE(g.total_guardados, 0) * 0.3) AS promedio_final
      FROM tatuajes t
      JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
      JOIN usuarios u ON ta.id_usuario = u.id_usuario
      LEFT JOIN (
          SELECT id_tatuaje, AVG(puntuacion) AS promedio_votos
          FROM comentarios_tatuajes
          WHERE fecha >= $1
          GROUP BY id_tatuaje
      ) v ON t.id_tatuaje = v.id_tatuaje
      LEFT JOIN (
          SELECT id_tatuaje, COUNT(*) AS total_guardados
          FROM guardados
          GROUP BY id_tatuaje
      ) g ON t.id_tatuaje = g.id_tatuaje
      LEFT JOIN (
          SELECT id_tatuaje, COUNT(*) AS total_comentarios
          FROM comentarios_tatuajes
          GROUP BY id_tatuaje
      ) cm ON t.id_tatuaje = cm.id_tatuaje
      ORDER BY promedio_final DESC
      LIMIT 10`,
      [fechaISO]
    );
    res.json(publicaciones);

    // Notificar a los usuarios cuyos tatuajes están en destacados
    for (const t of publicaciones) {
      // Buscar el id_usuario del tatuador
      const { rows: tatuador } = await pool.query(
        'SELECT ta.id_usuario FROM tatuadores ta WHERE ta.id_tatuador = $1',
        [t.id_tatuador]
      );
      if (tatuador.length > 0) {
        await notificacionesController.crearNotificacion(
          tatuador[0].id_usuario,
          'destacado_semana',
          '¡Felicidades! Tu publicación ha sido destacada entre las mejores de la semana.'
        );
      }
    }
  } catch (error) {
    console.error('Error al obtener publicaciones más votadas:', error);
    res.status(500).json({ mensaje: 'Error al obtener las publicaciones más votadas' });
  }
});

// Obtener todas las publicaciones con promedio
router.get('/todas', async (req, res) => {
  try {
    // Primero, obtener todas las publicaciones con su imagen principal
    const { rows: publicaciones } = await pool.query(
            `SELECT 
                t.id_tatuaje, 
                t.titulo, 
                t.descripcion, 
                '/uploads/' || replace(t.imagen, '\\', '/') AS imagen_url, 
                u.nombre AS nombre_tatuador,
                COALESCE(v.promedio_votos, 0) AS promedio_votos,
                COALESCE(g.total_guardados, 0) AS total_guardados,
                COALESCE(cm.total_comentarios, 0) AS total_comentarios,
                (COALESCE(v.promedio_votos, 0) * 0.7 + COALESCE(g.total_guardados, 0) * 0.3) AS promedio_final
            FROM tatuajes t
            JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
            JOIN usuarios u ON ta.id_usuario = u.id_usuario
            LEFT JOIN (
                SELECT id_tatuaje, AVG(puntuacion) AS promedio_votos
                FROM comentarios_tatuajes
                GROUP BY id_tatuaje
            ) v ON t.id_tatuaje = v.id_tatuaje
            LEFT JOIN (
                SELECT id_tatuaje, COUNT(*) AS total_guardados
                FROM guardados
                GROUP BY id_tatuaje
            ) g ON t.id_tatuaje = g.id_tatuaje
            LEFT JOIN (
                SELECT id_tatuaje, COUNT(*) AS total_comentarios
                FROM comentarios_tatuajes
                GROUP BY id_tatuaje
            ) cm ON t.id_tatuaje = cm.id_tatuaje
            ORDER BY t.fecha_subida DESC`
    )

    // Luego, para cada publicación, obtener sus imágenes secundarias
    for (const pub of publicaciones) {
      const { rows: imagenesSecundarias } = await pool.query(
        "SELECT '/uploads/' || replace(url_imagen, '\\', '/') AS url FROM imagenes_tatuaje WHERE id_tatuaje = $1 AND es_principal = false",
        [pub.id_tatuaje]
      )
      pub.imagenes_secundarias = imagenesSecundarias.map(img => img.url)
    }

    res.json(publicaciones)
  } catch (error) {
    console.error('Error al obtener todas las publicaciones:', error)
    res.status(500).json({ mensaje: 'Error al obtener las publicaciones' })
  }
})

// Obtener el comentario de un usuario específico en un tatuaje para saber si ya comentó
router.get('/:id/comentarios-usuario', verificarAutenticacion, async (req, res) => {
  try {
    const { rows: comentarios } = await pool.query(
      'SELECT id_comentario FROM comentarios_tatuajes WHERE id_tatuaje = $1 AND id_usuario = $2',
      [req.params.id, req.session.usuario.id_usuario]
    )
    res.json({ haComentado: comentarios.length > 0 })
  } catch (error) {
    console.error('Error al obtener comentario del usuario:', error)
    res.status(500).json({ exito: false, mensaje: 'Error del servidor' })
  }
})

// Obtener todos los comentarios de un tatuaje
router.get('/:id/comentarios', async (req, res) => {
  try {
    const { id } = req.params

    const { rows: comentarios } = await pool.query(`
            SELECT 
                ct.id_comentario,
                ct.comentario,
                ct.puntuacion,
                ct.fecha,
                u.nombre as nombre_usuario,
                u.imagen_perfil
            FROM comentarios_tatuajes ct
            JOIN usuarios u ON ct.id_usuario = u.id_usuario
            WHERE ct.id_tatuaje = $1
            ORDER BY ct.fecha DESC
        `, [id])

    res.json(comentarios || [])
  } catch (error) {
    console.error('Error al obtener comentarios:', error)
    res.status(500).json({ mensaje: 'Error al obtener los comentarios' })
  }
})

// Verificar si un tatuaje está guardado por el usuario
router.get('/:id/guardado', verificarAutenticacion, async (req, res) => {
  try {
    const { id } = req.params
    const idUsuario = req.session.usuario.id_usuario

    const { rows: guardados } = await pool.query(
      'SELECT * FROM guardados WHERE id_tatuaje = $1 AND id_usuario = $2',
      [id, idUsuario]
    )

    res.json({ guardado: guardados.length > 0 })
  } catch (error) {
    console.error('Error al verificar si está guardado:', error)
    res.status(500).json({ mensaje: 'Error al verificar el estado de guardado' })
  }
})

// Ruta para verificar si un tatuaje está guardado por el usuario actual
router.get('/:id/estado-guardado', verificarAutenticacion, async (req, res) => {
  const { id: id_tatuaje } = req.params
  const id_usuario = req.session.usuario.id_usuario

  try {
    const { rows } = await pool.query(
      'SELECT * FROM guardados WHERE id_usuario = $1 AND id_tatuaje = $2',
      [id_usuario, id_tatuaje]
    )

    if (rows.length > 0) {
      res.json({ exito: true, guardado: true })
    } else {
      res.json({ exito: true, guardado: false })
    }
  } catch (error) {
    console.error('Error al verificar estado de guardado:', error)
    res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' })
  }
})

// Obtener detalles de una publicación
router.get('/:id', async (req, res) => {
  const { id } = req.params
  let connection

  try {
    connection = await pool.getConnection()
    const { rows: tatuaje } = await connection.query(`
            SELECT t.id_tatuaje, t.id_tatuador, t.titulo, t.descripcion, t.fecha_subida, t.imagen,
                   u.nombre as nombre_tatuador,
                   COALESCE(AVG(ct.puntuacion), 0) as promedio_votos,
                   -- Contar total de guardados (pulgar arriba) usando subconsulta
                   (SELECT COUNT(*) FROM guardados g2 WHERE g2.id_tatuaje = t.id_tatuaje) as total_guardados,
                   COALESCE(AVG(ct.puntuacion), 0) as promedio_final
            FROM tatuajes t
            JOIN tatuadores ta ON t.id_tatuador = ta.id_tatuador
            JOIN usuarios u ON ta.id_usuario = u.id_usuario
            LEFT JOIN comentarios_tatuajes ct ON t.id_tatuaje = ct.id_tatuaje
            WHERE t.id_tatuaje = $1
        `, [id])

    if (tatuaje.length === 0) {
      return res.status(404).json({ mensaje: 'Tatuaje no encontrado' })
    }

    const { rows: imagenesSecundarias } = await connection.query(`
            SELECT url_imagen
            FROM imagenes_tatuaje
            WHERE id_tatuaje = $1 AND es_principal = false
        `, [id])

    const urlsSecundarias = imagenesSecundarias.map(img => `/uploads/${img.url_imagen.replace(/\\/g, '/')}`)

    const publicacion = {
      ...tatuaje[0],
      imagen_url: `/uploads/${tatuaje[0].imagen.replace(/\\/g, '/')}`,
      imagenes_secundarias: urlsSecundarias
    }

    res.json(publicacion)
  } catch (error) {
    console.error('Error al obtener detalles de la publicación:', error)
    res.status(500).json({ mensaje: 'Error al obtener los detalles de la publicación' })
  } finally {
    if (connection) {
      connection.release()
    }
  }
})

// Ruta para obtener las imágenes secundarias de un tatuaje
router.get('/:id/imagenes', async (req, res) => {
  try {
    const { rows: imagenes } = await pool.query(
      "SELECT '/uploads/' || replace(url_imagen, '\\', '/') AS url FROM imagenes_tatuaje WHERE id_tatuaje = $1 AND es_principal = false",
      [req.params.id]
    )
    res.json({ exito: true, imagenes })
  } catch (error) {
    console.error('Error al obtener imágenes secundarias:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al obtener las imágenes' })
  }
})

module.exports = router
