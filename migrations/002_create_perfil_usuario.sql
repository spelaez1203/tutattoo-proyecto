-- Crear tabla perfil_usuario para almacenar información adicional del perfil
CREATE TABLE IF NOT EXISTS perfil_usuario (
    id_perfil SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    descripcion TEXT,
    instagram VARCHAR(255),
    tiktok VARCHAR(255),
    youtube VARCHAR(255),
    twitter VARCHAR(255),
    url_imagen VARCHAR(255),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE(id_usuario)
);

-- Crear índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_perfil_usuario_id_usuario ON perfil_usuario(id_usuario); 