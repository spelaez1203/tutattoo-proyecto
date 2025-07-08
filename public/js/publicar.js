document.addEventListener('DOMContentLoaded', async () => {
  const formPublicar = document.getElementById('formPublicar')
  const uploadPrincipal = document.getElementById('uploadPrincipal')
  const uploadAdicionales = document.getElementById('uploadAdicionales')
  const previewPrincipal = document.getElementById('previewPrincipal')
  const previewAdicionales = document.getElementById('previewAdicionales')
  const imagenPrincipal = document.getElementById('imagenPrincipal')
  const imagenesAdicionales = document.getElementById('imagenesAdicionales')

  // Array para almacenar las imágenes adicionales seleccionadas
  const selectedAdditionalFiles = []
  let selectedPrincipalFile = null // Variable para la imagen principal

  // Verificar si el usuario está autenticado
  const usuarioActual = JSON.parse(sessionStorage.getItem('usuarioActual'))
  if (!usuarioActual) {
    alert('Debes iniciar sesión para publicar tatuajes')
    window.location.href = 'login.html'
    return
  }

  // Verificar si el usuario es tatuador
  if (usuarioActual.rol !== 'tatuador') {
    alert('Solo los tatuadores pueden publicar tatuajes')
    window.location.href = 'index.html'
    return
  }

  // Verificar y sincronizar estado del tatuador
  try {
    const response = await fetch('/api/tatuajes/verificar-estado', {
      credentials: 'include'
    })
    const data = await response.json()

    if (!data.exito) {
      alert(data.mensaje || 'Error al verificar tu estado como tatuador')
      window.location.href = 'index.html'
      return
    }

    // Actualizar la sesión con el id_tatuador
    usuarioActual.id_tatuador = data.id_tatuador
    sessionStorage.setItem('usuarioActual', JSON.stringify(usuarioActual))
  } catch (error) {
    console.error('Error al verificar estado:', error)
    alert('Error al verificar tu estado como tatuador')
    window.location.href = 'index.html'
    return
  }

  // Configuración de drag & drop
  [uploadPrincipal, uploadAdicionales].forEach(area => {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, preventDefaults, false)
    })

    function preventDefaults (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    ['dragenter', 'dragover'].forEach(eventName => {
      area.addEventListener(eventName, highlight, false)
    });

    ['dragleave', 'drop'].forEach(eventName => {
      area.addEventListener(eventName, unhighlight, false)
    })

    function highlight (e) {
      area.classList.add('highlight')
    }

    function unhighlight (e) {
      area.classList.remove('highlight')
    }

    area.addEventListener('drop', handleDrop, false)
  })

  function handleDrop (e) {
    const dt = e.dataTransfer
    const files = dt.files
    const isPrincipal = e.target.id === 'uploadPrincipal' || e.target.closest('#uploadPrincipal')

    if (isPrincipal) {
      handleFiles(files, true)
    } else {
      filterAndAddFiles(files)
    }
  }

  // Manejo de archivos seleccionados
  imagenPrincipal.addEventListener('change', (e) => {
    handleFiles(e.target.files, true)
  })

  imagenesAdicionales.addEventListener('change', (e) => {
    filterAndAddFiles(e.target.files)
    // Limpiar el input para permitir volver a seleccionar los mismos archivos
    e.target.value = ''
  })

  function filterAndAddFiles (files) {
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    Array.from(files).forEach(file => {
      if (!allowedTypes.includes(file.type)) {
        mostrarError(`Tipo de archivo no permitido: ${file.name}. Solo JPG, PNG, WEBP.`)
        return
      }
      if (file.size > maxSize) {
        mostrarError(`La imagen ${file.name} supera los 5MB.`)
        return
      }
      selectedAdditionalFiles.push(file)
    })

    updateAdditionalPreviews()
  }

  // Nueva función para actualizar las previsualizaciones de imágenes adicionales
  function updateAdditionalPreviews () {
    const previewContainer = previewAdicionales
    previewContainer.innerHTML = '' // Limpiar las previsualizaciones existentes

    selectedAdditionalFiles.forEach(file => {
      if (!(file instanceof File)) {
        console.error('Se intentó procesar un objeto que no es un archivo:', file)
        return
      }

      const reader = new FileReader()

      reader.onload = (e) => {
        const previewItem = document.createElement('div')
        previewItem.className = 'preview-item'

        const img = document.createElement('img')
        img.src = e.target.result

        const removeBtn = document.createElement('button')
        removeBtn.className = 'remove-image'
        removeBtn.innerHTML = '×'
        removeBtn.onclick = () => {
          const fileIndex = selectedAdditionalFiles.indexOf(file)
          if (fileIndex > -1) {
            selectedAdditionalFiles.splice(fileIndex, 1)
            updateAdditionalPreviews()
          }
        }

        previewItem.appendChild(img)
        previewItem.appendChild(removeBtn)
        previewContainer.appendChild(previewItem)
      }

      reader.onerror = () => {
        console.error(`Error al leer el archivo: ${file.name}`)
        const errorItem = document.createElement('div')
        errorItem.className = 'preview-item error'
        errorItem.textContent = `Error al cargar ${file.name}`
        previewContainer.appendChild(errorItem)
      }

      reader.readAsDataURL(file)
    })
  }

  // Modificar handleFiles para que solo maneje la imagen principal si isPrincipal es true
  function handleFiles (files, isPrincipal) {
    const previewContainer = isPrincipal ? previewPrincipal : previewAdicionales
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    // Limpiar preview si es imagen principal
    if (isPrincipal) {
      previewContainer.innerHTML = ''
      // Asegurarse de que solo haya un archivo principal
      if (files.length > 0) {
        const file = files[0]
        if (!allowedTypes.includes(file.type)) {
          mostrarError('Solo se permiten imágenes en formato JPG, PNG o WEBP')
          return
        }
        if (file.size > maxSize) {
          mostrarError('La imagen no debe superar los 5MB')
          return
        }

        selectedPrincipalFile = file // Guardar el archivo en la variable

        const reader = new FileReader()
        reader.onload = (e) => {
          const previewItem = document.createElement('div')
          previewItem.className = 'preview-item'
          const img = document.createElement('img')
          img.src = e.target.result
          previewItem.appendChild(img)
          previewContainer.appendChild(previewItem)
        }
        reader.readAsDataURL(file)
      }
    } else {
      // Esta rama ya no debería ser usada directamente por handleDrop y change events para adicionales
      // Se usa updateAdditionalPreviews ahora
    }
  }

  // Manejo del envío del formulario
  formPublicar.addEventListener('submit', async (e) => {
    e.preventDefault()

    // Verificar estado de la sesión
    console.log('Estado de la sesión:', {
      sessionStorage: sessionStorage.getItem('usuarioActual'),
      usuarioActual
    })

    // Validar que haya una imagen principal
    if (previewPrincipal.children.length === 0) {
      mostrarError('Debes seleccionar una imagen principal')
      return
    }

    const formData = new FormData()
    formData.append('titulo', document.getElementById('titulo').value)
    formData.append('descripcion', document.getElementById('descripcion').value)
    formData.append('id_tatuador', usuarioActual.id_tatuador)

    // Agregar imagen principal desde la variable
    if (selectedPrincipalFile) {
      formData.append('imagenPrincipal', selectedPrincipalFile)
    }

    // Agregar imágenes adicionales del array selectedAdditionalFiles
    selectedAdditionalFiles.forEach((file) => {
      formData.append('imagenesAdicionales', file)
    })

    try {
      const response = await fetch('/api/tatuajes/publicar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      })

      const data = await response.json()

      if (data.exito) {
        mostrarExito('Tatuaje publicado exitosamente')
        setTimeout(() => {
          window.location.href = 'perfil.html'
        }, 2000)
      } else {
        mostrarError(data.mensaje || 'Error al publicar el tatuaje')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarError('Error al comunicarse con el servidor')
    }
  })

  function mostrarError (mensaje) {
    const alert = document.createElement('div')
    alert.className = 'alert alert-error'
    alert.textContent = mensaje
    formPublicar.insertBefore(alert, formPublicar.firstChild)
    setTimeout(() => alert.remove(), 5000)
  }

  function mostrarExito (mensaje) {
    const alert = document.createElement('div')
    alert.className = 'alert alert-success'
    alert.textContent = mensaje
    formPublicar.insertBefore(alert, formPublicar.firstChild)
  }
})
