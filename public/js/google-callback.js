// Lee los parámetros de la URL
const params = new URLSearchParams(window.location.search)
const userBase64 = params.get('user')
const returnTo = params.get('returnTo') || '/index.html'

if (userBase64) {
  try {
    const userJson = atob(userBase64)
    const user = JSON.parse(userJson)
    sessionStorage.setItem('usuarioActual', JSON.stringify(user))
  } catch (e) {
    console.error('Error al decodificar el usuario:', e)
  }
}
// Redirige a la página original
window.location.href = returnTo
