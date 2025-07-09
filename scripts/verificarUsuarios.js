const mysql = require('mysql2/promise')
const bcrypt = require('bcrypt')
require('dotenv').config()

async function verificarUsuarios () {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '0000',
    database: 'tutattoo_db'
  })

  try {
    // Obtener todos los usuarios
    const [usuarios] = await connection.query('SELECT * FROM usuarios')
    console.log('\nUsuarios en la base de datos:')
    console.log('------------------------')

    for (const usuario of usuarios) {
      console.log(`\nID: ${usuario.id_usuario}`)
      console.log(`Nombre: ${usuario.nombre}`)
      console.log(`Correo: ${usuario.correo}`)
      console.log(`Rol: ${usuario.rol || 'usuario'}`)
      console.log(`Estado verificado: ${usuario.estado_verificado ? 'Sí' : 'No'}`)

      // Actualizar contraseñas según el usuario
      let nuevaContrasena
      if (usuario.correo === 'adminsantiago@tutattoo.com') {
        nuevaContrasena = '12345'
      } else if (usuario.id_usuario === 2) { // Usuario Santiago
        nuevaContrasena = '12345'
      }

      if (nuevaContrasena) {
        const hash = await bcrypt.hash(nuevaContrasena, 10)
        await connection.query(
          'UPDATE usuarios SET contrasena = ? WHERE id_usuario = ?',
          [hash, usuario.id_usuario]
        )
        console.log(`✅ Contraseña actualizada a: ${nuevaContrasena}`)
      }
    }

    console.log('\nVerificación completada')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await connection.end()
  }
}

verificarUsuarios()
