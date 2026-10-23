/* administrador.js · Panel de administración */

let curArea = "A";
let chosen = null;
let filterQ = "";

function todayStart() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
}

/* ---- Resumen: KPIs ---- */
function renderKpis() {
  let free = 0;
  let resv = 0;
  let busy = 0;
  AREAS.forEach((a) =>
    ids(a.id).forEach((i) => {
      const s = stateOf(i);
      if (s === "free") free++;
      else if (s === "resv") resv++;
      else busy++;
    }),
  );
  const t0 = todayStart();
  let entradas = 0;
  let ingresos = 0;
  all().forEach((r) => {
    if (r.checkin && r.checkin >= t0) entradas++;
    (r.payments || []).forEach((p) => {
      if (p.at >= t0) ingresos += p.amount;
    });
  });
  setHtml(
    $("kpis"),
    [
      ["Libres", free, "free"],
      ["Reservados", resv, "resv"],
      ["Ocupados", busy, "busy"],
      ["Entradas hoy", entradas, ""],
      ["Ingresos hoy", "$" + ingresos, ""],
    ]
      .map(([l, v, c]) => `<div class="kpi ${c}"><b>${v}</b>${l}</div>`)
      .join(""),
  );
}

/* ---- Resumen: gráfica de entradas por día ---- */
function renderChart() {
  let h = ld(KEY.hist);
  if (!h) {
    h = [38, 24, 41, 22, 35, 47, 52]; // datos de ejemplo
    sv(KEY.hist, h);
  }
  h = h.slice();
  const now = new Date();
  const idx = (now.getDay() + 6) % 7;
  const t0 = todayStart();
  let today = 0;
  all().forEach((r) => {
    if (r.checkin && r.checkin >= t0) today++;
  });
  h[idx] += today;

  const top = Math.ceil((Math.max.apply(null, h) + 1) / 10) * 10;
  const x0 = 46;
  const y0 = 170;
  const ph = 140;
  const pw = 340;
  const st = pw / 7;
  const bw = 30;
  const D = ["L", "M", "M", "J", "V", "S", "D"];
  let s = "";
  for (let k = 0; k <= 4; k++) {
    const y = y0 - (ph * k) / 4;
    s += `<line class="gl" x1="${x0}" x2="${x0 + pw}" y1="${y}" y2="${y}"/><text class="ax" x="${x0 - 6}" y="${y + 4}" text-anchor="end">${Math.round((top * k) / 4)}</text>`;
  }
  h.forEach((v, i) => {
    const bh = (ph * v) / top;
    const x = x0 + st * i + (st - bw) / 2;
    s +=
      `<rect class="bar${i === idx ? " today" : ""}" x="${x}" y="${y0 - bh}" width="${bw}" height="${bh}" rx="3"><title>${v} entradas</title></rect>` +
      `<text class="bv" x="${x + bw / 2}" y="${y0 - bh - 4}">${v}</text>` +
      `<text class="ax" style="font-size:13px;font-weight:${i === idx ? 700 : 400}" x="${x + bw / 2}" y="190" text-anchor="middle">${D[i]}</text>`;
  });
  s += `<text class="ax" transform="rotate(-90 11 100)" x="11" y="100" text-anchor="middle">Vehículos</text>`;
  setHtml($("chart"), s);
}

/* ---- Cajones: mapa ---- */
function renderMap() {
  setHtml(
    $("areas"),
    AREAS.map((x) => {
      const f = ids(x.id).filter((i) => stateOf(i) === "free").length;
      return `<button type="button" class="area" data-a="${x.id}" aria-pressed="${x.id === curArea}" aria-label="${x.n}, ${f} libres"><span class="sw" style="background:${x.c}"></span>${x.id}<small>${f}</small></button>`;
    }).join(""),
  );
  if (chosen && stateOf(chosen) !== "free") chosen = null;
  draw("map", curArea, chosen && chosen.charAt(0) === curArea ? chosen : null, true);

  const ch = $("chosen");
  ch.classList.toggle("on", !!chosen);
  ch.textContent = chosen ? "Cajón " + chosen : "Ningún cajón seleccionado";
  updateResBtn();
}

function updateResBtn() {
  $("resBtn").disabled = !(chosen && norm($("resPlate").value).length >= 5);
}

$("areas").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  curArea = b.dataset.a;
  renderMap();
});

function pickSpot(id) {
  chosen = id;
  renderMap();
  $("resPlate").focus();
}

$("map").addEventListener("click", (e) => {
  const g = e.target.closest("g[data-id]");
  if (g) pickSpot(g.dataset.id);
});

$("map").addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    const g = e.target.closest("g[data-id]");
    if (g) {
      e.preventDefault();
      pickSpot(g.dataset.id);
    }
  }
});

/* ---- Reservar ---- */
$("resPlate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
  updateResBtn();
});

$("resBtn").addEventListener("click", () => {
  const pl = fmtPlate($("resPlate").value);
  if (!chosen) return toast("Selecciona un cajón en el mapa.", "bad");
  if (norm(pl).length < 5) return toast("Escribe la placa completa (mínimo 5 caracteres).", "bad");
  if (stateOf(chosen) !== "free") {
    toast("Ese cajón ya no está libre.", "bad");
    return renderAll();
  }
  const a = all();
  const code = newCode();
  a.push({ code: code, plate: pl, spot: chosen, start: Date.now(), status: "reserved" });
  sv(KEY.res, a);
  toast(`Cajón ${chosen} reservado para ${pl} (código ${code}). Tiene 15 min para llegar.`, "ok");
  chosen = null;
  $("resPlate").value = "";
  renderAll();
});

/* ---- Reservas activas ---- */
$("q").addEventListener("input", function () {
  filterQ = this.value;
  renderActive();
});

function renderActive() {
  const fq = norm(filterQ);
  const rows = all()
    .filter(active)
    .filter((r) => !fq || [norm(r.plate), norm(r.code), r.spot].some((s) => s.includes(fq)))
    .sort((a, b) => (a.spot < b.spot ? -1 : 1));

  setHtml(
    $("act"),
    rows.length
      ? rows
          .map((r) => {
            const inn = r.status === "in";
            const due = inn ? dueOf(r) : 0;
            return (
              `<tr><td><b>${r.spot}</b></td>` +
              `<td class="mono">${esc(r.plate)}${isEmp(r.plate) ? ' <span class="tag emp">Empleado</span>' : ""}</td>` +
              `<td><span class="tag ${inn ? "busy" : "resv"}">${inn ? "Ocupado" : "Reservado"}</span></td>` +
              `<td>${hhmm(inn ? r.checkin : r.start)}</td>` +
              `<td>${inn ? fmtDur(Date.now() - r.checkin) : "—"}</td>` +
              `<td>${inn ? (due > 0 ? `<span class="tag bad">$${due} por cobrar</span>` : `<span class="tag ok">Pagado</span>`) : "—"}</td>` +
              `<td class="act">` +
              (inn
                ? `<button class="btn sm${due > 0 ? "" : " ghost"}" data-a="out" data-c="${r.code}">${due > 0 ? "Cobrar y salir" : "Registrar salida"}</button>`
                : `<button class="btn sm" data-a="in" data-c="${r.code}">Check-in</button><button class="btn sm ghost" data-a="cancel" data-c="${r.code}">Cancelar</button>`) +
              `</td></tr>`
            );
          })
          .join("")
      : `<tr><td colspan="7" class="empty">${fq ? "Sin resultados para esa búsqueda." : "No hay reservas activas."}</td></tr>`,
  );
}

function apply(code, act) {
  const a = all();
  const r = a.find((x) => x.code === code);
  if (!r || !active(r) || (act === "in" && r.status !== "reserved") || (act === "out" && r.status !== "in")) {
    toast("Esa reserva ya cambió. Se actualizó la lista.", "bad");
    return renderAll();
  }
  if (act === "in") {
    r.status = "in";
    r.checkin = Date.now();
    sv(KEY.res, a);
    toast(`Check-in registrado: ${r.plate} en ${r.spot}.`, "ok");
  } else if (act === "cancel") {
    r.status = "cancelled";
    sv(KEY.res, a);
    toast(`Reserva de ${r.plate} cancelada. El cajón ${r.spot} quedó libre.`, "ok");
  } else {
    const due = dueOf(r);
    if (due > 0) addPayment(code, "efectivo");
    const f = exitRecord(code);
    toast(
      `Salida de ${f.plate} (${f.spot}). ` + (due > 0 ? `Cobrado en efectivo: ${money(due)}.` : `Ya estaba pagado: ${money(paidOf(f))}.`) + (isEmp(f.plate) ? " Empleado: revisar si aplica descuento." : ""),
      "ok",
    );
  }
  renderAll();
}

$("act").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const act = b.dataset.a;
  const code = b.dataset.c;
  const r = all().find((x) => x.code === code);
  if (!r) return;
  const who = `<b class="mono">${esc(r.plate)}</b>`;
  const sp = `<b>${r.spot}</b>`;
  const go = () => apply(code, act);

  if (act === "in") {
    ask({ title: "Confirmar check-in", body: `¿Registrar la entrada de ${who} en el cajón ${sp}?`, ok: "Sí, registrar entrada", fn: go });
  } else if (act === "cancel") {
    ask({
      title: "Cancelar reserva",
      body: `Vas a cancelar la reserva de ${who} en el cajón ${sp}. El cajón quedará libre y <b>esta acción no se puede deshacer</b>.`,
      ok: "Sí, cancelar reserva",
      danger: 1,
      fn: go,
    });
  } else {
    const due = dueOf(r);
    ask({
      title: due > 0 ? "Cobrar y registrar salida" : "Registrar salida",
      body:
        `Vehículo ${who} · cajón ${sp}<br>Tiempo dentro: <b>${fmtDur(Date.now() - r.checkin)}</b><br>` +
        (due > 0
          ? `Por cobrar: <b>${money(due)}</b> en efectivo. El cajón quedará libre.`
          : `Pago completo (${money(paidOf(r))}). El cajón quedará libre.`),
      ok: due > 0 ? "Sí, cobrar y salir" : "Sí, registrar salida",
      danger: 1,
      fn: go,
    });
  }
});

/* ---- Empleados ---- */
$("empPlate").addEventListener("input", function () {
  this.value = this.value.replace(/[^A-Za-z0-9 -]/g, "");
});

function renderEmp() {
  const e = emps();
  setHtml(
    $("emp"),
    e.length
      ? e
          .map((x, i) => `<tr><td>${esc(x.name)}</td><td class="mono">${esc(x.plate)}</td><td class="act"><button class="btn sm ghost" data-i="${i}">Quitar</button></td></tr>`)
          .join("")
      : `<tr><td colspan="3" class="empty">Aún no hay empleados registrados.</td></tr>`,
  );
}

$("empBtn").addEventListener("click", () => {
  const n = $("empName").value.trim();
  const p = fmtPlate($("empPlate").value);
  if (!n) return toast("Escribe el nombre.", "bad");
  if (norm(p).length < 5) return toast("Escribe la placa completa (mínimo 5 caracteres).", "bad");
  if (isEmp(p)) return toast("Esa placa ya está registrada.", "bad");
  const e = emps();
  e.push({ name: n, plate: p });
  sv(KEY.emp, e);
  $("empName").value = "";
  $("empPlate").value = "";
  toast("Empleado registrado.", "ok");
  renderAll();
});

$("emp").addEventListener("click", (ev) => {
  const b = ev.target.closest("button[data-i]");
  if (!b) return;
  const x = emps()[+b.dataset.i];
  if (!x) return;
  ask({
    title: "Eliminar empleado",
    body: `Vas a quitar a <b>${esc(x.name)}</b> (<b class="mono">${esc(x.plate)}</b>) de la lista de empleados. <b>Esta acción no se puede deshacer</b>.`,
    ok: "Sí, eliminar",
    danger: 1,
    fn: () => {
      sv(KEY.emp, emps().filter((y) => norm(y.plate) !== norm(x.plate)));
      toast("Empleado eliminado.", "ok");
      renderAll();
    },
  });
});

/* ---- Confirmación antes de eliminar o modificar ---- */
let pending = null;

function ask(o) {
  $("dTitle").textContent = o.title;
  $("dBody").innerHTML = o.body;
  $("dOk").textContent = o.ok;
  $("dOk").className = "btn" + (o.danger ? "" : "");
  pending = o.fn;
  $("dlg").showModal();
  (o.danger ? $("dNo") : $("dOk")).focus();
}

$("dNo").addEventListener("click", () => {
  pending = null;
  $("dlg").close();
});

$("dOk").addEventListener("click", () => {
  const f = pending;
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

$("dlg").addEventListener("close", () => {
  pending = null;
});

$("logout").addEventListener("click", () => {
  ask({
    title: "Cerrar sesión",
    body: "Saldrás del panel de administrador y tendrás que iniciar sesión de nuevo.",
    ok: "Sí, cerrar sesión",
    fn: () => {
      try {
        sessionStorage.removeItem("sp2_admin");
      } catch (e) {}
      location.href = "accesoadmin.html";
    },
  });
});

/* ---- Pestaña activa según el scroll ---- */
if ("IntersectionObserver" in window) {
  const links = [...document.querySelectorAll("#sub a")];
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) => l.setAttribute("aria-current", String(l.getAttribute("href") === "#" + en.target.id)));
        }
      });
    },
    { rootMargin: "-30% 0px -60% 0px" },
  );
  document.querySelectorAll("main section").forEach((s) => io.observe(s));
}

function renderAll() {
  renderKpis();
  renderChart();
  renderMap();
  renderActive();
  renderEmp();
}

renderAll();
setInterval(renderAll, 5000);
window.addEventListener("storage", renderAll); // se actualiza si se reserva en otra pestaña
