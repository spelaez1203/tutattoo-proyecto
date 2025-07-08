const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'tutattoo_db'
}

async function ejecutarTriggers () {
  let connection

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig)
    console.log('Conectado a la base de datos')

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, 'crearTriggersVotos.sql')
    const sqlContent = fs.readFileSync(sqlPath, 'utf8')

    // Dividir el contenido en comandos individuales
    const commands = sqlContent.split(';').filter(cmd => cmd.trim())

    // Ejecutar cada comando
    for (const command of commands) {
      if (command.trim()) {
        try {
          await connection.execute(command)
          console.log('✅ Comando ejecutado:', command.substring(0, 50) + '...')
        } catch (error) {
          console.log('⚠️  Comando omitido (probablemente ya existe):', error.message)
        }
      }
    }

    console.log('✅ Triggers creados/actualizados exitosamente')

    // Verificar que los triggers se crearon
    const [triggers] = await connection.query("SHOW TRIGGERS LIKE 'actualizar_votos%'")
    console.log('\n📋 Triggers creados:')
    triggers.forEach(trigger => {
      console.log(`- ${trigger.Trigger}: ${trigger.Timing} ${trigger.Event} ON ${trigger.Table}`)
    })
  } catch (error) {
    console.error('❌ Error durante la ejecución:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Conexión cerrada')
    }
  }
}

// Ejecutar el script
ejecutarTriggers()
