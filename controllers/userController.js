// Obtener id_tatuador por id_usuario (usando pool y promesas)
const pool = require('../db/conexion')
const getIdTatuador = async (req, res) => {
  const { id_usuario } = req.params
  try {
    const [results] = await pool.query('SELECT id_tatuador FROM tatuadores WHERE id_usuario = ?', [id_usuario])
    if (results.length === 0) {
      return res.json({ exito: false, mensaje: 'No se encontró tatuador para este usuario' })
    }
    res.json({ exito: true, id_tatuador: results[0].id_tatuador })
  } catch (err) {
    return res.status(500).json({ exito: false, mensaje: 'Error en la base de datos' })
  }
}

module.exports.getIdTatuador = getIdTatuador
