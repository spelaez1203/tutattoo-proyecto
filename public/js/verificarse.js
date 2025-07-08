document.addEventListener('DOMContentLoaded', () => {
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
  if (!usuarioActual) {
    window.location.href = 'login.html'
    return
  }

  const formulario = document.getElementById('formulario-verificacion')
  const tieneLocal = document.getElementById('tiene-local')
  const infoLocal = document.getElementById('info-local')
  const inputsLocal = infoLocal.querySelectorAll('input')

  // Mostrar/ocultar campos del local según la selección
  tieneLocal.addEventListener('change', () => {
    if (tieneLocal.value === '1') {
      infoLocal.style.display = 'block'
      inputsLocal.forEach(input => { input.required = true })
    } else {
      infoLocal.style.display = 'none'
      inputsLocal.forEach(input => { input.required = false; input.value = '' })
    }
  })

  // Manejar envío del formulario
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault()

    const formData = new FormData(formulario)
    formData.append('id_usuario', usuarioActual.id_usuario)

    try {
      const respuesta = await fetch('/api/solicitud-verificacion', {
        method: 'POST',
        body: formData
      })

      const datos = await respuesta.json()

      if (respuesta.ok && datos.exito) {
        mostrarMensaje('Solicitud enviada correctamente. Te notificaremos cuando sea revisada.', 'exito')
        setTimeout(() => {
          window.location.href = 'configuracion.html'
        }, 3000)
      } else {
        mostrarMensaje(datos.mensaje || 'Error al enviar la solicitud', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al enviar la solicitud', 'error')
    }
  })

  function mostrarMensaje (mensaje, tipo) {
    const mensajeExistente = document.querySelector('.mensaje-error, .mensaje-exito')
    if (mensajeExistente) {
      mensajeExistente.remove()
    }

    const div = document.createElement('div')
    div.className = `mensaje-${tipo}`
    div.textContent = mensaje
    formulario.appendChild(div)
  }

  // Validación de archivos
  const inputDocumentos = document.getElementById('documentos')
  const inputPortfolio = document.getElementById('portfolio')
  const inputFachada = document.getElementById('imagen-fachada')

  function validarArchivos (input, tiposPermitidos, maxSizeMB) {
    const archivos = input.files
    const maxSize = maxSizeMB * 1024 * 1024 // Convertir a bytes

    for (const archivo of archivos) {
      // Validar tipo de archivo
      if (!tiposPermitidos.includes(archivo.type)) {
        mostrarMensaje(`El archivo ${archivo.name} no es de un tipo permitido`, 'error')
        input.value = ''
        return false
      }

      // Validar tamaño
      if (archivo.size > maxSize) {
        mostrarMensaje(`El archivo ${archivo.name} excede el tamaño máximo de ${maxSizeMB}MB`, 'error')
        input.value = ''
        return false
      }
    }
    return true
  }

  inputDocumentos.addEventListener('change', () => {
    validarArchivos(inputDocumentos, ['application/pdf'], 5)
  })

  inputPortfolio.addEventListener('change', () => {
    validarArchivos(inputPortfolio, ['image/jpeg', 'image/png', 'image/jpg'], 2)
  })

  inputFachada.addEventListener('change', () => {
    if (inputFachada.files.length > 0) {
      validarArchivos(inputFachada, ['image/jpeg', 'image/png', 'image/jpg'], 2)
    }
  })
})
