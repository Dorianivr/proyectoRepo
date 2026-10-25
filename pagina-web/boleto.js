/* boleto.js · Boleto digital, pago y descarga */

/* El boleto se busca por el código que manda la pantalla de acceso */
const params = new URLSearchParams(location.search);
let tkCode = params.get("b");
let tkDup = params.get("d") === "1";

if (!tkCode) {
  const l = ld(KEY.last);
  if (l) {
    tkCode = l.code;
    tkDup = !!l.dup;
  }
}

const getRec = () =>
  tkCode ? (ld(KEY.res) || []).find((x) => x.code === tkCode && x.checkin) || null : null;

let staticDone = false;
let payKey = "";

function renderStatic(r) {
  $("rCode").textContent = r.code;
  $("rPlate").textContent = fmtPlate(r.plate);
  $("plLbl").textContent = "Placa registrada";
  if (isEmp(r.plate)) {
    const t = document.createElement("span");
    t.className = "tag";
    t.textContent = "EMPLEADO";
    $("plLbl").appendChild(t);
  }
  $("rSpot").textContent = r.spot.charAt(0) + "-" + r.spot.slice(1);
  $("rArea").textContent = "Área " + r.spot.charAt(0) + " · Nivel 1";
  $("rTime").textContent = new Date(r.checkin).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  $("bar").innerHTML = barcodeSvg(r.code, 60);
  $("barNum").textContent = r.code;
  staticDone = true;
}

function render() {
  const r = getRec();
  if (!r) {
    $("none").classList.remove("hidden");
    $("ok").classList.add("hidden");
    return;
  }
  $("none").classList.add("hidden");
  $("ok").classList.remove("hidden");
  if (!staticDone) renderStatic(r);

  const due = dueOf(r);
  const paid = paidOf(r);
  const done = r.status === "done";
  const settled = due === 0 && paid > 0;

  /* Título y etiqueta según el estado */
  if (done) {
    $("rTitle").textContent = "Salida registrada";
    $("rSub").textContent = "Gracias por visitarnos";
  } else if (settled) {
    $("rTitle").textContent = "Pago registrado";
    $("rSub").textContent = "Ya puedes salir";
  } else {
    $("rTitle").textContent = tkDup ? "Ya estás dentro" : "¡Ingreso exitoso!";
    $("rSub").textContent = tkDup ? "Este es tu boleto digital" : "Conserva este boleto digital";
  }
  const pill = $("rPill");
  pill.textContent = done ? "SALIDA" : settled ? "PAGADO" : "ENTRADA";
  pill.className = "pill" + (done ? " out" : settled ? " paid" : "");

  /* Tiempo y total */
  $("rDur").textContent = fmtDur((r.exitAt || Date.now()) - r.checkin);
  const showPaid = done || settled;
  $("rTotLbl").textContent = showPaid ? "Total pagado" : paid > 0 ? "Por pagar" : "Total a pagar";
  $("rTotal").textContent = "$" + (showPaid ? paid : due);
  document.querySelector(".tot").classList.toggle("paid", showPaid);

  renderPay(r, due, paid, done, settled);
}

function renderPay(r, due, paid, done, settled) {
  const key = [r.status, due, paid].join("|");
  if (key === payKey) return;
  payKey = key;
  const box = $("payBox");
  box.className = "card pay" + (done || settled ? " ok" : "");
  const receipt = `<button class="btn ghost block" type="button" data-dl>Descargar recibo</button>`;

  if (done) {
    box.innerHTML = `<h2>Salida registrada</h2><p class="sub">Pagaste <b>${money(paid)}</b>. ¡Gracias por visitarnos!</p>${receipt}`;
  } else if (due > 0) {
    box.innerHTML =
      `<h2>Pagar estacionamiento</h2>` +
      `<div class="amt">$${due}<small> MXN</small></div>` +
      `<p class="sub">Tarifa $${RATE}/h · se cobra por hora iniciada` +
      (paid > 0 ? ` · ya pagaste ${money(paid)}` : "") +
      `</p>` +
      `<button class="btn block" type="button" id="payBtn">` +
      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>` +
      `Pagar en línea</button>` +
      `<p class="note">Te llevaremos a una pasarela de pago segura. SmartPark no guarda tus datos de tarjeta.<br>¿Prefieres efectivo? Paga en la caseta mostrando este boleto.</p>`;
  } else {
    const until = graceUntil(r);
    box.innerHTML =
      `<h2 class="stamp">✓ Pago registrado</h2>` +
      `<p class="sub">Pagaste <b>${money(paid)}</b>` +
      (until ? `. Tienes hasta las <b>${hhmm(until)}</b> para salir sin cargo extra.` : ".") +
      `</p>${receipt}`;
  }
}

$("payBox").addEventListener("click", (e) => {
  if (e.target.closest("#payBtn")) openPay();
  if (e.target.closest("[data-dl]")) downloadTicket();
});

/* ---------- Pago: se envía a la pasarela (simulada) y se regresa aquí ---------- */
function openPay() {
  const r = getRec();
  if (!r) return;
  const due = dueOf(r);
  if (due <= 0) return render();
  const ok = startCheckout({
    kind: "ticket",
    amount: due,
    label: "Estacionamiento · boleto " + r.code,
    returnUrl: "boleto.html?b=" + encodeURIComponent(r.code),
    payload: { code: r.code },
  });
  if (!ok) toast("No se pudo iniciar el pago. Activa el almacenamiento del navegador.", "bad");
}

/* Resultado al volver de la pasarela. Solo se guarda método, monto y folio. */
(function () {
  const res = takeCheckoutResult("ticket");
  if (!res) return;
  if (res.status === "ok") {
    addPayment(res.payload.code, "tarjeta", { amount: res.amount, ref: res.folio });
    toast(`Pago de ${money(res.amount)} aprobado. Folio ${res.folio}.`, "ok");
  } else {
    toast(checkoutMsg(res), "bad");
  }
})();

/* ---------- Descargar boleto / recibo como PNG ---------- */
function downloadTicket() {
  const r = getRec();
  if (!r) return;
  const paid = paidOf(r);
  const due = dueOf(r);
  const settled = paid > 0 && due === 0;
  const end = r.exitAt || Date.now();
  const W = 720;
  const Hh = 1120;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = Hh;
  const x = c.getContext("2d");
  const M = "ui-monospace,Menlo,Consolas,monospace";

  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, Hh);
  x.strokeStyle = "#f5c400";
  x.lineWidth = 14;
  x.strokeRect(7, 7, W - 14, Hh - 14);

  x.textAlign = "center";
  x.fillStyle = "#111";
  x.font = "800 54px system-ui,sans-serif";
  x.fillText("SMARTPARK", W / 2, 110);
  x.fillStyle = "#6b7790";
  x.font = "600 26px system-ui,sans-serif";
  x.fillText(settled || r.status === "done" ? "Recibo de pago" : "Boleto digital de entrada", W / 2, 155);

  x.textAlign = "left";
  function line(l, v, y, col, sz) {
    x.fillStyle = "#6b7790";
    x.font = "600 22px system-ui,sans-serif";
    x.fillText(l, 70, y);
    x.fillStyle = col || "#1c2333";
    x.font = "700 " + (sz || 40) + "px " + M;
    x.fillText(v, 70, y + 46);
  }
  line("BOLETO #", r.code, 225);
  line("PLACA REGISTRADA", fmtPlate(r.plate), 335);
  line("CAJÓN ASIGNADO", r.spot.charAt(0) + "-" + r.spot.slice(1) + "  (Área " + r.spot.charAt(0) + ")", 445, "#b86a00", 44);
  line("HORA DE ENTRADA", new Date(r.checkin).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" }), 555);
  line("TIEMPO DENTRO", fmtDur(end - r.checkin), 665);
  if (paid > 0 && due === 0) line("TOTAL PAGADO", money(paid), 775, "#15704a", 44);
  else line("TOTAL A PAGAR", money(due), 775, "#1c2333", 44);

  /* Código de barras */
  const u = code39(r.code);
  const total = u.reduce((s, p) => s + p[0], 0);
  const mod = Math.floor((W - 140) / total);
  let bx = Math.round((W - mod * total) / 2);
  x.fillStyle = "#111";
  u.forEach(([w, bar]) => {
    if (bar) x.fillRect(bx, 880, w * mod, 130);
    bx += w * mod;
  });
  x.textAlign = "center";
  x.fillStyle = "#6b7790";
  x.font = "600 26px " + M;
  x.fillText(r.code, W / 2, 1050);

  const a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = (settled ? "recibo-" : "ticket-") + r.code + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

$("dl").addEventListener("click", downloadTicket);

render();
setInterval(render, 1000);
window.addEventListener("storage", () => {
  payKey = "";
  render();
});
