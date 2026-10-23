/* El boleto se busca por el código que manda la pantalla de acceso */
var q = new URLSearchParams(location.search),
  code = q.get("b"),
  dup = q.get("d") === "1";

if (!code) {
  var l = ld("sp2_last");
  if (l) {
    code = l.code;
    dup = !!l.dup;
  }
}

var cur =
  code &&
  (ld("sp2_res") || []).filter(function (x) {
    return x.code === code && x.checkin;
  })[0];

if (!cur) {
  $("none").classList.remove("hidden");
} else {
  $("ok").classList.remove("hidden");
  if (dup) {
    $("rTitle").textContent = "Ya estás dentro";
    $("rSub").textContent = "Este es tu boleto digital";
  }
  $("rCode").textContent = cur.code;
  $("rPlate").textContent = fmtPlate(cur.plate);
  if (
    (ld("sp2_emp") || []).some(function (e) {
      return norm(e.plate) === norm(cur.plate);
    })
  ) {
    var t = document.createElement("span");
    t.className = "tag";
    t.textContent = "EMPLEADO";
    $("plLbl").appendChild(t);
  }
  $("rSpot").textContent = cur.spot.charAt(0) + "-" + cur.spot.slice(1);
  $("rArea").textContent = "Área " + cur.spot.charAt(0) + " · Nivel 1";
  $("rTime").textContent = new Date(cur.checkin).toLocaleTimeString("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/* Descargar el boleto como imagen PNG */
$("dl").addEventListener("click", function () {
  if (!cur) return;
  var c = document.createElement("canvas"),
    W = 720,
    Hh = 800,
    x = c.getContext("2d"),
    M = "ui-monospace,Menlo,Consolas,monospace";
  c.width = W;
  c.height = Hh;
  x.fillStyle = "#fff";
  x.fillRect(0, 0, W, Hh);
  x.strokeStyle = "#f5c400";
  x.lineWidth = 14;
  x.strokeRect(7, 7, W - 14, Hh - 14);
  x.textAlign = "center";
  x.fillStyle = "#111";
  x.font = "800 54px system-ui,sans-serif";
  x.fillText("SMARTPARK", W / 2, 110);
  x.fillStyle = "#8d99ad";
  x.font = "600 26px system-ui,sans-serif";
  x.fillText("Boleto digital de entrada", W / 2, 155);
  x.textAlign = "left";
  function line(l, v, y, col, sz) {
    x.fillStyle = "#8d99ad";
    x.font = "600 24px system-ui,sans-serif";
    x.fillText(l, 70, y);
    x.fillStyle = col || "#1c2333";
    x.font = "700 " + (sz || 44) + "px " + M;
    x.fillText(v, 70, y + 52);
  }
  line("BOLETO #", cur.code, 250);
  line("PLACA REGISTRADA", fmtPlate(cur.plate), 370);
  line(
    "CAJÓN ASIGNADO",
    cur.spot.charAt(0) + "-" + cur.spot.slice(1),
    490,
    "#d9820d",
    64,
  );
  line("HORA DE ENTRADA", $("rTime").textContent, 640);
  var a = document.createElement("a");
  a.href = c.toDataURL("image/png");
  a.download = "ticket-" + cur.code + ".png";
  document.body.appendChild(a);
  a.click();
  a.remove();
});
