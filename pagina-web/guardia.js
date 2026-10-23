/* guardia.js · Si no hay sesión de administrador, manda al login */
try {
  if (sessionStorage.getItem("sp2_admin") !== "1")
    location.replace("accesoadmin.html");
} catch (e) {
  location.replace("accesoadmin.html");
}
