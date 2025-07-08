const mysql = require('mysql2/promise')

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'tutattoo_db'
}

async function crearTriggers () {
  let connection

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig)
    console.log('Conectado a la base de datos')

    // Eliminar triggers existentes
    try {
      await connection.execute('DROP TRIGGER IF EXISTS actualizar_votos_after_insert')
      await connection.execute('DROP TRIGGER IF EXISTS actualizar_votos_after_update')
      await connection.execute('DROP TRIGGER IF EXISTS actualizar_votos_after_delete')
      console.log('✅ Triggers existentes eliminados')
    } catch (error) {
      console.log('⚠️  No había triggers existentes para eliminar')
    }

    // Crear trigger para INSERT
    const triggerInsert = `
            CREATE TRIGGER actualizar_votos_after_insert
            AFTER INSERT ON comentarios_tatuajes
            FOR EACH ROW
            BEGIN
                UPDATE tatuajes 
                SET votos = (
                    SELECT COALESCE(AVG(puntuacion), 0)
                    FROM comentarios_tatuajes 
                    WHERE id_tatuaje = NEW.id_tatuaje
                )
                WHERE id_tatuaje = NEW.id_tatuaje;
            END
        `

    // Crear trigger para UPDATE
    const triggerUpdate = `
            CREATE TRIGGER actualizar_votos_after_update
            AFTER UPDATE ON comentarios_tatuajes
            FOR EACH ROW
            BEGIN
                UPDATE tatuajes 
                SET votos = (
                    SELECT COALESCE(AVG(puntuacion), 0)
                    FROM comentarios_tatuajes 
                    WHERE id_tatuaje = NEW.id_tatuaje
                )
                WHERE id_tatuaje = NEW.id_tatuaje;
            END
        `

    // Crear trigger para DELETE
    const triggerDelete = `
            CREATE TRIGGER actualizar_votos_after_delete
            AFTER DELETE ON comentarios_tatuajes
            FOR EACH ROW
            BEGIN
                UPDATE tatuajes 
                SET votos = (
                    SELECT COALESCE(AVG(puntuacion), 0)
                    FROM comentarios_tatuajes 
                    WHERE id_tatuaje = OLD.id_tatuaje
                )
                WHERE id_tatuaje = OLD.id_tatuaje;
            END
        `

    // Ejecutar los triggers
    await connection.query(triggerInsert)
    console.log('✅ Trigger INSERT creado')

    await connection.query(triggerUpdate)
    console.log('✅ Trigger UPDATE creado')

    await connection.query(triggerDelete)
    console.log('✅ Trigger DELETE creado')

    console.log('✅ Todos los triggers creados exitosamente')

    // Verificar que los triggers se crearon
    const [triggers] = await connection.query("SHOW TRIGGERS LIKE 'actualizar_votos%'")
    console.log('\n📋 Triggers creados:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.Trigger}: ${trigger.Timing} ${trigger.Event} ON ${trigger.Table}`)
    })
  } catch (error) {
    console.error('❌ Error durante la creación de triggers:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Conexión cerrada')
    }
  }
}

// Ejecutar el script
crearTriggers()
