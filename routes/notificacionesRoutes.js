const express = require('express')
const router = express.Router()
const notificacionesController = require('../controllers/notificacionesController')

// Obtener notificaciones de un usuario
router.get('/:id_usuario', notificacionesController.obtenerNotificaciones)

// Marcar una notificación como leída
router.put('/leida/:id_notificacion', notificacionesController.marcarComoLeida)

module.exports = router
