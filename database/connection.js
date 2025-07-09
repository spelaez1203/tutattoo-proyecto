const { Pool } = require('pg')
require('dotenv').config()

const pool = new Pool({
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  user: process.env.PGUSER || process.env.DB_USER || 'root',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tutattoo_db',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

pool.on('connect', () => {
  console.log('Conexión a la base de datos PostgreSQL exitosa')
})

pool.on('error', (err) => {
  console.error('Error de conexión a la base de datos:', err)
})

module.exports = pool
