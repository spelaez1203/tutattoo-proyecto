const { Pool } = require('pg')
require('dotenv').config()

// Configuración de la base de datos
const dbConfig = {
  host: process.env.PGHOST || process.env.DB_HOST || 'localhost',
  user: process.env.PGUSER || process.env.DB_USER || 'root',
  password: process.env.PGPASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.PGDATABASE || process.env.DB_NAME || 'tutattoo_db',
  port: process.env.PGPORT || process.env.DB_PORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // máximo número de conexiones en el pool
  idleTimeoutMillis: 30000, // tiempo máximo que una conexión puede estar inactiva
  connectionTimeoutMillis: 2000 // tiempo máximo para establecer una conexión
}

console.log('Configuración de base de datos:', {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port,
  ssl: dbConfig.ssl ? 'enabled' : 'disabled'
})

const pool = new Pool(dbConfig)

// Evento cuando se establece una conexión
pool.on('connect', () => {
  console.log('✅ Conexión a la base de datos PostgreSQL exitosa')
})

// Evento cuando hay un error en el pool
pool.on('error', (err) => {
  console.error('❌ Error en el pool de conexiones PostgreSQL:', err)
})

// Evento cuando se libera una conexión
pool.on('remove', () => {
  console.log('🔌 Conexión liberada del pool')
})

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect()
    console.log('✅ Prueba de conexión exitosa')
    client.release()
    return true
  } catch (err) {
    console.error('❌ Error al probar la conexión:', err.message)
    return false
  }
}

// Probar la conexión al iniciar
testConnection()

module.exports = pool
