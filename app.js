const express = require('express')
const morgan = require('morgan')
const path = require('path')
const session = require('express-session')
const passport = require('./config/passport')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 3000

// Middlewares
app.use(morgan('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'tu_secreto_super_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax'
  }
}))

// Inicializar Passport
app.use(passport.initialize())
app.use(passport.session())

// Archivos estáticos
app.use(express.static(path.join(__dirname, 'public')))

// Rutas
const indexRoutes = require('./routes/index')
const autenticacionRoutes = require('./routes/autenticacionRoutes')
const tatuajesRoutes = require('./routes/tatuajesRoutes')
const localesRoutes = require('./routes/localesRoutes')

app.use('/api', indexRoutes) // Ruta base de la API
app.use('/auth', autenticacionRoutes)
app.use('/tatuajes', tatuajesRoutes)
app.use('/api', localesRoutes)

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`)
})
