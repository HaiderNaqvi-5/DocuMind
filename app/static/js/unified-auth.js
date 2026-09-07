import { clearSession, getToken, request, saveSession, toast } from "./unified-api.js";

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

function setMode(mode) {
  const registering = mode === "register";
  loginForm.classList.toggle("hidden", registering);
  registerForm.classList.toggle("hidden", !registering);
  loginTab.classList.toggle("active", !registering);
  registerTab.classList.toggle("active", registering);
  loginTab.setAttribute("aria-selected", String(!registering));
  registerTab.setAttribute("aria-selected", String(registering));
  document.getElementById("authTitle").textContent = registering ? "Create your account" : "Welcome back";
  document.getElementById("authSubtitle").textContent = registering ? "Create a user workspace and start completing documents." : "Sign in and we’ll take you to the right workspace.";
  history.replaceState(null, "", registering ? "#register" : location.pathname);
}

function setBusy(form, busy, label) {
  const button = form.querySelector('button[type="submit"]');
  if (!button.dataset.label) button.dataset.label = button.innerHTML;
  button.disabled = busy;
  button.innerHTML = busy ? `<span class="spinner"></span><span>${label}</span>` : button.dataset.label;
}

function showFieldErrors(form) {
  let valid = true;
  form.querySelectorAll("input").forEach((input) => {
    const wrapper = input.closest(".form-field");
    const error = wrapper.querySelector(".field-error");
    let message = "";
    if (!input.value.trim()) message = "This field is required.";
    else if (input.type === "email" && !input.validity.valid) message = "Enter a valid email address.";
    else if (input.name === "name" && input.value.trim().length < 2) message = "Name must contain at least 2 characters.";
    else if (form === registerForm && input.name === "password" && input.value.length < 6) message = "Password must contain at least 6 characters.";
    wrapper.classList.toggle("invalid", Boolean(message));
    error.textContent = message;
    if (message) valid = false;
  });
  return valid;
}

loginTab.addEventListener("click", () => setMode("login"));
registerTab.addEventListener("click", () => setMode("register"));
document.querySelectorAll(".password-toggle").forEach((button) => button.addEventListener("click", () => {
  const input = button.previousElementSibling;
  input.type = input.type === "password" ? "text" : "password";
  button.textContent = input.type === "password" ? "Show" : "Hide";
}));
document.querySelectorAll("input").forEach((input) => input.addEventListener("input", () => {
  input.closest(".form-field")?.classList.remove("invalid");
  const error = input.closest(".form-field")?.querySelector(".field-error");
  if (error) error.textContent = "";
}));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!showFieldErrors(loginForm)) return;
  setBusy(loginForm, true, "Signing in...");
  try {
    const data = await request("/api/auth/login", { method: "POST", body: JSON.stringify({
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value
    }) });
    saveSession(data.access_token, data.user);
    location.href = "/dashboard";
  } catch (error) {
    toast(error.message, "error", "Could not sign in");
  } finally {
    setBusy(loginForm, false);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!showFieldErrors(registerForm)) return;
  setBusy(registerForm, true, "Creating account...");
  try {
    await request("/api/auth/register", { method: "POST", body: JSON.stringify({
      name: document.getElementById("registerName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value
    }) });
    toast("Your user account is ready. Sign in to continue.");
    document.getElementById("loginEmail").value = document.getElementById("registerEmail").value.trim();
    registerForm.reset();
    setMode("login");
    document.getElementById("loginPassword").focus();
  } catch (error) {
    toast(error.message, "error", "Could not create account");
  } finally {
    setBusy(registerForm, false);
  }
});

async function redirectExistingSession() {
  if (!getToken()) return;
  try {
    const user = await request("/api/auth/me");
    saveSession(getToken(), user);
    location.href = "/dashboard";
  } catch {
    clearSession();
  }
}

setMode(location.hash === "#register" ? "register" : "login");
redirectExistingSession();
