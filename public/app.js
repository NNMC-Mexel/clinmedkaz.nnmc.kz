(function () {
  const invitation = window.__INVITATION__ || {};
  const i18n = window.__APP_I18N__ || {
    preparing: "Preparing payment...",
    createError: "Payment could not be created."
  };
  const pricing = window.__PRICING__ || {};
  for (const key of ["invitationId", "fullName", "email", "phone", "articleTitle"]) {
    const id = key === "invitationId" ? "invitationId" : key;
    const element = document.getElementById(id);
    if (!element) continue;
    element.value = key === "invitationId" ? invitation.id || "" : invitation[key] || "";
  }

  const form = document.getElementById("payment-form");
  const status = document.getElementById("form-status");
  const charge = document.getElementById("payment-charge");
  if (!form) return;

  function updateCharge() {
    const selected = form.querySelector('input[name="residency"]:checked')?.value || "resident_kz";
    if (!charge) return;
    if (selected === "non_resident") {
      charge.textContent = `${pricing.nonResidentLabel || "Payment for non-resident"}: ${pricing.nonResident || "300 USD"}`;
      return;
    }
    charge.textContent = `${pricing.residentLabel || "Payment for Kazakhstan resident"}: ${pricing.resident || ""}`;
  }

  form.querySelectorAll('input[name="residency"]').forEach((input) => {
    input.addEventListener("change", updateCharge);
  });
  updateCharge();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = i18n.preparing;
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || i18n.createError);
      window.location.href = payload.payUrl;
    } catch (error) {
      status.textContent = error.message;
    }
  });
})();
