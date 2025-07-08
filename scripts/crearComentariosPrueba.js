const mysql = require('mysql2/promise')

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '0000',
  database: 'tutattoo_db'
}

async function crearComentariosPrueba () {
  let connection

  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig)
    console.log('Conectado a la base de datos')

    // Obtener un tatuaje existente
    const [tatuajes] = await connection.query('SELECT id_tatuaje FROM tatuajes LIMIT 1')

    if (tatuajes.length === 0) {
      console.log('No hay tatuajes en la base de datos')
      return
    }

    const tatuajeId = tatuajes[0].id_tatuaje
    console.log(`Usando tatuaje ID: ${tatuajeId}`)

    // Obtener un usuario existente
    const [usuarios] = await connection.query('SELECT id_usuario FROM usuarios WHERE rol = "usuario" LIMIT 1')

    if (usuarios.length === 0) {
      console.log('No hay usuarios en la base de datos')
      return
    }

    const usuarioId = usuarios[0].id_usuario
    console.log(`Usando usuario ID: ${usuarioId}`)

    // Crear 4 comentarios para probar el límite
    const comentarios = [
      { comentario: 'Primer comentario de prueba', puntuacion: 5 },
      { comentario: 'Segundo comentario de prueba', puntuacion: 4 },
      { comentario: 'Tercer comentario de prueba', puntuacion: 3 },
      { comentario: 'Cuarto comentario de prueba (debería fallar)', puntuacion: 2 }
    ]

    for (let i = 0; i < comentarios.length; i++) {
      const comentario = comentarios[i]

      try {
        // Verificar si ya existe un voto del usuario
        const [votoExistente] = await connection.query(
          'SELECT * FROM comentarios_tatuajes WHERE id_tatuaje = ? AND id_usuario = ?',
          [tatuajeId, usuarioId]
        )

        if (votoExistente.length === 0) {
          // Crear voto y comentario
          await connection.query(
            'INSERT INTO comentarios_tatuajes (id_tatuaje, id_usuario, comentario, puntuacion, fecha) VALUES (?, ?, ?, ?, NOW())',
            [tatuajeId, usuarioId, comentario.comentario, comentario.puntuacion]
          )
          console.log(`✅ Comentario ${i + 1} creado exitosamente`)
        } else {
          // Contar comentarios existentes
          const [comentariosUsuario] = await connection.query(
            'SELECT COUNT(*) as total FROM comentarios_tatuajes WHERE id_tatuaje = ? AND id_usuario = ? AND comentario IS NOT NULL',
            [tatuajeId, usuarioId]
          )

          const totalComentarios = comentariosUsuario[0].total

          if (totalComentarios >= 3) {
            console.log(`❌ Comentario ${i + 1} no se pudo crear: límite alcanzado (${totalComentarios}/3)`)
            break
          } else {
            // Crear nuevo comentario
            await connection.query(
              'INSERT INTO comentarios_tatuajes (id_tatuaje, id_usuario, comentario, puntuacion, fecha) VALUES (?, ?, ?, ?, NOW())',
              [tatuajeId, usuarioId, comentario.comentario, comentario.puntuacion]
            )
            console.log(`✅ Comentario ${i + 1} creado exitosamente (${totalComentarios + 1}/3)`)
          }
        }
      } catch (error) {
        console.log(`❌ Error al crear comentario ${i + 1}:`, error.message)
      }
    }

    // Mostrar resumen final
    const [comentariosFinales] = await connection.query(`
            SELECT 
                ct.comentario,
                ct.puntuacion,
                ct.fecha
            FROM comentarios_tatuajes ct
            WHERE ct.id_tatuaje = ? AND ct.id_usuario = ? AND ct.comentario IS NOT NULL
            ORDER BY ct.fecha DESC
        `, [tatuajeId, usuarioId])

    console.log('\n📊 Resumen final:')
    console.log(`Total de comentarios creados: ${comentariosFinales.length}`)
    comentariosFinales.forEach((com, index) => {
      console.log(`${index + 1}. "${com.comentario}" - ${com.puntuacion} estrellas - ${com.fecha}`)
    })
  } catch (error) {
    console.error('❌ Error durante la prueba:', error)
  } finally {
    if (connection) {
      await connection.end()
      console.log('Conexión cerrada')
    }
  }
}

// Ejecutar el script
crearComentariosPrueba()
