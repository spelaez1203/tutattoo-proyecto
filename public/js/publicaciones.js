document.addEventListener('DOMContentLoaded', () => {
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
  const gridPublicaciones = document.getElementById('grid-publicaciones')
  const header = document.getElementById('encabezado')

  // Crear overlay para el fondo oscuro
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  document.body.appendChild(overlay)

  // --- NUEVO: abrir modal si hay id en la URL ---
  function abrirModalPorIdSiExiste() {
    const params = new URLSearchParams(window.location.search)
    const idTatuaje = params.get('id')
    if (idTatuaje) {
      // Esperar a que las tarjetas estén en el DOM
      setTimeout(() => {
        const card = document.querySelector(`.tatuaje-card[data-id="${idTatuaje}"]`)
        if (card) {
          card.click()
        }
      }, 300)
    }
  }

  async function cargarPublicaciones () {
    try {
      const respuesta = await fetch('/api/tatuajes/todas')
      if (!respuesta.ok) throw new Error('Error al cargar publicaciones')

      const publicaciones = await respuesta.json()

      // Limpiar grid
      gridPublicaciones.innerHTML = ''

      publicaciones.forEach(pub => {
        const card = crearTatuajeCard(pub)
        if (card) {
          gridPublicaciones.appendChild(card)
        }
      })
      // Intentar abrir el modal si hay id en la URL
      abrirModalPorIdSiExiste()
    } catch (error) {
      console.error('Error completo:', error)
      gridPublicaciones.innerHTML = '<p style="text-align: center; color: #666; font-size: 1.2rem;">Error al cargar las publicaciones. Intente más tarde.</p>'
    }
  }

  function crearTatuajeCard (tatuaje) {
    if (!tatuaje || !tatuaje.id_tatuaje) {
      // console.error('Tatuaje inválido:', tatuaje);
      return null
    }

    // Convertir valores a números usando los nuevos campos
    const promedioFinal = parseFloat(tatuaje.promedio_final) || 0
    const totalGuardados = parseInt(tatuaje.total_guardados) || 0

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
                            <i class="fas fa-star"></i>
                            ${promedioFinal.toFixed(1)}
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-thumbs-up"></i>
                            ${totalGuardados} guardados
                        </span>
                        <span class="stat-item">
                            <i class="fas fa-comment"></i>
                            ${tatuaje.total_comentarios || 0}
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

    // Si el usuario es admin, agregar el botón de eliminar
    if (usuarioActual && usuarioActual.rol === 'admin') {
      const deleteButton = document.createElement('button')
      deleteButton.className = 'btn-eliminar-admin'
      deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>'
      deleteButton.dataset.id = tatuaje.id_tatuaje

      deleteButton.addEventListener('click', async (e) => {
        e.stopPropagation()
        const idTatuaje = e.currentTarget.dataset.id

        const confirmacion = confirm('¿Estás seguro de que quieres eliminar esta publicación? Esta acción es irreversible.')

        if (confirmacion) {
          const razon = prompt('Por favor, introduce la razón de la eliminación:')
          if (razon) {
            try {
              const response = await fetch(`/api/tatuajes/${idTatuaje}`, {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ razon })
              })

              const resultado = await response.json()

              if (resultado.exito) {
                alert('Publicación eliminada correctamente.')
                card.remove() // Eliminar la tarjeta de la vista
              } else {
                alert(`Error: ${resultado.mensaje}`)
              }
            } catch (error) {
              console.error('Error al eliminar:', error)
              alert('Error de conexión al intentar eliminar la publicación.')
            }
          } else {
            alert('La eliminación fue cancelada porque no se proporcionó una razón.')
          }
        }
      })

      const accionesContainer = card.querySelector('.tatuaje-acciones-no-expandido')
      if (accionesContainer) {
        accionesContainer.appendChild(deleteButton)
      }

      const btnGuardar = card.querySelector('.btn-guardar')
      if (btnGuardar) {
        btnGuardar.style.right = '60px'
      }
    }

    // Agregar eventos
    const btnGuardar = card.querySelector('.btn-guardar')
    if (btnGuardar) {
      // Verificar estado inicial de guardado
      verificarEstadoGuardado(tatuaje.id_tatuaje, btnGuardar)

      btnGuardar.addEventListener('click', (e) => {
        e.stopPropagation()
        toggleGuardar(tatuaje.id_tatuaje, btnGuardar)
      })
    }

    // Evento de expansión
    card.addEventListener('click', async (e) => {
      // Prevenir la expansión si se hizo clic en un botón de acción
      if (e.target.closest('.btn-guardar')) {
        return
      }

      // Si la tarjeta ya está expandida y el clic es dentro de los detalles expandidos, no hacer nada
      if (card.classList.contains('expanded') && e.target.closest('.tatuaje-detalles')) {
        return
      }

      if (!card.classList.contains('expanded')) {
        const tatuajeId = card.dataset.id
        if (!tatuajeId) {
          // console.error('ID de tatuaje no encontrado');
          return
        }

        // Expandir la tarjeta
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

          const carruselElement = card.querySelector('.tatuaje-carrusel')

          // Unificar la lógica para el carrusel
          const imagenesSecundarias = (tatuaje.imagenes_secundarias || []).map(url => ({ url }))
          const todasLasImagenes = [{ url: tatuaje.imagen_url }, ...imagenesSecundarias]

          if (todasLasImagenes.length > 1) {
            configurarCarrusel(card, todasLasImagenes)
            if (carruselElement) carruselElement.style.display = 'block'
          } else {
            if (carruselElement) carruselElement.style.display = 'none'
          }

          // Configurar formulario de comentarios
          configurarFormularioComentarios(card, tatuajeId, infoComentario.haComentado, infoComentario.comentariosRestantes)
        } catch (error) {
          console.error('Error al cargar detalles del tatuaje:', error)
        }
      }
    })

    // Evento para cerrar
    const btnCerrar = card.querySelector('.btn-cerrar')
    btnCerrar.addEventListener('click', (e) => {
      e.stopPropagation()
      cerrarTarjeta(card)
    })

    return card
  }

  async function cargarComentariosUsuario (tatuajeId) {
    // Si no hay usuario, no se puede verificar si ha comentado
    if (!usuarioActual) {
      return { haComentado: false, comentariosRestantes: 0 }
    }

    try {
      const respuesta = await fetch(`/api/tatuajes/${tatuajeId}/comentarios-usuario`)

      if (!respuesta.ok) {
        throw new Error('Error al verificar el estado del comentario')
      }

      return await respuesta.json()
    } catch (error) {
      console.error('Error al cargar comentarios del usuario:', error)
      // En caso de error, asumimos que no ha comentado para no bloquear la UI
      return { haComentado: false, comentariosRestantes: 0 }
    }
  }

  async function cargarComentarios (tatuajeId) {
    const comentariosLista = document.getElementById(`comentarios-${tatuajeId}`)
    if (!comentariosLista) return

    // Limpiar comentarios previos antes de renderizar
    comentariosLista.innerHTML = '';

    try {
      const respuesta = await fetch(`/api/tatuajes/${tatuajeId}/comentarios`)

      if (!respuesta.ok) {
        // Leer el cuerpo de la respuesta para obtener el mensaje de error del servidor
        const errorData = await respuesta.json().catch(() => ({ mensaje: 'Error desconocido en el servidor' }))
        console.error('Error del servidor:', errorData)
        throw new Error(`Error al cargar comentarios: ${errorData.mensaje || respuesta.statusText}`)
      }

      const comentarios = await respuesta.json()

      if (comentarios.length === 0) {
        comentariosLista.innerHTML = '<p style="text-align: center; color: #666; font-style: italic;">No hay comentarios aún. ¡Sé el primero en comentar!</p>'
      } else {
        comentarios.forEach(comentario => {
          const comentarioElement = document.createElement('div')
          comentarioElement.classList.add('comentario')
          const fecha = comentario.fecha || comentario.fecha_comentario;
          const fechaValida = fecha && !isNaN(new Date(fecha));
          comentarioElement.innerHTML = `
                        <p><strong>${comentario.nombre_usuario}:</strong> ${comentario.comentario}</p>
                        <small>${fechaValida ? new Date(fecha).toLocaleDateString('es-ES') : ''}</small>
                    `
          comentariosLista.appendChild(comentarioElement)
        })
      }
    } catch (error) {
      console.error('Error al cargar comentarios:', error)
      if (comentariosLista) {
        comentariosLista.innerHTML = '<p>Error al cargar comentarios. Intente más tarde.</p>'
      }
    }
  }

  async function cargarRecomendaciones (tatuajeId) {
    if (!tatuajeId) {
      // console.error('ID de tatuaje no proporcionado para cargar recomendaciones');
      return
    }

    const contenedor = document.getElementById(`recomendaciones-${tatuajeId}`)
    if (!contenedor) {
      // console.error(`Contenedor de recomendaciones no encontrado para tatuaje ${tatuajeId}`);
      return
    }

    try {
      const response = await fetch(`/api/tatuajes/${tatuajeId}/recomendaciones`)
      if (!response.ok) {
        throw new Error(`Error al cargar recomendaciones: ${response.status}`)
      }

      const recomendaciones = await response.json()

      if (!Array.isArray(recomendaciones)) {
        throw new Error('Formato de respuesta inválido para recomendaciones')
      }

      if (recomendaciones.length === 0) {
        contenedor.innerHTML = '<p class="no-recomendaciones">No hay más tatuajes de este artista</p>'
        return
      }

      contenedor.innerHTML = recomendaciones.map(tatuaje => `
                <div class="tatuaje-recomendado" data-id="${tatuaje.id_tatuaje}">
                    <img src="${tatuaje.imagen_url || '/img/image.png'}" alt="${tatuaje.titulo || 'Tatuaje'}" 
                         onerror="this.src='/img/image.png'">
                </div>
            `).join('')

      // Agregar eventos a las recomendaciones
      contenedor.querySelectorAll('.tatuaje-recomendado').forEach(rec => {
        rec.addEventListener('click', (e) => {
          e.stopPropagation() // Prevenir la propagación del evento
          const card = document.querySelector(`.tatuaje-card[data-id="${rec.dataset.id}"]`)
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
          }
        })
      })
    } catch (error) {
      console.error('Error al cargar recomendaciones:', error)
      contenedor.innerHTML = '<p class="error-recomendaciones">Error al cargar las recomendaciones. Por favor, intenta de nuevo más tarde.</p>'
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
    if (!usuarioActual) {
      alert('Debes iniciar sesión para guardar tatuajes')
      return
    }

    try {
      const response = await fetch(`/api/tatuajes/${tatuajeId}/guardar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Error al guardar/quitar tatuaje')

      const data = await response.json()

      if (data.guardado) {
        boton.classList.add('guardado')
        boton.querySelector('i').style.color = '#ff4757'
      } else {
        boton.classList.remove('guardado')
        boton.querySelector('i').style.color = '#ff6b6b'
      }
    } catch (error) {
      console.error('Error al guardar/quitar tatuaje:', error)
      alert('Error al actualizar el estado de guardado.')
    }
  }

  function cerrarTarjeta (card) {
    card.classList.remove('expanded')
    overlay.classList.remove('active')
    card.querySelector('.btn-cerrar').style.display = 'none'
    document.body.style.overflow = 'auto'
  }

  function configurarCarrusel (cardElement, imagenes) {
    const imagenPrincipal = cardElement.querySelector('.tatuaje-imagen-principal-expandida')
    const carruselContainer = cardElement.querySelector('.carrusel-imagenes')
    const prevBtn = cardElement.querySelector('.carrusel-btn.prev')
    const nextBtn = cardElement.querySelector('.carrusel-btn.next')

    let currentIndex = 0

    if (!imagenPrincipal || !carruselContainer || !prevBtn || !nextBtn) {
      console.error('Elementos del carrusel no encontrados')
      return
    }

    // Limpiar carrusel previo
    carruselContainer.innerHTML = ''

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

      img.addEventListener('click', (e) => {
        e.stopPropagation()
        currentIndex = index
        showImage(currentIndex)
      })

      miniContainer.appendChild(img)
      carruselContainer.appendChild(miniContainer)
    })

    function showImage (index) {
      imagenPrincipal.src = imagenes[index].url

      const miniaturas = carruselContainer.querySelectorAll('.carrusel-miniatura')
      miniaturas.forEach((min, i) => {
        min.classList.toggle('active', i === index)
      })

      const miniaturaActiva = carruselContainer.querySelector('.carrusel-miniatura.active')
      if (miniaturaActiva) {
        const containerRect = carruselContainer.getBoundingClientRect()
        const thumbRect = miniaturaActiva.parentElement.getBoundingClientRect()

        carruselContainer.scrollLeft += thumbRect.left - containerRect.left - (containerRect.width / 2) + (thumbRect.width / 2)
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

    showImage(0)
  }

  // Cerrar tarjeta al hacer clic en el overlay
  overlay.addEventListener('click', () => {
    const tarjetaExpandida = document.querySelector('.tatuaje-card.expanded')
    if (tarjetaExpandida) {
      cerrarTarjeta(tarjetaExpandida)
    }
  })

  // Lógica de búsqueda
  const searchInput = document.getElementById('search-input')
  const searchIcon = document.getElementById('search-icon')

  searchIcon.addEventListener('click', () => {
    searchInput.style.display = searchInput.style.display === 'none' || searchInput.style.display === '' ? 'block' : 'none'
    searchInput.focus()
    searchIcon.style.display = searchInput.style.display === 'block' ? 'none' : 'block'
  })

  searchInput.addEventListener('input', () => {
    const searchTerm = searchInput.value.toLowerCase()
    const cards = gridPublicaciones.getElementsByClassName('tatuaje-card')

    Array.from(cards).forEach(card => {
      const title = card.querySelector('.tatuaje-titulo').textContent.toLowerCase()
      const description = card.querySelector('.tatuaje-artista').textContent.toLowerCase()

      const matches = title.includes(searchTerm) || description.includes(searchTerm)
      card.style.display = matches ? 'block' : 'none'
    })
  })

  // Cambiar el fondo del header al hacer scroll
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 10)
  })

  // Cargar publicaciones al inicio
  cargarPublicaciones()

  // Función para verificar si un tatuaje está guardado
  async function verificarEstadoGuardado (tatuajeId, boton) {
    if (!usuarioActual) return

    try {
      const response = await fetch(`/api/tatuajes/${tatuajeId}/guardado`, {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        if (data.guardado) {
          boton.classList.add('guardado')
          boton.querySelector('i').style.color = '#ff4757'
        } else {
          boton.classList.remove('guardado')
          boton.querySelector('i').style.color = '#ff6b6b'
        }
      }
    } catch (error) {
      console.error('Error al verificar estado de guardado:', error)
    }
  }
})
