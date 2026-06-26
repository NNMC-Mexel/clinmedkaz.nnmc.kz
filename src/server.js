import crypto from "node:crypto";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { getPaymentToken, makeInvoiceId, makePaymentObject, makeSecretHash } from "./halyk.js";
import { sendMail } from "./mailer.js";
import {
  adminPage,
  legalPage,
  normalizeLanguage,
  payPage,
  paymentFormPage,
  resultPage
} from "./pages.js";
import { readStore, updateStore } from "./storage.js";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

function requireAdmin(req, res, next) {
  const token = req.get("x-admin-token") || req.query.token;
  if (!token || token !== config.adminToken) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function calculateOrderPrice(residency) {
  if (residency === "non_resident") {
    return {
      amount: config.pricing.nonResidentAmount,
      currency: config.pricing.nonResidentCurrency,
      exchangeRate: null
    };
  }
  return {
    amount: config.pricing.residentKztAmount,
    currency: config.pricing.residentCurrency,
    exchangeRate: config.pricing.usdToKztRate
  };
}

function resolveLang(req) {
  const explicit = cleanText(req.query.lang || req.body?.lang, 8);
  if (explicit) return normalizeLanguage(explicit);
  const accepted = String(req.get("accept-language") || "").toLowerCase();
  if (accepted.startsWith("kk") || accepted.includes("kk-")) return "kk";
  if (accepted.startsWith("en") || accepted.includes("en-")) return "en";
  return "ru";
}

function validateOrderInput(input) {
  const fullName = cleanText(input.fullName, 160);
  const email = cleanText(input.email, 160).toLowerCase();
  const phone = cleanText(input.phone, 80);
  const articleTitle = cleanText(input.articleTitle, 500);
  const invitationId = cleanText(input.invitationId, 80);
  const lang = normalizeLanguage(cleanText(input.lang, 8));
  const residency = cleanText(input.residency, 24) === "non_resident" ? "non_resident" : "resident_kz";

  if (fullName.length < 3) throw new Error("Full name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required.");
  if (phone.length < 6) throw new Error("Phone number is required.");
  if (articleTitle.length < 3) throw new Error("Article title is required.");

  return { fullName, email, phone, articleTitle, invitationId, lang, residency };
}

async function notifyAdminPaid(order, payload) {
  await sendMail({
    to: config.adminEmail,
    subject: `ClinMedKaz payment received: ${order.invoiceId}`,
    text: `Payment received for ${order.articleTitle}\nAuthor: ${order.fullName}\nEmail: ${order.email}\nAmount: ${order.amount} ${order.currency}\nReference: ${payload.reference || ""}`,
    html: `
      <h1>Payment received</h1>
      <p><strong>Invoice:</strong> ${order.invoiceId}</p>
      <p><strong>Author:</strong> ${order.fullName}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Phone:</strong> ${order.phone}</p>
      <p><strong>Article:</strong> ${order.articleTitle}</p>
      <p><strong>Amount:</strong> ${order.amount} ${order.currency}</p>
      <p><strong>Reference:</strong> ${payload.reference || ""}</p>
    `
  });
}

app.get("/", async (req, res, next) => {
  try {
    const lang = resolveLang(req);
    const inviteId = cleanText(req.query.invite, 80);
    const store = await readStore();
    const invitation = inviteId
      ? store.invitations.find((item) => item.id === inviteId && item.status !== "cancelled")
      : null;
    res.send(paymentFormPage(invitation, { lang, path: req.path, query: req.query }));
  } catch (error) {
    next(error);
  }
});

app.get("/pay/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const order = store.orders.find((item) => item.id === req.params.id);
    if (!order) {
      res.status(404).send(resultPage({ ok: false, lang: resolveLang(req), path: req.path, query: req.query }));
      return;
    }
    res.send(payPage(order, { lang: resolveLang(req), path: req.path, query: req.query }));
  } catch (error) {
    next(error);
  }
});

app.get("/payment/success/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const order = store.orders.find((item) => item.id === req.params.id);
    res.send(resultPage({ ok: true, order, lang: resolveLang(req), path: req.path, query: req.query }));
  } catch (error) {
    next(error);
  }
});

app.get("/payment/failure/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const order = store.orders.find((item) => item.id === req.params.id);
    res.send(resultPage({ ok: false, order, lang: resolveLang(req), path: req.path, query: req.query }));
  } catch (error) {
    next(error);
  }
});

app.get("/admin", (req, res) => {
  res.send(adminPage({ lang: resolveLang(req), path: req.path, query: req.query }));
});

for (const page of ["service", "terms", "privacy", "refunds", "contacts"]) {
  app.get(`/${page}`, (req, res) =>
    res.send(legalPage(page, { lang: resolveLang(req), path: req.path, query: req.query }))
  );
}

app.post("/api/payments", async (req, res, next) => {
  try {
    const input = validateOrderInput(req.body);
    const price = calculateOrderPrice(input.residency);
    const invoiceId = makeInvoiceId();
    const secretHash = makeSecretHash();
    const postLink = `${config.baseUrl}/api/halyk/postlink`;
    const order = {
      id: makeId("ord"),
      invoiceId,
      secretHash,
      status: "created",
      amount: price.amount,
      currency: price.currency,
      publicationFeeUsd: config.pricing.publicationFeeUsd,
      exchangeRate: price.exchangeRate,
      residency: input.residency,
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      articleTitle: input.articleTitle,
      lang: input.lang,
      invitationId: input.invitationId || null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
      postbacks: []
    };

    await updateStore((store) => {
      store.orders.unshift(order);
      if (order.invitationId) {
        const invite = store.invitations.find((item) => item.id === order.invitationId);
        if (invite) {
          invite.status = "payment_started";
          invite.updatedAt = nowIso();
        }
      }
    });

    res.json({ payUrl: `/pay/${order.id}?lang=${encodeURIComponent(order.lang)}` });
  } catch (error) {
    next(error);
  }
});

app.get("/api/payments/:id/payment-object", async (req, res, next) => {
  try {
    const store = await readStore();
    const order = store.orders.find((item) => item.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const postLink = `${config.baseUrl}/api/halyk/postlink`;
    const auth = await getPaymentToken({
      invoiceId: order.invoiceId,
      secretHash: order.secretHash,
      amount: order.amount,
      currency: order.currency,
      postLink,
      failurePostLink: postLink
    });
    await updateStore((state) => {
      const current = state.orders.find((item) => item.id === order.id);
      if (current) {
        current.status = "token_issued";
        current.updatedAt = nowIso();
      }
    });
    res.json({ paymentObject: makePaymentObject({ order, auth }) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/halyk/postlink", async (req, res, next) => {
  try {
    const payload = req.body || {};
    let paidOrder;
    await updateStore((store) => {
      const order = store.orders.find((item) => item.invoiceId === String(payload.invoiceId || ""));
      if (!order) return;
      const secretMatches = payload.secret_hash && payload.secret_hash === order.secretHash;
      order.postbacks.unshift({ receivedAt: nowIso(), payload, secretMatches });
      order.updatedAt = nowIso();
      if (!secretMatches) {
        order.status = "postlink_rejected";
        return;
      }
      order.status = payload.code === "ok" ? "paid" : "failed";
      order.halykReference = payload.reference || "";
      order.cardMask = payload.cardMask || "";
      order.reason = payload.reason || "";
      paidOrder = order.status === "paid" ? order : null;

      if (order.invitationId) {
        const invite = store.invitations.find((item) => item.id === order.invitationId);
        if (invite) {
          invite.status = order.status;
          invite.updatedAt = nowIso();
        }
      }
    });

    if (paidOrder) {
      await notifyAdminPaid(paidOrder, payload);
    }

    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.post("/api/invitations", requireAdmin, async (req, res, next) => {
  try {
    const email = cleanText(req.body.email, 160).toLowerCase();
    const fullName = cleanText(req.body.fullName, 160);
    const phone = cleanText(req.body.phone, 80);
    const articleTitle = cleanText(req.body.articleTitle, 500);
    const lang = normalizeLanguage(cleanText(req.body.lang, 8));
    const sendEmail = req.body.sendEmail !== false && req.body.sendEmail !== "false";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required.");
    if (articleTitle.length < 3) throw new Error("Article title is required.");

    const invitation = {
      id: makeId("inv"),
      status: "created",
      email,
      fullName,
      phone,
      articleTitle,
      lang,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    const link = `${config.baseUrl}/?invite=${encodeURIComponent(invitation.id)}&lang=${encodeURIComponent(lang)}`;

    await updateStore((store) => {
      store.invitations.unshift(invitation);
    });

    if (sendEmail) {
      await sendMail({
        to: email,
        subject: "ClinMedKaz article publication payment",
        text: `Your article has been accepted. Please complete publication payment here: ${link}`,
        html: `
          <p>Your article has been accepted.</p>
          <p><strong>Article:</strong> ${articleTitle}</p>
          <p>Please complete publication payment here: <a href="${link}">${link}</a></p>
        `
      });
    }

    res.json({ invitation, link });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/orders", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({
      invitations: store.invitations,
      orders: store.orders.map((order) => ({
        id: order.id,
        invoiceId: order.invoiceId,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        publicationFeeUsd: order.publicationFeeUsd,
        exchangeRate: order.exchangeRate,
        residency: order.residency,
        fullName: order.fullName,
        email: order.email,
        phone: order.phone,
        articleTitle: order.articleTitle,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        halykReference: order.halykReference || "",
        cardMask: order.cardMask || "",
        reason: order.reason || ""
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, _next) => {
  console.error(error);
  const status = error.status || 400;
  if (req.path.startsWith("/api/")) {
    res.status(status).json({ error: error.message || "Request failed" });
    return;
  }
  res.status(status).send(resultPage({ ok: false, lang: resolveLang(req), path: req.path, query: req.query }));
});

app.listen(config.port, () => {
  console.info(`ClinMedKaz payment site running at http://localhost:${config.port}`);
});
