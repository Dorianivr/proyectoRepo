function isEmp(p) {
  return (ld("sp2_emp") || []).some(function (e) {
    return norm(e.plate) === norm(p);
  });
}

/* Entrada de placa */
$("pin").addEventListener("input", function () {
  this.value = fmtPlate(this.value.slice(0, 8));
  $("plate").classList.remove("err");
  $("msg").textContent = "";
});

$("pin").addEventListener("keydown", function (e) {
  if (e.key === "Enter") go();
});

$("go").addEventListener("click", go);

/* Al registrar, se abre el boleto (boleto.html) */
function show(r, dup) {
  sv("sp2_last", { code: r.code, dup: dup });
  location.href =
    "boleto.html?b=" + encodeURIComponent(r.code) + (dup ? "&d=1" : "");
}

function fail(m) {
  $("plate").classList.add("err");
  $("msg").textContent = m;
  $("pin").focus();
}

function go() {
  var raw = norm($("pin").value);
  if (raw.length < 5) {
    fail("Escribe la placa completa (mínimo 5 caracteres).");
    return;
  }
  var a = all(),
    r = a.filter(function (x) {
      return active(x) && norm(x.plate) === raw;
    })[0];
  if (r && r.status === "in") {
    show(r, true);
    return;
  }
  if (r && r.status === "reserved") {
    if (Date.now() < r.start - TOL) {
      fail(
        "Tu reserva empieza a las " +
          hhmm(r.start) +
          ". El acceso abre 15 min antes.",
      );
      return;
    }
    r.status = "in";
    r.checkin = Date.now();
    sv("sp2_res", a);
    show(r, false);
    return;
  }
  var spot = firstFree();
  if (!spot) {
    fail("El estacionamiento está lleno por ahora.");
    return;
  }
  var n = Date.now(),
    w = {
      code: "SP-" + Math.floor(1000 + Math.random() * 9000),
      plate: fmtPlate(raw),
      spot: spot,
      start: n,
      checkin: n,
      status: "in",
      walkin: true,
    };
  a.push(w);
  sv("sp2_res", a);
  show(w, false);
}

$("pin").focus();
