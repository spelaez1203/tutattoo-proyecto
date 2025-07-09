const express = require('express')
const router = express.Router()
const pool = require('../database/connection')
const { verificarAutenticacion } = require('../middlewares/authMiddleware')
const { getIdTatuador } = require('../controllers/userController')

// Ruta para obtener los datos del perfil de un usuario
router.get('/:id_usuario/perfil', verificarAutenticacion, async (req, res) => {
  const { id_usuario } = req.params

  try {
    const { rows } = await pool.query('SELECT * FROM perfil_usuario WHERE id_usuario = $1', [id_usuario])

    let perfil = rows[0] || { descripcion: '', instagram: '', tiktok: '', youtube: '', twitter: '', url_imagen: '' }

    // Si no hay imagen en perfil_usuario, buscar en usuarios
    if (!perfil.url_imagen) {
      const { rows: usuarios } = await pool.query('SELECT imagen_perfil FROM usuarios WHERE id_usuario = $1', [id_usuario])
      if (usuarios.length > 0 && usuarios[0].imagen_perfil) {
        perfil.url_imagen = usuarios[0].imagen_perfil
      }
    } else {
      // Si hay imagen en perfil_usuario, anteponer la ruta local
      perfil.url_imagen = `/uploads/perfiles/${perfil.url_imagen}`
    }

    res.json({ exito: true, ...perfil })
  } catch (error) {
    console.error('Error al obtener datos del perfil:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al obtener los datos del perfil' })
  }
})

// Ruta para actualizar el perfil del usuario
router.post('/:id_usuario/perfil', verificarAutenticacion, async (req, res) => {
  const { id_usuario } = req.params
  const { nombre, descripcion, instagram, tiktok, youtube, twitter } = req.body

  if (parseInt(req.session.usuario.id_usuario) !== parseInt(id_usuario)) {
    return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para actualizar este perfil' })
  }

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    if (nombre) {
      await connection.query('UPDATE usuarios SET nombre = ? WHERE id_usuario = ?', [nombre, id_usuario])
    }

    const perfilData = { descripcion, instagram, tiktok, youtube, twitter }
    const [perfilExistente] = await connection.query('SELECT id_perfil FROM perfil_usuario WHERE id_usuario = ?', [id_usuario])

    if (perfilExistente.length > 0) {
      await connection.query('UPDATE perfil_usuario SET ? WHERE id_usuario = ?', [perfilData, id_usuario])
    } else {
      perfilData.id_usuario = id_usuario
      await connection.query('INSERT INTO perfil_usuario SET ?', [perfilData])
    }

    await connection.commit()
    res.json({ exito: true, mensaje: 'Perfil actualizado correctamente' })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Error al actualizar el perfil:', error)
    res.status(500).json({ exito: false, mensaje: 'Error interno al actualizar el perfil' })
  } finally {
    if (connection) connection.release()
  }
})

// Ruta para obtener el id_tatuador de un usuario
router.get('/:id_usuario/tatuador', getIdTatuador)

// Eliminar cuenta de usuario
router.delete('/:id_usuario/eliminar', verificarAutenticacion, async (req, res) => {
  const { id_usuario } = req.params
  if (parseInt(req.session.usuario.id_usuario) !== parseInt(id_usuario)) {
    return res.status(403).json({ exito: false, mensaje: 'No tienes permiso para eliminar esta cuenta' })
  }
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()

    // Eliminar datos relacionados (comentarios, guardados, perfil, etc.)
    await connection.query('DELETE FROM comentarios_tatuajes WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM guardados WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM perfil_usuario WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM tatuadores WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM citas WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM solicitudes_verificacion WHERE id_usuario = ?', [id_usuario])
    await connection.query('DELETE FROM usuarios WHERE id_usuario = ?', [id_usuario])

    await connection.commit()
    res.json({ exito: true, mensaje: 'Cuenta eliminada correctamente' })
  } catch (error) {
    if (connection) await connection.rollback()
    console.error('Error al eliminar cuenta:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al eliminar la cuenta' })
  } finally {
    if (connection) connection.release()
  }
})

module.exports = router
