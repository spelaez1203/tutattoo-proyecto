document.addEventListener('DOMContentLoaded', () => {
  const formularioRegistro = document.getElementById('formulario-registro')

  formularioRegistro.addEventListener('submit', async (e) => {
    e.preventDefault()

    const nombre = document.getElementById('nombre').value.trim()
    const correo = document.getElementById('correo').value.trim()
    const contrasena = document.getElementById('contrasena').value
    const confirmarContrasena = document.getElementById('confirmar-contrasena').value

    if (contrasena !== confirmarContrasena) {
      mostrarError('Las contraseñas no coinciden')
      return
    }

    try {
      const datosUsuario = { nombre, correo, contrasena }

      const respuesta = await fetch('/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosUsuario)
      })

      const datos = await respuesta.json()

      if (datos.exito) {
        alert('¡Registro exitoso!')
        window.location.href = 'login.html'
      } else {
        mostrarError(datos.mensaje || 'Error en el registro')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarError('Error al registrar usuario')
    }
  })

  function mostrarError (mensaje) {
    const errorPrevio = document.querySelector('.mensaje-error')
    if (errorPrevio) errorPrevio.remove()

    const div = document.createElement('div')
    div.className = 'mensaje-error'
    div.textContent = mensaje
    formularioRegistro.appendChild(div)
  }
})
