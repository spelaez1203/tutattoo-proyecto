const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos de producción
const { Pool } = require('pg');

const dbConfig = {
  host: process.env.PGHOST || 'localhost',
  user: process.env.PGUSER || 'root',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'tutattoo_db',
  port: process.env.PGPORT || 5432,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

async function ejecutarMigracion() {
  try {
    console.log('🔧 Ejecutando migración para crear tabla perfil_usuario...');
    console.log('Configuración de BD:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      port: dbConfig.port,
      ssl: dbConfig.ssl ? 'enabled' : 'disabled'
    });
    
    // Leer el archivo de migración
    const migracionPath = path.join(__dirname, '../migrations/002_create_perfil_usuario.sql');
    const sql = fs.readFileSync(migracionPath, 'utf8');
    
    // Ejecutar la migración
    await pool.query(sql);
    
    console.log('✅ Migración ejecutada exitosamente');
    console.log('✅ Tabla perfil_usuario creada');
    
  } catch (error) {
    console.error('❌ Error al ejecutar la migración:', error);
  } finally {
    await pool.end();
  }
}

ejecutarMigracion(); 