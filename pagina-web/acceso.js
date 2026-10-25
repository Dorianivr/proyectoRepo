/* acceso.js · Entrada de placa */

function showFree() {
  const n = countFree();
  const el = $("freeInfo");
  el.textContent = n ? n + " de 48 cajones libres" : "Estacionamiento lleno";
  el.classList.toggle("none", !n);
}

$("pin").addEventListener("input", function () {
  this.value = fmtPlate(this.value.slice(0, 8));
  $("plate").classList.remove("err");
  $("msg").textContent = "";
});

$("pin").addEventListener("keydown", (e) => {
  if (e.key === "Enter") go();
});

$("go").addEventListener("click", go);

/* Al registrar, se abre el boleto */
function show(r, dup) {
  sv(KEY.last, { code: r.code, dup: dup });
  location.href = "boleto.html?b=" + encodeURIComponent(r.code) + (dup ? "&d=1" : "");
}

function fail(m) {
  $("plate").classList.add("err");
  $("msg").textContent = m;
  $("pin").focus();
}

function go() {
  const raw = norm($("pin").value);
  if (raw.length < 5) {
    fail("Escribe la placa completa (mínimo 5 caracteres).");
    return;
  }
  const a = all();
  const r = a.find((x) => active(x) && norm(x.plate) === raw);

  if (r && r.status === "in") {
    show(r, true);
    return;
  }

  if (r && r.status === "reserved") {
    if (Date.now() < r.start - TOL) {
      fail("Tu reserva empieza a las " + hhmm(r.start) + ". El acceso abre 15 min antes.");
      return;
    }
    r.status = "in";
    r.checkin = Date.now();
    sv(KEY.res, a);
    show(r, false);
    return;
  }

  const spot = firstFree();
  if (!spot) {
    fail("El estacionamiento está lleno por ahora.");
    return;
  }
  const n = Date.now();
  const w = {
    code: newCode(),
    plate: fmtPlate(raw),
    spot: spot,
    start: n,
    checkin: n,
    status: "in",
    walkin: true,
  };
  a.push(w);
  sv(KEY.res, a);
  show(w, false);
}

showFree();
$("pin").focus();
