/* datos.js · Datos y funciones que comparten todas las pantallas de SmartPark.
   Se carga ANTES del .js de cada página. */

const $ = (i) => document.getElementById(i);

const TOL = 15 * 60000; // tolerancia: 15 minutos
const RATE = 15; // tarifa: $15 MXN por hora (o fracción)
const H = 3600000; // una hora en milisegundos

/* Mientras no conectes una pasarela de pago real, deja esto en true:
   muestra el aviso "modo demostración" en la ventana de pago. */
const DEMO_PAGOS = true;

/* Llaves de almacenamiento (se conservan los nombres anteriores) */
const KEY = {
  res: "sp2_res",
  mine: "sp2_mine",
  emp: "sp2_emp",
  last: "sp2_last",
  hist: "sp2_hist",
};

const AREAS = [
  { id: "A", n: "Área A", c: "#2f6fed" },
  { id: "B", n: "Área B", c: "#1f9d55" },
  { id: "C", n: "Área C", c: "#d63b3b" },
  { id: "D", n: "Área D", c: "#8e4ee0" },
  { id: "E", n: "Área E", c: "#c9661a" },
  { id: "F", n: "Área F", c: "#ec4899" },
];

function areaById(id) {
  return AREAS.find((a) => a.id === id);
}

function ids(a) {
  const o = [];
  for (let i = 1; i <= 8; i++) o.push(a + "0" + i);
  return o;
}

/* ---------- Almacenamiento (en el navegador; para varios dispositivos
   se necesita una base de datos real) ---------- */
function ld(k) {
  try {
    const v = localStorage.getItem(k);
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
  const n = Date.now();
  return [
    { code: "SP-0001", plate: "DEMO1", spot: "A03", start: n - H, checkin: n - H, status: "in" },
    { code: "SP-0002", plate: "DEMO2", spot: "B02", start: n - 30 * 60000, checkin: n - 25 * 60000, status: "in" },
    { code: "SP-0003", plate: "DEMO3", spot: "A05", start: n + 30 * 60000, status: "reserved" },
    { code: "SP-0004", plate: "DEMO4", spot: "B04", start: n + H, status: "reserved" },
    { code: "SP-0005", plate: "DEMO5", spot: "C01", start: n - 2 * 60000, checkin: n - 60000, status: "in" },
    { code: "SP-0006", plate: "DEMO6", spot: "D06", start: n + 10 * 60000, status: "reserved" },
    { code: "SP-0007", plate: "DEMO7", spot: "E02", start: n - H * 2, checkin: n - H * 2, status: "in" },
    { code: "SP-0008", plate: "DEMO8", spot: "F08", start: n + 20 * 60000, status: "reserved" },
  ];
}

function all() {
  let r = ld(KEY.res);
  if (!r) {
    r = seed();
    sv(KEY.res, r);
  }
  return r;
}

function mine() {
  const c = ld(KEY.mine);
  return c ? all().find((r) => r.code === c) || null : null;
}

function update(r) {
  sv(KEY.res, all().map((x) => (x.code === r.code ? r : x)));
}

function newCode() {
  return "SP-" + Math.floor(1000 + Math.random() * 9000);
}

/* ---------- Disponibilidad ---------- */
function active(r) {
  if (r.status === "hold") return Date.now() < r.holdUntil; // cajón apartado mientras se paga
  if (r.status === "cancelled" || r.status === "expired" || r.status === "done") return false;
  if (r.status === "reserved" && Date.now() > r.start + TOL) return false;
  return true;
}

function stateOf(id) {
  let st = "free";
  all().forEach((r) => {
    if (r.spot === id && active(r)) {
      if (r.status === "in") st = "busy";
      else if (st !== "busy") st = "resv";
    }
  });
  return st;
}

function firstFree() {
  for (const a of AREAS) {
    for (const id of ids(a.id)) if (stateOf(id) === "free") return id;
  }
  return null;
}

function countFree() {
  let n = 0;
  AREAS.forEach((a) => ids(a.id).forEach((i) => stateOf(i) === "free" && n++));
  return n;
}

/* ---------- Formato ---------- */
function two(n) {
  return n < 10 ? "0" + n : "" + n;
}

function hhmm(t) {
  const d = new Date(t);
  return two(d.getHours()) + ":" + two(d.getMinutes());
}

function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? h + " h " + two(m) + " min" : two(m) + ":" + two(s % 60);
}

function money(n) {
  return "$" + n + " MXN";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/* ---------- Placas y empleados ---------- */
function emps() {
  return ld(KEY.emp) || [];
}

function norm(p) {
  return String(p).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function fmtPlate(p) {
  const r = norm(p);
  return r.length > 3 ? r.slice(0, 3) + "-" + r.slice(3) : r;
}

/* Única definición: compara sin importar espacios o guiones */
function isEmp(p) {
  return emps().some((e) => norm(e.plate) === norm(p));
}

/* ---------- Pago en pasarela (simulada) ----------
   Se guarda en sessionStorage solo lo necesario para ir a pagar y volver:
   qué se paga, cuánto y a dónde regresar. Nunca datos de tarjeta. */
const CK = "sp2_checkout";
const CKR = "sp2_checkout_result";

function startCheckout(o) {
  try {
    sessionStorage.setItem(
      CK,
      JSON.stringify({
        id: "CK-" + Date.now().toString(36),
        kind: o.kind,
        amount: o.amount,
        label: o.label,
        returnUrl: o.returnUrl,
        payload: o.payload || {},
        expires: Date.now() + 10 * 60000,
      }),
    );
    sessionStorage.removeItem(CKR);
  } catch (e) {
    return false;
  }
  location.href = "pasarela.html";
  return true;
}

/* Lee (una sola vez) el resultado del pago al volver de la pasarela */
function takeCheckoutResult(kind) {
  try {
    const r = JSON.parse(sessionStorage.getItem(CKR) || "null");
    if (!r || r.kind !== kind) return null;
    sessionStorage.removeItem(CKR);
    return r;
  } catch (e) {
    return null;
  }
}

function checkoutMsg(res) {
  return res.status === "expired"
    ? "La sesión de pago venció. No se hizo ningún cargo."
    : "Pago cancelado. No se hizo ningún cargo.";
}

/* ---------- Tarifa de reservación ----------
   Se paga al reservar y depende del día y la hora de LLEGADA.
   Es independiente de la tarifa por hora de estacionamiento.
   Para cambiar los precios, edita los números de esta función. */
function reservationFee(ts) {
  const d = new Date(ts);
  const dow = d.getDay(); // 0 = domingo ... 6 = sábado
  const h = d.getHours() + d.getMinutes() / 60;
  if (h >= 22 || h < 6) return { amount: 15, label: "Horario nocturno" };
  if ((dow === 5 || dow === 6) && h >= 18) return { amount: 40, label: "Noche de viernes o sábado" };
  if ((dow === 0 || dow === 6) && h >= 10 && h < 18) return { amount: 35, label: "Fin de semana" };
  if (dow >= 1 && dow <= 5 && ((h >= 7 && h < 10) || (h >= 17 && h < 20))) return { amount: 30, label: "Hora pico" };
  return { amount: 20, label: "Tarifa base" };
}

/* ---------- Cobro ----------
   Se cobra por hora iniciada. Tras pagar hay 15 min (TOL) para salir
   sin cargo extra; pasado ese tiempo se cobra la diferencia. */
function costOf(r, t) {
  const end = t || r.exitAt || Date.now();
  return Math.max(1, Math.ceil((end - r.checkin) / H)) * RATE;
}

function paidOf(r) {
  return (r.payments || []).reduce((s, p) => s + p.amount, 0);
}

function dueOf(r) {
  if (!r.checkin || r.status === "done") return 0;
  const pays = r.payments || [];
  if (pays.length) {
    const last = pays[pays.length - 1].at;
    if (Date.now() <= last + TOL) return Math.max(0, costOf(r, last) - paidOf(r));
  }
  return Math.max(0, costOf(r) - paidOf(r));
}

/* Hora límite para salir después de haber pagado (o null) */
function graceUntil(r) {
  const pays = r.payments || [];
  if (!pays.length || dueOf(r) > 0) return null;
  return pays[pays.length - 1].at + TOL;
}

/* Registra un pago por el saldo pendiente. Guarda SOLO método, monto y
   últimos 4 dígitos; nunca el número completo, el vencimiento ni el CVV. */
function addPayment(code, method, extra) {
  const a = all();
  const r = a.find((x) => x.code === code);
  if (!r || !r.checkin) return null;
  const amount = dueOf(r);
  if (amount <= 0) return r;
  (r.payments = r.payments || []).push(
    Object.assign({ at: Date.now(), amount: amount, method: method }, extra || {}),
  );
  sv(KEY.res, a);
  return r;
}

function exitRecord(code) {
  const a = all();
  const r = a.find((x) => x.code === code);
  if (!r) return null;
  r.status = "done";
  r.exitAt = Date.now();
  sv(KEY.res, a);
  return r;
}

/* ---------- Tarjetas (validación) ---------- */
function luhn(n) {
  if (!/^\d{13,19}$/.test(n)) return false;
  let s = 0;
  let alt = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = +n[i];
    if (alt) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    s += d;
    alt = !alt;
  }
  return s % 10 === 0;
}

function cardBrand(n) {
  if (/^4/.test(n)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "Mastercard";
  if (/^3[47]/.test(n)) return "Amex";
  return "Tarjeta";
}

/* ---------- Código de barras (Code 39) ---------- */
const C39 = {
  0: "nnnwwnwnn", 1: "wnnwnnnnw", 2: "nnwwnnnnw", 3: "wnwwnnnnn", 4: "nnnwwnnnw",
  5: "wnnwwnnnn", 6: "nnwwwnnnn", 7: "nnnwnnwnw", 8: "wnnwnnwnn", 9: "nnwwnnwnn",
  A: "wnnnnwnnw", B: "nnwnnwnnw", C: "wnwnnwnnn", D: "nnnnwwnnw", E: "wnnnwwnnn",
  F: "nnwnwwnnn", G: "nnnnnwwnw", H: "wnnnnwwnn", I: "nnwnnwwnn", J: "nnnnwwwnn",
  K: "wnnnnnnww", L: "nnwnnnnww", M: "wnwnnnnwn", N: "nnnnwnnww", O: "wnnnwnnwn",
  P: "nnwnwnnwn", Q: "nnnnnnwww", R: "wnnnnnwwn", S: "nnwnnnwwn", T: "nnnnwnwwn",
  U: "wwnnnnnnw", V: "nwwnnnnnw", W: "wwwnnnnnn", X: "nwnnwnnnw", Y: "wwnnwnnnn",
  Z: "nwwnwnnnn", "-": "nwnnnnwnw", ".": "wwnnnnwnn", " ": "nwwnnnwnn", "*": "nwnnwnwnn",
};

/* Lista de [ancho en módulos, es_barra] */
function code39(text) {
  const out = [];
  for (const ch of "*" + String(text).toUpperCase() + "*") {
    const p = C39[ch];
    if (!p) continue;
    for (let i = 0; i < 9; i++) out.push([p[i] === "w" ? 3 : 1, i % 2 === 0]);
    out.push([1, false]);
  }
  return out;
}

function barcodeSvg(text, h) {
  const u = code39(text);
  const W = u.reduce((s, x) => s + x[0], 0);
  let x = 0;
  let r = "";
  u.forEach(([w, bar]) => {
    if (bar) r += `<rect x="${x}" y="0" width="${w}" height="${h}"/>`;
    x += w;
  });
  return `<svg viewBox="0 0 ${W} ${h}" preserveAspectRatio="none" width="100%" height="100%" role="img" aria-label="Código de barras ${esc(text)}" fill="#111">${r}</svg>`;
}

/* ---------- Mapa de cajones de un área ----------
   Cada cajón muestra su estado con color Y con texto (no solo color). */
function setHtml(el, h) {
  if (el._h !== h) {
    el.innerHTML = h;
    el._h = h;
  }
}

function draw(svgId, aid, sel, interactive) {
  const a = areaById(aid);
  let h = `<rect class="floor" x="0" y="94" width="400" height="22" rx="4"/><text x="345" y="109" class="sl dim">→ entrada</text>`;
  ids(aid).forEach((id, i) => {
    const x = 17 + (i % 4) * 94;
    const y = i < 4 ? 22 : 118;
    const st = stateOf(id);
    const on = id === sel;
    const can = interactive && (st === "free" || on);
    const tc = on ? " on" : st === "busy" ? " busy" : "";
    const label = on ? "Tu cajón" : st === "free" ? "Libre" : st === "resv" ? "Reservado" : "Ocupado";
    h +=
      `<g${can ? ` tabindex="0" role="button" aria-label="Cajón ${id}, ${label}" data-id="${id}"` : ""}>` +
      `<rect class="sp ${on ? "sel" : st}" x="${x}" y="${y}" width="84" height="70" rx="10"/>` +
      `<rect x="${x + 22}" y="${y + 9}" width="40" height="4" rx="2" fill="${a.c}"/>` +
      `<text class="sl${tc}" x="${x + 42}" y="${y + 40}">${id}</text>` +
      `<text class="sl sub${tc}" x="${x + 42}" y="${y + 58}">${label.toUpperCase()}</text>` +
      `</g>`;
  });
  setHtml($(svgId), h);
}

/* ---------- Avisos ---------- */
function toast(msg, kind) {
  let box = $("toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("aria-live", "polite");
    document.body.appendChild(box);
  }
  const t = document.createElement("div");
  t.className = "toast " + (kind || "");
  if (kind === "bad") t.setAttribute("role", "alert");
  t.textContent = msg;
  box.appendChild(t);
  setTimeout(() => {
    t.classList.add("out");
    setTimeout(() => t.remove(), 260);
  }, 4200);
}

/* ---------- Encabezado y barra inferior ---------- */
const LOGO =
  '<svg width="28" height="28" viewBox="0 0 34 34" fill="none" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l3-6h18l3 6"/><path d="M6 12h22v16H6z"/><path d="M11 28v-7h12v7"/><path d="M14 17h6"/></svg>';

const TABS = [
  {
    id: "entrada",
    href: "acceso.html",
    t: "Entrada",
    i: '<path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5"/><path d="M14 8l4 4-4 4M18 12H8"/>',
  },
  {
    id: "reservar",
    href: "reservaciones.html",
    t: "Reservar",
    i: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  },
  {
    id: "boleto",
    href: "boleto.html",
    t: "Mi boleto",
    i: '<path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  },
];

function mountChrome() {
  const h = document.querySelector("header[data-sub]");
  if (h) {
    h.innerHTML = `<div class="lg" aria-hidden="true">${LOGO}</div><div class="brand"><b>SMART</b><span>PARK</span></div><small>${esc(h.dataset.sub)}</small>`;
  }
  const cur = document.body.dataset.tab;
  if (cur) {
    const nav = document.createElement("nav");
    nav.className = "tabbar";
    nav.setAttribute("aria-label", "Navegación");
    nav.innerHTML = TABS.map(
      (t) =>
        `<a class="tab" href="${t.href}"${t.id === cur ? ' aria-current="page"' : ""}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${t.i}</svg>${t.t}</a>`,
    ).join("");
    document.body.appendChild(nav);
  }
}

mountChrome();
