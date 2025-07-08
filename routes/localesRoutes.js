const express = require('express')
const router = express.Router()
const { upload, crearLocal, obtenerEstadoLocal, obtenerSolicitudesLocales, actualizarEstadoLocal, obtenerImagenesLocal, obtenerLocalesAprobados } = require('../controllers/localesController')

// Ruta para crear local (solo para tatuadores verificados)
router.post('/locales', upload.fields([
  { name: 'fachada', maxCount: 1 },
  { name: 'interior', maxCount: 10 }
]), crearLocal)

// Ruta para obtener el estado del local de un tatuador
router.get('/locales/estado/:id_tatuador', obtenerEstadoLocal)

// Ruta para obtener todas las solicitudes de locales (admin)
router.get('/locales/solicitudes', obtenerSolicitudesLocales)

// Ruta para aprobar/rechazar solicitud de local
router.post('/locales/:id_local/estado', actualizarEstadoLocal)

// Ruta para obtener imágenes secundarias de un local
router.get('/locales/:id_local/imagenes', obtenerImagenesLocal)

// Ruta para obtener todos los locales aprobados (pública)
router.get('/locales-publicos', obtenerLocalesAprobados)

module.exports = router
