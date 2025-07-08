document.addEventListener('DOMContentLoaded', async () => {
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
  if (!usuarioActual) {
    window.location.href = 'login.html'
    return
  }

  // Verificar que tenemos el ID del usuario
  if (!usuarioActual.id_usuario) {
    console.error('❌ ID de usuario no encontrado en sessionStorage')
    alert('Error: Sesión de usuario inválida. Por favor, vuelve a iniciar sesión.')
    window.location.href = 'login.html'
    return
  }

  console.log('Usuario actual cargado:', {
    id: usuarioActual.id_usuario,
    nombre: usuarioActual.nombre,
    rol: usuarioActual.rol
  })

  // Elementos del DOM
  const formulario = document.getElementById('formulario-configuracion')
  const inputNombre = document.getElementById('nombre')
  const inputCorreo = document.getElementById('correo')
  const inputDescripcion = document.getElementById('descripcion')
  const inputInstagram = document.getElementById('instagram')
  const inputTiktok = document.getElementById('tiktok')
  const inputYoutube = document.getElementById('youtube')
  const inputTwitter = document.getElementById('twitter')
  const rolUsuario = document.getElementById('rol-usuario')
  const estadoVerificacion = document.getElementById('estado-verificacion')
  const btnVerificacion = document.getElementById('btn-verificacion')
  const btnCambiarImagen = document.getElementById('btn-cambiar-imagen')
  const inputImagen = document.getElementById('input-imagen')
  const imagenPerfil = document.getElementById('imagen-perfil')
  const seccionSolicitudes = document.getElementById('seccion-solicitudes')
  const btnAgregarLocal = document.getElementById('btn-agregar-local')
  const modalLocal = document.getElementById('modal-local')
  const cerrarModalLocal = document.getElementById('cerrar-modal-local')
  const formLocal = document.getElementById('form-local')

  const urlPatterns = {
    instagram: /^https:\/\/(www\.)?instagram\.com\/[a-zA-Z0-9_.]+\/?$/,
    tiktok: /^https:\/\/(www\.)?tiktok\.com\/@[a-zA-Z0-9_.]+\/?$/,
    youtube: /^https:\/\/(www\.)?youtube\.com\/(c\/|channel\/|user\/)?[a-zA-Z0-9_.-]+\/?$/,
    twitter: /^https:\/\/(www\.)?(x|twitter)\.com\/[a-zA-Z0-9_]{1,15}\/?$/
  }

  function validarRedSocial (input, pattern, nombreRed, ejemplo) {
    const url = input.value.trim()
    if (url && !pattern.test(url)) {
      alert(`La URL de ${nombreRed} no es válida. Por favor, introduce una URL completa (ej: ${ejemplo}).`)
      return false
    }
    return true
  }

  // Cargar datos del usuario
  inputNombre.value = usuarioActual.nombre
  inputCorreo.value = usuarioActual.correo
  rolUsuario.textContent = usuarioActual.rol.toUpperCase()

  // Obtener datos del perfil desde la API (incluye imagen, descripción y redes)
  try {
    const respuesta = await fetch(`/api/users/${usuarioActual.id_usuario}/perfil`)
    const datos = await respuesta.json()

    if (datos.exito) {
      // Llenar los campos del formulario con los datos del perfil
      if (datos.url_imagen) {
        imagenPerfil.src = datos.url_imagen
        usuarioActual.imagen_perfil = datos.url_imagen
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))
      }
      inputDescripcion.value = datos.descripcion || ''
      inputInstagram.value = datos.instagram || ''
      inputTiktok.value = datos.tiktok || ''
      inputYoutube.value = datos.youtube || ''
      inputTwitter.value = datos.twitter || ''
    } else {
      // Usar imagen por defecto si no hay perfil
      const imagenDefault = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=300'
      imagenPerfil.src = imagenDefault
      console.log(datos.mensaje) // "No se encontró perfil de usuario"
    }
  } catch (error) {
    console.error('Error al cargar datos del perfil:', error)
    const imagenDefault = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=300'
    imagenPerfil.src = imagenDefault
  }

  // Obtener y mostrar estado de verificación desde la API
  try {
    const respuestaEstado = await fetch(`/api/estado/${usuarioActual.id_usuario}`)
    const datosEstado = await respuestaEstado.json()

    if (datosEstado.exito) {
      const estadoInfo = datosEstado.estado

      if (estadoInfo.verificado) {
        estadoVerificacion.textContent = 'Verificado'
        btnVerificacion.style.display = 'none'
      } else if (estadoInfo.tiene_solicitud) {
        // Mostrar el estado de la solicitud
        switch (estadoInfo.estado_solicitud) {
          case 'pendiente':
            estadoVerificacion.textContent = 'Solicitud Pendiente'
            btnVerificacion.style.display = 'none' // Ocultar botón si hay solicitud pendiente
            break
          case 'aprobada':
            // Esto no debería ocurrir si estado_verificado es false, pero como fallback
            estadoVerificacion.textContent = 'Aprobado (Rol no actualizado)'
            btnVerificacion.style.display = 'none'
            break
          case 'rechazada':
            estadoVerificacion.textContent = 'Solicitud Rechazada'
            btnVerificacion.style.display = 'block' // Mostrar botón para reintentar
            break
          default:
            estadoVerificacion.textContent = 'Estado desconocido'
            btnVerificacion.style.display = 'block'
            break
        }
      } else {
        // No tiene solicitud ni está verificado
        estadoVerificacion.textContent = 'No verificado'
        btnVerificacion.style.display = 'block'
      }
    } else {
      console.error('Error al obtener estado de verificación de la API:', datosEstado.mensaje)
      estadoVerificacion.textContent = 'Error al cargar estado'
      btnVerificacion.style.display = 'block' // Mostrar botón por si acaso
    }
  } catch (error) {
    console.error('Error en fetch al obtener estado de verificación:', error)
    estadoVerificacion.textContent = 'Error al cargar estado'
    btnVerificacion.style.display = 'block'
  }

  // Mostrar sección de solicitudes solo para admin
  if (usuarioActual.rol === 'admin') {
    seccionSolicitudes.style.display = 'block'
    window.cargarSolicitudes()
  }

  // Mostrar botón 'Agregar local' solo a tatuadores verificados y según estado del local
  if (usuarioActual.rol === 'tatuador' && estadoVerificacion.textContent === 'Verificado') {
    // Consultar estado del local
    fetch(`/api/locales/estado/${usuarioActual.id_tatuador}`)
      .then(resp => resp.json())
      .then(data => {
        // Mostrar u ocultar el botón según el estado
        if (!data.estado || data.estado === 'rechazado') {
          btnAgregarLocal.style.display = 'inline-block'
        } else {
          btnAgregarLocal.style.display = 'none'
        }
        // Mostrar el estado del local en la interfaz
        let estadoLocalSpan = document.getElementById('estado-local')
        if (!estadoLocalSpan) {
          // Crear el elemento si no existe
          estadoLocalSpan = document.createElement('span')
          estadoLocalSpan.id = 'estado-local'
          estadoVerificacion.parentNode.appendChild(document.createElement('br'))
          estadoVerificacion.parentNode.appendChild(estadoLocalSpan)
        }
        if (data.estado === 'pendiente') {
          estadoLocalSpan.textContent = 'Estado del local: pendiente'
        } else if (data.estado === 'aprobado') {
          estadoLocalSpan.textContent = 'Estado del local: aprobado'
        } else if (data.estado === 'rechazado') {
          estadoLocalSpan.textContent = 'Estado del local: rechazado'
        } else {
          estadoLocalSpan.textContent = ''
        }
      })
      .catch(() => {
        btnAgregarLocal.style.display = 'inline-block'
      })
  }

  // Abrir modal al hacer click en 'Agregar local'
  btnAgregarLocal.addEventListener('click', () => {
    modalLocal.style.display = 'block'
    document.body.classList.add('modal-abierto')
  })

  // Cerrar modal al hacer click en la X
  cerrarModalLocal.addEventListener('click', () => {
    modalLocal.style.display = 'none'
    formLocal.reset()
    document.body.classList.remove('modal-abierto')
  })

  // Cerrar modal si se hace click fuera del contenido
  window.addEventListener('click', (event) => {
    if (event.target === modalLocal) {
      modalLocal.style.display = 'none'
      formLocal.reset()
      document.body.classList.remove('modal-abierto')
    }
  })

  // Manejar envío del formulario de local (ahora con lógica de backend)
  formLocal.addEventListener('submit', async function (e) {
    e.preventDefault()
    if (!usuarioActual.id_tatuador) {
      alert('No se encontró el id_tatuador. No puedes registrar un local.')
      return
    }
    const formData = new FormData()
    formData.append('id_tatuador', usuarioActual.id_tatuador)
    formData.append('nombre', document.getElementById('nombre-local').value)
    formData.append('direccion', document.getElementById('direccion-local').value)
    formData.append('telefono', document.getElementById('telefono-local').value)
    // Fachada (obligatoria)
    const fachadaFile = document.getElementById('fachada-local').files[0]
    if (!fachadaFile) {
      alert('Debes seleccionar una imagen de fachada.')
      return
    }
    formData.append('fachada', fachadaFile)
    // Imágenes de interior (opcionales)
    const interiorFiles = document.getElementById('interior-local').files
    for (let i = 0; i < interiorFiles.length; i++) {
      formData.append('interior', interiorFiles[i])
    }
    try {
      const resp = await fetch('/api/locales', {
        method: 'POST',
        body: formData
      })
      const data = await resp.json()
      if (data.exito) {
        alert('Local registrado correctamente. Queda pendiente de aprobación.')
        modalLocal.style.display = 'none'
        formLocal.reset()
      } else {
        alert('Error: ' + (data.mensaje || 'No se pudo registrar el local.'))
      }
    } catch (err) {
      alert('Error al registrar el local. Intenta de nuevo.')
      console.error(err)
    }
  })

  // Manejar cambio de imagen
  btnCambiarImagen.addEventListener('click', () => {
    inputImagen.click()
  })

  inputImagen.addEventListener('change', async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Verificar que tenemos el ID del usuario antes de continuar
    if (!usuarioActual.id_usuario) {
      alert('Error: Sesión de usuario inválida. Por favor, vuelve a iniciar sesión.')
      window.location.href = 'login.html'
      return
    }

    console.log('Archivo seleccionado:', {
      nombre: file.name,
      tipo: file.type,
      tamaño: file.size,
      ultimaModificacion: new Date(file.lastModified).toISOString()
    })

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecciona una imagen válida (JPG, PNG)')
      inputImagen.value = ''
      return
    }

    // Validar extensión
    const extensionesPermitidas = ['jpg', 'jpeg', 'png']
    const extension = file.name.split('.').pop().toLowerCase()
    if (!extensionesPermitidas.includes(extension)) {
      alert('Formato de imagen no permitido. Use JPG o PNG')
      inputImagen.value = ''
      return
    }

    // Validar tamaño (2MB máximo)
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no debe superar los 2MB')
      inputImagen.value = ''
      return
    }

    // Mostrar indicador de carga
    btnCambiarImagen.disabled = true
    btnCambiarImagen.textContent = 'Subiendo...'

    const formData = new FormData()
    formData.append('imagen', file)
    formData.append('id_usuario', usuarioActual.id_usuario)

    // Verificar datos antes de enviar
    console.log('Datos a enviar:', {
      id_usuario: usuarioActual.id_usuario,
      nombre_archivo: file.name,
      tipo_archivo: file.type,
      tamaño: file.size
    })

    try {
      console.log('Enviando petición a /api/actualizar-imagen...')
      const respuesta = await fetch('/api/actualizar-imagen', {
        method: 'POST',
        body: formData
      })

      console.log('Respuesta recibida:', {
        status: respuesta.status,
        statusText: respuesta.statusText,
        headers: Object.fromEntries(respuesta.headers.entries())
      })

      let datos
      try {
        datos = await respuesta.json()
        console.log('Datos de respuesta:', datos)
      } catch (error) {
        console.error('Error al parsear la respuesta:', error)
        throw new Error('Error al procesar la respuesta del servidor')
      }

      if (!respuesta.ok) {
        throw new Error(datos.mensaje || `Error ${respuesta.status}: ${respuesta.statusText}`)
      }

      if (datos.exito) {
        console.log('Imagen actualizada exitosamente:', datos.url_imagen)
        // Actualizar la imagen en la interfaz
        imagenPerfil.src = datos.url_imagen
        // Actualizar usuario en sessionStorage
        usuarioActual.imagen_perfil = datos.url_imagen
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))
        alert('Imagen actualizada correctamente')
      } else {
        throw new Error(datos.mensaje || 'Error al actualizar la imagen')
      }
    } catch (error) {
      console.error('Error completo:', error)
      console.error('Stack trace:', error.stack)
      alert(error.message || 'Error al actualizar la imagen. Por favor, intenta de nuevo.')
    } finally {
      // Restaurar el botón
      btnCambiarImagen.disabled = false
      btnCambiarImagen.textContent = 'Cambiar foto'
      // Limpiar el input
      inputImagen.value = ''
    }
  })

  // Manejar actualización de perfil
  formulario.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Validar URLs de redes sociales
    if (!validarRedSocial(inputInstagram, urlPatterns.instagram, 'Instagram', 'https://www.instagram.com/usuario')) return
    if (!validarRedSocial(inputTiktok, urlPatterns.tiktok, 'TikTok', 'https://www.tiktok.com/@usuario')) return
    if (!validarRedSocial(inputYoutube, urlPatterns.youtube, 'YouTube', 'https://www.youtube.com/c/usuario')) return
    if (!validarRedSocial(inputTwitter, urlPatterns.twitter, 'Twitter', 'https://twitter.com/usuario')) return

    try {
      const respuesta = await fetch(`/api/users/${usuarioActual.id_usuario}/perfil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nombre: inputNombre.value,
          descripcion: inputDescripcion.value,
          instagram: inputInstagram.value,
          tiktok: inputTiktok.value,
          youtube: inputYoutube.value,
          twitter: inputTwitter.value
        })
      })

      if (respuesta.ok) {
        const datos = await respuesta.json()
        if (datos.exito) {
          usuarioActual.nombre = inputNombre.value
          sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))
          alert('Perfil actualizado correctamente')
        } else {
          alert('Error al actualizar el perfil: ' + datos.mensaje)
        }
      } else {
        const errorData = await respuesta.json()
        alert('Error al actualizar el perfil: ' + (errorData.mensaje || 'Error de red'))
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar el perfil')
    }
  })

  // Manejar solicitud de verificación
  btnVerificacion.addEventListener('click', () => {
    window.location.href = 'verificarse.html'
  })

  // Manejar tabs de solicitudes
  const tabBtns = document.querySelectorAll('.tab-btn')
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'))
      btn.classList.add('active')

      const tabId = btn.dataset.tab
      document.querySelectorAll('.tab-contenido').forEach(contenido => {
        contenido.classList.remove('active')
      })
      document.getElementById(`contenido-${tabId}`).classList.add('active')
    })
  })

  // Si el usuario es tatuador, obtener su id_tatuador si no está en sessionStorage
  if (usuarioActual.rol === 'tatuador' && !usuarioActual.id_tatuador) {
    try {
      const respTatuador = await fetch(`/api/users/${usuarioActual.id_usuario}/tatuador`)
      const dataTatuador = await respTatuador.json()
      if (dataTatuador.exito && dataTatuador.id_tatuador) {
        usuarioActual.id_tatuador = dataTatuador.id_tatuador
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))
      }
    } catch (e) {
      console.error('No se pudo obtener el id_tatuador:', e)
    }
  }

  // Botón eliminar cuenta
  const btnEliminarCuenta = document.getElementById('btn-eliminar-cuenta')
  if (btnEliminarCuenta) {
    btnEliminarCuenta.addEventListener('click', async () => {
      const confirmar = confirm('¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.')
      if (!confirmar) return
      try {
        const respuesta = await fetch(`/api/users/${usuarioActual.id_usuario}/eliminar`, {
          method: 'DELETE',
          credentials: 'include'
        })
        const resultado = await respuesta.json()
        if (respuesta.ok && resultado.exito) {
          alert('Tu cuenta ha sido eliminada correctamente.')
          sessionStorage.clear()
          window.location.href = 'index.html'
        } else {
          alert('Error al eliminar la cuenta: ' + (resultado.mensaje || 'Intenta de nuevo.'))
        }
      } catch (error) {
        alert('Error al eliminar la cuenta. Intenta de nuevo más tarde.')
      }
    })
  }
})

// Funciones globales para manejar solicitudes
window.aprobarSolicitud = async (tipo, id) => {
  console.log(`Aprobando solicitud ${tipo} con ID ${id}...`)
  try {
    const respuesta = await fetch(`/api/solicitudes/${tipo}/aprobar/${id}`, {
      method: 'PUT'
    })
    const datos = await respuesta.json()
    if (datos.exito) {
      alert(`Solicitud de ${tipo} aprobada.`)
      window.cargarSolicitudes()
    } else {
      alert(`Error al aprobar solicitud de ${tipo}: ${datos.mensaje}`)
    }
  } catch (error) {
    console.error(`Error al aprobar solicitud de ${tipo}:`, error)
    alert(`Error al aprobar solicitud de ${tipo}.`)
  }
}

window.rechazarSolicitud = async (tipo, id) => {
  console.log(`Rechazando solicitud ${tipo} con ID ${id}...`)
  try {
    const respuesta = await fetch(`/api/solicitudes/${tipo}/rechazar/${id}`, {
      method: 'PUT'
    })
    const datos = await respuesta.json()
    if (datos.exito) {
      alert(`Solicitud de ${tipo} rechazada.`)
      window.cargarSolicitudes()
    } else {
      alert(`Error al rechazar solicitud de ${tipo}: ${datos.mensaje}`)
    }
  } catch (error) {
    console.error(`Error al rechazar solicitud de ${tipo}:`, error)
    alert(`Error al rechazar solicitud de ${tipo}.`)
  }
}

// --- INICIO: funciones globales para solicitudes ---
async function cargarSolicitudes () {
  try {
    const [respuestaTatuadores, respuestaLocales] = await Promise.all([
      fetch('/api/solicitudes/tatuadores'),
      fetch('/api/solicitudes/locales')
    ])
    const tatuadores = await respuestaTatuadores.json()
    const locales = await respuestaLocales.json()
    mostrarSolicitudes('tatuadores', tatuadores)
    mostrarSolicitudes('locales', locales)
  } catch (error) {
    console.error('Error al cargar solicitudes:', error)
  }
}

function mostrarSolicitudes (tipo, solicitudes) {
  const contenedor = document.getElementById(`contenido-${tipo}`)
  contenedor.innerHTML = ''
  solicitudes.forEach(solicitud => {
    const div = document.createElement('div')
    div.className = 'solicitud'
    div.innerHTML = `
      <div class="solicitud-header">
        <h3>${tipo === 'tatuadores' ? solicitud.nombre : solicitud.nombre_local}</h3>
        <div class="solicitud-acciones">
          <button class="btn-aprobar" onclick="aprobarSolicitud('${tipo}', ${solicitud.id_usuario || solicitud.id_local})">Aprobar</button>
          <button class="btn-rechazar" onclick="rechazarSolicitud('${tipo}', ${solicitud.id_usuario || solicitud.id_local})">Rechazar</button>
        </div>
      </div>
      <div class="solicitud-body">
        <p>ID Solicitud: ${solicitud.id}</p>
        <p>ID Usuario: ${solicitud.id_usuario}</p>
        <p>Estado: ${solicitud.estado}</p>
        ${tipo === 'tatuadores' ? `<p>Años Experiencia: ${solicitud.años_experiencia}</p><p>Descripción: ${solicitud.descripcion}</p><p>Documento: <a href="/uploads/documentos/${solicitud.documento}" target="_blank">Ver Documento</a></p>` : ''}
        ${tipo === 'locales' ? `<p>Dirección: ${solicitud.direccion}</p><p>Teléfono: ${solicitud.telefono}</p><p>Fachada: <a href="/uploads/fachadas/${solicitud.fachada}" target="_blank">Ver Fachada</a></p>` : ''}
      </div>
    `
    contenedor.appendChild(div)
  })
}
window.cargarSolicitudes = cargarSolicitudes
// --- FIN: funciones globales para solicitudes ---
