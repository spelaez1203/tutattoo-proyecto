document.addEventListener('DOMContentLoaded', () => {
  const formularioLogin = document.getElementById('formulario-login')

  formularioLogin.addEventListener('submit', async (e) => {
    e.preventDefault()

    const correo = document.getElementById('correo').value
    const contrasena = document.getElementById('contrasena').value

    try {
      console.log('DEBUG: Enviando solicitud de login para:', correo)
      const respuesta = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          correo,
          contrasena
        })
      })

      const datos = await respuesta.json()
      console.log('DEBUG: Respuesta del servidor:', datos)

      if (respuesta.ok && datos.exito) {
        console.log('DEBUG: Login exitoso, guardando usuario en sessionStorage')
        // Guardar usuario en sessionStorage
        sessionStorage.setItem('usuarioActual', JSON.stringify(datos.usuario))

        // Obtener la URL de retorno si existe
        const urlParams = new URLSearchParams(window.location.search)
        const returnTo = urlParams.get('returnTo') || 'index.html'

        console.log('DEBUG: Redirigiendo a:', returnTo)
        // Redirigir a la página original o a index
        window.location.href = returnTo
      } else {
        console.log('DEBUG: Error en login:', datos.mensaje)
        mostrarError(datos.mensaje || 'Error al iniciar sesión')
      }
    } catch (error) {
      console.error('ERROR: Error en la solicitud de login:', error)
      mostrarError('Error al intentar iniciar sesión. Por favor, intente nuevamente.')
    }
  })

  function mostrarError (mensaje) {
    const errorExistente = document.querySelector('.mensaje-error')
    if (errorExistente) {
      errorExistente.remove()
    }

    const mensajeError = document.createElement('div')
    mensajeError.className = 'mensaje-error alert alert-danger mt-3'
    mensajeError.textContent = mensaje
    formularioLogin.appendChild(mensajeError)

    // Remover el mensaje después de 5 segundos
    setTimeout(() => {
      mensajeError.remove()
    }, 5000)
  }

  const googleBtn = document.getElementById('google-login-btn')
  if (googleBtn) {
    const urlParams = new URLSearchParams(window.location.search)
    const returnTo = urlParams.get('returnTo') || '/index.html'
    googleBtn.href = `/auth/google?returnTo=${encodeURIComponent(returnTo)}`
  }
})
