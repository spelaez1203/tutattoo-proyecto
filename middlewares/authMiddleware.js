// Middleware para verificar autenticación básica
const verificarAutenticacion = async (req, res, next) => {
  console.log('=== Verificación de Autenticación ===')
  console.log('Session ID:', req.sessionID)
  console.log('Passport User:', req.user)
  console.log('Session User:', req.session?.usuario)
  console.log('Is Authenticated:', req.isAuthenticated())
  console.log('===================================')

  if (!req.isAuthenticated()) {
    console.log('Usuario no autenticado')
    return res.status(401).json({
      exito: false,
      mensaje: 'Debes iniciar sesión para realizar esta acción'
    })
  }

  // Sincronizar req.user con la sesión
  if (req.user && (!req.session.usuario || req.session.usuario.id_usuario !== req.user.id_usuario)) {
    console.log('Sincronizando usuario en sesión')
    req.session.usuario = { ...req.user }

    // Guardar la sesión explícitamente
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
  }

  console.log('Usuario autenticado:', req.user)
  next()
}

// Middleware para verificar que es tatuador
const verificarRolTatuador = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({
      exito: false,
      mensaje: 'Debes iniciar sesión para realizar esta acción'
    })
  }

  console.log('Verificando rol de tatuador:', req.user.rol)

  if (req.user.rol !== 'tatuador') {
    console.log('Usuario no es tatuador')
    return res.status(403).json({
      exito: false,
      mensaje: 'Solo los tatuadores pueden realizar esta acción'
    })
  }
  console.log('Usuario es tatuador')
  next()
}

// Middleware para verificar tatuador completo
const verificarTatuador = async (req, res, next) => {
  console.log('Verificando tatuador completo:', {
    id_tatuador: req.user?.id_tatuador,
    session_id_tatuador: req.session?.usuario?.id_tatuador
  })

  // Si no hay id_tatuador en req.user pero sí en la sesión, lo sincronizamos
  if (!req.user.id_tatuador && req.session?.usuario?.id_tatuador) {
    console.log('Sincronizando id_tatuador desde la sesión:', req.session.usuario.id_tatuador)
    req.user.id_tatuador = req.session.usuario.id_tatuador
  }

  if (!req.user.id_tatuador) {
    console.log('Usuario no tiene id_tatuador')
    return res.status(403).json({
      exito: false,
      mensaje: 'Tu cuenta no está completamente configurada como tatuador'
    })
  }

  console.log('Tatuador verificado con id:', req.user.id_tatuador)
  next()
}

// Middleware para verificar que es admin
const verificarRolAdmin = (req, res, next) => {
  if (req.user?.rol !== 'admin') {
    return res.status(403).json({
      exito: false,
      mensaje: 'Acceso denegado. Se requieren privilegios de administrador.'
    })
  }
  next()
}

module.exports = {
  verificarAutenticacion,
  verificarRolTatuador,
  verificarTatuador,
  verificarRolAdmin
}
