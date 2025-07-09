const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const LocalStrategy = require('passport-local').Strategy
const bcrypt = require('bcrypt')
const db = require('../database/connection') // Importar la conexión a la base de datos
require('dotenv').config()

// Verificar que las credenciales estén disponibles
console.log('Configurando Passport con Google Strategy...')
console.log('Client ID disponible:', !!process.env.GOOGLE_CLIENT_ID)
console.log('Client Secret disponible:', !!process.env.GOOGLE_CLIENT_SECRET)

passport.serializeUser((user, done) => {
  console.log('DEBUG: User object received in serializeUser:', JSON.stringify(user, null, 2))

  // Usar id_usuario para todos los usuarios
  if (!user.id_usuario) {
    console.error('ERROR: User.id_usuario no está definido en serializeUser!', user)
    return done(new Error('ID de usuario inválido para serialización'), null)
  }

  done(null, user.id_usuario)
})

passport.deserializeUser(async (id, done) => {
  console.log('DEBUG: ID recibido en deserializeUser:', id)

  try {
    // Buscar usuario por id_usuario y obtener su id_tatuador si existe
    const { rows } = await db.query(
      `SELECT u.*, t.id_tatuador 
       FROM usuarios u 
       LEFT JOIN tatuadores t ON u.id_usuario = t.id_usuario 
       WHERE u.id_usuario = $1`,
      [id]
    )

    if (rows.length > 0) {
      const usuario = rows[0]
      console.log('DEBUG: Usuario encontrado en deserializeUser:', usuario.correo)
      console.log('DEBUG: id_tatuador encontrado:', usuario.id_tatuador)
      done(null, usuario)
    } else {
      console.log('DEBUG: Usuario no encontrado en deserializeUser')
      done(null, false)
    }
  } catch (error) {
    console.error('ERROR: Error al deserializar usuario:', error)
    done(error)
  }
})

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3000/auth/google/callback',
  scope: ['profile', 'email']
},
async function (accessToken, refreshToken, profile, done) {
  try {
    console.log('DEBUG: Autenticación exitosa con Google:', profile.id)
    const googleId = profile.id
    const displayName = profile.displayName
    const email = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null
    const imageUrl = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : null

    const { rows: existingUsers } = await db.query('SELECT * FROM usuarios WHERE googleId = $1', [googleId])

    if (existingUsers.length > 0) {
      const user = existingUsers[0]
      console.log('DEBUG: Usuario existente encontrado:', user.nombre)
      await db.query(
        'UPDATE usuarios SET nombre = $1, correo = $2, imagen_perfil = $3 WHERE googleId = $4',
        [displayName, email, imageUrl, googleId]
      )
      return done(null, { ...user, googleId })
    } else {
      console.log('DEBUG: Creando nuevo usuario:', displayName)
      const result = await db.query(
        'INSERT INTO usuarios (googleId, nombre, correo, imagen_perfil) VALUES ($1, $2, $3, $4) RETURNING *',
        [googleId, displayName, email, imageUrl]
      )
      const newUser = result.rows[0]
      return done(null, newUser)
    }
  } catch (error) {
    console.error('ERROR: Error en la autenticación de Google al guardar en DB:', error)
    return done(error, null)
  }
}))

// Estrategia local para login normal
passport.use(new LocalStrategy({
  usernameField: 'correo',
  passwordField: 'contrasena'
}, async function (correo, contrasena, done) {
  try {
    console.log('DEBUG: Intentando login local para:', correo)
    console.log('DEBUG: Contraseña recibida (longitud):', contrasena ? contrasena.length : 0)

    // Buscar usuario por correo
    console.log('DEBUG: Ejecutando consulta SQL...')
    const { rows: usuarios } = await db.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    )
    console.log('DEBUG: Resultado de la consulta:', usuarios.length > 0 ? 'Usuario encontrado' : 'Usuario no encontrado')

    if (usuarios.length === 0) {
      console.log('DEBUG: Usuario no encontrado:', correo)
      return done(null, false, { message: 'Credenciales incorrectas' })
    }

    const usuario = usuarios[0]
    console.log('DEBUG: Usuario encontrado:', {
      id: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      tieneGoogleId: !!usuario.googleId,
      tieneContraseña: !!usuario.contrasena
    })

    // Verificar si es un usuario de Google
    if (usuario.googleId) {
      console.log('DEBUG: Usuario es de Google, no puede usar login normal:', correo)
      return done(null, false, { message: 'Esta cuenta está asociada a Google. Por favor, use el inicio de sesión con Google.' })
    }

    // Verificar que el usuario tenga contraseña
    if (!usuario.contrasena) {
      console.log('DEBUG: Usuario sin contraseña, probablemente creado por Google');
      return done(null, false, { message: 'Esta cuenta no tiene contraseña. Usa el login con Google.' });
    }

    // Verificar contraseña
    console.log('DEBUG: Verificando contraseña...')
    const contrasenaValida = await bcrypt.compare(contrasena, usuario.contrasena)
    console.log('DEBUG: Resultado de verificación de contraseña:', contrasenaValida)

    if (!contrasenaValida) {
      console.log('DEBUG: Contraseña incorrecta para:', correo)
      return done(null, false, { message: 'Credenciales incorrectas' })
    }

    console.log('DEBUG: Login exitoso para:', correo)
    return done(null, usuario)
  } catch (error) {
    console.error('ERROR: Error en autenticación local:', error)
    console.error('ERROR: Stack trace:', error.stack)
    return done(error)
  }
}))

module.exports = passport
