-- Tabla para almacenar los documentos de verificación
CREATE TABLE IF NOT EXISTS documentos_verificacion (
    id_documento INT PRIMARY KEY AUTO_INCREMENT,
    id_solicitud INT NOT NULL,
    url_documento VARCHAR(255) NOT NULL,
    tipo_documento ENUM('documento', 'portfolio') NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes_verificacion(id_solicitud) ON DELETE CASCADE
);

-- Tabla para almacenar las imágenes del portfolio
CREATE TABLE IF NOT EXISTS portfolio_verificacion (
    id_portfolio INT PRIMARY KEY AUTO_INCREMENT,
    id_solicitud INT NOT NULL,
    url_imagen VARCHAR(255) NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_solicitud) REFERENCES solicitudes_verificacion(id_solicitud) ON DELETE CASCADE
);

-- Tabla de notificaciones para la bandeja de entrada de los usuarios
CREATE TABLE IF NOT EXISTS notificaciones (
  id_notificacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  tipo VARCHAR(50) NOT NULL, -- 'cambio_rol', 'solicitud_aprobada', 'solicitud_rechazada', 'publicacion_eliminada', 'destacado_semana'
  mensaje TEXT NOT NULL,
  leida TINYINT(1) DEFAULT 0,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
); 