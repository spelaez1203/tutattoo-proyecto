const express = require('express')
const router = express.Router()
const passport = require('passport')

// Ruta para verificar el estado de autenticación
router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
    res.json({
      isAuthenticated: true,
      user: {
        id_usuario: req.user.id_usuario,
        nombre: req.user.nombre,
        correo: req.user.correo,
        rol: req.user.rol,
        imagen_perfil: req.user.imagen_perfil,
        estado_verificado: req.user.estado_verificado
      }
    })
  } else {
    res.json({
      isAuthenticated: false
    })
  }
})

// Ruta para login local
router.post('/login', (req, res, next) => {
  console.log('DEBUG: Intento de login local recibido')
  console.log('DEBUG: Body recibido:', JSON.stringify(req.body, null, 2))

  passport.authenticate('local', async (err, user, info) => {
    console.log('DEBUG: Callback de autenticación ejecutado')
    console.log('DEBUG: Error:', err)
    console.log('DEBUG: User:', user ? JSON.stringify(user, null, 2) : 'null')
    console.log('DEBUG: Info:', info)

    if (err) {
      console.error('ERROR: Error en autenticación:', err)
      return res.status(500).json({
        exito: false,
        mensaje: 'Error en el servidor'
      })
    }

    if (!user) {
      console.log('DEBUG: Autenticación fallida:', info?.message)
      return res.status(401).json({
        exito: false,
        mensaje: info?.message || 'Credenciales incorrectas'
      })
    }

    console.log('DEBUG: Intentando iniciar sesión con usuario:', user.correo)
    req.login(user, async (err) => {
      if (err) {
        console.error('ERROR: Error al iniciar sesión:', err)
        return res.status(500).json({
          exito: false,
          mensaje: 'Error al iniciar sesión'
        })
      }

      try {
        console.log('DEBUG: Guardando sesión...')
        await new Promise((resolve, reject) => {
          req.session.save((err) => {
            if (err) {
              console.error('ERROR: Error al guardar sesión:', err)
              reject(err)
            } else {
              console.log('DEBUG: Sesión guardada exitosamente')
              resolve()
            }
          })
        })

        // Crear objeto de usuario para la respuesta
        const usuarioRespuesta = {
          id_usuario: user.id_usuario,
          nombre: user.nombre,
          correo: user.correo,
          rol: user.rol,
          estado_verificado: user.estado_verificado,
          id_tatuador: user.id_tatuador,
          imagen_perfil: user.imagen_perfil
        }

        console.log('DEBUG: Login exitoso para:', user.correo)
        console.log('DEBUG: Enviando respuesta:', JSON.stringify(usuarioRespuesta, null, 2))
        res.json({
          exito: true,
          mensaje: 'Inicio de sesión exitoso',
          usuario: usuarioRespuesta
        })
      } catch (error) {
        console.error('ERROR: Error al guardar sesión:', error)
        res.status(500).json({
          exito: false,
          mensaje: 'Error al guardar la sesión'
        })
      }
    })
  })(req, res, next)
})

// Ruta para iniciar el proceso de autenticación con Google
router.get('/google',
  (req, res, next) => {
    // Guardar la URL original en la sesión
    req.session.returnTo = req.query.returnTo || '/index.html'
    next()
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

// Ruta de callback después de la autenticación con Google
router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: '/login.html'
  }),
  async (req, res) => {
    try {
      console.log('=== Google Callback ===')
      console.log('User:', req.user)
      console.log('Session ID:', req.sessionID)
      console.log('Is Authenticated:', req.isAuthenticated())

      // Asegurarnos de que la sesión se guarde
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

      const returnTo = req.session.returnTo || '/index.html'
      delete req.session.returnTo // Limpiar la URL guardada

      // Codificar el usuario en base64 para pasarlo por la URL
      const userBase64 = Buffer.from(JSON.stringify(req.user)).toString('base64')
      // Redirigir a la página de callback del frontend
      res.redirect(`/google-callback.html?user=${encodeURIComponent(userBase64)}&returnTo=${encodeURIComponent(returnTo)}`)
    } catch (error) {
      console.error('Error en callback de Google:', error)
      res.redirect('/login.html')
    }
  }
)

// Ruta para cerrar sesión
router.get('/logout', async (req, res) => {
  try {
    console.log('=== Cierre de Sesión ===')
    console.log('Session ID:', req.sessionID)
    console.log('User:', req.user)

    // Destruir la sesión
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error al destruir sesión:', err)
          reject(err)
        } else {
          console.log('Sesión destruida exitosamente')
          resolve()
        }
      })
    })

    // Limpiar la cookie de sesión
    res.clearCookie('session_cookie_name')

    // Enviar una página HTML que limpie el sessionStorage y redirija
    res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cerrando sesión...</title>
            </head>
            <body>
                <script>
                    // Limpiar sessionStorage
                    sessionStorage.clear();
                    // Limpiar localStorage
                    localStorage.clear();
                    // Redirigir a la página principal
                    window.location.href = '/index.html';
                </script>
            </body>
            </html>
        `)
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
    res.redirect('/index.html')
  }
})

// Ruta POST para cerrar sesión (para compatibilidad con JavaScript)
router.post('/logout', async (req, res) => {
  try {
    console.log('=== Cierre de Sesión (POST) ===')
    console.log('Session ID:', req.sessionID)
    console.log('User:', req.user)

    // Destruir la sesión
    await new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error al destruir sesión:', err)
          reject(err)
        } else {
          console.log('Sesión destruida exitosamente')
          resolve()
        }
      })
    })

    // Limpiar la cookie de sesión
    res.clearCookie('session_cookie_name')

    // Responder con JSON para peticiones AJAX
    res.json({
      exito: true,
      mensaje: 'Sesión cerrada exitosamente'
    })
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error al cerrar sesión'
    })
  }
})

router.post('/registro', async (req, res) => {
  const { nombre, correo, contrasena } = req.body;
  const db = require('../db/conexion');
  const bcrypt = require('bcrypt');

  if (!nombre || !correo || !contrasena) {
    return res.json({ exito: false, mensaje: 'Todos los campos son obligatorios' });
  }

  try {
    // Verificar si ya existe el correo
    const [usuarios] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    if (usuarios.length > 0) {
      return res.json({ exito: false, mensaje: 'Este correo ya está registrado' });
    }

    // Encriptar la contraseña
    const hash = await bcrypt.hash(contrasena, 10);

    // Insertar en la base de datos
    await db.query(
      'INSERT INTO usuarios (nombre, correo, contraseña) VALUES (?, ?, ?)',
      [nombre, correo, hash]
    );

    res.json({ exito: true, mensaje: '¡Registro exitoso!' });
  } catch (error) {
    console.error('Error al registrar:', error);
    res.status(500).json({ exito: false, mensaje: 'Error del servidor' });
  }
});

module.exports = router
