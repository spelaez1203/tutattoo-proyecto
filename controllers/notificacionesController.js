const pool = require('../database/connection')

// Obtener notificaciones de un usuario
exports.obtenerNotificaciones = async (req, res) => {
  const id_usuario = req.params.id_usuario
  try {
    const { rows: notificaciones } = await pool.query(
      'SELECT * FROM notificaciones WHERE id_usuario = $1 ORDER BY fecha DESC',
      [id_usuario]
    )
    res.json({ exito: true, notificaciones })
  } catch (error) {
    console.error('Error al obtener notificaciones:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al obtener notificaciones' })
  }
}

// Crear una notificación
exports.crearNotificacion = async (id_usuario, tipo, mensaje) => {
  try {
    await pool.query(
      'INSERT INTO notificaciones (id_usuario, tipo, mensaje) VALUES ($1, $2, $3)',
      [id_usuario, tipo, mensaje]
    )
  } catch (error) {
    console.error('Error al crear notificación:', error)
  }
}

// Marcar notificaciones como leídas
exports.marcarComoLeida = async (req, res) => {
  const id_notificacion = req.params.id_notificacion
  try {
    await pool.query(
      'UPDATE notificaciones SET leida = true WHERE id_notificacion = $1',
      [id_notificacion]
    )
    res.json({ exito: true })
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error)
    res.status(500).json({ exito: false, mensaje: 'Error al marcar como leída' })
  }
}
