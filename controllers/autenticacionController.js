const db = require('../db/conexion')
const bcrypt = require('bcrypt')

const iniciarSesion = async (req, res) => {
  const { correo, contraseña } = req.body
  console.log('Intento de inicio de sesión:', { correo })

  try {
    // Buscar usuario por correo
    const [usuarios] = await db.query(
      'SELECT * FROM usuarios WHERE correo = ?',
      [correo]
    )

    console.log('Resultado de búsqueda:', {
      encontrado: usuarios.length > 0,
      usuario: usuarios.length > 0
        ? {
            id: usuarios[0].id_usuario,
            nombre: usuarios[0].nombre,
            correo: usuarios[0].correo,
            rol: usuarios[0].rol,
            estado_verificado: usuarios[0].estado_verificado,
            id_tatuador: usuarios[0].id_tatuador
          }
        : null
    })

    if (usuarios.length === 0) {
      console.log('Usuario no encontrado')
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas'
      })
    }

    const usuario = usuarios[0]

    // Verificar contraseña
    console.log('Verificando contraseña...')
    const contraseñaValida = await bcrypt.compare(contraseña, usuario.contraseña)
    console.log('Resultado de verificación de contraseña:', contraseñaValida)

    if (!contraseñaValida) {
      console.log('Contraseña incorrecta')
      return res.status(401).json({
        exito: false,
        mensaje: 'Credenciales inválidas'
      })
    }

    // Si es administrador, verificar automáticamente
    if (usuario.rol === 'admin') {
      console.log('Usuario es administrador, verificando automáticamente')
      await db.query(
        'UPDATE usuarios SET estado_verificado = 1 WHERE id_usuario = ?',
        [usuario.id_usuario]
      )
      usuario.estado_verificado = 1
    }

    // Si es tatuador, obtener su id_tatuador
    if (usuario.rol === 'tatuador') {
      const [tatuadores] = await db.query(
        'SELECT id_tatuador FROM tatuadores WHERE id_usuario = ?',
        [usuario.id_usuario]
      )
      if (tatuadores.length > 0) {
        usuario.id_tatuador = tatuadores[0].id_tatuador
      }
    }

    // Guardar usuario en la sesión del servidor
    const usuarioSesion = {
      id_usuario: usuario.id_usuario,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      estado_verificado: usuario.estado_verificado,
      id_tatuador: usuario.id_tatuador
    }

    console.log('Guardando usuario en sesión:', usuarioSesion)
    req.session.usuario = usuarioSesion
    await req.session.save()
    console.log('Sesión guardada. ID de sesión:', req.session.id)
    console.log('Contenido de la sesión:', req.session)

    res.json({
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      usuario: usuarioSesion
    })
  } catch (error) {
    console.error('Error en inicio de sesión:', error)
    res.status(500).json({
      exito: false,
      mensaje: 'Error en el servidor'
    })
  }
}

module.exports = {
  iniciarSesion
}
