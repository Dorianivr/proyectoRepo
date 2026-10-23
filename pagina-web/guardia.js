/* guardia.js · Si no hay sesión de administrador, manda al login.
   (Es solo una barrera visual del lado del navegador; no sustituye
   una validación real en servidor.) */
try {
  if (sessionStorage.getItem("sp2_admin") !== "1") location.replace("accesoadmin.html");
} catch (e) {
  location.replace("accesoadmin.html");
}
