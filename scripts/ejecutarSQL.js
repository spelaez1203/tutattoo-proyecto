const mysql = require('mysql2/promise')
require('dotenv').config()
const bcrypt = require('bcrypt')

async function actualizarTabla () {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0000',
    database: 'tutattoo_db'
  })

  try {
    // Verificar si existe la columna rol en usuarios
    const [columns] = await connection.query(`
            SELECT COLUMN_NAME 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tutattoo_db' 
            AND TABLE_NAME = 'usuarios' 
            AND COLUMN_NAME = 'rol'
        `)

    if (columns.length === 0) {
      // Agregar columna rol
      await connection.query(`
                ALTER TABLE usuarios
                ADD COLUMN rol ENUM('usuario', 'admin', 'tatuador') DEFAULT 'usuario'
            `)
      console.log('Columna rol añadida exitosamente')
    }

    // Verificar si existe el usuario administrador
    const [admin] = await connection.query(
      'SELECT id_usuario FROM usuarios WHERE correo = ?',
      ['adminsantiago@tutattoo.com']
    )

    if (admin.length === 0) {
      // Crear usuario administrador con contraseña '12345'
      const hash = await bcrypt.hash('12345', 10)
      await connection.query(`
                INSERT INTO usuarios (nombre, correo, contraseña, rol, estado_verificado)
                VALUES (?, ?, ?, ?, ?)
            `, ['Admin Santiago', 'adminsantiago@tutattoo.com', hash, 'admin', 1])
      console.log('Usuario administrador creado exitosamente')
    } else {
      // Actualizar la contraseña del administrador existente
      const hash = await bcrypt.hash('12345', 10)
      await connection.query(`
                UPDATE usuarios 
                SET contraseña = ? 
                WHERE correo = ?
            `, [hash, 'adminsantiago@tutattoo.com'])
      console.log('Contraseña del administrador actualizada exitosamente')
    }

    // Verificar si existe la tabla solicitudes_verificacion
    const [tablas] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'tutattoo_db' 
            AND TABLE_NAME = 'solicitudes_verificacion'
        `)

    if (tablas.length === 0) {
      // Crear tabla de solicitudes de verificación
      await connection.query(`
                CREATE TABLE solicitudes_verificacion (
                    id_solicitud INT AUTO_INCREMENT PRIMARY KEY,
                    id_usuario INT NOT NULL UNIQUE,
                    id_tatuador INT,
                    ciudad VARCHAR(100) NOT NULL,
                    hace_domicilio BOOLEAN NOT NULL,
                    tiene_local BOOLEAN NOT NULL,
                    nombre_local VARCHAR(100),
                    direccion VARCHAR(255),
                    telefono VARCHAR(20),
                    documentos TEXT,
                    portfolio TEXT,
                    estado ENUM('pendiente', 'aprobada', 'rechazada') DEFAULT 'pendiente',
                    fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
                    fecha_revision DATETIME,
                    comentario_admin TEXT,
                    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                    FOREIGN KEY (id_tatuador) REFERENCES tatuadores(id_tatuador) ON DELETE CASCADE
                )
            `)
      console.log('Tabla solicitudes_verificacion creada exitosamente')
    }

    // Corregir la adición de las columnas documentos y portfolio si no existen
    try {
      const [columns] = await connection.query(`
                SHOW COLUMNS FROM solicitudes_verificacion LIKE 'documentos';
            `)
      if (columns.length === 0) {
        await connection.query(`
                    ALTER TABLE solicitudes_verificacion ADD COLUMN documentos TEXT;
                `)
        console.log('Columna documentos añadida a solicitudes_verificacion')
      }

      const [portfolioColumns] = await connection.query(`
                SHOW COLUMNS FROM solicitudes_verificacion LIKE 'portfolio';
            `)
      if (portfolioColumns.length === 0) {
        await connection.query(`
                    ALTER TABLE solicitudes_verificacion ADD COLUMN portfolio TEXT;
                `)
        console.log('Columna portfolio añadida a solicitudes_verificacion')
      }
    } catch (error) {
      // Si la tabla no existe aún, se creará más abajo, así que ignoramos el error.
      if (!error.message.includes("Table 'tutattoo_db.solicitudes_verificacion' doesn't exist")) {
        console.error('Error al verificar/añadir columnas:', error)
      }
    }

    // Crear tabla solicitud_archivos
    await connection.query(`
            CREATE TABLE IF NOT EXISTS solicitud_archivos (
                id_archivo INT AUTO_INCREMENT PRIMARY KEY,
                id_tatuador INT,
                ruta_archivo VARCHAR(255) NOT NULL,
                tipo_archivo ENUM('documento', 'portfolio') NOT NULL,
                fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (id_tatuador) REFERENCES tatuadores(id_tatuador) ON DELETE CASCADE
            )
        `)
    console.log('Tabla solicitud_archivos creada exitosamente')

    // Verificar si existe la tabla guardados
    const [tablasGuardados] = await connection.query(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'tutattoo_db' 
            AND TABLE_NAME = 'guardados'
        `)

    if (tablasGuardados.length === 0) {
      // Crear tabla guardados
      await connection.query(`
                CREATE TABLE guardados (
                    id INT PRIMARY KEY AUTO_INCREMENT,
                    id_tatuaje INT NOT NULL,
                    id_usuario INT NOT NULL,
                    fecha_guardado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (id_tatuaje) REFERENCES tatuajes(id) ON DELETE CASCADE,
                    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
                    UNIQUE KEY unique_guardado (id_tatuaje, id_usuario)
                )
            `)
      console.log('Tabla guardados creada exitosamente')
    }

    // Verificar si existe la tabla reportes
    const [tablasReportes] = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = 'tutattoo_db'
            AND TABLE_NAME = 'reportes'
        `)

    if (tablasReportes.length === 0) {
      await connection.query(`
                CREATE TABLE reportes (
                  id_reporte int NOT NULL AUTO_INCREMENT,
                  id_tatuaje int NOT NULL,
                  id_admin int NOT NULL,
                  razon text COLLATE utf8mb4_general_ci NOT NULL,
                  fecha_reporte timestamp NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id_reporte),
                  KEY id_tatuaje_idx (id_tatuaje),
                  KEY id_admin_idx (id_admin),
                  CONSTRAINT reportes_fk_tatuaje FOREIGN KEY (id_tatuaje) REFERENCES tatuajes (id_tatuaje) ON DELETE CASCADE,
                  CONSTRAINT reportes_fk_admin FOREIGN KEY (id_admin) REFERENCES usuarios (id_usuario)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
            `)
      console.log('Tabla reportes creada exitosamente.')
    }
  } catch (error) {
    console.error('Error al actualizar la base de datos:', error)
  } finally {
    await connection.end()
  }
}

actualizarTabla()
