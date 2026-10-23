var area = null,
  selected = null;

/* ---------- Mapa de cajones de un área ---------- */
function draw(svg, aid, sel, interactive) {
  var a = areaById(aid),
    h =
      '<rect x="0" y="94" width="400" height="22" fill="var(--floor)"/><text x="345" y="109" class="sl" style="font-weight:500;fill:var(--mute)">→ entrada</text>';
  ids(aid).forEach(function (id, i) {
    var x = 17 + (i % 4) * 94,
      y = i < 4 ? 22 : 118,
      st = stateOf(id),
      on = id === sel,
      cls =
        "sp" +
        (on ? " sel" : st === "resv" ? " resv" : st === "busy" ? " busy" : ""),
      can = (interactive && st === "free" && !on) || (interactive && on),
      ink = on || st === "resv" ? "var(--ink)" : "#fff";
    h +=
      "<g" +
      (can
        ? ' tabindex="0" role="button" aria-label="Cajón ' +
          id +
          '" data-id="' +
          id +
          '"'
        : "") +
      ">" +
      '<rect class="' +
      cls +
      '" x="' +
      x +
      '" y="' +
      y +
      '" width="84" height="70" rx="8" fill="' +
      a.c +
      '"/>' +
      '<text class="sl" style="font-size:16px;fill:' +
      ink +
      '" x="' +
      (x + 42) +
      '" y="' +
      (y + 38) +
      '">' +
      id +
      "</text>";
    if (!on && st !== "free")
      h +=
        '<text class="sl" style="font-size:10px;font-weight:600;fill:' +
        ink +
        '" x="' +
        (x + 42) +
        '" y="' +
        (y + 56) +
        '">' +
        (st === "busy" ? "🚗 Ocupado" : "Reservado") +
        "</text>";
    if (on)
      h +=
        '<text x="' +
        (x + 42) +
        '" y="' +
        (y < 90 ? y - 5 : y + 86) +
        '" text-anchor="middle" font-size="16">📍</text>';
    h += "</g>";
  });
  $(svg).innerHTML = h;
}

function startTs() {
  var d = $("date").value,
    t = $("time").value;
  if (!d || !t) return null;
  var s = new Date(d + "T" + t).getTime();
  return isNaN(s) ? null : s;
}

function refresh() {
  $("areas").innerHTML = AREAS.map(function (a) {
    var free = ids(a.id).filter(function (i) {
      return stateOf(i) === "free";
    }).length;
    return (
      '<button type="button" class="area" data-a="' +
      a.id +
      '" aria-pressed="' +
      (a.id === area) +
      '"><span class="sw" style="background:' +
      a.c +
      '">' +
      a.n +
      "</span><small>" +
      free +
      (free === 1 ? " libre" : " libres") +
      "</small></button>"
    );
  }).join("");
  $("hint").classList.toggle("hidden", !!area);
  $("cajones").classList.toggle("hidden", !area);
  if (area) {
    var a = areaById(area);
    $("cTitle").innerHTML =
      "2. Elige tu cajón <span>· " + a.n + ", Nivel 1</span>";
    $("lgFree").style.background = a.c;
    draw("map", area, selected, true);
  }
  $("selTxt").textContent = selected || "ninguno";
}

function initForm() {
  var d = new Date(Date.now() + 15 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  var today =
    d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
  $("date").value = today;
  $("date").min = today;
  $("time").value = two(d.getHours()) + ":" + two(d.getMinutes());
  area = null;
  selected = null;
  $("plate").value = "";
  $("msg").textContent = "";
  $("msg").style.color = "";
  refresh();
}

$("plate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
  $("pf").classList.remove("err");
});

$("areas").addEventListener("click", function (e) {
  var b = e.target.closest("button[data-a]");
  if (!b) return;
  if (area !== b.dataset.a) {
    area = b.dataset.a;
    selected = null;
  }
  $("msg").textContent = "";
  refresh();
});

function pick(id) {
  selected = id;
  $("msg").textContent = "";
  refresh();
}

$("map").addEventListener("click", function (e) {
  var g = e.target.closest("g[data-id]");
  if (g) pick(g.dataset.id);
});

$("map").addEventListener("keydown", function (e) {
  if (e.key === "Enter" || e.key === " ") {
    var g = e.target.closest("g[data-id]");
    if (g) {
      e.preventDefault();
      pick(g.dataset.id);
    }
  }
});

$("book").addEventListener("click", function () {
  var pl = $("plate").value.trim().toUpperCase(),
    s = startTs();
  $("msg").style.color = "";
  if (pl.length < 5) {
    $("pf").classList.add("err");
    $("plate").focus();
    $("msg").textContent = "Escribe la placa completa (mínimo 5 caracteres).";
    return;
  }
  if (!s || s + TOL < Date.now()) {
    $("msg").textContent = "Elige una hora de llegada que no haya pasado.";
    return;
  }
  if (!area) {
    $("msg").textContent = "Primero elige un área.";
    return;
  }
  if (!selected) {
    $("msg").textContent = "Ahora toca un cajón libre del área " + area + ".";
    return;
  }
  if (stateOf(selected) !== "free") {
    $("msg").textContent = "Ese cajón acaba de ocuparse. Elige otro.";
    selected = null;
    refresh();
    return;
  }
  var r = {
    code: "SP-" + Math.floor(1000 + Math.random() * 9000),
    plate: pl,
    spot: selected,
    start: s,
    status: "reserved",
  };
  var a = all();
  a.push(r);
  sv("sp2_res", a);
  sv("sp2_mine", r.code);
  showTicket();
});

function day(t) {
  return new Date(t).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function fmt(ms) {
  var s = Math.max(0, Math.floor(ms / 1000)),
    h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60);
  return h ? h + " h " + two(m) + " min" : two(m) + ":" + two(s % 60);
}

function showTicket() {
  var r = mine();
  if (!r) {
    $("s2").classList.add("hidden");
    $("s1").classList.remove("hidden");
    return;
  }
  var a = areaById(r.spot.charAt(0));
  $("s1").classList.add("hidden");
  $("s2").classList.remove("hidden");
  $("msg2").textContent = "";
  $("tTop").style.background = a.c;
  $("tArea").textContent = a.n + " · tu cajón";
  $("tSpot").textContent = r.spot;
  $("tCode").textContent = r.code;
  $("tPlate").textContent = r.plate;
  $("tStart").textContent = day(r.start) + ", " + hhmm(r.start);
  draw("map2", a.id, r.spot, false);
  tick();
}

function tick() {
  var r = mine();
  if (!r || $("s2").classList.contains("hidden")) return;
  var n = Date.now(),
    cls = "stat",
    txt = "";
  if (r.status === "reserved" && n > r.start + TOL) {
    r.status = "expired";
    update(r);
  }
  if (r.status === "in") {
    cls += " in";
    txt =
      "Dentro desde las " +
      hhmm(r.checkin) +
      " · " +
      fmt(n - r.checkin) +
      " estacionado";
    $("tCl").textContent = "Costo acumulado";
    $("tCost").textContent =
      "$" + Math.max(1, Math.ceil((n - r.checkin) / H)) * RATE + " MXN";
  } else {
    $("tCl").textContent = "Tarifa";
    $("tCost").textContent = "$" + RATE + " MXN / hora";
    if (r.status === "expired" || r.status === "cancelled") {
      cls += " dead";
      txt = "Reserva vencida: tu cajón se liberó";
    } else if (n < r.start) {
      txt = "Tu reserva empieza en " + fmt(r.start - n);
    } else {
      var left = r.start + TOL - n;
      txt = "Llega en " + fmt(left) + " o se libera tu cajón";
      if (left < 10 * 60000) cls += " warn";
    }
  }
  $("stat").className = cls;
  $("stat").textContent = txt;
  var dead = r.status === "expired" || r.status === "cancelled";
  $("cancel").classList.toggle("hidden", dead);
  $("again").classList.toggle("hidden", !dead);
  $("cancel").textContent =
    r.status === "in" ? "Terminar y salir" : "Cancelar reserva";
}

setInterval(tick, 1000);

$("cancel").addEventListener("click", function () {
  var r = mine();
  if (!r) return;
  var was = r.status,
    cost =
      was === "in"
        ? Math.max(1, Math.ceil((Date.now() - r.checkin) / H)) * RATE
        : 0;
  r.status = was === "in" ? "done" : "cancelled";
  update(r);
  rm("sp2_mine");
  initForm();
  showTicket();
  if (was === "in") {
    $("msg").style.color = "var(--ok)";
    $("msg").textContent =
      "Salida registrada. Total a pagar: $" + cost + " MXN.";
  }
});

$("again").addEventListener("click", function () {
  rm("sp2_mine");
  initForm();
  showTicket();
});

/* ---------- Inicio ---------- */
initForm();

showTicket();
