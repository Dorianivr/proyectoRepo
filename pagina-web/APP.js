// ---------- DATOS ----------
var usuarios = JSON.parse(localStorage.getItem("usuarios")) || [];
var pantallas = ["pantallaLogin", "pantallaRegistro", "pantallaReserva"];

// ---------- FUNCIONES DE AYUDA ----------

// Muestra una pantalla y oculta las demás
function mostrar(id) {
  for (var i = 0; i < pantallas.length; i++) {
    document.getElementById(pantallas[i]).classList.add("oculto");
  }
  document.getElementById(id).classList.remove("oculto");
}

// Busca un usuario por su placa. Si no existe, devuelve null
function buscarUsuario(placa) {
  for (var i = 0; i < usuarios.length; i++) {
    if (usuarios[i].placa === placa) {
      return usuarios[i];
    }
  }
  return null;
}

// Guarda la sesión y muestra la pantalla de reservación
function abrirReserva(usuario) {
  localStorage.setItem("sesion", usuario.placa);
  document.getElementById("saludo").textContent = "Hola, " + usuario.nombre;
  document.getElementById("datosUsuario").textContent =
    "Placa " + usuario.placa + " · " + usuario.tipo;
  mostrar("pantallaReserva");
}

// ---------- REGISTRO ----------
function registrar() {
  var nombre = document.getElementById("nombre").value.trim();
  var placa = document.getElementById("placa").value.trim().toUpperCase();
  var tipo = document.getElementById("tipo").value;
  var clave = document.getElementById("clave").value;
  var mensaje = document.getElementById("mensaje");

  if (nombre === "" || placa === "" || clave === "") {
    mensaje.style.color = "#dc2626";
    mensaje.textContent = "Completa todos los campos.";
    return;
  }

  if (buscarUsuario(placa) !== null) {
    mensaje.style.color = "#dc2626";
    mensaje.textContent = "Esa placa ya está registrada.";
    return;
  }

  var nuevo = { nombre: nombre, placa: placa, tipo: tipo, clave: clave };
  usuarios.push(nuevo);
  localStorage.setItem("usuarios", JSON.stringify(usuarios));

  mensaje.textContent = "";
  abrirReserva(nuevo); // después de registrarse, entra directo
}

// ---------- LOGIN ----------
function entrar() {
  var placa = document.getElementById("loginPlaca").value.trim().toUpperCase();
  var clave = document.getElementById("loginClave").value;
  var mensaje = document.getElementById("mensajeLogin");

  var usuario = buscarUsuario(placa);

  if (usuario === null || usuario.clave !== clave) {
    mensaje.style.color = "#dc2626";
    mensaje.textContent = "Placa o contraseña incorrecta.";
    return;
  }

  mensaje.textContent = "";
  abrirReserva(usuario);
}

// ---------- CERRAR SESIÓN ----------
function salir() {
  localStorage.removeItem("sesion");
  document.getElementById("loginPlaca").value = "";
  document.getElementById("loginClave").value = "";
  mostrar("pantallaLogin");
}

// ---------- CONECTAR BOTONES ----------
document.getElementById("btnRegistrar").addEventListener("click", registrar);
document.getElementById("btnEntrar").addEventListener("click", entrar);
document.getElementById("btnSalir").addEventListener("click", salir);
document.getElementById("irRegistro").addEventListener("click", function () {
  mostrar("pantallaRegistro");
});
document.getElementById("irLogin").addEventListener("click", function () {
  mostrar("pantallaLogin");
});

// ---------- AL CARGAR LA PÁGINA ----------
// Si ya había una sesión abierta, entra directo
var sesion = localStorage.getItem("sesion");
if (sesion !== null && buscarUsuario(sesion) !== null) {
  abrirReserva(buscarUsuario(sesion));
}
