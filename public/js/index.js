document.addEventListener('DOMContentLoaded', async () => {
  const btnLogin = document.querySelector('.btn a')
  const opcionesUsuario = document.querySelector('.opciones-usuario')
  const btnSalir = document.getElementById('btn-salir')
  const btnPublicar = document.getElementById('btn-publicar')
  const btnConfiguracion = document.getElementById('btn-configuracion')
  const btnPerfil = document.getElementById('btn-perfil')
  const itemSolicitudes = document.getElementById('item-solicitudes')
  const publicacionesContainer = document.getElementById('publicaciones-container')
  const header = document.getElementById('encabezado')

  // Variables para el sistema de votación
  let usuarioActual = null
  let publicaciones = []

  // Crear overlay para el fondo oscuro
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  document.body.appendChild(overlay)

  // Efecto scroll header
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10)
  })

  // Verificar estado de autenticación
  try {
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

    if (data.isAuthenticated && data.user) {
      // Guardar usuario en sessionStorage
      sessionStorage.setItem('usuarioActual', JSON.stringify(data.user))
      usuarioActual = data.user

      // Actualizar interfaz
      btnLogin.textContent = data.user.nombre
      btnLogin.style.display = 'inline-block'
      btnLogin.style.cursor = 'pointer'
      btnLogin.removeAttribute('href')
      btnLogin.classList.add('nombre-usuario')

      // Mostrar menú al hacer clic en el botón
      btnLogin.addEventListener('click', (e) => {
        e.preventDefault()
        opcionesUsuario.classList.toggle('mostrar')
      })

      // Mostrar/Ocultar opciones según rol
      if (data.user.rol === 'admin' || data.user.rol === 'ADMINISTRADOR') {
        if (itemSolicitudes) itemSolicitudes.style.display = 'block'
      } else {
        if (itemSolicitudes) itemSolicitudes.style.display = 'none'
      }
      if (btnPublicar) btnPublicar.style.display = data.user.rol === 'tatuador' ? 'block' : 'none'
    } else {
      // Usuario no autenticado
      sessionStorage.removeItem('usuarioActual')
      btnLogin.textContent = 'Iniciar Sesión'
      btnLogin.style.display = 'inline-block'
      btnLogin.setAttribute('href', 'login.html')
      btnLogin.classList.remove('nombre-usuario')
      if (itemSolicitudes) itemSolicitudes.style.display = 'none'
      if (btnPublicar) btnPublicar.style.display = 'none'
    }
  } catch (error) {
    console.error('Error al verificar autenticación:', error)
    // En caso de error, mostrar como no autenticado
    sessionStorage.removeItem('usuarioActual')
    btnLogin.textContent = 'Iniciar Sesión'
    btnLogin.style.display = 'inline-block'
    btnLogin.setAttribute('href', 'login.html')
    btnLogin.classList.remove('nombre-usuario')
  }

  // Cargar publicaciones más votadas de la semana
  async function cargarPublicacionesDestacadas () {
    try {
      if (publicacionesContainer) {
        publicacionesContainer.innerHTML = '<div class="cargando">Cargando publicaciones...</div>'

        const response = await fetch('/api/tatuajes/mas-votadas-semana')
        if (!response.ok) {
          throw new Error('Error al cargar publicaciones')
        }

        publicaciones = await response.json()

        // Limitar a 6 publicaciones
        publicaciones = publicaciones.slice(0, 6)

        if (publicaciones.length === 0) {
          publicacionesContainer.innerHTML = '<div class="cargando">No hay publicaciones destacadas esta semana</div>'
          return
        }

        publicacionesContainer.innerHTML = ''

        publicaciones.forEach(pub => {
          const card = crearTatuajeCard(pub)
          if (card) {
            publicacionesContainer.appendChild(card)
          }
        })
      }
    } catch (error) {
      console.error('Error al cargar publicaciones:', error)
      if (publicacionesContainer) {
        publicacionesContainer.innerHTML = '<div class="cargando">Error al cargar las publicaciones</div>'
      }
    }
  }

  function crearTatuajeCard (tatuaje) {
    if (!tatuaje || !tatuaje.id_tatuaje) {
      return null
    }

    // Convertir valores a números usando los nuevos campos
    const promedioFinal = parseFloat(tatuaje.promedio_final) || 0
    const totalGuardados = parseInt(tatuaje.total_guardados) || 0
    const totalComentarios = parseInt(tatuaje.total_comentarios) || 0

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
                            ${totalGuardados} guardados
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-comment" style="color: #6c757d;"></i>
                            ${totalComentarios}
                        </span>
                    </div>
                </div>
                <div class="tatuaje-acciones-no-expandido">
                    ${usuarioActual
? `
                        <button class="btn-guardar" data-id="${tatuaje.id_tatuaje}">
                            <i class="fas fa-heart"></i>
                        </button>
                    `
: ''}
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
                        <span>(${totalGuardados} guardados)</span>
                    </div>
                    <div class="tatuaje-comentarios">
                        <h3>Comentarios</h3>
                        <div class="comentarios-lista" id="comentarios-${tatuaje.id_tatuaje}">
                            <!-- Los comentarios se cargarán dinámicamente -->
                        </div>
                        ${usuarioActual
? `
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
                        `
: `
                            <p style="text-align: center; color: #666; font-style: italic;">
                                <a href="login.html" style="color: #ff6b6b;">Inicia sesión</a> para comentar
                            </p>
                        `}
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
    if (btnGuardar) {
      // Verificar estado inicial de guardado
      // verificarEstadoGuardado(tatuaje.id_tatuaje, btnGuardar);

      btnGuardar.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleGuardar(tatuaje.id_tatuaje, btnGuardar)
      })
    }

    // Evento de expansión
    card.addEventListener('click', async (e) => {
      if (e.target.closest('.btn-guardar')) {
        return
      }

      if (card.classList.contains('expanded')) {
        return
      }

      const tatuajeId = card.dataset.id
      if (!tatuajeId) {
        return
      }

      card.classList.add('expanded')
      overlay.classList.add('active')
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
        if (!infoComentario) {
          // Si no hay infoComentario, asumimos que no puede comentar
          configurarFormularioComentarios(card, tatuajeId, false, 0)
        } else if (infoComentario.noAutenticado) {
          // Si el usuario no está autenticado, mostrar mensaje especial
          const comentariosLista = card.querySelector('.comentarios-lista')
          if (comentariosLista) {
            comentariosLista.innerHTML += '<p style="text-align: center; color: #666; font-style: italic;">Inicia sesión para comentar.</p>'
          }
          configurarFormularioComentarios(card, tatuajeId, false, 0)
        } else {
          configurarFormularioComentarios(card, tatuajeId, infoComentario.haComentado, infoComentario.comentariosRestantes)
        }

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
        console.error('Error al expandir la tarjeta:', error)
      }
    })

    // Evento para cerrar tarjeta expandida
    const btnCerrar = card.querySelector('.btn-cerrar')
    btnCerrar.addEventListener('click', (e) => {
      e.stopPropagation()
      cerrarTarjeta(card)
    })

    // Evento para cerrar con overlay
    overlay.addEventListener('click', () => {
      const tarjetaExpandida = document.querySelector('.tatuaje-card.expanded')
      if (tarjetaExpandida) {
        cerrarTarjeta(tarjetaExpandida)
      }
    })

    return card
  }

  async function cargarComentariosUsuario (tatuajeId) {
    try {
      const respuesta = await fetch(`/api/tatuajes/${tatuajeId}/comentarios-usuario`)

      if (respuesta.status === 401) {
        // Usuario no autenticado
        return { haComentado: false, comentariosRestantes: 0, noAutenticado: true }
      }

      if (!respuesta.ok) {
        throw new Error('Error al verificar el estado del comentario')
      }

      return await respuesta.json()
    } catch (error) {
      console.error('Error al cargar comentarios del usuario:', error)
      // En caso de error, asumimos que no ha comentado para no bloquear la UI
      return { haComentado: false, comentariosRestantes: 0, error: true }
    }
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
            // Agregar evento para abrir el modal al hacer click en la recomendación
            recomendacionesContainer.querySelectorAll('.tatuaje-recomendado').forEach(recDiv => {
              recDiv.addEventListener('click', (e) => {
                e.stopPropagation()
                const card = document.querySelector(`.tatuaje-card[data-id="${recDiv.dataset.id}"]`)
                if (card) {
                  // Cerrar la tarjeta actual
                  const tarjetaActual = document.querySelector('.tatuaje-card.expanded')
                  if (tarjetaActual) {
                    cerrarTarjeta(tarjetaActual)
                  }
                  // Expandir la nueva tarjeta
                  setTimeout(() => {
                    card.click()
                  }, 300)
                } else {
                  // Si no existe la tarjeta, redirigir a publicaciones.html con el id
                  window.location.href = `publicaciones.html?id=${recDiv.dataset.id}`
                }
              })
            })
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
    overlay.classList.remove('active')
    card.querySelector('.btn-cerrar').style.display = 'none'
    document.body.style.overflow = ''
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

  // Event listeners para navegación
  if (btnSalir) {
    btnSalir.addEventListener('click', async () => {
      try {
        console.log('Intentando cerrar sesión...')
        const response = await fetch('/auth/logout', {
          method: 'POST',
          credentials: 'include'
        })

        console.log('Respuesta del servidor:', response.status)

        if (response.ok) {
          console.log('Sesión cerrada exitosamente')
          sessionStorage.removeItem('usuarioActual')
          localStorage.removeItem('usuarioActual')
          window.location.href = '/index.html'
        } else {
          console.error('Error en la respuesta del servidor:', response.status)
          // Intentar limpiar localmente y redirigir
          sessionStorage.removeItem('usuarioActual')
          localStorage.removeItem('usuarioActual')
          window.location.href = '/index.html'
        }
      } catch (error) {
        console.error('Error al cerrar sesión:', error)
        // En caso de error, limpiar localmente y redirigir
        sessionStorage.removeItem('usuarioActual')
        localStorage.removeItem('usuarioActual')
        window.location.href = '/index.html'
      }
    })
  } else {
    console.error('Botón de salir no encontrado')
  }

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

  if (btnPerfil) {
    btnPerfil.addEventListener('click', () => {
      window.location.href = 'perfil.html'
    })
  }

  // Cargar publicaciones al inicio
  cargarPublicacionesDestacadas()
})
