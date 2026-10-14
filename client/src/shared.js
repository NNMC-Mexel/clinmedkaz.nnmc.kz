// Shared by the main app and the admin report pages.

const defaultApiBaseUrl = import.meta.env.PROD ? "https://clinmedkazserver.nnmc.kz/api" : "/api";
export const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || defaultApiBaseUrl).replace(/\/$/, "");
const adminJwtStorageKey = "clinmed_admin_jwt";

// "Remember me" keeps the JWT in localStorage (survives browser restarts until the token expires);
// otherwise it lives in sessionStorage and is dropped when the tab closes.
// Storage access can throw (Safari "Block all cookies", some private modes); the site must still
// work for authors, so every access is guarded and the token falls back to memory for this page.
let memoryAdminJwt = "";

// Takes the storage name, not the object: in some browsers even reading window.localStorage throws.
export function readStorage(name, key) {
  try {
    return window[name].getItem(key) || "";
  } catch {
    return "";
  }
}

export function writeStorage(name, key, value) {
  try {
    if (value === null) window[name].removeItem(key);
    else window[name].setItem(key, value);
  } catch {}
}

export function adminJwt() {
  return readStorage("sessionStorage", adminJwtStorageKey) || readStorage("localStorage", adminJwtStorageKey) || memoryAdminJwt;
}

export function setAdminJwt(jwt, remember = false) {
  clearAdminJwt();
  memoryAdminJwt = jwt;
  writeStorage(remember ? "localStorage" : "sessionStorage", adminJwtStorageKey, jwt);
  markAdminDevice(true);
}

// Marks this browser as an admin's, in localStorage so that every tab sees it - including the
// noopener tabs the admin "Open" buttons create, which do not inherit a sessionStorage token.
// Payment pages opened here are not counted as the author opening the link. Cleared on logout.
const adminDeviceStorageKey = "clinmed_admin_device";

export function markAdminDevice(value) {
  writeStorage("localStorage", adminDeviceStorageKey, value ? "1" : null);
}

// Admins signed in before this marker existed get it on their next page load.
if (adminJwt()) markAdminDevice(true);

export function isAdminDevice() {
  return readStorage("localStorage", adminDeviceStorageKey) === "1";
}

export function clearAdminJwt() {
  memoryAdminJwt = "";
  writeStorage("sessionStorage", adminJwtStorageKey, null);
  writeStorage("localStorage", adminJwtStorageKey, null);
}

function shouldAttachAdminJwt(path) {
  return path.startsWith("/admin") || path.startsWith("/invitations");
}

export function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = adminJwt();
  if (token && shouldAttachAdminJwt(path) && !headers.has("authorization")) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${apiBaseUrl}${path}`, { credentials: "include", ...options, headers });
}

export const dateLocales = { ru: "ru-RU", kk: "kk-KZ", en: "en-US" };
// Browsers report "kk" as supported but often ship without its data and silently fall back
// to the root locale ("2026 M10 6", "136,494.5"). Kazakh shares Russian number conventions,
// and dates are assembled by hand in the CLDR kk pattern ("2026 ж. 06 қаз., 11:30").
export const numberLocales = { ru: "ru-RU", kk: "ru-RU", en: "en-US" };
const kkShortMonths = ["қаң.", "ақп.", "нау.", "сәу.", "мам.", "мау.", "шіл.", "там.", "қыр.", "қаз.", "қар.", "жел."];

export function formatNumber(value, lang = "ru", options = {}) {
  return new Intl.NumberFormat(numberLocales[lang] || numberLocales.ru, options).format(Number(value || 0));
}

export function formatKkDate(date, withTime) {
  const day = `${date.getFullYear()} ж. ${String(date.getDate()).padStart(2, "0")} ${kkShortMonths[date.getMonth()]}`;
  return withTime ? `${day}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : day;
}

export function formatDay(isoDate, lang = "ru") {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  if (lang === "kk") return formatKkDate(date, false);
  return new Intl.DateTimeFormat(dateLocales[lang] || dateLocales.ru, { dateStyle: "medium" }).format(date);
}

export function money(amount, currency, lang = "ru") {
  return `${formatNumber(amount, lang, { maximumFractionDigits: currency === "KZT" ? 0 : 2 })} ${currency}`;
}

export function formatDate(value, lang = "ru") {
  if (!value) return "-";
  const date = new Date(value);
  if (lang === "kk") return formatKkDate(date, true);
  return new Intl.DateTimeFormat(dateLocales[lang] || dateLocales.ru, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function dateFilterBoundary(value, end = false) {
  if (!value) return "";
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day + (end ? 1 : 0));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}
