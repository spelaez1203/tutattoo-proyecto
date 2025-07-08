const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
require('dotenv').config()
const notificacionesController = require('../controllers/notificacionesController')

// Configuración del almacenamiento en disco para todos los archivos
const uploadDirBase = process.env.UPLOAD_DIR_BASE || path.join(__dirname, '../imagenes_pagina')

// Crear directorios necesarios
const fs = require('fs')
const directorios = {
  perfiles: path.join(uploadDirBase, 'perfiles'),
  documentos: path.join(uploadDirBase, 'documentos'),
  portfolio: path.join(uploadDirBase, 'portfolio'),
  fachadas: path.join(uploadDirBase, 'fachadas')
}

Object.entries(directorios).forEach(([nombre, ruta]) => {
  if (!fs.existsSync(ruta)) {
    fs.mkdirSync(ruta, { recursive: true })
    console.log(`✅ Directorio de ${nombre} creado: ${ruta}`)
  } else {
    console.log(`✅ Directorio de ${nombre} ya existe: ${ruta}`)
  }
})

// Configuración común de almacenamiento
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Determinar el directorio de destino basado en el campo del archivo
    let destino
    if (file.fieldname === 'imagen') {
      destino = directorios.perfiles
    } else if (file.fieldname === 'imagen-fachada') {
      destino = directorios.fachadas
    } else if (file.fieldname === 'documentos') {
      destino = directorios.documentos
    } else if (file.fieldname === 'portfolio') {
      destino = directorios.portfolio
    } else {
      destino = uploadDirBase // Directorio por defecto
    }
    cb(null, destino)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const extension = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`)
  }
})

// Configuración común de filtro de archivos
const fileFilter = (req, file, cb) => {
  try {
    console.log('Validando archivo:', {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      fieldname: file.fieldname
    })

    // Validar tipo de archivo
    if (file.fieldname === 'imagen' || file.fieldname === 'imagen-fachada' || file.fieldname === 'portfolio') {
      if (!file.mimetype.startsWith('image/')) {
        console.error('Tipo de archivo no permitido:', file.mimetype)
        return cb(new Error('Solo se permiten imágenes (JPG, PNG)'))
      }
    }

    // Validar extensión
    const extensionesPermitidas = ['jpg', 'jpeg', 'png', 'pdf']
    const extension = file.originalname.split('.').pop().toLowerCase()
    if (!extensionesPermitidas.includes(extension)) {
      console.error('Extensión no permitida:', extension)
      return cb(new Error('Formato de archivo no permitido'))
    }

    console.log('Archivo validado correctamente')
    cb(null, true)
  } catch (error) {
    console.error('Error en fileFilter:', error)
    cb(error)
  }
}

// Configuración de Multer para imagen de perfil
const uploadPerfil = multer({
  storage: diskStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter
}).single('imagen')

// Configuración de Multer para solicitud de verificación
const uploadFields = multer({
  storage: diskStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB por archivo
  },
  fileFilter
}).fields([
  { name: 'imagen-fachada', maxCount: 1 },
  { name: 'documentos', maxCount: 5 },
  { name: 'portfolio', maxCount: 5 }
])

// Ruta para enviar solicitud de verificación
router.post('/solicitud-verificacion', uploadFields, async (req, res) => {
  console.log('\n--- Solicitud de verificación recibida ---')
  console.log('req.body:', req.body)
  console.log('req.files:', req.files)

  const db = require('../db/conexion')
  const { id_usuario, ciudad, hace_domicilio, tiene_local, nombre_local, direccion, telefono } = req.body

  // Validar datos esenciales
  if (!id_usuario || !ciudad) {
    console.error('❌ Datos esenciales faltantes (id_usuario o ciudad)')
    if (req.files) {
      Object.values(req.files).forEach(filesArray => {
        if (Array.isArray(filesArray)) {
          filesArray.forEach(file => {
            if (file && file.path) {
              fs.unlink(file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr)
              })
            }
          })
        }
      })
    }
    return res.status(400).json({ exito: false, mensaje: 'Datos esenciales incompletos' })
  }

  let connection
  try {
    console.log('Iniciando transacción de base de datos para solicitud...')
    connection = await db.getConnection()
    await connection.beginTransaction()
    console.log('Transacción iniciada.')

    // Verificar si el usuario ya tiene una solicitud pendiente o aprobada
    const [solicitudExistente] = await connection.query(
      'SELECT id_solicitud FROM solicitudes_verificacion WHERE id_usuario = ? AND estado IN (?, ?)',
      [id_usuario, 'pendiente', 'aprobada']
    )

    if (solicitudExistente.length > 0) {
      console.warn('⚠️ Usuario ya tiene una solicitud activa.', { id_usuario })
      if (req.files) {
        Object.values(req.files).forEach(filesArray => {
          if (Array.isArray(filesArray)) {
            filesArray.forEach(file => {
              if (file && file.path) {
                fs.unlink(file.path, (unlinkErr) => {
                  if (unlinkErr) console.error('Error al eliminar archivo duplicado:', unlinkErr)
                })
              }
            })
          }
        })
      }
      await connection.rollback()
      return res.status(400).json({ exito: false, mensaje: 'Ya tienes una solicitud de verificación en proceso o aprobada.' })
    }

    console.log('Insertando en tabla solicitudes_verificacion...')
    const documentos = ((req.files && req.files.documentos) || []).map(file => path.relative(uploadDirBase, file.path)).join(',')
    const portfolio = ((req.files && req.files.portfolio) || []).map(file => path.relative(uploadDirBase, file.path)).join(',')

    const [result] = await connection.query(
      'INSERT INTO solicitudes_verificacion (id_usuario, ciudad, hace_domicilio, tiene_local, nombre_local, direccion, telefono, documentos, portfolio, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id_usuario, ciudad, hace_domicilio === '1', tiene_local === '1', nombre_local || null, direccion || null, telefono || null, documentos || null, portfolio || null, 'pendiente']
    )

    const id_solicitud = result.insertId
    console.log(`Solicitud de verificación insertada con ID: ${id_solicitud}`)

    await connection.commit()
    console.log('Transacción de solicitud confirmada.')
    return res.json({
      exito: true,
      mensaje: 'Solicitud enviada correctamente. Te notificaremos cuando sea revisada.',
      id_solicitud
    })
  } catch (error) {
    console.error('❌ Error al procesar la solicitud de verificación:', error)
    if (connection) {
      await connection.rollback()
    }
    if (req.files) {
      Object.values(req.files).forEach(filesArray => {
        if (Array.isArray(filesArray)) {
          filesArray.forEach(file => {
            if (file && file.path) {
              fs.unlink(file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Error al eliminar archivo después de error:', unlinkErr)
              })
            }
          })
        }
      })
    }
    return res.status(500).json({ exito: false, mensaje: 'Error interno del servidor al procesar la solicitud.' })
  } finally {
    if (connection) {
      connection.release()
      console.log('Conexión de base de datos liberada.')
    }
  }
})

// Ruta para obtener el estado de verificación
router.get('/estado/:id_usuario', async (req, res) => {
  const { id_usuario } = req.params

  if (!id_usuario) {
    return res.status(400).json({
      exito: false,
      mensaje: 'ID de usuario no proporcionado'
    })
  }

  const db = require('../db/conexion')
  try {
    // Consultar estado general de verificación, si tiene solicitud y el estado de la solicitud
    const [rows] = await db.query(
      'SELECT u.estado_verificado, sv.estado as estado_solicitud FROM usuarios u LEFT JOIN solicitudes_verificacion sv ON u.id_usuario = sv.id_usuario WHERE u.id_usuario = ?',
      [id_usuario]
    )

    if (rows.length === 0) {
      return res.status(404).json({ exito: false, mensaje: 'Usuario no encontrado' })
    }

    const data = rows[0]

    res.json({
      exito: true,
      estado: {
        verificado: data.estado_verificado,
        tiene_solicitud: data.estado_solicitud !== null, // Indica si hay una solicitud (pendiente, aprobada, rechazada)
        estado_solicitud: data.estado_solicitud // El estado de la solicitud (null si no hay)
      }
    })
  } catch (error) {
    console.error('Error al obtener estado de verificación:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al obtener estado de verificación' })
  }
})

// Ruta para actualizar imagen de perfil
router.post('/actualizar-imagen', (req, res) => {
  console.log('Iniciando actualización de imagen...')
  console.log('Solicitud recibida en /actualizar-imagen')

  uploadPerfil(req, res, async (err) => {
    console.log('Multer callback ejecutado')
    console.log('Archivo recibido por Multer:', req.file)

    if (err) {
      console.error('❌ Error en uploadPerfil:', err)
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            exito: false,
            mensaje: 'La imagen no debe superar los 2MB'
          })
        }
        return res.status(400).json({
          exito: false,
          mensaje: 'Error al subir la imagen: ' + err.message
        })
      }
      return res.status(400).json({
        exito: false,
        mensaje: err.message || 'Error al procesar la imagen'
      })
    }

    if (!req.file) {
      console.error('❌ No se recibió ningún archivo')
      return res.status(400).json({
        exito: false,
        mensaje: 'No se ha subido ninguna imagen'
      })
    }

    const { id_usuario } = req.body
    console.log('ID Usuario recibido:', id_usuario)

    if (!id_usuario) {
      console.error('❌ ID de usuario no proporcionado')
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr)
      })
      return res.status(400).json({
        exito: false,
        mensaje: 'ID de usuario no proporcionado'
      })
    }

    const db = require('../db/conexion')
    try {
      // Verificar que el usuario existe
      const [usuario] = await db.query(
        'SELECT id_usuario FROM usuarios WHERE id_usuario = ?',
        [id_usuario]
      )

      if (usuario.length === 0) {
        console.error('❌ Usuario no encontrado:', id_usuario)
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr)
        })
        return res.status(404).json({
          exito: false,
          mensaje: 'Usuario no encontrado'
        })
      }

      // Obtener la ruta relativa para almacenar en la base de datos
      const rutaRelativa = path.relative(uploadDirBase, req.file.path)
      console.log('Ruta relativa del archivo:', rutaRelativa)

      // Actualizar o insertar en perfil_usuario
      const [perfilExistente] = await db.query(
        'SELECT id_perfil FROM perfil_usuario WHERE id_usuario = ?',
        [id_usuario]
      )

      if (perfilExistente.length > 0) {
        await db.query(
          'UPDATE perfil_usuario SET url_imagen = ? WHERE id_usuario = ?',
          [rutaRelativa, id_usuario]
        )
      } else {
        await db.query(
          'INSERT INTO perfil_usuario (id_usuario, url_imagen) VALUES (?, ?)',
          [id_usuario, rutaRelativa]
        )
      }

      res.json({
        exito: true,
        mensaje: 'Imagen actualizada correctamente',
        url_imagen: `/uploads/${rutaRelativa.replace(/\\/g, '/')}`
      })
    } catch (error) {
      console.error('❌ Error al actualizar imagen en la base de datos:', error)
      if (req.file && req.file.path) {
        fs.unlink(req.file.path, (unlinkErr) => {
          if (unlinkErr) console.error('Error al eliminar archivo:', unlinkErr)
        })
      }
      res.status(500).json({
        exito: false,
        mensaje: 'Error al actualizar la imagen'
      })
    }
  })
})

// Ruta para obtener todas las solicitudes de verificación (para admin)
router.get('/solicitudes-verificacion', async (req, res) => {
  const { estado, nombre } = req.query
  const db = require('../db/conexion')

  try {
    let query = `
            SELECT s.*, u.nombre as nombre_usuario, u.correo
            FROM solicitudes_verificacion s
            JOIN usuarios u ON s.id_usuario = u.id_usuario
            WHERE 1=1
        `
    const params = []

    if (estado && estado !== 'todos') {
      query += ' AND s.estado = ?'
      params.push(estado)
    }

    if (nombre) {
      query += ' AND u.nombre LIKE ?'
      params.push(`%${nombre}%`)
    }

    query += ' ORDER BY s.fecha_solicitud DESC'

    const [solicitudes] = await db.query(query, params)

    // Convertir las cadenas de documentos y portfolio en arrays para cada solicitud
    solicitudes.forEach(solicitud => {
      solicitud.documentos = solicitud.documentos ? solicitud.documentos.split(',').filter(doc => doc.trim()) : []
      solicitud.portfolio = solicitud.portfolio ? solicitud.portfolio.split(',').filter(img => img.trim()) : []
    })

    res.json({
      exito: true,
      solicitudes
    })
  } catch (error) {
    console.error('Error al obtener solicitudes:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener las solicitudes'
    })
  }
})

// Ruta para obtener detalles de una solicitud específica
router.get('/solicitudes-verificacion/:id', async (req, res) => {
  const { id } = req.params
  const db = require('../db/conexion')

  try {
    const [solicitudes] = await db.query(`
            SELECT s.*, u.nombre as nombre_usuario, u.correo
            FROM solicitudes_verificacion s
            JOIN usuarios u ON s.id_usuario = u.id_usuario
            WHERE s.id_solicitud = ?
        `, [id])

    if (solicitudes.length === 0) {
      return res.status(404).json({
        exito: false,
        mensaje: 'Solicitud no encontrada'
      })
    }

    const solicitud = solicitudes[0]

    // Convertir las cadenas de documentos y portfolio en arrays
    solicitud.documentos = solicitud.documentos ? solicitud.documentos.split(',').filter(doc => doc.trim()) : []
    solicitud.portfolio = solicitud.portfolio ? solicitud.portfolio.split(',').filter(img => img.trim()) : []

    res.json({
      exito: true,
      solicitud
    })
  } catch (error) {
    console.error('Error al obtener detalles de la solicitud:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al obtener los detalles de la solicitud'
    })
  }
})

// Ruta para aprobar una solicitud
router.post('/solicitudes-verificacion/:id/aprobar', async (req, res) => {
  const { id } = req.params
  const { comentario } = req.body
  const db = require('../db/conexion')

  try {
    // Iniciar transacción
    const connection = await db.getConnection()
    await connection.beginTransaction()

    try {
      // Obtener los datos de la solicitud antes de actualizarla
      const [solicitudes] = await connection.query(
        'SELECT * FROM solicitudes_verificacion WHERE id_solicitud = ?',
        [id]
      )

      if (solicitudes.length === 0) {
        throw new Error('Solicitud no encontrada')
      }

      const solicitud = solicitudes[0]

      // Actualizar estado de la solicitud
      await connection.query(`
                UPDATE solicitudes_verificacion 
                SET estado = 'aprobada', 
                    fecha_revision = CURRENT_TIMESTAMP,
                    comentario_admin = ?
                WHERE id_solicitud = ?
            `, [comentario, id])

      // Actualizar rol del usuario a tatuador
      await connection.query(`
                UPDATE usuarios 
                SET rol = 'tatuador',
                    estado_verificado = 1
                WHERE id_usuario = ?
            `, [solicitud.id_usuario])

      // Insertar en la tabla tatuadores
      await connection.query(`
                INSERT INTO tatuadores (id_usuario, ciudad, hace_domicilio, tiene_local)
                VALUES (?, ?, ?, ?)
            `, [
        solicitud.id_usuario,
        solicitud.ciudad,
        solicitud.hace_domicilio,
        solicitud.tiene_local
      ])

      // Notificar al usuario que su solicitud fue aprobada y su rol cambió
      await notificacionesController.crearNotificacion(
        solicitud.id_usuario,
        'solicitud_aprobada',
        '¡Felicidades! Tu solicitud de verificación fue aprobada y ahora eres tatuador.'
      )

      await connection.commit()

      res.json({
        exito: true,
        mensaje: 'Solicitud aprobada exitosamente'
      })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    console.error('Error al aprobar solicitud:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al aprobar la solicitud'
    })
  }
})

// Ruta para rechazar una solicitud
router.post('/solicitudes-verificacion/:id/rechazar', async (req, res) => {
  const { id } = req.params
  const { comentario } = req.body
  const db = require('../db/conexion')

  if (!comentario) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Se requiere un comentario para rechazar la solicitud'
    })
  }

  try {
    await db.query(`
            UPDATE solicitudes_verificacion 
            SET estado = 'rechazada', 
                fecha_revision = CURRENT_TIMESTAMP,
                comentario_admin = ?
            WHERE id_solicitud = ?
        `, [comentario, id])

    // Obtener el id_usuario de la solicitud rechazada
    const [solicitud] = await db.query(
      'SELECT id_usuario FROM solicitudes_verificacion WHERE id_solicitud = ?',
      [id]
    )
    if (solicitud.length > 0) {
      await notificacionesController.crearNotificacion(
        solicitud[0].id_usuario,
        'solicitud_rechazada',
        'Tu solicitud de verificación fue rechazada. Motivo: ' + comentario
      )
    }

    res.json({
      exito: true,
      mensaje: 'Solicitud rechazada exitosamente'
    })
  } catch (error) {
    console.error('Error al rechazar solicitud:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al rechazar la solicitud'
    })
  }
})

// Función para sincronizar tatuadores
async function sincronizarTatuadores () {
  const db = require('../db/conexion')
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Obtener todos los usuarios con rol tatuador que no están en la tabla tatuadores
    const [usuarios] = await connection.query(`
            SELECT u.id_usuario, sv.ciudad, sv.hace_domicilio, sv.tiene_local
            FROM usuarios u
            LEFT JOIN tatuadores t ON u.id_usuario = t.id_usuario
            LEFT JOIN solicitudes_verificacion sv ON u.id_usuario = sv.id_usuario
            WHERE u.rol = 'tatuador' 
            AND t.id_usuario IS NULL
            AND sv.estado = 'aprobada'
        `)

    // Insertar cada usuario en la tabla tatuadores
    for (const usuario of usuarios) {
      await connection.query(`
                INSERT INTO tatuadores (id_usuario, ciudad, hace_domicilio, tiene_local)
                VALUES (?, ?, ?, ?)
            `, [
        usuario.id_usuario,
        usuario.ciudad,
        usuario.hace_domicilio,
        usuario.tiene_local
      ])
    }

    await connection.commit()
    return usuarios.length // Retorna cuántos usuarios se sincronizaron
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
}

// Ruta para sincronizar tatuadores (solo admin)
router.post('/sincronizar-tatuadores', async (req, res) => {
  try {
    const usuariosSincronizados = await sincronizarTatuadores()
    res.json({
      exito: true,
      mensaje: `Se sincronizaron ${usuariosSincronizados} tatuadores exitosamente`
    })
  } catch (error) {
    console.error('Error al sincronizar tatuadores:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al sincronizar tatuadores'
    })
  }
})

module.exports = router
