(function () {
  const i18n = window.__PAY_I18N__ || {
    token: "Requesting secure payment token...",
    open: "Opening Halyk ePay...",
    startError: "Could not start payment.",
    scriptError: "Halyk ePay script is not loaded."
  };
  const status = document.getElementById("payment-status");
  const button = document.getElementById("open-payment");
  const orderId = window.__ORDER_ID__;
  const payMode = window.__PAY_MODE__ || "default";
  const successUrl = window.__SUCCESS_URL__ || "/";
  const failureUrl = window.__FAILURE_URL__ || "/";

  async function openPayment() {
    status.textContent = i18n.token;
    button.disabled = true;
    try {
      const response = await fetch(`/api/payments/${encodeURIComponent(orderId)}/payment-object`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || i18n.startError);
      if (!window.halyk || typeof window.halyk.pay !== "function") {
        throw new Error(i18n.scriptError);
      }
      status.textContent = i18n.open;
      if (payMode === "card_widget" && typeof window.halyk.showPaymentWidget === "function") {
        window.halyk.showPaymentWidget(payload.paymentObject, (result) => {
          window.location.href = result ? successUrl : failureUrl;
        });
        return;
      }
      window.halyk.pay(payload.paymentObject);
    } catch (error) {
      status.textContent = error.message;
      button.disabled = false;
    }
  }

  button.addEventListener("click", openPayment);
  window.addEventListener("load", () => {
    setTimeout(openPayment, 350);
  });
})();
