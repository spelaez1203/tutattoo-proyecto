// locales.js
// Script para mostrar todos los locales aprobados y ver su detalle

document.addEventListener('DOMContentLoaded', () => {
  const contenedor = document.getElementById('lista-locales');
  const modal = document.getElementById('modal-local-detalle');
  const modalContent = document.getElementById('modal-local-content');
  const cerrarModal = document.getElementById('cerrar-modal-local-detalle');

  // Cargar locales
  fetch('/api/locales-publicos')
    .then(res => res.json())
    .then(data => {
      if (data.exito && data.locales.length > 0) {
        contenedor.innerHTML = '';
        data.locales.forEach((local, idx) => {
          const card = document.createElement('div');
          card.className = 'local-card';
          
          // Validar si hay imagen de fachada
          const imagenFachada = local.imagen_fachada && local.imagen_fachada !== 'null' 
            ? `/uploads/locales/${local.imagen_fachada}` 
            : '/img/image.png';
          
          card.innerHTML = `
            <img src="${imagenFachada}" alt="Fachada de ${local.nombre}" class="local-fachada" onerror="this.src='/img/image.png'">
            <h3>${local.nombre}</h3>
            <p><strong>Dirección:</strong> ${local.direccion}</p>
            <p><strong>Tatuador:</strong> ${local.nombre_tatuador || ''}</p>
            <button class="btn-ver-detalle" data-id="${local.id_local}">Ver más</button>
          `;
          contenedor.appendChild(card);
        });
      } else {
        contenedor.innerHTML = '<p class="no-locales">No hay locales disponibles.</p>';
      }
    });

  // Delegación para ver detalle
  contenedor.addEventListener('click', async (e) => {
    if (e.target.classList.contains('btn-ver-detalle')) {
      const id = e.target.getAttribute('data-id');
      // Buscar info del local
      const res = await fetch('/api/locales-publicos');
      const data = await res.json();
      const local = data.locales.find(l => l.id_local == id);
      
      // Buscar imágenes interiores
      const resImg = await fetch(`/api/locales/${id}/imagenes`);
      const dataImg = await resImg.json();
      let imagenes = '';
      if (dataImg.exito && dataImg.imagenes.length > 0) {
        imagenes = '<div class="interiores"><strong>Imágenes interiores:</strong><br>' +
          dataImg.imagenes.map(img => `<img src="/uploads/locales/${img.url_imagen}" class="img-interior" onerror="this.src='/img/image.png'">`).join('') + '</div>';
      }
      
      // Validar si hay imagen de fachada para el modal
      const imagenFachadaModal = local.imagen_fachada && local.imagen_fachada !== 'null' 
        ? `/uploads/locales/${local.imagen_fachada}` 
        : '/img/image.png';
      
      modalContent.innerHTML = `
        <h2>${local.nombre}</h2>
        <img src="${imagenFachadaModal}" alt="Fachada" class="fachada-modal" onerror="this.src='/img/image.png'">
        <p><strong>Dirección:</strong> ${local.direccion}</p>
        <p><strong>Teléfono:</strong> ${local.telefono}</p>
        <p><strong>Tatuador:</strong> ${local.nombre_tatuador || ''}</p>
        ${imagenes}
      `;
      modal.style.display = 'block';
    }
  });

  cerrarModal.onclick = () => {
    modal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = 'none';
    }
  };
}); 