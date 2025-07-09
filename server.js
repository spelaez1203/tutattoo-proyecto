const express = require('express')
const path = require('path')
const morgan = require('morgan')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const passport = require('./config/passport')
const pool = require('./database/connection') // Importar la conexión a la base de datos
const app = express()
const PORT = process.env.PORT || 3000
require('dotenv').config()
const helmet = require('helmet')

// Middleware unificado para Content Security Policy
const cspDirectives = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Permitir inline scripts (si es necesario para alguna librería)
      'https://apis.google.com',
      'https://kit.fontawesome.com'
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Permitir inline styles
      'https://fonts.googleapis.com',
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com',
      'https://kit.fontawesome.com',
      'https://ka-f.fontawesome.com'
    ],
    fontSrc: [
      "'self'",
      'https://fonts.gstatic.com',
      'https://unpkg.com',
      'https://cdnjs.cloudflare.com',
      'data:', // Permitir fuentes desde data URIs
      'https://ka-f.fontawesome.com'
    ],
    imgSrc: [
      "'self'",
      'data:', // ¡LA CLAVE! Permitir imágenes desde data URIs para las vistas previas
      'https://cdn.tutattoo.com',
      'https://upload.wikimedia.org',
      'https://www.gravatar.com',
      'https://lh3.googleusercontent.com'
    ],
    connectSrc: [
      "'self'",
      'http://localhost:3000', // Permitir conexiones al propio servidor para desarrollo
      'https://api.tutattoo.com',
      'https://ka.fontawesome.com',
      'https://ka-f.fontawesome.com'
    ],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: []
  }
}

// Aplicar la política de seguridad de contenido
app.use(helmet.contentSecurityPolicy(cspDirectives))

// Middleware para logs detallados
app.use((req, res, next) => {
  console.log('=== Nueva solicitud ===')
  console.log('Método:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', req.headers)
  next()
})

// Middleware para logs
app.use(morgan('dev'))

// Middleware para parsear JSON y formularios
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configuración de la sesión
const sessionStore = new pgSession({
  pool: pool,
  tableName: 'session' // <--- Cambiado a 'session' sin la s
})

app.use(session({
  key: 'session_cookie_name',
  secret: process.env.SESSION_SECRET || 'tutattoo_secret_key',
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    secure: false,
    httpOnly: true,
    sameSite: 'lax'
  }
}))

// Logs de sesión
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID)
  console.log('Session content (before Passport):', req.session)
  next()
})

// Inicializar Passport
console.log('Inicializando Passport...')
app.use(passport.initialize())
app.use(passport.session())

// Logs de Passport después de inicialización
app.use((req, res, next) => {
  console.log('Passport initialized. req.user:', req.user)
  console.log('isAuthenticated:', req.isAuthenticated ? req.isAuthenticated() : 'N/A')
  next()
})

// Configuración de tipos MIME
app.use((req, res, next) => {
  if (req.path.endsWith('.css')) {
    res.type('text/css')
  }
  next()
})

// Importar rutas
const autenticacionRoutes = require('./routes/autenticacionRoutes')
const verificacionRoutes = require('./routes/verificacionRoutes')
const tatuajesRoutes = require('./routes/tatuajesRoutes')
const notificacionesRoutes = require('./routes/notificacionesRoutes')
const userRoutes = require('./routes/userRoutes')
const localesRoutes = require('./routes/localesRoutes')

// Servir archivos estáticos desde la carpeta 'public'
app.use(express.static(path.join(__dirname, 'public')))

// Configuración de archivos estáticos
const uploadDirBase = process.env.UPLOAD_DIR_BASE || __dirname + '/imagenes_pagina'
app.use('/uploads', express.static(uploadDirBase))

// Servir archivos estáticos desde la carpeta de subida de perfiles
const uploadDirPerfiles = process.env.UPLOAD_DIR_PERFILES || path.join(__dirname, 'public', 'uploads', 'perfiles')
// Asegurarnos de que Express sirva correctamente los archivos, incluso si la ruta es absoluta
const serveStatic = require('serve-static')
app.use('/uploads/perfiles', serveStatic(uploadDirPerfiles))

// Registrar rutas - IMPORTANTE: Las rutas de autenticación deben ir primero
console.log('Registrando rutas de autenticación...')
app.use('/auth', autenticacionRoutes)

// Otras rutas
app.use('/api/users', userRoutes)
app.use('/api/tatuajes', tatuajesRoutes)
app.use('/api/notificaciones', notificacionesRoutes)
app.use('/api', verificacionRoutes)
app.use('/api', localesRoutes)

// Ruta para verificar que el servidor está funcionando
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok' })
})

// Rutas estáticas para las páginas HTML
app.get(['/', '/index.html'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'))
})

app.get('/registro.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registro.html'))
})

app.get('/configuracion.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'configuracion.html'))
})

app.get('/verificarse.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'verificarse.html'))
})

app.get('/panel-admin.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'panel-admin.html'))
})

app.get('/Solicitudes.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'Solicitudes.html'))
})

app.get('/publicaciones.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'publicaciones.html'))
})

app.get('/perfil.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'perfil.html'))
})

app.get('/dashboard', (req, res) => {
  console.log('Accediendo a /dashboard')
  console.log('Estado de autenticación en /dashboard:', req.isAuthenticated())
  console.log('Usuario en /dashboard (req.user):', req.user)
  if (!req.isAuthenticated()) {
    console.log('Redirigiendo a /login.html desde /dashboard')
    return res.redirect('/login.html')
  }
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'))
})

// Seguridad extra con Helmet
app.use(helmet.hidePoweredBy())
app.use(helmet.xssFilter())
app.use(helmet.noSniff())
app.use(helmet.frameguard({ action: 'deny' }))
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }))
app.use(helmet.referrerPolicy({ policy: 'strict-origin-when-cross-origin' }))

// Middleware para errores 404 en rutas API
app.use('/api', (req, res, next) => {
  res.status(404).json({ exito: false, mensaje: 'Ruta no encontrada' });
});

// Middleware para errores 500 en rutas API
app.use('/api', (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ exito: false, mensaje: 'Error interno del servidor' });
});

// Middleware para capturar peticiones a directorios y devolver 404 con CSP
const directoriosEstaticos = ['/css', '/img', '/js', '/uploads', '/uploads/tatuajes', '/uploads/perfiles']
directoriosEstaticos.forEach(dir => {
  app.use(dir, (req, res, next) => {
    // Si la petición es exactamente al directorio (sin archivo)
    if (req.path === '/' || req.path === '') {
      res.status(404)
      res.setHeader('Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://apis.google.com; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https://cdn.tutattoo.com https://lh3.googleusercontent.com; connect-src 'self' https://api.tutattoo.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests; script-src-attr 'none'; worker-src 'self';"
      )
      return res.send('404 Not Found')
    }
    next()
  })
})

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`)
})
