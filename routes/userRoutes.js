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

// Ruta para actualizar perfil de usuario
router.put('/:id_usuario/perfil', verificarAutenticacion, async (req, res) => {
  const { id_usuario } = req.params
  const { nombre, descripcion, instagram, tiktok, youtube, twitter } = req.body

  try {
    // Actualizar nombre en la tabla usuarios
    if (nombre) {
      await pool.query('UPDATE usuarios SET nombre = $1 WHERE id_usuario = $2', [nombre, id_usuario])
    }

    // Actualizar o insertar en perfil_usuario
    const { rows: perfilExistente } = await pool.query('SELECT id_perfil FROM perfil_usuario WHERE id_usuario = $1', [id_usuario])

    if (perfilExistente.length > 0) {
      await pool.query('UPDATE perfil_usuario SET descripcion = $1, instagram = $2, tiktok = $3, youtube = $4, twitter = $5 WHERE id_usuario = $6', [descripcion, instagram, tiktok, youtube, twitter, id_usuario])
    } else {
      await pool.query('INSERT INTO perfil_usuario (id_usuario, descripcion, instagram, tiktok, youtube, twitter) VALUES ($1, $2, $3, $4, $5, $6)', [id_usuario, descripcion, instagram, tiktok, youtube, twitter])
    }

    res.json({ exito: true, mensaje: 'Perfil actualizado correctamente' })
  } catch (error) {
    console.error('Error al actualizar perfil:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al actualizar el perfil' })
  }
})

// Ruta para obtener el id_tatuador de un usuario
router.get('/:id_usuario/tatuador', getIdTatuador)

// Eliminar cuenta de usuario
router.delete('/:id_usuario', verificarAutenticacion, async (req, res) => {
  const { id_usuario } = req.params

  try {
    // Eliminar en orden para respetar las foreign keys
    await pool.query('DELETE FROM comentarios_tatuajes WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM guardados WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM perfil_usuario WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM tatuadores WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM citas WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM solicitudes_verificacion WHERE id_usuario = $1', [id_usuario])
    await pool.query('DELETE FROM usuarios WHERE id_usuario = $1', [id_usuario])

    res.json({ exito: true, mensaje: 'Cuenta eliminada correctamente' })
  } catch (error) {
    console.error('Error al eliminar cuenta:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al eliminar la cuenta' })
  }
})

module.exports = router
