const express = require('express')
const router = express.Router()
const localesRoutes = require('./localesRoutes')

router.get('/saludo', (req, res) => {
  res.json({ mensaje: 'Hola desde la API Tutattoo' })
})

module.exports = [
  router,
  localesRoutes
]
