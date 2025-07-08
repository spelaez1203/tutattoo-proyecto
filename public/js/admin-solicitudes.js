document.addEventListener('DOMContentLoaded', () => {
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
  if (!usuarioActual || usuarioActual.rol !== 'admin') {
    window.location.href = 'login.html'
    return
  }

  const filtroEstado = document.getElementById('filtro-estado')
  const filtroNombre = document.getElementById('filtro-nombre')
  const solicitudesContainer = document.querySelector('.solicitudes-container')
  const modal = document.getElementById('modal-detalles')
  const cerrarModal = document.querySelector('.cerrar-modal')
  const btnAprobar = document.getElementById('btn-aprobar')
  const btnRechazar = document.getElementById('btn-rechazar')
  const comentarioAdmin = document.getElementById('comentario-admin')

  // Añadir botón de sincronización
  const btnSincronizar = document.createElement('button')
  btnSincronizar.className = 'btn-sincronizar'
  btnSincronizar.textContent = 'Sincronizar Tatuadores'
  btnSincronizar.onclick = sincronizarTatuadores
  document.querySelector('.filtros').appendChild(btnSincronizar)

  let solicitudActual = null

  // Cargar solicitudes iniciales
  cargarSolicitudes()
  cargarSolicitudesLocales()

  // Event listeners para filtros
  filtroEstado.addEventListener('change', cargarSolicitudes)
  filtroNombre.addEventListener('input', debounce(cargarSolicitudes, 500))

  // Event listeners para modal
  cerrarModal.addEventListener('click', () => {
    modal.style.display = 'none'
    solicitudActual = null
    comentarioAdmin.value = ''
  })

  window.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.style.display = 'none'
      solicitudActual = null
      comentarioAdmin.value = ''
    }
  })

  // Event listeners para botones de acción
  btnAprobar.addEventListener('click', () => {
    if (!solicitudActual) return
    if (solicitudActual.estado !== 'pendiente') {
      mostrarMensaje('Esta solicitud ya ha sido procesada', 'error')
      return
    }
    procesarSolicitud('aprobar')
  })

  btnRechazar.addEventListener('click', () => {
    if (!solicitudActual) return
    if (solicitudActual.estado !== 'pendiente') {
      mostrarMensaje('Esta solicitud ya ha sido procesada', 'error')
      return
    }
    if (!comentarioAdmin.value.trim()) {
      mostrarMensaje('Debes escribir un comentario para rechazar la solicitud', 'error')
      return
    }
    procesarSolicitud('rechazar')
  })

  async function cargarSolicitudes () {
    try {
      const estado = filtroEstado.value
      const nombre = filtroNombre.value
      const url = `/api/solicitudes-verificacion?estado=${estado}&nombre=${nombre}`

      const respuesta = await fetch(url)
      const datos = await respuesta.json()

      if (!datos.exito) {
        throw new Error(datos.mensaje)
      }

      mostrarSolicitudes(datos.solicitudes)
    } catch (error) {
      console.error('Error al cargar solicitudes:', error)
      mostrarMensaje('Error al cargar las solicitudes', 'error')
    }
  }

  function mostrarSolicitudes (solicitudes) {
    solicitudesContainer.innerHTML = ''

    if (solicitudes.length === 0) {
      solicitudesContainer.innerHTML = '<p class="no-solicitudes">No hay solicitudes que coincidan con los filtros</p>'
      return
    }

    solicitudes.forEach(solicitud => {
      const card = document.createElement('div')
      card.className = 'solicitud-card'
      card.innerHTML = `
                <h3>${solicitud.nombre_usuario}</h3>
                <p><strong>Correo:</strong> ${solicitud.correo}</p>
                <p><strong>Ciudad:</strong> ${solicitud.ciudad}</p>
                <p><strong>Fecha:</strong> ${new Date(solicitud.fecha_solicitud).toLocaleDateString()}</p>
                <span class="estado ${solicitud.estado}">${solicitud.estado.toUpperCase()}</span>
                <button class="btn-ver-detalles" data-id="${solicitud.id_solicitud}">Ver detalles</button>
            `

      card.querySelector('.btn-ver-detalles').addEventListener('click', () => {
        mostrarDetallesSolicitud(solicitud)
      })

      solicitudesContainer.appendChild(card)
    })
  }

  async function mostrarDetallesSolicitud (solicitud) {
    try {
      const respuesta = await fetch(`/api/solicitudes-verificacion/${solicitud.id_solicitud}`)
      const datos = await respuesta.json()

      if (!datos.exito) {
        throw new Error(datos.mensaje)
      }

      solicitudActual = datos.solicitud
      const detalles = document.querySelector('.detalles-solicitud')

      // Función para convertir ruta absoluta a relativa
      const getRutaRelativa = (rutaCompleta) => {
        const partes = rutaCompleta.split('/')
        const indiceUploads = partes.findIndex(p => p === 'documentos' || p === 'portfolio')
        if (indiceUploads === -1) return rutaCompleta
        return partes.slice(indiceUploads).join('/')
      }

      detalles.innerHTML = `
                <p><strong>Nombre:</strong> ${solicitudActual.nombre_usuario}</p>
                <p><strong>Correo:</strong> ${solicitudActual.correo}</p>
                <p><strong>Ciudad:</strong> ${solicitudActual.ciudad}</p>
                <p><strong>Realiza tatuajes a domicilio:</strong> ${solicitudActual.hace_domicilio ? 'Sí' : 'No'}</p>
                <p><strong>Tiene local:</strong> ${solicitudActual.tiene_local ? 'Sí' : 'No'}</p>
                ${solicitudActual.tiene_local
? `
                    <p><strong>Nombre del local:</strong> ${solicitudActual.nombre_local || 'No especificado'}</p>
                    <p><strong>Dirección:</strong> ${solicitudActual.direccion || 'No especificada'}</p>
                    <p><strong>Teléfono:</strong> ${solicitudActual.telefono || 'No especificado'}</p>
                `
: ''}
                <p><strong>Fecha de solicitud:</strong> ${new Date(solicitudActual.fecha_solicitud).toLocaleString()}</p>
                ${solicitudActual.fecha_revision
? `
                    <p><strong>Fecha de revisión:</strong> ${new Date(solicitudActual.fecha_revision).toLocaleString()}</p>
                `
: ''}
                ${solicitudActual.comentario_admin
? `
                    <p><strong>Comentario del administrador:</strong> ${solicitudActual.comentario_admin}</p>
                `
: ''}
                
                <div class="archivos-container">
                    <h4>Documentos:</h4>
                    ${solicitudActual.documentos && solicitudActual.documentos.length > 0
                        ? solicitudActual.documentos.map(doc => `
                            <div class="archivo-item">
                                <i class='bx bx-file'></i>
                                <a href="/uploads/${getRutaRelativa(doc)}" target="_blank">Ver documento</a>
                            </div>
                        `).join('')
: '<p>No hay documentos</p>'}
                    
                    <h4>Portfolio:</h4>
                    ${solicitudActual.portfolio && solicitudActual.portfolio.length > 0
                        ? solicitudActual.portfolio.map(img => `
                            <div class="archivo-item">
                                <i class='bx bx-image'></i>
                                <a href="/uploads/${getRutaRelativa(img)}" target="_blank">Ver imagen</a>
                            </div>
                        `).join('')
: '<p>No hay imágenes de portfolio</p>'}
                </div>
            `

      // Mostrar/ocultar botones según el estado
      const botonesAccion = document.querySelector('.acciones-solicitud')
      if (solicitudActual.estado === 'pendiente') {
        botonesAccion.style.display = 'block'
      } else {
        botonesAccion.style.display = 'none'
      }

      modal.style.display = 'block'
    } catch (error) {
      console.error('Error al cargar detalles:', error)
      mostrarMensaje('Error al cargar los detalles de la solicitud', 'error')
    }
  }

  async function procesarSolicitud (accion) {
    if (!solicitudActual) return

    try {
      const url = `/api/solicitudes-verificacion/${solicitudActual.id_solicitud}/${accion}`
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comentario: comentarioAdmin.value.trim()
        })
      })

      const datos = await respuesta.json()

      if (!datos.exito) {
        throw new Error(datos.mensaje)
      }

      mostrarMensaje(`Solicitud ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente`, 'exito')
      modal.style.display = 'none'
      solicitudActual = null
      comentarioAdmin.value = ''
      cargarSolicitudes()
    } catch (error) {
      console.error(`Error al ${accion} solicitud:`, error)
      mostrarMensaje(`Error al ${accion} la solicitud`, 'error')
    }
  }

  function mostrarMensaje (mensaje, tipo) {
    const mensajeExistente = document.querySelector('.mensaje-error, .mensaje-exito')
    if (mensajeExistente) {
      mensajeExistente.remove()
    }

    const div = document.createElement('div')
    div.className = `mensaje-${tipo}`
    div.textContent = mensaje
    document.querySelector('.contenedor').insertBefore(div, document.querySelector('.filtros'))

    setTimeout(() => {
      div.remove()
    }, 5000)
  }

  // Función para debounce
  function debounce (func, wait) {
    let timeout
    return function executedFunction (...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  // Función para sincronizar tatuadores
  async function sincronizarTatuadores () {
    try {
      const respuesta = await fetch('/api/sincronizar-tatuadores', {
        method: 'POST'
      })
      const datos = await respuesta.json()

      if (!datos.exito) {
        throw new Error(datos.mensaje)
      }

      mostrarMensaje(datos.mensaje, 'exito')
    } catch (error) {
      console.error('Error al sincronizar tatuadores:', error)
      mostrarMensaje('Error al sincronizar tatuadores', 'error')
    }
  }

  // --- Solicitudes de Locales ---
  async function cargarSolicitudesLocales () {
    try {
      const respuesta = await fetch('/api/locales/solicitudes')
      const datos = await respuesta.json()
      if (!datos.exito) throw new Error(datos.mensaje)
      mostrarSolicitudesLocales(datos.solicitudes)
    } catch (error) {
      console.error('Error al cargar solicitudes de locales:', error)
    }
  }

  function mostrarSolicitudesLocales (solicitudes) {
    let contenedor = document.getElementById('solicitudes-locales')
    if (!contenedor) {
      contenedor = document.createElement('div')
      contenedor.id = 'solicitudes-locales'
      contenedor.innerHTML = '<h2>Solicitudes de Locales</h2>'
      solicitudesContainer.parentNode.insertBefore(contenedor, solicitudesContainer.nextSibling)
    }
    contenedor.innerHTML = '<h2>Solicitudes de Locales</h2>'
    if (!solicitudes || solicitudes.length === 0) {
      contenedor.innerHTML += '<p class="no-solicitudes">No hay solicitudes de locales</p>'
      return
    }
    solicitudes.forEach(local => {
      const card = document.createElement('div')
      card.className = 'solicitud-card'
      card.innerHTML = `
        <h3>${local.nombre || 'Sin nombre'}</h3>
        <p><strong>Tatuador:</strong> ${local.nombre_tatuador || 'Desconocido'}</p>
        <p><strong>Correo:</strong> ${local.correo || '-'}</p>
        <p><strong>Dirección:</strong> ${local.direccion || '-'}</p>
        <p><strong>Teléfono:</strong> ${local.telefono || '-'}</p>
        <span class="estado ${local.estado}">${local.estado.toUpperCase()}</span>
        <button class="btn-ver-detalles-local btn-ver-detalles" data-id="${local.id_local}">Ver detalles</button>
      `
      card.querySelector('.btn-ver-detalles-local').addEventListener('click', () => {
        mostrarDetallesLocal(local)
      })
      contenedor.appendChild(card)
    })
  }

  // Modal para detalles de local
  let modoLocal = false
  function mostrarDetallesLocal (local) {
    modoLocal = true
    const modal = document.getElementById('modal-detalles')
    const detalles = document.querySelector('.detalles-solicitud')
    const acciones = document.querySelector('.acciones-solicitud')
    const comentarioAdmin = document.getElementById('comentario-admin')
    // Mostrar imágenes secundarias
    let imagenesSecundariasHtml = ''
    if (local.id_local) {
      imagenesSecundariasHtml = '<div id="imagenes-secundarias-local"></div>'
    }
    detalles.innerHTML = `
      <h3>${local.nombre || 'Sin nombre'}</h3>
      <p><strong>Tatuador:</strong> ${local.nombre_tatuador || 'Desconocido'}</p>
      <p><strong>Correo:</strong> ${local.correo || '-'}</p>
      <p><strong>Dirección:</strong> ${local.direccion || '-'}</p>
      <p><strong>Teléfono:</strong> ${local.telefono || '-'}</p>
      <p><strong>Estado:</strong> <span class="estado ${local.estado}">${local.estado.toUpperCase()}</span></p>
      ${local.imagen_fachada ? `<div><strong>Fachada:</strong><br><img src="/uploads/locales/${local.imagen_fachada}" alt="Fachada" style="max-width:200px;"></div>` : ''}
      ${imagenesSecundariasHtml}
    `
    acciones.style.display = local.estado === 'pendiente' ? 'block' : 'none'
    comentarioAdmin.value = ''
    modal.style.display = 'block'
    window.solicitudLocalActual = local
    // Cargar imágenes secundarias si hay id_local
    if (local.id_local) {
      fetch(`/api/locales/${local.id_local}/imagenes`)
        .then(resp => resp.json())
        .then(data => {
          if (data.exito && data.imagenes && data.imagenes.length > 0) {
            const cont = document.getElementById('imagenes-secundarias-local')
            cont.innerHTML = '<strong>Imágenes interiores:</strong><br>' + data.imagenes.map(img => `<img src="/uploads/locales/${img.url_imagen}" alt="Interior" style="max-width:150px; margin:5px;">`).join('')
          }
        })
    }
  }

  // Modificar listeners de aprobar/rechazar para modo local

  btnAprobar.addEventListener('click', async () => {
    if (modoLocal && window.solicitudLocalActual) {
      await procesarSolicitudLocal('aprobado')
    }
    // ... existente para verificación ...
  })
  btnRechazar.addEventListener('click', async () => {
    if (modoLocal && window.solicitudLocalActual) {
      const comentario = document.getElementById('comentario-admin').value.trim()
      if (!comentario) {
        mostrarMensaje('Debes escribir un comentario para rechazar la solicitud', 'error')
        return
      }
      await procesarSolicitudLocal('rechazado', comentario)
    }
    // ... existente para verificación ...
  })

  async function procesarSolicitudLocal (nuevoEstado, comentario = '') {
    const local = window.solicitudLocalActual
    if (!local) return
    try {
      const resp = await fetch(`/api/locales/${local.id_local}/estado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado, comentario })
      })
      const data = await resp.json()
      if (data.exito) {
        mostrarMensaje('Solicitud procesada correctamente', 'exito')
        document.getElementById('modal-detalles').style.display = 'none'
        cargarSolicitudesLocales()
      } else {
        mostrarMensaje(data.mensaje || 'Error al procesar la solicitud', 'error')
      }
    } catch (err) {
      mostrarMensaje('Error al procesar la solicitud', 'error')
    }
    modoLocal = false
    window.solicitudLocalActual = null
  }
})
