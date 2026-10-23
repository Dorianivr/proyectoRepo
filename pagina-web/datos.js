/* datos.js · Datos y funciones que comparten todas las pantallas de SmartPark.
   Se carga ANTES del .js de cada página. */
var $ = function (i) {
  return document.getElementById(i);
};
var TOL = 15 * 60000; // tolerancia: 15 minutos
var RATE = 15; // tarifa: $15 MXN por hora
var H = 3600000; // una hora en milisegundos

var AREAS = [
  { id: "A", n: "Área A", c: "#2f6fed" },
  { id: "B", n: "Área B", c: "#1f9d55" },
  { id: "C", n: "Área C", c: "#d63b3b" },
  { id: "D", n: "Área D", c: "#8e4ee0" },
  { id: "E", n: "Área E", c: "#c9661a" },
  { id: "F", n: "Área F", c: "#0f8a90" },
];

function areaById(id) {
  return AREAS.filter(function (a) {
    return a.id === id;
  })[0];
}

function ids(a) {
  var o = [];
  for (var i = 1; i <= 8; i++) o.push(a + "0" + i);
  return o;
}

/* ---------- Almacenamiento (en el celular; ver nota para base de datos real) ---------- */
function ld(k) {
  try {
    var v = localStorage.getItem(k);
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
}

function sv(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch (e) {}
}

function rm(k) {
  try {
    localStorage.removeItem(k);
  } catch (e) {}
}

function seed() {
  var n = Date.now();
  return [
    {
      code: "SP-0001",
      plate: "DEMO1",
      spot: "A03",
      start: n - H,
      checkin: n - H,
      status: "in",
    },
    {
      code: "SP-0002",
      plate: "DEMO2",
      spot: "B02",
      start: n - 30 * 60000,
      checkin: n - 25 * 60000,
      status: "in",
    },
    {
      code: "SP-0003",
      plate: "DEMO3",
      spot: "A05",
      start: n + 30 * 60000,
      status: "reserved",
    },
    {
      code: "SP-0004",
      plate: "DEMO4",
      spot: "B04",
      start: n + H,
      status: "reserved",
    },
    {
      code: "SP-0005",
      plate: "DEMO5",
      spot: "C01",
      start: n - 2 * 60000,
      checkin: n - 60000,
      status: "in",
    },
    {
      code: "SP-0006",
      plate: "DEMO6",
      spot: "D06",
      start: n + 10 * 60000,
      status: "reserved",
    },
    {
      code: "SP-0007",
      plate: "DEMO7",
      spot: "E02",
      start: n - H * 2,
      checkin: n - H * 2,
      status: "in",
    },
    {
      code: "SP-0008",
      plate: "DEMO8",
      spot: "F08",
      start: n + 20 * 60000,
      status: "reserved",
    },
  ];
}

function all() {
  var r = ld("sp2_res");
  if (!r) {
    r = seed();
    sv("sp2_res", r);
  }
  return r;
}

function mine() {
  var c = ld("sp2_mine");
  return c
    ? all().filter(function (r) {
        return r.code === c;
      })[0] || null
    : null;
}

function update(r) {
  sv(
    "sp2_res",
    all().map(function (x) {
      return x.code === r.code ? r : x;
    }),
  );
}

/* ---------- Disponibilidad ---------- */
function active(r) {
  if (r.status === "cancelled" || r.status === "expired" || r.status === "done")
    return false;
  if (r.status === "reserved" && Date.now() > r.start + TOL) return false;
  return true;
}

function stateOf(id) {
  var st = "free";
  all().forEach(function (r) {
    if (r.spot === id && active(r)) {
      if (r.status === "in") st = "busy";
      else if (st !== "busy") st = "resv";
    }
  });
  return st;
}

/* ---------- Formulario ---------- */
function two(n) {
  return n < 10 ? "0" + n : "" + n;
}

/* ---------- Boleto ---------- */
function hhmm(t) {
  var d = new Date(t);
  return two(d.getHours()) + ":" + two(d.getMinutes());
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[c];
  });
}

function emps() {
  return ld("sp2_emp") || [];
}

function norm(p) {
  return String(p)
    .replace(/[^A-Za-z0-9]/g, "")
    .toUpperCase();
}

function fmtPlate(p) {
  var r = norm(p);
  return r.length > 3 ? r.slice(0, 3) + "-" + r.slice(3) : r;
}

function firstFree() {
  var L = "ABCDEF";
  for (var a = 0; a < 6; a++)
    for (var i = 1; i <= 8; i++) {
      var id = L[a] + "0" + i;
      if (stateOf(id) === "free") return id;
    }
  return null;
}

function isEmp(p) {
  return emps().some(function (e) {
    return e.plate === p;
  });
}
