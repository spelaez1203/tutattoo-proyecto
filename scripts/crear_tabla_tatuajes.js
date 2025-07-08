const db = require('../db/conexion')

async function crearTablaTatuajes () {
  const connection = await db.getConnection()

  try {
    await connection.beginTransaction()

    // Crear tabla tatuajes si no existe
    await connection.query(`
            CREATE TABLE IF NOT EXISTS tatuajes (
                id INT PRIMARY KEY AUTO_INCREMENT,
                id_tatuador INT NOT NULL,
                titulo VARCHAR(255) NOT NULL,
                descripcion TEXT,
                imagen VARCHAR(255) NOT NULL,
                fecha_publicacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_tatuador) REFERENCES tatuadores(id_tatuador) ON DELETE CASCADE
            )
        `)

    // Crear tabla imagenes_tatuaje si no existe
    await connection.query(`
            CREATE TABLE IF NOT EXISTS imagenes_tatuaje (
                id_imagen INT PRIMARY KEY AUTO_INCREMENT,
                id_tatuaje INT NOT NULL,
                url_imagen VARCHAR(255) NOT NULL,
                es_principal BOOLEAN DEFAULT FALSE,
                fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_tatuaje) REFERENCES tatuajes(id) ON DELETE CASCADE
            )
        `)

    await connection.commit()
    console.log('Tablas tatuajes e imagenes_tatuaje creadas exitosamente')
  } catch (error) {
    await connection.rollback()
    console.error('Error al crear las tablas:', error)
    throw error
  } finally {
    connection.release()
  }
}

// Ejecutar la función
crearTablaTatuajes()
  .then(() => {
    console.log('Script completado exitosamente')
    process.exit(0)
  })
  .catch(error => {
    console.error('Error en el script:', error)
    process.exit(1)
  })
