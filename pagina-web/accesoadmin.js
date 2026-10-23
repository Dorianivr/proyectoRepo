/* ===== CAMBIA AQUÍ EL USUARIO Y LA CONTRASEÑA ===== */
var ADMIN_USER = "admin",
  ADMIN_PASS = "smartpark2026";

var MAX_TRIES = 3,
  LOCK_SECONDS = 30;

var $ = function (i) {
    return document.getElementById(i);
  },
  tries = 0,
  lockUntil = 0,
  timer = null;

function ss(k, v) {
  try {
    if (v === undefined) return sessionStorage.getItem(k);
    if (v === null) sessionStorage.removeItem(k);
    else sessionStorage.setItem(k, v);
    return true;
  } catch (e) {
    return null;
  }
}

if (ss("sp2_admin") === "1") location.replace("ADMINISTRADOR.html"); // ya tiene sesión

lockUntil = +ss("sp2_lock") || 0;

function bad(m, who) {
  $("msg").textContent = m;
  $("fu").classList.toggle("err", who !== "p");
  $("fp").classList.toggle("err", who !== "u");
}

function clean() {
  $("msg").textContent = "";
  $("fu").classList.remove("err");
  $("fp").classList.remove("err");
}

["usr", "pwd"].forEach(function (id) {
  $(id).addEventListener("input", clean);
  $(id).addEventListener("keydown", function (e) {
    if (e.key === "Enter") login();
  });
});

$("eye").addEventListener("click", function () {
  var s = $("pwd").type === "password";
  $("pwd").type = s ? "text" : "password";
  this.setAttribute(
    "aria-label",
    s ? "Ocultar contraseña" : "Mostrar contraseña",
  );
});

$("go").addEventListener("click", login);

function tickLock() {
  var left = Math.ceil((lockUntil - Date.now()) / 1000);
  if (left <= 0) {
    clearInterval(timer);
    timer = null;
    tries = 0;
    ss("sp2_lock", null);
    $("go").disabled = false;
    $("msg").textContent = "";
    return;
  }
  $("go").disabled = true;
  $("msg").textContent =
    "Demasiados intentos. Espera " + left + " s para volver a intentar.";
}

if (lockUntil > Date.now()) {
  tickLock();
  timer = setInterval(tickLock, 1000);
}

function login() {
  if (lockUntil > Date.now()) return;
  var u = $("usr").value.trim(),
    p = $("pwd").value;
  if (!u || !p) {
    bad("Escribe tu usuario y tu contraseña.", !u ? "u" : "p");
    (!u ? $("usr") : $("pwd")).focus();
    return;
  }
  if (u.toLowerCase() === ADMIN_USER.toLowerCase() && p === ADMIN_PASS) {
    if (ss("sp2_admin", "1") === null) {
      bad(
        "El navegador bloquea el almacenamiento de sesión. Actívalo para continuar.",
      );
      return;
    }
    location.href = "ADMINISTRADOR.html";
    return;
  }
  tries++;
  $("pwd").value = "";
  if (tries >= MAX_TRIES) {
    lockUntil = Date.now() + LOCK_SECONDS * 1000;
    ss("sp2_lock", String(lockUntil));
    tickLock();
    timer = setInterval(tickLock, 1000);
    return;
  }
  bad(
    "Usuario o contraseña incorrectos. Intentos restantes: " +
      (MAX_TRIES - tries) +
      ".",
  );
  $("pwd").focus();
}
