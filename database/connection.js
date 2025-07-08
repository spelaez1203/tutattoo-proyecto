const mysql = require('mysql2')
require('dotenv').config()

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'tutattoo_db'
})

db.connect(err => {
  if (err) {
    console.error('Error de conexión a la base de datos:', err)
    return
  }
  console.log('Conexión a la base de datos MySQL exitosa')
})

module.exports = db
