CREATE TABLE IF NOT EXISTS guardados (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_tatuaje INT NOT NULL,
    id_usuario INT NOT NULL,
    fecha_guardado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_tatuaje) REFERENCES tatuajes(id) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_guardado (id_tatuaje, id_usuario)
); 