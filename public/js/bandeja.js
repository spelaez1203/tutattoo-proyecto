// Obtiene el usuario actual del sessionStorage
const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
const lista = document.getElementById('notificaciones-lista')

if (!usuarioActual) {
  lista.innerHTML = '<p>Debes iniciar sesión para ver tus notificaciones.</p>'
} else {
  fetch(`/api/notificaciones/${usuarioActual.id_usuario}`)
    .then(res => res.json())
    .then(data => {
      if (!data.exito || !data.notificaciones.length) {
        lista.innerHTML = '<p>No tienes notificaciones.</p>'
        return
      }
      lista.innerHTML = ''
      data.notificaciones.forEach(n => {
        const div = document.createElement('div')
        div.className = 'notificacion' + (n.leida ? ' leida' : '')
        div.innerHTML = `
          <div class="tipo">${tipoNotificacion(n.tipo)}</div>
          <div class="mensaje">${n.mensaje}</div>
          <div class="fecha">${formatearFecha(n.fecha)}</div>
          ${!n.leida ? '<button class="marcar-leida">Marcar como leída</button>' : ''}
        `
        if (!n.leida) {
          div.querySelector('.marcar-leida').onclick = () => marcarLeida(n.id_notificacion, div)
        }
        lista.appendChild(div)
      })
    })
}

function tipoNotificacion (tipo) {
  switch (tipo) {
    case 'cambio_rol': return 'Cambio de rol'
    case 'solicitud_aprobada': return 'Solicitud aprobada'
    case 'solicitud_rechazada': return 'Solicitud rechazada'
    case 'publicacion_eliminada': return 'Publicación eliminada'
    case 'destacado_semana': return '¡Destacado de la semana!'
    default: return 'Notificación'
  }
}

function formatearFecha (fecha) {
  const d = new Date(fecha)
  return d.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })
}

function marcarLeida (id, div) {
  fetch(`/api/notificaciones/leida/${id}`, { method: 'PUT' })
    .then(res => res.json())
    .then(data => {
      if (data.exito) {
        div.classList.add('leida')
        div.querySelector('.marcar-leida').remove()
      }
    })
}
