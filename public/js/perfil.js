document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Verificar estado de autenticación
    const response = await fetch('/auth/status', {
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Error al verificar autenticación')
    }

    const data = await response.json()

    if (!data.isAuthenticated || !data.user) {
      // Redirigir al login con la URL de retorno
      const currentPath = window.location.pathname
      window.location.href = `/login.html?returnTo=${encodeURIComponent(currentPath)}`
      return
    }

    // Guardar usuario en sessionStorage
    sessionStorage.setItem('usuarioActual', JSON.stringify(data.user))
    const usuario = data.user

    // Crear overlay para el fondo oscuro
    const overlay = document.createElement('div')
    overlay.className = 'overlay'
    document.body.appendChild(overlay)

    // Actualizar la información del perfil
    actualizarInfoPerfil(usuario)

    // Obtener imagen de perfil
    try {
      const res = await fetch(`/api/users/${usuario.id_usuario}/perfil?cache_bust=${new Date().getTime()}`)
      const datos = await res.json()
      if (datos.exito) {
        // Mover la actualización de la información del perfil aquí
        // para asegurar que 'datos' completos se usen.
        const usuarioCompleto = { ...usuario, ...datos }
        actualizarInfoPerfil(usuarioCompleto)
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioCompleto))

        if (datos.url_imagen) {
          document.getElementById('imagen-perfil').src = datos.url_imagen
        }

        // Mostrar descripción si existe
        const descContainer = document.getElementById('descripcion-perfil')
        if (datos.descripcion) {
          descContainer.textContent = datos.descripcion
          descContainer.style.display = 'block'
        }

        // Mostrar redes sociales si existen
        const redesContainer = document.getElementById('redes-sociales')
        const socialLinks = {
          'instagram-link': datos.instagram,
          'tiktok-link': datos.tiktok,
          'youtube-link': datos.youtube,
          'twitter-link': datos.twitter
        }

        let hasSocialMedia = false
        for (const [id, url] of Object.entries(socialLinks)) {
          const linkElement = document.getElementById(id)
          if (url) {
            linkElement.href = url
            linkElement.style.display = 'inline-block'
            hasSocialMedia = true
          }
        }

        if (hasSocialMedia) {
          redesContainer.style.display = 'flex'
        }
      }
    } catch (error) {
      console.error('Error al cargar imagen de perfil:', error)
    }

    // Configurar las pestañas
    configurarTabs()

    // Si es tatuador, mostrar la pestaña de publicaciones
    if (usuario.rol === 'tatuador') {
      const tabPublicaciones = document.querySelector('[data-tab="publicaciones"]')
      tabPublicaciones.style.display = 'block'

      // Verificar estado del tatuador antes de cargar publicaciones
      try {
        const response = await fetch('/api/tatuajes/verificar-estado', {
          credentials: 'include'
        })
        const data = await response.json()

        if (!data.exito) {
          console.error('Error al verificar estado:', data.mensaje)
          tabPublicaciones.style.display = 'none'
          document.querySelector('[data-tab="guardados"]').click()
          return
        }

        // Actualizar la sesión con el id_tatuador
        usuario.id_tatuador = data.id_tatuador
        sessionStorage.setItem('usuarioActual', JSON.stringify(usuario))

        // Cargar las publicaciones
        await cargarPublicaciones()

        // Activar la pestaña de publicaciones
        tabPublicaciones.click()
      } catch (error) {
        console.error('Error al verificar estado:', error)
        tabPublicaciones.style.display = 'none'
        document.querySelector('[data-tab="guardados"]').click()
      }
    } else {
      // Para usuarios normales, ocultar pestaña de publicaciones
      document.querySelector('[data-tab="publicaciones"]').style.display = 'none'
      // Activar la pestaña de guardados por defecto
      document.querySelector('[data-tab="guardados"]').click()
    }

    // Cargar guardados para todos los usuarios
    await cargarGuardados()

    // Configurar botones de acción
    configurarBotonesAccion()
  } catch (error) {
    console.error('Error al inicializar perfil:', error)
    // Redirigir al login con la URL de retorno
    const currentPath = window.location.pathname
    window.location.href = `/login.html?returnTo=${encodeURIComponent(currentPath)}`
  }
})

function actualizarInfoPerfil (usuario) {
  // Actualizar nombre y rol
  document.getElementById('nombre-usuario-perfil').textContent = usuario.nombre
  document.getElementById('rol-usuario').textContent = usuario.rol === 'tatuador' ? 'Tatuador Verificado' : 'Usuario'

  // Actualizar imagen de perfil si existe
  if (usuario.imagen_perfil) {
    document.getElementById('imagen-perfil').src = usuario.imagen_perfil
  }
}

function configurarTabs () {
  const tabs = document.querySelectorAll('.tab-btn')
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remover clase active de todas las pestañas
      tabs.forEach(t => t.classList.remove('active'))
      document.querySelectorAll('.tab-contenido').forEach(c => c.classList.remove('active'))

      // Activar la pestaña seleccionada
      tab.classList.add('active')
      const tabId = tab.getAttribute('data-tab')
      document.getElementById(tabId).classList.add('active')
    })
  })
}

async function cargarPublicaciones () {
  try {
    // Primero verificar el estado del tatuador
    const responseEstado = await fetch('/api/tatuajes/verificar-estado', {
      credentials: 'include'
    })

    if (!responseEstado.ok) {
      throw new Error('Error al verificar estado del tatuador')
    }

    const dataEstado = await responseEstado.json()

    if (!dataEstado.exito) {
      console.error('Error en estado del tatuador:', dataEstado.mensaje)
      document.querySelector('[data-tab="publicaciones"]').style.display = 'none'
      document.querySelector('[data-tab="guardados"]').click()
      return
    }

    // Actualizar la sesión con el id_tatuador
    const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
    usuarioActual.id_tatuador = dataEstado.id_tatuador
    sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))

    // Ahora intentar cargar las publicaciones
    const response = await fetch('/api/tatuajes/publicaciones', {
      credentials: 'include'
    })

    if (!response.ok) {
      if (response.status === 403) {
        // Si no es tatuador, ocultar la pestaña de publicaciones
        document.querySelector('[data-tab="publicaciones"]').style.display = 'none'
        document.querySelector('[data-tab="guardados"]').click()
        return
      }
      throw new Error('Error al cargar publicaciones')
    }

    const publicaciones = await response.json()
    const grid = document.getElementById('grid-publicaciones')

    // Actualizar contador
    document.getElementById('num-publicaciones').textContent = publicaciones.length

    // Limpiar grid
    grid.innerHTML = ''

    // Agregar publicaciones
    publicaciones.forEach(tatuaje => {
      const card = crearTatuajeCard(tatuaje, false, true)
      if (card) {
        grid.appendChild(card)
      }
    })
  } catch (error) {
    console.error('Error:', error)
    mostrarError('Error al cargar las publicaciones')
  }
}

async function cargarGuardados () {
  try {
    const response = await fetch('/api/tatuajes/guardados', {
      credentials: 'include',
      headers: {
        Accept: 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        // Redirigir al login con la URL de retorno
        const currentPath = window.location.pathname
        window.location.href = `/login.html?returnTo=${encodeURIComponent(currentPath)}`
        return
      }
      throw new Error('Error al cargar guardados')
    }

    const guardados = await response.json()
    const grid = document.getElementById('grid-guardados')

    // Actualizar contador
    document.getElementById('num-guardados').textContent = guardados.length

    // Limpiar grid
    grid.innerHTML = ''

    // Agregar guardados
    guardados.forEach(tatuaje => {
      const card = crearTatuajeCard(tatuaje, true, false)
      if (card) {
        grid.appendChild(card)
      }
    })
  } catch (error) {
    console.error('Error:', error)
    mostrarError('Error al cargar los guardados')
  }
}

function crearTatuajeCard (tatuaje, esGuardado = false, esTatuador = false) {
  if (!tatuaje || !tatuaje.id_tatuaje) {
    return null
  }

  // Convertir valores a números usando los nuevos campos
  const promedioFinal = parseFloat(tatuaje.promedio_final) || 0
  const totalVotos = parseInt(tatuaje.total_votos) || 0

  // Determinar qué botón mostrar
  let botonAccion = ''
  if (esTatuador) {
    // Botón de eliminar para la pestaña de publicaciones del tatuador
    botonAccion = `
            <button class="btn-eliminar" data-id="${tatuaje.id_tatuaje}" title="Eliminar publicación">
                <i class="fas fa-trash"></i>
            </button>
        `
  } else if (esGuardado) {
    // Botón de guardar para la pestaña de guardados
    botonAccion = `
            <button class="btn-guardar" data-id="${tatuaje.id_tatuaje}" title="Quitar de guardados">
                <i class="fas fa-heart"></i>
            </button>
        `
  }

  const card = document.createElement('div')
  card.className = 'tatuaje-card'
  card.dataset.id = tatuaje.id_tatuaje

  // Asegurarnos de que la URL de la imagen principal sea válida
  const imagenUrl = tatuaje.imagen_url || '/img/image.png'

  card.innerHTML = `
        <!-- Contenido para la tarjeta no expandida -->
        <div class="tatuaje-view-no-expandido">
            <img src="${imagenUrl}" alt="${tatuaje.titulo || 'Tatuaje'}"
                 onerror="this.src='/img/image.png'"
                 class="tatuaje-imagen-principal">

            <div class="tatuaje-info-no-expandido">
                <h3 class="tatuaje-titulo">${tatuaje.titulo || 'Sin título'}</h3>
                <p class="tatuaje-artista">${tatuaje.nombre_tatuador || 'Artista'}</p>
                <div class="tatuaje-stats">
                    <span class="stat-item">
                        <i class="fas fa-star" style="color: #ffd700;"></i>
                        ${promedioFinal.toFixed(1)}
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-thumbs-up" style="color: #ff6b6b;"></i>
                        ${totalVotos} guardados
                    </span>
                    <span class="stat-item">
                        <i class="fas fa-comment" style="color: #6c757d;"></i>
                        ${tatuaje.total_comentarios || 0}
                    </span>
                </div>
            </div>
            <div class="tatuaje-acciones-no-expandido">
                ${botonAccion}
            </div>
        </div>

        <!-- Contenido para la tarjeta expandida -->
        <div class="tatuaje-detalles">
            <div class="tatuaje-media-column">
                <img src="${imagenUrl}" alt="${tatuaje.titulo || 'Tatuaje'}"
                     onerror="this.src='/img/image.png'"
                     class="tatuaje-imagen-principal-expandida">
                <div class="tatuaje-carrusel">
                    <div class="carrusel-imagenes">
                        <!-- Las imágenes se cargarán dinámicamente aquí -->
                    </div>
                    <button class="carrusel-btn prev"><i class="fas fa-chevron-left"></i></button>
                    <button class="carrusel-btn next"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>

            <div class="tatuaje-content-column">
                <h2>${tatuaje.titulo || 'Sin título'}</h2>
                <p class="tatuaje-artista">${tatuaje.nombre_tatuador || 'Artista'}</p>
                <p class="tatuaje-descripcion">${tatuaje.descripcion || 'Sin descripción'}</p>
                <div class="tatuaje-valoracion">
                    <span>(${totalVotos} guardados)</span>
                </div>
                <div class="tatuaje-comentarios">
                    <h3>Comentarios</h3>
                    <div class="comentarios-lista" id="comentarios-${tatuaje.id_tatuaje}">
                        <!-- Los comentarios se cargarán dinámicamente -->
                    </div>
                    <form class="form-comentario" onsubmit="return false;">
                        <div class="valoracion-input">
                            <label>Tu valoración:</label>
                            <div class="estrellas-input">
                                ${[1, 2, 3, 4, 5].map(num => `
                                    <i class="far fa-star" data-valor="${num}"></i>
                                `).join('')}
                            </div>
                        </div>
                        <textarea placeholder="Escribe un comentario..." rows="2"></textarea>
                        <button type="submit">Comentar</button>
                    </form>
                </div>
                <div class="tatuaje-recomendaciones">
                    <h3>Otros tatuajes del artista</h3>
                    <div class="recomendaciones-grid" id="recomendaciones-${tatuaje.id_tatuaje}">
                        <!-- Las recomendaciones se cargarán dinámicamente -->
                    </div>
                </div>
            </div>
        </div>

        <button class="btn-cerrar" style="display: none;">
            <i class="fas fa-times"></i>
        </button>
    `

  // Agregar eventos
  const btnGuardar = card.querySelector('.btn-guardar')
  const btnEliminar = card.querySelector('.btn-eliminar')

  if (btnGuardar) {
    // Para la pestaña de guardados, el corazón debe aparecer como 'guardado'
    if (esGuardado) {
      btnGuardar.classList.add('guardado')
      btnGuardar.querySelector('i').style.color = '#ff6b6b'
    }
    btnGuardar.addEventListener('click', (e) => {
      e.stopPropagation()
      toggleGuardar(tatuaje.id_tatuaje, btnGuardar)
    })
  }

  if (btnEliminar) {
    btnEliminar.addEventListener('click', (e) => {
      e.stopPropagation()
      if (confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
        eliminarTatuaje(tatuaje.id_tatuaje)
      }
    })
  }

  // Evento de expansión
  card.addEventListener('click', async (e) => {
    // Prevenir la expansión si se hizo clic en un botón de acción
    if (e.target.closest('.btn-guardar') || e.target.closest('.btn-eliminar')) {
      return
    }

    // Si la tarjeta ya está expandida y el clic es dentro de los detalles expandidos, no hacer nada
    if (card.classList.contains('expanded') && e.target.closest('.tatuaje-detalles')) {
      return
    }

    if (!card.classList.contains('expanded')) {
      const tatuajeId = card.dataset.id
      if (!tatuajeId) {
        return
      }

      // Expandir la tarjeta
      card.classList.add('expanded')
      const overlay = document.querySelector('.overlay')
      if (overlay) {
        overlay.classList.add('active')
      }
      card.querySelector('.btn-cerrar').style.display = 'block'
      document.body.style.overflow = 'hidden'

      try {
        // Cargar comentarios, recomendaciones e información del usuario en paralelo
        const [infoComentario] = await Promise.all([
          cargarComentariosUsuario(tatuajeId),
          cargarComentarios(tatuajeId),
          cargarRecomendaciones(tatuajeId)
        ])

        // Configurar el formulario de comentarios con la información obtenida
        configurarFormularioComentarios(card, tatuajeId, infoComentario.haComentado, infoComentario.comentariosRestantes)

        const carruselElement = card.querySelector('.tatuaje-carrusel')

        try {
          // Obtener imágenes secundarias
          const res = await fetch(`/api/tatuajes/${tatuajeId}/imagenes`)
          const imagenesData = await res.json()

          if (imagenesData.exito && imagenesData.imagenes.length > 0) {
            const todasLasImagenes = [
              { url: imagenUrl },
              ...imagenesData.imagenes
            ]
            configurarCarrusel(card, todasLasImagenes)
            if (carruselElement) carruselElement.style.display = 'block'
          } else {
            // Si no hay imágenes secundarias, ocultar el carrusel
            if (carruselElement) carruselElement.style.display = 'none'
          }
        } catch (error) {
          console.error('Error al cargar imágenes del carrusel:', error)
          if (carruselElement) carruselElement.style.display = 'none'
        }
      } catch (error) {
        console.error('Error al cargar detalles:', error)
      }
    }
  })

  // Evento para cerrar tarjeta expandida
  const btnCerrar = card.querySelector('.btn-cerrar')
  btnCerrar.addEventListener('click', (e) => {
    e.stopPropagation()
    cerrarTarjeta(card)
  })

  // Evento para cerrar con overlay
  const overlay = document.querySelector('.overlay')
  if (overlay) {
    overlay.addEventListener('click', () => {
      const tarjetaExpandida = document.querySelector('.tatuaje-card.expanded')
      if (tarjetaExpandida) {
        cerrarTarjeta(tarjetaExpandida)
      }
    })
  }

  return card
}

async function cargarComentariosUsuario (tatuajeId) {
  try {
    const respuesta = await fetch(`/api/tatuajes/${tatuajeId}/comentarios-usuario`)

    if (!respuesta.ok) {
      throw new Error('Error al verificar el estado del comentario')
    }

    return await respuesta.json()
  } catch (error) {
    console.error('Error al cargar comentarios del usuario:', error)
  }
  return null
}

async function cargarComentarios (tatuajeId) {
  try {
    const response = await fetch(`/api/tatuajes/${tatuajeId}/comentarios`)
    if (response.ok) {
      const comentarios = await response.json()
      const comentariosContainer = document.getElementById(`comentarios-${tatuajeId}`)
      if (comentariosContainer) {
        if (comentarios.length === 0) {
          comentariosContainer.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No hay comentarios aún. ¡Sé el primero en comentar!</p>'
        } else {
          comentariosContainer.innerHTML = comentarios.map(comentario => {
            const fecha = comentario.fecha || comentario.fecha_comentario;
            const fechaValida = fecha && !isNaN(new Date(fecha));
            return `
                        <div class="comentario">
                            <div class="comentario-header">
                                <strong>${comentario.nombre_usuario}</strong>
                            </div>
                            <p>${comentario.comentario}</p>
                            <small>${fechaValida ? new Date(fecha).toLocaleDateString('es-ES') : ''}</small>
                        </div>
                    `
          }).join('')
        }
      }
    }
  } catch (error) {
    console.error('Error al cargar comentarios:', error)
  }
}

async function cargarRecomendaciones (tatuajeId) {
  try {
    const response = await fetch(`/api/tatuajes/${tatuajeId}/recomendaciones`)
    if (response.ok) {
      const recomendaciones = await response.json()
      const recomendacionesContainer = document.getElementById(`recomendaciones-${tatuajeId}`)
      if (recomendacionesContainer) {
        if (recomendaciones.length === 0) {
          recomendacionesContainer.innerHTML = '<p class="no-recomendaciones">No hay más tatuajes de este artista</p>'
        } else {
          recomendacionesContainer.innerHTML = recomendaciones.slice(0, 3).map(rec => `
                        <div class="tatuaje-recomendado" data-id="${rec.id_tatuaje}">
                            <img src="${rec.imagen_url}" alt="${rec.titulo}" onerror="this.src='/img/image.png'">
                            <div class="tatuaje-info">
                                <h4>${rec.titulo}</h4>
                                <p>${rec.nombre_tatuador}</p>
                            </div>
                        </div>
                    `).join('')
          // Agregar evento click a los recomendados para expandir la tarjeta
          const recomendados = recomendacionesContainer.querySelectorAll('.tatuaje-recomendado');
          recomendados.forEach(recDiv => {
            recDiv.addEventListener('click', (e) => {
              e.stopPropagation();
              const card = document.querySelector(`.tatuaje-card[data-id="${recDiv.dataset.id}"]`);
              if (card) {
                // Cerrar la tarjeta actual
                const tarjetaActual = document.querySelector('.tatuaje-card.expanded');
                if (tarjetaActual) {
                  cerrarTarjeta(tarjetaActual);
                }
                // Expandir la nueva tarjeta
                setTimeout(() => {
                  card.click();
                }, 300);
              } else {
                // Si no existe la tarjeta, redirigir a publicaciones.html con el id
                window.location.href = `publicaciones.html?id=${recDiv.dataset.id}`;
              }
            });
          });
        }
      }
    }
  } catch (error) {
    console.error('Error al cargar recomendaciones:', error)
    const recomendacionesContainer = document.getElementById(`recomendaciones-${tatuajeId}`)
    if (recomendacionesContainer) {
      recomendacionesContainer.innerHTML = '<p class="error-recomendaciones">Error al cargar recomendaciones</p>'
    }
  }
}

function configurarFormularioComentarios (card, tatuajeId, haComentado, comentariosRestantes) {
  const form = card.querySelector('.form-comentario')
  if (!form) return

  const mensajeExistente = card.querySelector('.mensaje-comentario')
  if (mensajeExistente) mensajeExistente.remove()

  // El usuario puede comentar si le quedan intentos
  const puedeComentar = comentariosRestantes > 0

  if (haComentado && !puedeComentar) {
    form.style.display = 'none'
    const mensaje = document.createElement('p')
    mensaje.className = 'mensaje-comentario'
    mensaje.textContent = 'Has alcanzado el límite de 3 comentarios para esta publicación.'
    form.insertAdjacentElement('afterend', mensaje)
  } else {
    form.style.display = 'block'

    const estrellasInput = form.querySelector('.estrellas-input')
    const textarea = form.querySelector('textarea')
    const submitButton = form.querySelector('button')
    let puntuacionSeleccionada = 0

    // Limpiar eventos y estado anterior
    const nuevasEstrellas = estrellasInput.cloneNode(true)
    estrellasInput.parentNode.replaceChild(nuevasEstrellas, estrellasInput)
    textarea.value = ''

    const estrellas = nuevasEstrellas.querySelectorAll('i')

    estrellas.forEach(estrella => {
      estrella.addEventListener('mouseover', () => {
        const valor = parseInt(estrella.dataset.valor)
        estrellas.forEach(e => {
          e.classList.toggle('fas', e.dataset.valor <= valor)
          e.classList.toggle('far', e.dataset.valor > valor)
        })
      })

      estrella.addEventListener('mouseout', () => {
        estrellas.forEach(e => {
          e.classList.toggle('fas', e.dataset.valor <= puntuacionSeleccionada)
          e.classList.toggle('far', e.dataset.valor > puntuacionSeleccionada)
        })
      })

      estrella.addEventListener('click', () => {
        puntuacionSeleccionada = parseInt(estrella.dataset.valor)
        estrellas.forEach(e => {
          e.classList.toggle('fas', e.dataset.valor <= puntuacionSeleccionada)
          e.classList.toggle('far', e.dataset.valor > puntuacionSeleccionada)
        })
      })
    })

    // Re-asociar el evento submit
    const nuevoBoton = submitButton.cloneNode(true)
    submitButton.parentNode.replaceChild(nuevoBoton, submitButton)

    nuevoBoton.addEventListener('click', async () => {
      const comentarioTexto = textarea.value.trim()

      if (!comentarioTexto) {
        alert('El comentario no puede estar vacío.')
        return
      }
      if (puntuacionSeleccionada === 0) {
        alert('Debes seleccionar una puntuación.')
        return
      }

      try {
        const response = await fetch(`/api/tatuajes/${tatuajeId}/comentar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            comentario: comentarioTexto,
            puntuacion: puntuacionSeleccionada
          })
        })

        const resultado = await response.json()

        if (!response.ok) {
          throw new Error(resultado.mensaje || 'Error al enviar el comentario')
        }

        alert('Comentario agregado con éxito.')
        textarea.value = ''
        puntuacionSeleccionada = 0
        estrellas.forEach(e => e.classList.replace('fas', 'far'))

        // Volver a cargar los comentarios y re-configurar el formulario
        await cargarComentarios(tatuajeId)
        const nuevoInfo = await cargarComentariosUsuario(tatuajeId)
        configurarFormularioComentarios(card, tatuajeId, nuevoInfo.haComentado, nuevoInfo.comentariosRestantes)
      } catch (error) {
        console.error('Error al enviar comentario:', error)
        alert(`Error: ${error.message}`)
      }
    })
  }
}

async function toggleGuardar (tatuajeId, boton) {
  try {
    const response = await fetch(`/api/tatuajes/${tatuajeId}/guardar`, {
      method: 'POST',
      credentials: 'include'
    })

    if (response.ok) {
      const data = await response.json()
      if (data.guardado) {
        boton.classList.add('guardado')
        boton.querySelector('i').style.color = '#ff6b6b'
      } else {
        boton.classList.remove('guardado')
        boton.querySelector('i').style.color = ''
      }
    }
  } catch (error) {
    console.error('Error al guardar:', error)
  }
}

function cerrarTarjeta (card) {
  card.classList.remove('expanded')
  const overlay = document.querySelector('.overlay')
  if (overlay) {
    overlay.classList.remove('active')
  }
  card.querySelector('.btn-cerrar').style.display = 'none'
  document.body.style.overflow = ''
}

async function eliminarTatuaje (tatuajeId) {
  try {
    const response = await fetch(`/api/tatuajes/${tatuajeId}`, {
      method: 'DELETE',
      credentials: 'include'
    })

    if (response.ok) {
      // Remover la tarjeta del DOM
      const card = document.querySelector(`[data-id="${tatuajeId}"]`)
      if (card) {
        card.remove()
      }

      // Actualizar contador
      const numPublicaciones = document.getElementById('num-publicaciones')
      const currentCount = parseInt(numPublicaciones.textContent)
      numPublicaciones.textContent = currentCount - 1

      alert('Publicación eliminada con éxito')
    } else {
      alert('Error al eliminar la publicación')
    }
  } catch (error) {
    console.error('Error al eliminar tatuaje:', error)
    alert('Error al eliminar la publicación')
  }
}

function configurarBotonesAccion () {
  const btnPublicar = document.getElementById('btn-publicar')
  const btnConfiguracion = document.getElementById('btn-configuracion')
  const btnSalir = document.getElementById('btn-salir')

  if (btnPublicar) {
    btnPublicar.addEventListener('click', () => {
      window.location.href = 'publicar.html'
    })
  }

  if (btnConfiguracion) {
    btnConfiguracion.addEventListener('click', () => {
      window.location.href = 'configuracion.html'
    })
  }

  if (btnSalir) {
    btnSalir.addEventListener('click', async () => {
      try {
        const response = await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include'
        })

        if (response.ok) {
          sessionStorage.removeItem('usuarioActual')
          window.location.href = '/index.html'
        }
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
      }
    })
  }
}

function mostrarError (mensaje) {
  console.error(mensaje)
  // Aquí podrías mostrar un mensaje de error en la interfaz
}

function configurarCarrusel (cardElement, imagenes) {
  const imagenPrincipal = cardElement.querySelector('.tatuaje-imagen-principal-expandida')
  const carruselContainer = cardElement.querySelector('.carrusel-imagenes')
  const prevBtn = cardElement.querySelector('.carrusel-btn.prev')
  const nextBtn = cardElement.querySelector('.carrusel-btn.next')

  let currentIndex = 0

  // Limpiar carrusel previo
  if (carruselContainer) {
    carruselContainer.innerHTML = ''
  }

  // Crear miniaturas
  imagenes.forEach((imagen, index) => {
    const miniContainer = document.createElement('div')
    miniContainer.className = 'carrusel-miniatura-container'

    const img = document.createElement('img')
    img.src = imagen.url
    img.alt = `Imagen ${index + 1}`
    img.className = 'carrusel-miniatura'
    if (index === 0) {
      img.classList.add('active')
    }

    img.addEventListener('click', () => {
      currentIndex = index
      showImage(currentIndex)
    })

    miniContainer.appendChild(img)
    if (carruselContainer) {
      carruselContainer.appendChild(miniContainer)
    }
  })

  function showImage (index) {
    // Actualizar imagen principal
    imagenPrincipal.src = imagenes[index].url

    // Actualizar la clase 'active' en las miniaturas
    const miniaturas = carruselContainer.querySelectorAll('.carrusel-miniatura')
    miniaturas.forEach((min, i) => {
      min.classList.toggle('active', i === index)
    })

    // Opcional: centrar la miniatura activa
    if (carruselContainer) {
      const miniaturaActiva = carruselContainer.querySelector('.carrusel-miniatura.active')
      if (miniaturaActiva) {
        const containerRect = carruselContainer.getBoundingClientRect()
        const thumbRect = miniaturaActiva.parentElement.getBoundingClientRect()

        carruselContainer.scrollLeft += thumbRect.left - containerRect.left - (containerRect.width / 2) + (thumbRect.width / 2)
      }
    }
  }

  prevBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    currentIndex = (currentIndex > 0) ? currentIndex - 1 : imagenes.length - 1
    showImage(currentIndex)
  })

  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    currentIndex = (currentIndex < imagenes.length - 1) ? currentIndex + 1 : 0
    showImage(currentIndex)
  })

  // Mostrar la primera imagen
  showImage(0)
}
