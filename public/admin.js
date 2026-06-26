(function () {
  const i18n = window.__ADMIN_I18N__ || {
    creating: "Creating link...",
    created: "Link created",
    createError: "Could not create invitation.",
    loading: "Loading...",
    loadError: "Could not load admin data.",
    empty: "No orders yet.",
    headers: ["Status", "Invoice", "Author", "Article", "Amount", "Reference", "Updated"]
  };
  const tokenInput = document.getElementById("admin-token");
  const saveToken = document.getElementById("save-token");
  const refresh = document.getElementById("refresh-admin");
  const inviteForm = document.getElementById("invite-form");
  const inviteStatus = document.getElementById("invite-status");
  const ordersList = document.getElementById("orders-list");

  tokenInput.value = localStorage.getItem("clinmed_admin_token") || "";
  saveToken.addEventListener("click", () => {
    localStorage.setItem("clinmed_admin_token", tokenInput.value);
    loadAdmin();
  });
  refresh.addEventListener("click", loadAdmin);

  function adminHeaders() {
    return {
      "content-type": "application/json",
      "x-admin-token": tokenInput.value
    };
  }

  inviteForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    inviteStatus.textContent = i18n.creating;
    const raw = Object.fromEntries(new FormData(inviteForm).entries());
    const body = { ...raw, sendEmail: raw.sendEmail === "on" };
    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || i18n.createError);
      inviteStatus.innerHTML = `${escapeHtml(i18n.created)}: <a href="${payload.link}">${payload.link}</a>`;
      inviteForm.reset();
      loadAdmin();
    } catch (error) {
      inviteStatus.textContent = error.message;
    }
  });

  async function loadAdmin() {
    if (!tokenInput.value) return;
    ordersList.textContent = i18n.loading;
    try {
      const response = await fetch("/api/admin/orders", { headers: adminHeaders() });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || i18n.loadError);
      renderOrders(payload.orders);
    } catch (error) {
      ordersList.textContent = error.message;
    }
  }

  function renderOrders(orders) {
    if (!orders.length) {
      ordersList.textContent = i18n.empty;
      return;
    }
    const headers = i18n.headers;
    ordersList.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>${escapeHtml(headers[0])}</th>
            <th>${escapeHtml(headers[1])}</th>
            <th>${escapeHtml(headers[2])}</th>
            <th>${escapeHtml(headers[3])}</th>
            <th>${escapeHtml(headers[4])}</th>
            <th>${escapeHtml(headers[5])}</th>
            <th>${escapeHtml(headers[6])}</th>
          </tr>
        </thead>
        <tbody>
          ${orders
            .map(
              (order) => `
                <tr>
                  <td><span class="badge">${escapeHtml(order.status)}</span></td>
                  <td>${escapeHtml(order.invoiceId)}</td>
                  <td>${escapeHtml(order.fullName)}<br><small>${escapeHtml(order.email)}</small></td>
                  <td>${escapeHtml(order.articleTitle)}</td>
                  <td>${escapeHtml(order.amount)} ${escapeHtml(order.currency)}</td>
                  <td>${escapeHtml(order.halykReference || order.reason || "")}</td>
                  <td>${new Date(order.updatedAt).toLocaleString()}</td>
                </tr>`
            )
            .join("")}
        </tbody>
      </table>`;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  loadAdmin();
})();
