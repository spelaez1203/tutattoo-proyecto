const mysql = require('mysql2/promise')

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'tutattoo_db'
}

async function actualizarVotosPromedio () {
  let connection

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig)
    console.log('Conectado a la base de datos')

    // Obtener todos los tatuajes
    const [tatuajes] = await connection.query('SELECT id_tatuaje FROM tatuajes')
    console.log(`Encontrados ${tatuajes.length} tatuajes para actualizar`)

    // Actualizar cada tatuaje con su promedio real de votos
    for (const tatuaje of tatuajes) {
      // Calcular el promedio de votos desde comentarios_tatuajes
      const [promedioResult] = await connection.query(`
                SELECT AVG(puntuacion) as promedio
                FROM comentarios_tatuajes 
                WHERE id_tatuaje = ?
            `, [tatuaje.id_tatuaje])

      const promedio = promedioResult[0].promedio || 0
      const promedioRedondeado = Math.round(promedio * 10) / 10

      // Actualizar el campo votos en la tabla tatuajes
      await connection.query(
        'UPDATE tatuajes SET votos = ? WHERE id_tatuaje = ?',
        [promedioRedondeado, tatuaje.id_tatuaje]
      )

      console.log(`Tatuaje ${tatuaje.id_tatuaje}: promedio actualizado a ${promedioRedondeado}`)
    }

    console.log('✅ Actualización completada exitosamente')

    // Mostrar resumen final
    const [resumen] = await connection.query(`
            SELECT 
                t.id_tatuaje,
                t.titulo,
                t.votos as promedio_actual,
                COALESCE(AVG(ct.puntuacion), 0) as promedio_comentarios,
                COUNT(ct.id_comentario) as total_votos
            FROM tatuajes t
            LEFT JOIN comentarios_tatuajes ct ON t.id_tatuaje = ct.id_tatuaje
            GROUP BY t.id_tatuaje, t.titulo, t.votos
            ORDER BY t.id_tatuaje
        `)

    console.log('\n📊 Resumen de actualización:')
    console.log('ID | Título | Promedio Actual | Total Votos')
    console.log('---|--------|----------------|------------')
    resumen.forEach(row => {
      console.log(`${row.id_tatuaje} | ${row.titulo || 'Sin título'} | ${row.promedio_actual} | ${row.total_votos}`)
    })
  } catch (error) {
    console.error('❌ Error durante la actualización:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Conexión cerrada')
    }
  }
}

// Ejecutar el script
actualizarVotosPromedio()
