const TOKEN_KEY = "access_token";
const USER_KEY = "documind_user";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function errorMessage(detail, fallback = "Something went wrong. Please try again.") {
  if (typeof detail === "string") return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || String(item)).join(" ");
  return fallback;
}

export async function request(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response;
  try {
    response = await fetch(path, { ...options, headers });
  } catch {
    throw new Error("Unable to reach the server. Check your connection and try again.");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401 && path !== "/api/auth/login") clearSession();
    const error = new Error(errorMessage(data?.detail, `Request failed (${response.status}).`));
    error.status = response.status;
    error.detail = data?.detail;
    throw error;
  }
  return data;
}

export async function fetchProtectedBlob(path) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(path, { headers });
  if (!response.ok) {
    let message = "Could not retrieve the document.";
    try {
      const data = await response.json();
      message = errorMessage(data.detail, message);
    } catch {}
    throw new Error(message);
  }
  return response.blob();
}

export async function downloadFile(path, filename) {
  const blob = await fetchProtectedBlob(path);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || "document";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toast(message, type = "success", title) {
  const region = document.getElementById("toastRegion");
  if (!region) return;
  const item = document.createElement("div");
  item.className = `toast ${type}`;
  item.innerHTML = `<span class="toast-icon">${type === "error" ? "!" : "✓"}</span><div><strong>${escapeHtml(title || (type === "error" ? "Action failed" : "Success"))}</strong><small>${escapeHtml(message)}</small></div><button type="button" aria-label="Dismiss">&times;</button>`;
  item.querySelector("button").addEventListener("click", () => item.remove());
  region.appendChild(item);
  setTimeout(() => item.remove(), type === "error" ? 6500 : 4200);
}

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[character]));
}

export function formatDate(value, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
  }).format(date);
}

export function fileType(item) {
  const name = item?.original_filename || item?.generated_filename || item?.filename || "";
  return name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX";
}
