/* reservaciones.js */
let area = null;
let selected = null;

function startTs() {
  const d = $("date").value;
  const t = $("time").value;
  if (!d || !t) return null;
  const s = new Date(d + "T" + t).getTime();
  return isNaN(s) ? null : s;
}

/* Qué falta para poder reservar */
function missing() {
  const out = [];
  if (norm($("plate").value).length < 5) out.push("placa");
  const s = startTs();
  if (!s || s + TOL < Date.now()) out.push("hora de llegada");
  if (!area) out.push("área");
  else if (!selected) out.push("cajón");
  return out;
}

function updateSteps() {
  const s = startTs();
  const ok1 = norm($("plate").value).length >= 5 && s && s + TOL >= Date.now();
  const done = [!!ok1, !!area, !!selected];
  const now = done.indexOf(false);
  document.querySelectorAll("#steps li").forEach((li, i) => {
    li.className = done[i] ? "done" : i === now ? "now" : "";
    li.querySelector("b").textContent = done[i] ? "✓" : String(i + 1);
  });
}

function refresh() {
  setHtml(
    $("areas"),
    AREAS.map((a) => {
      const free = ids(a.id).filter((i) => stateOf(i) === "free").length;
      return `<button type="button" class="area" data-a="${a.id}" aria-pressed="${a.id === area}" aria-label="${a.n}, ${free} libres"><span class="sw" style="background:${a.c}"></span>${a.id}<small>${free} libres</small></button>`;
    }).join(""),
  );
  $("hint").classList.toggle("hidden", !!area);
  $("cajones").classList.toggle("hidden", !area);
  if (area) {
    const a = areaById(area);
    $("cTitle").innerHTML = `Elige tu cajón <span>· ${a.n}, Nivel 1</span>`;
    draw("map", area, selected, true);
  }
  $("selTxt").textContent = selected || "ninguno";

  const m = missing();
  $("book").disabled = m.length > 0;
  $("msg").textContent = m.length ? "Falta: " + m.join(", ") + "." : "Todo listo para reservar.";
  updateSteps();
}

function initForm() {
  const d = new Date(Date.now() + 15 * 60000);
  d.setMinutes(Math.ceil(d.getMinutes() / 15) * 15, 0, 0);
  const today = d.getFullYear() + "-" + two(d.getMonth() + 1) + "-" + two(d.getDate());
  $("date").value = today;
  $("date").min = today;
  $("time").value = two(d.getHours()) + ":" + two(d.getMinutes());
  area = null;
  selected = null;
  $("plate").value = "";
  refresh();
}

["plate", "date", "time"].forEach((id) => $(id).addEventListener("input", refresh));

$("plate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
});

$("areas").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  if (area !== b.dataset.a) {
    area = b.dataset.a;
    selected = null;
  }
  refresh();
});

function pick(id) {
  selected = id;
  refresh();
}

$("map").addEventListener("click", (e) => {
  const g = e.target.closest("g[data-id]");
  if (g) pick(g.dataset.id);
});

$("map").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const g = e.target.closest("g[data-id]");
    if (g) {
      e.preventDefault();
      pick(g.dataset.id);
    }
  }
});

$("book").addEventListener("click", () => {
  const s = startTs();
  if (missing().length) return refresh();
  if (stateOf(selected) !== "free") {
    toast("Ese cajón acaba de ocuparse. Elige otro.", "bad");
    selected = null;
    refresh();
    return;
  }
  const r = {
    code: newCode(),
    plate: fmtPlate($("plate").value),
    spot: selected,
    start: s,
    status: "reserved",
  };
  const a = all();
  a.push(r);
  sv(KEY.res, a);
  sv(KEY.mine, r.code);
  showTicket();
});

function day(t) {
  return new Date(t).toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

function showTicket() {
  const r = mine();
  if (!r) {
    $("s2").classList.add("hidden");
    $("s1").classList.remove("hidden");
    return;
  }
  const a = areaById(r.spot.charAt(0));
  $("s1").classList.add("hidden");
  $("s2").classList.remove("hidden");
  $("tTop").style.background = a.c;
  $("tArea").textContent = a.n + " · tu cajón";
  $("tSpot").textContent = r.spot;
  $("tCode").textContent = r.code;
  $("tPlate").textContent = r.plate;
  $("tStart").textContent = day(r.start) + ", " + hhmm(r.start);
  draw("map2", a.id, r.spot, false);
  $("pay").href = "boleto.html?b=" + encodeURIComponent(r.code);
  tick();
}

function tick() {
  const r = mine();
  if (!r || $("s2").classList.contains("hidden")) return;
  const n = Date.now();
  let cls = "stat";
  let txt = "";
  if (r.status === "reserved" && n > r.start + TOL) {
    r.status = "expired";
    update(r);
  }
  const inside = r.status === "in";
  const dead = r.status === "expired" || r.status === "cancelled" || r.status === "done";

  if (inside) {
    const due = dueOf(r);
    cls += " in";
    txt = "Dentro desde las " + hhmm(r.checkin) + " · " + fmtDur(n - r.checkin) + " estacionado";
    $("tCl").textContent = due > 0 ? "Por pagar" : "Pagado";
    $("tCost").textContent = money(due > 0 ? due : paidOf(r));
    $("pay").textContent = due > 0 ? "Pagar " + money(due) : "Ver boleto y recibo";
  } else {
    $("tCl").textContent = r.status === "done" ? "Total pagado" : "Tarifa";
    $("tCost").textContent = r.status === "done" ? money(paidOf(r)) : money(RATE) + " / hora";
    if (r.status === "done") {
      cls += " in";
      txt = "Salida registrada. ¡Gracias por tu visita!";
    } else if (dead) {
      cls += " dead";
      txt = "Reserva vencida: tu cajón se liberó";
    } else if (n < r.start) {
      txt = "Tu reserva empieza en " + fmtDur(r.start - n);
    } else {
      const left = r.start + TOL - n;
      txt = "Llega en " + fmtDur(left) + " o se libera tu cajón";
      if (left < 10 * 60000) cls += " warn";
    }
  }
  $("stat").className = cls;
  $("stat").textContent = txt;

  $("pay").classList.toggle("hidden", !inside);
  $("cancel").classList.toggle("hidden", dead || (inside && dueOf(r) > 0));
  $("again").classList.toggle("hidden", !dead);
  $("cancel").textContent = inside ? "Registrar salida" : "Cancelar reserva";
}

setInterval(tick, 1000);

$("cancel").addEventListener("click", () => {
  const r = mine();
  if (!r) return;
  if (r.status === "in") {
    if (dueOf(r) > 0) {
      location.href = "boleto.html?b=" + encodeURIComponent(r.code);
      return;
    }
    exitRecord(r.code);
    toast("Salida registrada. ¡Gracias por tu visita!", "ok");
  } else {
    r.status = "cancelled";
    update(r);
    toast("Reserva cancelada. El cajón quedó libre.", "ok");
  }
  rm(KEY.mine);
  initForm();
  showTicket();
});

$("again").addEventListener("click", () => {
  rm(KEY.mine);
  initForm();
  showTicket();
});

initForm();
showTicket();
