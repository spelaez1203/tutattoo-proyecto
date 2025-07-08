const mysql = require('mysql2/promise')

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'tutattoo_db'
}

async function verificarContadorGuardados () {
  let connection

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig)
    console.log('Conectado a la base de datos')

    // Verificar el contador de guardados para cada tatuaje
    const [tatuajes] = await connection.query(`
            SELECT 
                t.id_tatuaje,
                t.titulo,
                COALESCE(COUNT(DISTINCT g.id_usuario), 0) as total_guardados,
                COALESCE(AVG(ct.puntuacion), 0) as promedio_comentarios,
                COUNT(ct.id_comentario) as total_comentarios
            FROM tatuajes t
            LEFT JOIN guardados g ON t.id_tatuaje = g.id_tatuaje
            LEFT JOIN comentarios_tatuajes ct ON t.id_tatuaje = ct.id_tatuaje
            GROUP BY t.id_tatuaje, t.titulo
            ORDER BY t.id_tatuaje
        `)

    console.log('\n📊 Contador de Guardados por Tatuaje:')
    console.log('ID | Título | Guardados | Promedio Comentarios | Total Comentarios')
    console.log('---|--------|-----------|---------------------|------------------')

    tatuajes.forEach(row => {
      const promedio = parseFloat(row.promedio_comentarios) || 0
      console.log(`${row.id_tatuaje} | ${row.titulo || 'Sin título'} | ${row.total_guardados} | ${promedio.toFixed(1)} | ${row.total_comentarios}`)
    })

    // Mostrar resumen
    const totalGuardados = tatuajes.reduce((sum, row) => sum + row.total_guardados, 0)
    const totalComentarios = tatuajes.reduce((sum, row) => sum + row.total_comentarios, 0)

    console.log('\n📈 Resumen:')
    console.log(`Total de guardados en toda la plataforma: ${totalGuardados}`)
    console.log(`Total de comentarios en toda la plataforma: ${totalComentarios}`)
    console.log(`Promedio de guardados por tatuaje: ${(totalGuardados / tatuajes.length).toFixed(1)}`)
  } catch (error) {
    console.error('❌ Error durante la verificación:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Conexión cerrada')
    }
  }
}

// Ejecutar el script
verificarContadorGuardados()
