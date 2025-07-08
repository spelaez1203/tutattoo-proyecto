const mysql = require('mysql2/promise')
require('dotenv').config()

async function verificarTablaUsuarios () {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0000',
    database: 'tutattoo_db'
  })

  try {
    // Obtener la estructura de la tabla
    const [columns] = await connection.query(`
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'tutattoo_db' 
            AND TABLE_NAME = 'usuarios'
            ORDER BY ORDINAL_POSITION
        `)

    console.log('\nEstructura de la tabla usuarios:')
    console.log('------------------------')
    columns.forEach(col => {
      console.log(`\nColumna: ${col.COLUMN_NAME}`)
      console.log(`Tipo: ${col.COLUMN_TYPE}`)
      console.log(`Puede ser nulo: ${col.IS_NULLABLE}`)
      console.log(`Valor por defecto: ${col.COLUMN_DEFAULT}`)
    })

    // Verificar algunos registros de ejemplo
    const [usuarios] = await connection.query('SELECT * FROM usuarios LIMIT 1')
    if (usuarios.length > 0) {
      console.log('\nEjemplo de registro:')
      console.log('------------------------')
      console.log(JSON.stringify(usuarios[0], null, 2))
    }
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await connection.end()
  }
}

verificarTablaUsuarios()
