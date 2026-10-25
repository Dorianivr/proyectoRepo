/* pasarela.js · Pasarela de pago SIMULADA.
   Los datos de la tarjeta solo existen en los campos de esta página para validarlos:
   no se guardan en ningún lado ni se envían a SmartPark. SmartPark recibe únicamente
   el resultado (aprobado, cancelado o vencido) y un folio.
   Para usar una pasarela real (Mercado Pago, Stripe, Conekta) se reemplaza esta página
   por la de la pasarela y el resultado se confirma desde un servidor. */

let intent = null;
try {
  intent = JSON.parse(sessionStorage.getItem(CK) || "null");
} catch (e) {}

function show(id) {
  ["none", "pay", "proc", "done"].forEach((s) => $(s).classList.toggle("hidden", s !== id));
}

/* Devuelve el resultado a SmartPark y regresa a la página de origen */
function finish(status, folio) {
  try {
    sessionStorage.setItem(
      CKR,
      JSON.stringify({ id: intent.id, kind: intent.kind, status: status, folio: folio || null, amount: intent.amount, payload: intent.payload }),
    );
    sessionStorage.removeItem(CK);
  } catch (e) {}
  location.replace(intent.returnUrl);
}

function cardError() {
  const n = $("cc").value.replace(/\D/g, "");
  if (!luhn(n)) return "Revisa el número de tarjeta.";
  const m = /^(\d\d)\/(\d\d)$/.exec($("exp").value);
  if (!m || +m[1] < 1 || +m[1] > 12) return "Fecha de vencimiento inválida (MM/AA).";
  const now = new Date();
  const y = 2000 + +m[2];
  if (y < now.getFullYear() || (y === now.getFullYear() && +m[1] < now.getMonth() + 1)) return "La tarjeta está vencida.";
  if (!/^\d{3,4}$/.test($("cvv").value)) return "El CVV debe tener 3 o 4 dígitos.";
  return "";
}

if (!intent || !intent.returnUrl) {
  show("none");
} else if (Date.now() > intent.expires) {
  finish("expired");
} else {
  show("pay");
  $("concept").textContent = intent.label;
  $("amount").textContent = money(intent.amount);
  $("expLine").textContent = "Esta sesión de pago vence a las " + hhmm(intent.expires) + ".";
  $("demo").classList.toggle("hidden", !DEMO_PAGOS);
  $("ok").textContent = "Pagar " + money(intent.amount);
  $("cc").focus();

  $("cc").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
  });
  $("exp").addEventListener("input", function () {
    let v = this.value.replace(/\D/g, "").slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2);
    this.value = v;
  });
  $("cvv").addEventListener("input", function () {
    this.value = this.value.replace(/\D/g, "").slice(0, 4);
  });

  $("cancel").addEventListener("click", () => finish("cancelled"));

  $("form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (Date.now() > intent.expires) return finish("expired");
    const err = cardError();
    if (err) {
      $("msg").textContent = err;
      return;
    }
    /* Se borran los datos de la tarjeta antes de continuar */
    ["cc", "exp", "cvv"].forEach((id) => ($(id).value = ""));
    show("proc");
    setTimeout(() => {
      const folio = "PG-" + Math.floor(100000 + Math.random() * 900000);
      $("folio").textContent = folio;
      show("done");
      setTimeout(() => finish("ok", folio), 1400);
    }, 1600);
  });
}
