/* ---- Gráfica de entradas por día ---- */
function renderChart() {
  var h = ld("sp2_hist");
  if (!h) {
    h = [38, 24, 41, 22, 35, 47, 52];
    sv("sp2_hist", h);
  }
  h = h.slice();
  var now = new Date(),
    idx = (now.getDay() + 6) % 7,
    t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(),
    today = 0;
  all().forEach(function (r) {
    if (r.checkin && r.checkin >= t0) today++;
  });
  h[idx] += today;
  var top = Math.ceil((Math.max.apply(null, h) + 1) / 10) * 10,
    x0 = 46,
    y0 = 170,
    ph = 140,
    pw = 340,
    st = pw / 7,
    bw = 30,
    D = ["L", "M", "M", "J", "V", "S", "D"],
    s = "";
  for (var k = 0; k <= 4; k++) {
    var y = y0 - (ph * k) / 4;
    s +=
      '<line class="gl" x1="' +
      x0 +
      '" x2="' +
      (x0 + pw) +
      '" y1="' +
      y +
      '" y2="' +
      y +
      '"/><text class="ax" x="' +
      (x0 - 6) +
      '" y="' +
      (y + 4) +
      '" text-anchor="end">' +
      Math.round((top * k) / 4) +
      "</text>";
  }
  h.forEach(function (v, i) {
    var bh = (ph * v) / top,
      x = x0 + st * i + (st - bw) / 2;
    s +=
      '<rect class="bar' +
      (i === idx ? " today" : "") +
      '" x="' +
      x +
      '" y="' +
      (y0 - bh) +
      '" width="' +
      bw +
      '" height="' +
      bh +
      '" rx="3"><title>' +
      v +
      " entradas</title></rect>" +
      '<text class="bv" x="' +
      (x + bw / 2) +
      '" y="' +
      (y0 - bh - 4) +
      '">' +
      v +
      '</text><text class="ax" style="font-size:13px;font-weight:' +
      (i === idx ? 700 : 400) +
      '" x="' +
      (x + bw / 2) +
      '" y="190" text-anchor="middle">' +
      D[i] +
      "</text>";
  });
  s +=
    '<text class="ax" transform="rotate(-90 11 100)" x="11" y="100" text-anchor="middle">Vehículos</text>';
  $("chart").innerHTML = s;
}

/* ---- Cajones libres ---- */
function renderFree() {
  var free = 0,
    resv = 0,
    busy = 0,
    h = "";
  AREAS.forEach(function (a) {
    var f = [];
    ids(a.id).forEach(function (i) {
      var s = stateOf(i);
      if (s === "free") {
        free++;
        f.push(i);
      } else if (s === "resv") resv++;
      else busy++;
    });
    h +=
      '<div class="ag"><b>' +
      a.n +
      '</b><div class="chips">' +
      (f.length
        ? f
            .map(function (i) {
              return (
                '<button class="chip" data-id="' + i + '">' + i + "</button>"
              );
            })
            .join("")
        : "<em>Sin cajones libres</em>") +
      "</div></div>";
  });
  $("free").innerHTML = h;
  $("kpis").innerHTML =
    '<div class="kpi"><b>' +
    free +
    '</b>Libres</div><div class="kpi"><b>' +
    resv +
    '</b>Reservados</div><div class="kpi"><b>' +
    busy +
    "</b>Ocupados</div>";
  var cur = $("selCajon").value,
    o = '<option value="">Selecciona cajón</option>';
  AREAS.forEach(function (a) {
    var f = ids(a.id).filter(function (i) {
      return stateOf(i) === "free";
    });
    if (f.length)
      o +=
        '<optgroup label="' +
        a.n +
        '">' +
        f
          .map(function (i) {
            return "<option>" + i + "</option>";
          })
          .join("") +
        "</optgroup>";
  });
  $("selCajon").innerHTML = o;
  if (cur && stateOf(cur) === "free") $("selCajon").value = cur;
}

$("free").addEventListener("click", function (e) {
  var b = e.target.closest(".chip");
  if (!b) return;
  $("selCajon").value = b.dataset.id;
  $("reservar").scrollIntoView({ behavior: "smooth" });
  $("resPlate").focus({ preventScroll: true });
});

/* ---- Reservar ---- */
$("resPlate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
});

$("resBtn").addEventListener("click", function () {
  var sp = $("selCajon").value,
    pl = $("resPlate").value.trim().toUpperCase(),
    m = $("resMsg");
  m.className = "msg";
  if (!sp) {
    m.textContent = "Selecciona un cajón.";
    return;
  }
  if (pl.length < 5) {
    m.textContent = "Escribe la placa completa (mínimo 5 caracteres).";
    return;
  }
  if (stateOf(sp) !== "free") {
    m.textContent = "Ese cajón ya no está libre.";
    renderAll();
    return;
  }
  var a = all(),
    code = "SP-" + Math.floor(1000 + Math.random() * 9000);
  a.push({
    code: code,
    plate: pl,
    spot: sp,
    start: Date.now(),
    status: "reserved",
  });
  sv("sp2_res", a);
  $("resPlate").value = "";
  m.className = "msg ok";
  m.textContent =
    "Cajón " +
    sp +
    " reservado para " +
    pl +
    " (código " +
    code +
    "). Tiene 15 min para llegar.";
  renderAll();
});

/* ---- Reservas activas ---- */
function renderActive() {
  var rows = all()
    .filter(active)
    .sort(function (a, b) {
      return a.spot < b.spot ? -1 : 1;
    });
  $("act").innerHTML = rows.length
    ? rows
        .map(function (r) {
          var inn = r.status === "in";
          return (
            "<tr><td><b>" +
            r.spot +
            '</b></td><td class="mono">' +
            esc(r.plate) +
            (isEmp(r.plate) ? '<span class="tag e">Empleado</span>' : "") +
            '</td><td><span class="tag ' +
            (inn ? "o" : "r") +
            '">' +
            (inn ? "Ocupado" : "Reservado") +
            "</span></td><td>" +
            hhmm(inn ? r.checkin : r.start) +
            "</td>" +
            '<td class="act">' +
            (inn
              ? ""
              : '<button class="btn sm" data-a="in" data-c="' +
                r.code +
                '">Check-in</button>') +
            '<button class="btn sm out" data-a="' +
            (inn ? "out" : "cancel") +
            '" data-c="' +
            r.code +
            '">' +
            (inn ? "Registrar salida" : "Cancelar") +
            "</button></td></tr>"
          );
        })
        .join("")
    : '<tr><td colspan="5" class="empty">No hay reservas activas.</td></tr>';
}

function cost(r) {
  return Math.max(1, Math.ceil((Date.now() - r.checkin) / H)) * RATE;
}

function apply(code, act) {
  var a = all(),
    r = a.filter(function (x) {
      return x.code === code;
    })[0],
    m = $("actMsg");
  m.className = "msg";
  m.textContent = "";
  if (
    !r ||
    !active(r) ||
    (act === "in" && r.status !== "reserved") ||
    (act === "out" && r.status !== "in")
  ) {
    m.textContent = "Esa reserva ya cambió. Se actualizó la lista.";
    renderAll();
    return;
  }
  m.className = "msg ok";
  if (act === "in") {
    r.status = "in";
    r.checkin = Date.now();
    m.textContent = "Check-in registrado: " + r.plate + " en " + r.spot + ".";
  } else if (act === "cancel") {
    r.status = "cancelled";
    m.textContent =
      "Reserva de " +
      r.plate +
      " cancelada. El cajón " +
      r.spot +
      " quedó libre.";
  } else {
    var c = cost(r);
    r.status = "done";
    m.textContent =
      "Salida de " +
      r.plate +
      " (" +
      r.spot +
      "). Total: $" +
      c +
      " MXN" +
      (isEmp(r.plate) ? " (empleado: revisar si aplica descuento)." : ".");
  }
  sv("sp2_res", a);
  renderAll();
}

$("act").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-a]");
  if (!b) return;
  var act = b.dataset.a,
    code = b.dataset.c,
    r = all().filter(function (x) {
      return x.code === code;
    })[0];
  if (!r) return;
  var who = '<b class="mono">' + esc(r.plate) + "</b>",
    sp = "<b>" + r.spot + "</b>",
    go = function () {
      apply(code, act);
    };
  $("actMsg").textContent = "";
  if (act === "in")
    ask({
      title: "Confirmar check-in",
      body: "¿Registrar la entrada de " + who + " en el cajón " + sp + "?",
      ok: "Sí, registrar entrada",
      fn: go,
    });
  else if (act === "cancel")
    ask({
      title: "Cancelar reserva",
      body:
        "Vas a cancelar la reserva de " +
        who +
        " en el cajón " +
        sp +
        ". El cajón quedará libre y <b>esta acción no se puede deshacer</b>.",
      ok: "Sí, cancelar reserva",
      danger: 1,
      fn: go,
    });
  else
    ask({
      title: "Registrar salida",
      body:
        "¿Confirmas la salida de " +
        who +
        " del cajón " +
        sp +
        "?<br>Total a pagar: <b>$" +
        cost(r) +
        " MXN</b>. El cajón quedará libre.",
      ok: "Sí, registrar salida",
      danger: 1,
      fn: go,
    });
});

/* ---- Empleados ---- */
$("empPlate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
});

function renderEmp() {
  var e = emps();
  $("emp").innerHTML = e.length
    ? e
        .map(function (x, i) {
          return (
            "<tr><td>" +
            esc(x.name) +
            '</td><td class="mono">' +
            esc(x.plate) +
            '</td><td class="act"><button class="btn sm out" data-i="' +
            i +
            '">Quitar</button></td></tr>'
          );
        })
        .join("")
    : '<tr><td colspan="3" class="empty">Aún no hay empleados registrados.</td></tr>';
}

$("empBtn").addEventListener("click", function () {
  var n = $("empName").value.trim(),
    p = $("empPlate").value.trim().toUpperCase(),
    m = $("empMsg");
  m.className = "msg";
  if (!n) {
    m.textContent = "Escribe el nombre.";
    return;
  }
  if (p.length < 5) {
    m.textContent = "Escribe la placa completa (mínimo 5 caracteres).";
    return;
  }
  if (isEmp(p)) {
    m.textContent = "Esa placa ya está registrada.";
    return;
  }
  var e = emps();
  e.push({ name: n, plate: p });
  sv("sp2_emp", e);
  $("empName").value = "";
  $("empPlate").value = "";
  m.className = "msg ok";
  m.textContent = "Empleado registrado.";
  renderAll();
});

$("emp").addEventListener("click", function (ev) {
  var b = ev.target.closest("button[data-i]");
  if (!b) return;
  var x = emps()[+b.dataset.i];
  if (!x) return;
  ask({
    title: "Eliminar empleado",
    body:
      "Vas a quitar a <b>" +
      esc(x.name) +
      '</b> (<b class="mono">' +
      esc(x.plate) +
      "</b>) de la lista de empleados. <b>Esta acción no se puede deshacer</b>.",
    ok: "Sí, eliminar",
    danger: 1,
    fn: function () {
      var e = emps().filter(function (y) {
        return y.plate !== x.plate;
      });
      sv("sp2_emp", e);
      $("empMsg").className = "msg ok";
      $("empMsg").textContent = "Empleado eliminado.";
      renderAll();
    },
  });
});

/* ---- Confirmación antes de eliminar o modificar ---- */
var pending = null;

function ask(o) {
  $("dTitle").textContent = o.title;
  $("dBody").innerHTML = o.body;
  $("dOk").textContent = o.ok;
  pending = o.fn;
  $("dlg").showModal();
  (o.danger ? $("dNo") : $("dOk")).focus();
}

$("dNo").addEventListener("click", function () {
  pending = null;
  $("dlg").close();
});

$("dOk").addEventListener("click", function () {
  var f = pending;
  pending = null;
  $("dlg").close();
  if (f) f();
});

$("dlg").addEventListener("click", function (e) {
  if (e.target === this) {
    pending = null;
    this.close();
  }
});

$("dlg").addEventListener("close", function () {
  pending = null;
});

/* ---- Menú ---- */
$("menuBtn").addEventListener("click", function () {
  var o = $("nav").classList.toggle("hidden");
  this.setAttribute("aria-expanded", String(!o));
});

$("nav").addEventListener("click", function (e) {
  if (e.target.tagName === "A") {
    $("nav").classList.add("hidden");
    $("menuBtn").setAttribute("aria-expanded", "false");
  }
});

$("logout").addEventListener("click", function () {
  ask({
    title: "Cerrar sesión",
    body: "Saldrás del panel de administrador y tendrás que iniciar sesión de nuevo.",
    ok: "Sí, cerrar sesión",
    fn: function () {
      try {
        sessionStorage.removeItem("sp2_admin");
      } catch (e) {}
      location.href = "accesoadmin.html";
    },
  });
});

function renderAll() {
  renderChart();
  renderFree();
  renderActive();
  renderEmp();
}

renderAll();

setInterval(renderAll, 5000);

window.addEventListener("storage", renderAll); // se actualiza si el usuario reserva en otra pestaña
