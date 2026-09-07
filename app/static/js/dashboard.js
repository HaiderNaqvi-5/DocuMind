import {
  clearSession, downloadFile, escapeHtml, fetchProtectedBlob, fileType, formatDate,
  getStoredUser, getToken, request, saveSession, toast
} from "./unified-api.js";
import { fieldInput, normalizeValue, validateValue } from "./validation.js";
import { createSignaturePad } from "./signature-pad.js";

const SUPPORTED_FIELDS = [
  ["full_name", "Full Name", "text"], ["email", "Email", "email"],
  ["phone_number", "Phone Number", "text"], ["gender", "Gender", "select"],
  ["cnic", "CNIC", "text"], ["date_of_birth", "Date of Birth", "date"],
  ["address", "Address", "textarea"], ["signature", "E-Signature", "signature"]
];
const state = { user: null, templates: [], documents: [], adminTemplates: [], adminStats: null, selectedTemplate: null, flowStep: 0, flowSteps: [], signaturePad: null, generated: null };
const main = document.getElementById("mainContent");
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");

const icons = {
  dashboard: "&#9638;", templates: "&#9645;", upload: "&uarr;", documents: "&#9776;",
  users: "&#9673;", profile: "&#9675;"
};

const navByRole = {
  admin: [
    ["dashboard", "Dashboard"], ["templates", "Templates"], ["upload", "Upload Template"],
    ["documents", "Generated Documents"], ["users", "Users"], ["profile", "Profile"]
  ],
  user: [["dashboard", "Dashboard"], ["templates", "Templates"], ["documents", "My Documents"], ["profile", "Profile"]]
};

function route() {
  return (location.hash.slice(1) || "dashboard").split("?")[0];
}

function setTitle(title) {
  document.getElementById("pageTitle").textContent = title;
  document.getElementById("breadcrumb").textContent = `Workspace / ${title}`;
  document.title = `${title} | Documind`;
}

function renderNav() {
  document.getElementById("sideNav").innerHTML = navByRole[state.user.role].map(([key, label]) =>
    `<a class="nav-link ${route() === key ? "active" : ""}" href="#${key}"><span class="nav-icon">${icons[key]}</span>${label}</a>`
  ).join("");
}

function setLoading(message = "Loading...") {
  main.innerHTML = `<div class="empty-state"><span class="spinner"></span><p>${escapeHtml(message)}</p></div>`;
}

function emptyState(icon, title, message, action = "") {
  return `<div class="empty-state"><span class="empty-icon">${icon}</span><h3>${escapeHtml(title)}</h3><p>${escapeHtml(message)}</p>${action}</div>`;
}

function statCard(label, value, note, icon) {
  return `<article class="stat-card"><span>${label}</span><strong>${value}</strong><small>${note}</small><span class="stat-icon">${icon}</span></article>`;
}

function badge(status = "draft") {
  const clean = String(status).toLowerCase();
  return `<span class="badge badge-${escapeHtml(clean)}">${escapeHtml(clean)}</span>`;
}

function typeLabel(item) {
  return `<span class="file-icon">${fileType(item)}</span>`;
}

function knownAdminTemplates() {
  try { return JSON.parse(localStorage.getItem("documind_admin_templates") || "[]"); } catch { return []; }
}

function rememberAdminTemplate(template) {
  const templates = knownAdminTemplates().filter((item) => item.id !== template.id);
  templates.unshift({ ...template, created_at: template.created_at || new Date().toISOString() });
  localStorage.setItem("documind_admin_templates", JSON.stringify(templates));
}

async function loadAdminTemplates(silent = false) {
  try {
    const data = await request("/api/admin/templates");
    state.adminTemplates = data.templates || data || [];
    localStorage.setItem("documind_admin_templates", JSON.stringify(state.adminTemplates));
  } catch (error) {
    if (error.status !== 404 && !silent) toast(error.message, "error", "Could not load templates");
    state.adminTemplates = knownAdminTemplates();
    await Promise.all(state.adminTemplates.map(async (template) => {
      try {
        const data = await request(`/api/admin/templates/${template.id}/fields`);
        template.field_count = data.fields?.length || 0;
      } catch {}
    }));
  }
}

async function loadUserData() {
  const [templatesResult, documentsResult] = await Promise.allSettled([
    request("/api/user/templates"), request("/api/user/documents")
  ]);
  state.templates = templatesResult.status === "fulfilled" ? templatesResult.value.templates || [] : [];
  state.documents = documentsResult.status === "fulfilled" ? documentsResult.value.documents || [] : [];
  if (templatesResult.status === "rejected") toast(templatesResult.reason.message, "error", "Templates unavailable");
  if (documentsResult.status === "rejected") toast(documentsResult.reason.message, "error", "History unavailable");
}

async function renderRoute() {
  renderNav();
  closeMobileMenu();
  const current = route();
  if (!navByRole[state.user.role].some(([key]) => key === current)) {
    location.hash = "dashboard";
    return;
  }
  setLoading();
  try {
    if (state.user.role === "admin") {
      if (["dashboard", "templates"].includes(current)) await loadAdminTemplates(true);
      if (current === "dashboard") {
        try { state.adminStats = await request("/api/admin/stats"); } catch { state.adminStats = null; }
      }
      if (current === "dashboard") renderAdminDashboard();
      if (current === "templates") renderAdminTemplates();
      if (current === "upload") renderUpload();
      if (current === "documents") await renderAdminDocuments();
      if (current === "users") await renderUsers();
      if (current === "profile") renderProfile();
    } else {
      if (["dashboard", "templates", "documents"].includes(current)) await loadUserData();
      if (current === "dashboard") renderUserDashboard();
      if (current === "templates") renderUserTemplates();
      if (current === "documents") renderMyDocuments();
      if (current === "profile") renderProfile();
    }
    main.focus({ preventScroll: true });
  } catch (error) {
    main.innerHTML = emptyState("!", "This view could not be loaded", error.message, '<button class="button button-small" data-action="retry">Try again</button>');
  }
}

function renderAdminDashboard() {
  setTitle("Dashboard");
  const published = state.adminStats?.published_templates ?? state.adminTemplates.filter((item) => item.status === "published").length;
  const draft = state.adminStats?.draft_templates ?? state.adminTemplates.length - published;
  const total = state.adminStats?.total_templates ?? state.adminTemplates.length;
  const generated = state.adminStats?.generated_documents ?? 0;
  main.innerHTML = `
    <div class="welcome-row"><div><h2>Good day, ${escapeHtml(state.user.name.split(" ")[0])}.</h2><p>Manage document templates and keep the publishing workflow moving.</p></div><a class="button" href="#upload">+ Upload template</a></div>
    <section class="stats-grid">${statCard("Total templates", total, "In your workspace", "T")}${statCard("Published", published, "Available to users", "P")}${statCard("Draft templates", draft, "Awaiting review", "D")}${statCard("Generated documents", generated, "Completed by users", "G")}</section>
    <div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Recent templates</h2><p>Your latest uploads and their current status</p></div><a class="text-button" href="#templates">View all</a></div>${adminActivity()}</section>
    <aside class="panel"><div class="panel-header"><div><h2>Quick actions</h2><p>Continue your workflow</p></div></div><div class="quick-actions"><a class="quick-action" href="#upload"><span class="feature-icon">&uarr;</span><span><strong>Upload template</strong><small>Add a DOCX or PDF file</small></span></a><a class="quick-action" href="#templates"><span class="feature-icon">&#10022;</span><span><strong>Review templates</strong><small>Analyze fields and publish</small></span></a><a class="quick-action" href="#documents"><span class="feature-icon">&#9776;</span><span><strong>Generated documents</strong><small>Review platform activity</small></span></a></div></aside></div>`;
}

function adminActivity() {
  if (!state.adminTemplates.length) return emptyState("&uarr;", "No templates yet", "Upload your first DOCX or PDF template to begin.", '<a class="button button-small" href="#upload">Upload template</a>');
  return `<div class="activity-list">${state.adminTemplates.slice(0, 5).map((item) => `<div class="activity-item">${typeLabel(item)}<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.original_filename)} · ${formatDate(item.created_at)}</small></div>${badge(item.status)}</div>`).join("")}</div>`;
}

function renderAdminTemplates() {
  setTitle("Templates");
  main.innerHTML = `<div class="welcome-row"><div><h2>Template library</h2><p>Analyze, review, and publish controlled document templates.</p></div><a class="button" href="#upload">+ Upload template</a></div>
    <div class="toolbar"><div class="search-box"><span>&#9906;</span><input class="input" id="templateSearch" type="search" placeholder="Search templates or filenames"></div><select class="input filter-select" id="statusFilter"><option value="">All statuses</option><option value="draft">Draft</option><option value="analyzed">Analyzed</option><option value="published">Published</option></select></div><div id="adminTemplateList"></div>`;
  drawAdminTemplateTable();
  document.getElementById("templateSearch").addEventListener("input", drawAdminTemplateTable);
  document.getElementById("statusFilter").addEventListener("change", drawAdminTemplateTable);
}

function drawAdminTemplateTable() {
  const target = document.getElementById("adminTemplateList");
  const query = (document.getElementById("templateSearch")?.value || "").toLowerCase();
  const status = document.getElementById("statusFilter")?.value || "";
  const templates = state.adminTemplates.filter((item) => (!status || item.status === status) && `${item.title} ${item.original_filename}`.toLowerCase().includes(query));
  if (!templates.length) {
    target.innerHTML = emptyState("&#9645;", query || status ? "No matching templates" : "No templates yet", query || status ? "Change your search or status filter." : "Upload your first DOCX or PDF template to begin.", query || status ? "" : '<a class="button button-small" href="#upload">Upload template</a>');
    return;
  }
  target.innerHTML = `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Template</th><th>Type</th><th>Document type</th><th>Fields</th><th>Status</th><th>Uploaded</th><th>Actions</th></tr></thead><tbody>${templates.map((item) => `<tr><td><div class="table-title">${typeLabel(item)}<div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.original_filename)}</small></div></div></td><td>${fileType(item)}</td><td>${escapeHtml(item.document_type || "Not analyzed")}</td><td>${item.field_count ?? "--"}</td><td>${badge(item.status)}</td><td>${formatDate(item.created_at)}</td><td><div class="action-menu"><button data-admin-action="analyze" data-id="${item.id}">Analyze</button><button data-admin-action="review" data-id="${item.id}">Review</button><button data-admin-action="preview" data-id="${item.id}">Preview</button><button data-admin-action="${item.status === "published" ? "unpublish" : "publish"}" data-id="${item.id}">${item.status === "published" ? "Unpublish" : "Publish"}</button><button data-admin-action="delete" data-id="${item.id}">Delete</button></div></td></tr>`).join("")}</tbody></table></div>`;
}

function renderUpload() {
  setTitle("Upload Template");
  main.innerHTML = `<div class="welcome-row"><div><h2>Add a document template</h2><p>Upload the original file first. Field detection happens in the next step.</p></div></div><div class="upload-layout"><section class="panel upload-panel"><form id="uploadForm"><div class="form-field"><label for="uploadTitle">Template title</label><input id="uploadTitle" type="text" maxlength="200" placeholder="e.g. Employment Application Form" required><span class="field-error"></span></div><input id="uploadFile" class="hidden" type="file" accept=".docx,.pdf"><div id="dropZone" class="drop-zone" tabindex="0" role="button"><span class="drop-icon">&uarr;</span><h3>Drop your DOCX or PDF here</h3><p>or choose a file from your computer</p><span class="button button-small button-secondary">Browse files</span><small>Supported formats: DOCX, PDF · Use the original unflattened file where possible</small></div><div id="selectedFile"></div><button id="uploadButton" class="button button-block" type="submit" disabled><span>Upload template</span><span>&rarr;</span></button></form></section><aside class="panel upload-tips"><h3>For the best field detection</h3><ul><li>Use clear labels such as Applicant Name, CNIC, or Date of Birth.</li><li>Keep the original formatting, tables, fonts, and spacing in place.</li><li>Only supported personal fields are made editable.</li><li>Review every detected field before publishing to users.</li></ul><div class="account-note"><span>&#10022;</span> Long-form resume sections and arbitrary paragraphs are intentionally ignored.</div></aside></div>`;
  setupUpload();
}

function setupUpload() {
  const input = document.getElementById("uploadFile");
  const zone = document.getElementById("dropZone");
  const form = document.getElementById("uploadForm");
  const selected = document.getElementById("selectedFile");
  const button = document.getElementById("uploadButton");
  let file = null;
  const choose = (candidate) => {
    if (!candidate) return;
    const extension = candidate.name.split(".").pop().toLowerCase();
    if (!["docx", "pdf"].includes(extension)) return toast("Choose a DOCX or PDF file.", "error", "Unsupported file");
    file = candidate;
    selected.innerHTML = `<div class="selected-file">${typeLabel({ original_filename: file.name })}<div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)} · Ready to upload</small></div><button class="icon-button" id="removeFile" type="button" aria-label="Remove file">&times;</button></div>`;
    button.disabled = false;
    document.getElementById("removeFile").addEventListener("click", () => { file = null; input.value = ""; selected.innerHTML = ""; button.disabled = true; });
    if (!document.getElementById("uploadTitle").value) document.getElementById("uploadTitle").value = file.name.replace(/\.(docx|pdf)$/i, "").replace(/[_-]+/g, " ");
  };
  zone.addEventListener("click", () => input.click());
  zone.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) input.click(); });
  input.addEventListener("change", () => choose(input.files[0]));
  ["dragenter", "dragover"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.add("dragging"); }));
  ["dragleave", "drop"].forEach((name) => zone.addEventListener(name, (event) => { event.preventDefault(); zone.classList.remove("dragging"); }));
  zone.addEventListener("drop", (event) => choose(event.dataTransfer.files[0]));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = document.getElementById("uploadTitle").value.trim();
    if (!title || !file) return toast("Add a title and choose a document.", "error", "Missing information");
    const data = new FormData(); data.append("title", title); data.append("file", file);
    button.disabled = true; button.innerHTML = '<span class="spinner"></span><span>Uploading document...</span>';
    selected.insertAdjacentHTML("beforeend", '<div class="progress-bar"><span></span></div>');
    try {
      const template = await request("/api/admin/templates/upload", { method: "POST", body: data });
      rememberAdminTemplate(template);
      toast("Template uploaded. Analyze it to detect supported fields.");
      location.hash = "templates";
    } catch (error) {
      toast(error.message, "error", "Upload failed"); button.disabled = false; button.innerHTML = "<span>Upload template</span><span>&rarr;</span>";
      selected.querySelector(".progress-bar")?.remove();
    }
  });
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

async function adminAction(action, id, button) {
  const template = state.adminTemplates.find((item) => item.id === id);
  if (!template) return;
  if (action === "analyze" && template.status === "published") return toast("Unpublish this template before analyzing it again.", "error", "Template is published");
  if (action === "review") return openFieldReview(template);
  if (action === "preview") return previewTemplate(template, true);
  if (action === "delete" && !confirm(`Delete “${template.title}”? This cannot be undone.`)) return;
  if (action === "unpublish" && !confirm(`Unpublish “${template.title}”? Users will no longer be able to select it.`)) return;
  button.disabled = true; button.textContent = action === "analyze" ? "Analyzing..." : "Working...";
  try {
    if (action === "analyze") {
      const result = await request(`/api/admin/templates/${id}/analyze`, { method: "POST" });
      template.document_type = result.document_type; template.field_count = result.fields?.length || 0; template.status = "analyzed";
      rememberAdminTemplate(template); toast(`${template.field_count} supported field${template.field_count === 1 ? "" : "s"} detected.`, "success", "Analysis complete");
      await openFieldReview(template);
    } else if (action === "publish") {
      await request(`/api/admin/templates/${id}/publish`, { method: "POST" }); template.status = "published"; rememberAdminTemplate(template); toast("Template is now available to users.", "success", "Published");
    } else if (action === "unpublish") {
      await request(`/api/admin/templates/${id}/unpublish`, { method: "POST" }); template.status = "analyzed"; rememberAdminTemplate(template); toast("Template unpublished and returned to review status.");
    } else if (action === "delete") {
      await request(`/api/admin/templates/${id}`, { method: "DELETE" }); state.adminTemplates = state.adminTemplates.filter((item) => item.id !== id); localStorage.setItem("documind_admin_templates", JSON.stringify(state.adminTemplates)); toast("Template deleted.");
    }
    if (route() === "templates") drawAdminTemplateTable();
  } catch (error) {
    toast(error.status === 404 && ["unpublish", "delete"].includes(action) ? "This action needs the corresponding backend endpoint before it can complete." : error.message, "error");
    drawAdminTemplateTable();
  }
}

async function openFieldReview(template) {
  openModal("Detected fields", "Controlled AI review", '<div class="empty-state"><span class="spinner"></span><p>Loading detected fields...</p></div>');
  try {
    const data = await request(`/api/admin/templates/${template.id}/fields`);
    drawFieldReview(template, data.fields || []);
  } catch (error) { modalBody.innerHTML = emptyState("!", "Fields unavailable", error.message); }
}

function drawFieldReview(template, fields) {
  template.field_count = fields.length; rememberAdminTemplate(template);
  modalBody.innerHTML = `<div class="account-note"><span>&#10022;</span>Only approved personal fields can be configured. Save changes before publishing.</div><div id="fieldEditors">${fields.map(fieldEditor).join("")}</div><div class="flow-footer"><button class="button button-small button-secondary" id="addField" type="button">+ Add supported field</button><button class="button button-small" id="closeReview" type="button">Finish review</button></div>`;
  document.getElementById("closeReview").addEventListener("click", closeModal);
  document.getElementById("addField").addEventListener("click", () => addFieldEditor(template, fields));
  document.getElementById("fieldEditors").addEventListener("click", async (event) => {
    const button = event.target.closest("button[data-field-action]"); if (!button) return;
    const row = button.closest(".field-editor"); const id = Number(row.dataset.id); const action = button.dataset.fieldAction;
    try {
      if (action === "delete") {
        if (!confirm("Remove this detected field?")) return;
        await request(`/api/admin/templates/${template.id}/fields/${id}`, { method: "DELETE" }); row.remove(); fields = fields.filter((item) => item.id !== id); template.field_count = fields.length; rememberAdminTemplate(template); toast("Field removed.");
      } else {
        const payload = editorPayload(row);
        await request(`/api/admin/templates/${template.id}/fields/${id}`, { method: "PUT", body: JSON.stringify(payload) }); toast(`${payload.label} updated.`);
      }
    } catch (error) { toast(error.message, "error", "Could not update field"); }
  });
}

function fieldEditor(field) {
  return `<div class="field-editor" data-id="${field.id}"><div class="form-field"><label>Field</label><select data-name="field_key">${SUPPORTED_FIELDS.map(([key, label]) => `<option value="${key}" ${field.field_key === key ? "selected" : ""}>${label}</option>`).join("")}</select></div><div class="form-field"><label>Label</label><input data-name="label" value="${escapeHtml(field.label)}"></div><div class="form-field"><label>Source text</label><input data-name="source_text" value="${escapeHtml(field.source_text || field.placeholder_text || field.label)}"></div><label class="checkbox-field"><input data-name="required" type="checkbox" ${field.required ? "checked" : ""}>Required</label><div class="field-editor-actions"><button class="icon-button" data-field-action="save" title="Save field" type="button">&check;</button><button class="icon-button" data-field-action="delete" title="Remove field" type="button">&times;</button></div></div>`;
}

function editorPayload(row) {
  const fieldKey = row.querySelector('[data-name="field_key"]').value;
  const schema = SUPPORTED_FIELDS.find(([key]) => key === fieldKey);
  return { field_key: fieldKey, label: row.querySelector('[data-name="label"]').value.trim(), field_type: schema[2], required: row.querySelector('[data-name="required"]').checked, source_text: row.querySelector('[data-name="source_text"]').value.trim() };
}

function addFieldEditor(template, fields) {
  const available = SUPPORTED_FIELDS.find(([key]) => !fields.some((field) => field.field_key === key));
  if (!available) return toast("All supported fields are already configured.", "error");
  openModal("Add a supported field", "Controlled field schema", `<form id="addFieldForm"><div class="form-field"><label>Supported field</label><select id="newFieldKey">${SUPPORTED_FIELDS.filter(([key]) => !fields.some((field) => field.field_key === key)).map(([key, label]) => `<option value="${key}">${label}</option>`).join("")}</select></div><div class="form-field"><label>Label shown to users</label><input id="newFieldLabel" value="${available[1]}" required></div><div class="form-field"><label>Exact source text in document</label><input id="newFieldSource" placeholder="e.g. Applicant Name" required></div><label class="checkbox-field"><input id="newFieldRequired" type="checkbox" checked>Required field</label><div class="flow-footer"><button class="button button-secondary" type="button" id="backToReview">Back</button><button class="button" type="submit">Add field</button></div></form>`);
  const select = document.getElementById("newFieldKey"); select.addEventListener("change", () => { document.getElementById("newFieldLabel").value = SUPPORTED_FIELDS.find(([key]) => key === select.value)[1]; });
  document.getElementById("backToReview").addEventListener("click", () => drawFieldReview(template, fields));
  document.getElementById("addFieldForm").addEventListener("submit", async (event) => {
    event.preventDefault(); const schema = SUPPORTED_FIELDS.find(([key]) => key === select.value);
    try {
      const created = await request(`/api/admin/templates/${template.id}/fields`, { method: "POST", body: JSON.stringify({ field_key: schema[0], label: document.getElementById("newFieldLabel").value.trim(), field_type: schema[2], required: document.getElementById("newFieldRequired").checked, source_text: document.getElementById("newFieldSource").value.trim() }) });
      fields.push(created); toast("Supported field added."); drawFieldReview(template, fields);
    } catch (error) { toast(error.message, "error", "Could not add field"); }
  });
}

async function renderAdminDocuments() {
  setTitle("Generated Documents");
  main.innerHTML = `<div class="welcome-row"><div><h2>Generated documents</h2><p>Read-only activity across published templates.</p></div></div>`;
  try {
    const data = await request("/api/admin/documents");
    main.insertAdjacentHTML("beforeend", documentTable(data.documents || [], true));
  } catch (error) { main.insertAdjacentHTML("beforeend", emptyState("&#9776;", "Admin history is not available yet", error.status === 404 ? "The current backend provides personal document history to users. Add the admin documents endpoint to enable this view." : error.message)); }
}

async function renderUsers() {
  setTitle("Users");
  main.innerHTML = `<div class="welcome-row"><div><h2>Platform users</h2><p>Accounts with access to document completion.</p></div></div>`;
  try {
    const data = await request("/api/admin/users");
    const users = data.users || [];
    main.insertAdjacentHTML("beforeend", users.length ? `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Joined</th></tr></thead><tbody>${users.map((user) => `<tr><td><strong>${escapeHtml(user.name)}</strong></td><td>${escapeHtml(user.email)}</td><td>${badge(user.role)}</td><td>${formatDate(user.created_at)}</td></tr>`).join("")}</tbody></table></div>` : emptyState("&#9673;", "No users to show", "Registered users will appear here."));
  } catch (error) { main.insertAdjacentHTML("beforeend", emptyState("&#9673;", "User management is not available yet", error.status === 404 ? "Add the admin users endpoint to connect this prepared view." : error.message)); }
}

function renderUserDashboard() {
  setTitle("Dashboard");
  const recent = state.documents.slice(0, 4);
  main.innerHTML = `<div class="welcome-row"><div><h2>Welcome back, ${escapeHtml(state.user.name.split(" ")[0])}.</h2><p>Your document workspace is ready. Choose a template to get started.</p></div><a class="button" href="#templates">Browse templates &rarr;</a></div><section class="stats-grid">${statCard("Available templates", state.templates.length, "Published and ready", "T")}${statCard("Documents completed", state.documents.length, "In secure history", "✓")}${statCard("In progress", "0", "No saved drafts", "...")}${statCard("Recent documents", Math.min(recent.length, 4), "Latest activity", "R")}</section><div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Recent documents</h2><p>Your latest generated files</p></div><a class="text-button" href="#documents">View all</a></div>${recent.length ? `<div class="activity-list">${recent.map((item) => `<div class="activity-item">${typeLabel(item)}<div><strong>${escapeHtml(item.template_title)}</strong><small>Generated ${formatDate(item.created_at, true)}</small></div><button class="text-button" data-doc-action="download" data-id="${item.id}">Download</button></div>`).join("")}</div>` : emptyState("&#9776;", "No documents generated yet", "Choose a published template and create your first document.", '<a class="button button-small" href="#templates">Browse templates</a>')}</section><aside class="panel"><div class="panel-header"><div><h2>Quick start</h2><p>Complete a document</p></div></div><div class="quick-actions"><a class="quick-action" href="#templates"><span class="feature-icon">1</span><span><strong>Choose a template</strong><small>Browse published documents</small></span></a><div class="quick-action"><span class="feature-icon">2</span><span><strong>Enter your details</strong><small>Inline validation keeps them accurate</small></span></div><div class="quick-action"><span class="feature-icon">3</span><span><strong>Generate and download</strong><small>Your file remains in history</small></span></div></div></aside></div>`;
}

function renderUserTemplates() {
  setTitle("Templates");
  main.innerHTML = `<div class="welcome-row"><div><h2>Choose a template</h2><p>Only reviewed and published templates are shown here.</p></div></div><div class="toolbar"><div class="search-box"><span>&#9906;</span><input class="input" id="userTemplateSearch" type="search" placeholder="Search available templates"></div><select class="input filter-select" id="typeFilter"><option value="">All file types</option><option>DOCX</option><option>PDF</option></select></div><div id="userTemplateGrid"></div>`;
  drawUserTemplateGrid();
  document.getElementById("userTemplateSearch").addEventListener("input", drawUserTemplateGrid);
  document.getElementById("typeFilter").addEventListener("change", drawUserTemplateGrid);
}

function drawUserTemplateGrid() {
  const query = (document.getElementById("userTemplateSearch")?.value || "").toLowerCase(); const type = document.getElementById("typeFilter")?.value;
  const templates = state.templates.filter((item) => (!type || fileType(item) === type) && `${item.title} ${item.original_filename} ${item.document_type}`.toLowerCase().includes(query));
  const target = document.getElementById("userTemplateGrid");
  if (!templates.length) { target.innerHTML = emptyState("&#9645;", query || type ? "No matching templates" : "No published templates", query || type ? "Change your search or file type filter." : "Published templates will appear here when an administrator makes them available."); return; }
  target.innerHTML = `<div class="template-grid">${templates.map((item) => `<article class="template-card"><div class="template-card-top"><span class="template-file-icon">${fileType(item)}</span>${badge("published")}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.document_type || "Ready-to-complete document template")}</p><div class="template-meta"><span>${fileType(item)} file</span><span>${item.field_count != null ? `${item.field_count} fields` : "Dynamic fields"}</span></div><div class="template-actions"><button class="button button-secondary" data-template-action="preview" data-id="${item.id}">Preview</button><button class="button" data-template-action="use" data-id="${item.id}">Use template</button></div></article>`).join("")}</div>`;
}

async function startTemplateFlow(id) {
  setLoading("Preparing template fields...");
  try {
    state.selectedTemplate = await request(`/api/user/templates/${id}`); state.flowStep = 0; state.generated = null;
    const needsSignature = state.selectedTemplate.fields.some((field) => field.field_key === "signature" || field.field_type === "signature");
    state.flowSteps = ["Template", "Personal information", ...(needsSignature ? ["Signature"] : []), "Preview", "Download"];
    renderFlow();
  } catch (error) { toast(error.message, "error", "Could not open template"); renderUserTemplates(); }
}

function renderFlow() {
  setTitle("Complete Document");
  const content = flowContent();
  main.innerHTML = `<div class="stepper">${state.flowSteps.map((label, index) => `<div class="step ${index < state.flowStep ? "complete" : index === state.flowStep ? "active" : ""}"><span class="step-number">${index < state.flowStep ? "✓" : index + 1}</span><span>${label}</span></div>`).join("")}</div><section class="flow-card">${content}</section>`;
  bindFlowStep();
}

function flowContent() {
  const template = state.selectedTemplate; const label = state.flowSteps[state.flowStep];
  if (label === "Template") return `<div class="flow-header">${typeLabel(template)}<div><h2>${escapeHtml(template.title)}</h2><p>${fileType(template)} · ${escapeHtml(template.document_type || "Document template")} · ${template.fields.length} fields</p></div></div><div class="review-list"><div class="review-row"><span>Original filename</span><strong>${escapeHtml(template.original_filename)}</strong></div><div class="review-row"><span>Required information</span><strong>${template.fields.filter((field) => field.required).length} fields</strong></div><div class="review-row"><span>E-signature</span><strong>${template.fields.some((field) => field.field_type === "signature") ? "Required" : "Not required"}</strong></div></div><div class="flow-footer"><button class="button button-secondary" data-flow="cancel">Back to templates</button><div class="button-row"><button class="button button-secondary" data-flow="preview-template">Preview</button><button class="button" data-flow="next">Enter information &rarr;</button></div></div>`;
  if (label === "Personal information") {
    const fields = template.fields.filter((field) => field.field_type !== "signature" && field.field_key !== "signature");
    return `<div class="flow-header"><span class="feature-icon">2</span><div><h2>Personal information</h2><p>Fields marked with an asterisk are required. Your details are validated before generation.</p></div></div><form id="detailsForm" class="dynamic-form" novalidate>${fields.map((field) => `<div class="form-field ${field.field_key === "address" ? "span-full" : ""}" data-key="${escapeHtml(field.field_key)}"><label for="field-${escapeHtml(field.field_key)}">${escapeHtml(field.label)}${field.required ? " *" : ""}</label>${fieldInput(field)}<span class="field-error"></span></div>`).join("")}</form><div class="flow-footer"><button class="button button-secondary" data-flow="back">&larr; Back</button><button class="button" data-flow="validate">Continue &rarr;</button></div>`;
  }
  if (label === "Signature") return `<div class="flow-header"><span class="feature-icon">&#9998;</span><div><h2>Draw your e-signature</h2><p>Use your mouse, trackpad, or finger. Confirm it before continuing.</p></div></div><div class="signature-wrap"><p class="signature-instructions">Sign inside the box below.</p><canvas id="signatureCanvas" class="signature-canvas-new"></canvas><div class="signature-actions"><span id="signatureStatus" class="signature-status">Signature not yet added</span><div class="button-row"><button id="clearSignature" class="button button-small button-secondary" type="button">Clear</button><button id="confirmSignature" class="button button-small" type="button">Confirm signature</button></div></div></div><div class="flow-footer"><button class="button button-secondary" data-flow="back">&larr; Back</button><button id="signatureNext" class="button" data-flow="next" disabled>Continue &rarr;</button></div>`;
  if (label === "Preview" && !state.generated) return `<div class="flow-header"><span class="feature-icon">&#10003;</span><div><h2>Review your information</h2><p>Confirm these details before the completed document is generated.</p></div></div><div class="review-list">${template.fields.filter((field) => field.field_type !== "signature").map((field) => `<div class="review-row"><span>${escapeHtml(field.label)}</span><strong>${escapeHtml(template.values?.[field.field_key] || "Not provided")}</strong></div>`).join("")}${template.signature ? '<div class="review-row"><span>E-Signature</span><strong>Confirmed</strong></div>' : ""}</div><div class="flow-footer"><button class="button button-secondary" data-flow="back">&larr; Back</button><button class="button" data-flow="generate">Generate document</button></div>`;
  return `<div class="success-state"><span class="success-icon">&check;</span><h2>Document generated successfully</h2><p>${escapeHtml(state.generated?.filename || template.title)} is ready and has been added to My Documents.</p><div class="button-row"><button class="button button-secondary" data-flow="preview-generated">Preview document</button><button class="button" data-flow="download">Download ${fileType({ filename: state.generated?.filename })}</button></div><button class="text-button" data-flow="documents" type="button">Back to My Documents</button></div>`;
}

function bindFlowStep() {
  const label = state.flowSteps[state.flowStep];
  if (label === "Personal information") {
    Object.entries(state.selectedTemplate.values || {}).forEach(([key, value]) => { const input = document.getElementById(`field-${key}`); if (input) input.value = value; });
    document.querySelectorAll("#detailsForm input, #detailsForm select, #detailsForm textarea").forEach((input) => {
      input.addEventListener("blur", () => validateDynamicInput(input)); input.addEventListener("input", () => clearDynamicError(input));
    });
  }
  if (label === "Signature") {
    const status = document.getElementById("signatureStatus"); const next = document.getElementById("signatureNext");
    state.signaturePad = createSignaturePad(document.getElementById("signatureCanvas"), (signed) => { status.textContent = signed ? "Signature drawn · confirm to continue" : "Signature not yet added"; status.classList.remove("confirmed"); next.disabled = true; });
    document.getElementById("clearSignature").addEventListener("click", () => state.signaturePad.clear());
    document.getElementById("confirmSignature").addEventListener("click", () => { if (!state.signaturePad.hasSignature()) return toast("Draw your signature inside the box first.", "error"); state.selectedTemplate.signature = state.signaturePad.value(); status.textContent = "Signature confirmed"; status.classList.add("confirmed"); next.disabled = false; });
  }
}

function clearDynamicError(input) { const wrapper = input.closest(".form-field"); wrapper.classList.remove("invalid"); wrapper.querySelector(".field-error").textContent = ""; }
function validateDynamicInput(input) {
  const field = state.selectedTemplate.fields.find((item) => item.field_key === input.name); const error = validateValue(field.field_key, input.value, field.required); const wrapper = input.closest(".form-field"); wrapper.classList.toggle("invalid", Boolean(error)); wrapper.querySelector(".field-error").textContent = error;
  if (!error && ["cnic", "phone_number"].includes(field.field_key)) input.value = normalizeValue(field.field_key, input.value);
  return !error;
}

async function flowAction(action, button) {
  if (action === "cancel") return location.hash = "templates";
  if (action === "documents") return location.hash = "documents";
  if (action === "back") { state.flowStep--; renderFlow(); return; }
  if (action === "next") { state.flowStep++; renderFlow(); return; }
  if (action === "preview-template") return previewTemplate(state.selectedTemplate, false);
  if (action === "validate") {
    const inputs = [...document.querySelectorAll("#detailsForm input, #detailsForm select, #detailsForm textarea")];
    if (!inputs.map(validateDynamicInput).every(Boolean)) { inputs.find((input) => input.closest(".invalid"))?.focus(); return toast("Correct the highlighted fields before continuing.", "error", "Check your information"); }
    state.selectedTemplate.values = Object.fromEntries(inputs.map((input) => [input.name, normalizeValue(input.name, input.value)])); state.flowStep++; renderFlow(); return;
  }
  if (action === "generate") {
    button.disabled = true; button.innerHTML = '<span class="spinner"></span> Generating document...';
    const values = { ...state.selectedTemplate.values };
    const signatureField = state.selectedTemplate.fields.find((field) => field.field_type === "signature" || field.field_key === "signature"); if (signatureField) values[signatureField.field_key] = state.selectedTemplate.signature || "";
    try {
      state.generated = await request(`/api/user/templates/${state.selectedTemplate.template_id}/generate`, { method: "POST", body: JSON.stringify({ values }) }); state.flowStep++; renderFlow(); toast("Your completed document is ready.");
    } catch (error) { toast(error.message, "error", "Document generation failed"); button.disabled = false; button.textContent = "Generate document"; }
    return;
  }
  if (action === "download") return downloadFile(state.generated.download_url, state.generated.filename).catch((error) => toast(error.message, "error"));
  if (action === "preview-generated") return previewGenerated({ ...state.generated, generated_filename: state.generated.filename, template_title: state.generated.template_title });
}

function renderMyDocuments() {
  setTitle("My Documents");
  main.innerHTML = `<div class="welcome-row"><div><h2>My documents</h2><p>Return to completed files and download them securely.</p></div><a class="button" href="#templates">Create document</a></div>${documentTable(state.documents)}`;
}

function documentTable(documents, admin = false) {
  if (!documents.length) return emptyState("&#9776;", "No documents generated yet", admin ? "Generated platform documents will appear here." : "Choose a published template and create your first document.", admin ? "" : '<a class="button button-small" href="#templates">Browse templates</a>');
  return `<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Document</th><th>File type</th><th>Generated</th><th>Status</th>${admin ? "" : "<th>Actions</th>"}</tr></thead><tbody>${documents.map((item) => `<tr><td><div class="table-title">${typeLabel(item)}<div><strong>${escapeHtml(item.template_title)}</strong><small>${escapeHtml(item.generated_filename)}</small></div></div></td><td>${fileType(item)}</td><td>${formatDate(item.created_at, true)}</td><td>${badge("generated")}</td>${admin ? "" : `<td><div class="action-menu"><button data-doc-action="preview" data-id="${item.id}">Preview</button><button data-doc-action="download" data-id="${item.id}">Download</button></div></td>`}</tr>`).join("")}</tbody></table></div>`;
}

async function documentAction(action, id) {
  const item = state.documents.find((document) => document.id === id); if (!item) return;
  if (action === "download") return downloadFile(`/api/user/documents/${item.id}/download`, item.generated_filename).catch((error) => toast(error.message, "error"));
  if (action === "preview") return previewGenerated(item);
}

async function previewTemplate(template, admin) {
  openModal(template.title, "Template preview", '<div class="empty-state"><span class="spinner"></span><p>Preparing preview...</p></div>');
  const path = admin ? `/api/admin/templates/${template.id}/preview` : `/api/user/templates/${template.id || template.template_id}/preview`;
  try {
    const blob = await fetchProtectedBlob(path); showBlobPreview(blob, template.original_filename, path);
  } catch (error) {
    modalBody.innerHTML = `<div class="empty-state"><span class="empty-icon">${fileType(template)}</span><h3>Browser preview is not available</h3><p>${escapeHtml(error.message)} The template is still available for its normal workflow.</p></div>`;
  }
}

async function previewGenerated(item) {
  openModal(item.template_title || "Generated document", "Document preview", '<div class="empty-state"><span class="spinner"></span><p>Preparing secure preview...</p></div>');
  const documentId = item.generated_document_id || item.id;
  const path = item.preview_url || (documentId ? `/api/user/documents/${documentId}/preview` : item.download_url);
  if (fileType(item) === "PDF") {
    try { const blob = await fetchProtectedBlob(path); showBlobPreview(blob, item.generated_filename, path); } catch (error) { modalBody.innerHTML = emptyState("!", "Preview unavailable", error.message); }
  } else {
    modalBody.innerHTML = `<div class="empty-state"><span class="empty-icon">DOCX</span><h3>${escapeHtml(item.generated_filename || item.filename)}</h3><p>DOCX files do not have a reliable native browser preview. Download the generated file to review it with its original formatting intact.</p><button class="button" id="modalDownload">Download DOCX</button></div>`;
    document.getElementById("modalDownload").addEventListener("click", () => downloadFile(path, item.generated_filename || item.filename).catch((error) => toast(error.message, "error")));
  }
}

function showBlobPreview(blob, filename) {
  if (blob.type.includes("pdf") || filename?.toLowerCase().endsWith(".pdf")) {
    const url = URL.createObjectURL(blob); modalBody.innerHTML = `<iframe class="preview-frame" src="${url}" title="Document preview"></iframe>`; modal.dataset.objectUrl = url;
  } else modalBody.innerHTML = emptyState("DOCX", "Preview requires a compatible viewer", "Download this DOCX file to inspect its preserved formatting.");
}

function renderProfile() {
  setTitle("Profile");
  main.innerHTML = `<div class="welcome-row"><div><h2>Your profile</h2><p>Account information for this workspace.</p></div></div><section class="panel" style="max-width:680px"><div class="flow-header"><span class="avatar" style="width:54px;height:54px">${escapeHtml(initials(state.user.name))}</span><div><h2>${escapeHtml(state.user.name)}</h2><p>${escapeHtml(state.user.role)} account</p></div></div><div class="review-list"><div class="review-row"><span>Full name</span><strong>${escapeHtml(state.user.name)}</strong></div><div class="review-row"><span>Email address</span><strong>${escapeHtml(state.user.email)}</strong></div><div class="review-row"><span>Access level</span><strong style="text-transform:capitalize">${escapeHtml(state.user.role)}</strong></div></div><p class="account-note"><span>&#128274;</span>Profile changes are managed by an authorized administrator.</p></section>`;
}

function openModal(title, eyebrow, content) {
  if (modal.dataset.objectUrl) { URL.revokeObjectURL(modal.dataset.objectUrl); delete modal.dataset.objectUrl; }
  document.getElementById("modalTitle").textContent = title; document.getElementById("modalEyebrow").textContent = eyebrow; modalBody.innerHTML = content; modal.classList.remove("hidden"); document.body.classList.add("modal-open"); document.getElementById("modalClose").focus();
}
function closeModal() { if (modal.dataset.objectUrl) { URL.revokeObjectURL(modal.dataset.objectUrl); delete modal.dataset.objectUrl; } modal.classList.add("hidden"); document.body.classList.remove("modal-open"); }
function initials(name) { return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(); }
function closeMobileMenu() { document.getElementById("sidebar").classList.remove("open"); document.getElementById("mobileScrim").classList.add("hidden"); }

main.addEventListener("click", (event) => {
  const retry = event.target.closest('[data-action="retry"]'); if (retry) return renderRoute();
  const adminButton = event.target.closest("[data-admin-action]"); if (adminButton) return adminAction(adminButton.dataset.adminAction, Number(adminButton.dataset.id), adminButton);
  const templateButton = event.target.closest("[data-template-action]"); if (templateButton) { const template = state.templates.find((item) => item.id === Number(templateButton.dataset.id)); return templateButton.dataset.templateAction === "use" ? startTemplateFlow(template.id) : previewTemplate(template, false); }
  const docButton = event.target.closest("[data-doc-action]"); if (docButton) return documentAction(docButton.dataset.docAction, Number(docButton.dataset.id));
  const flowButton = event.target.closest("[data-flow]"); if (flowButton) return flowAction(flowButton.dataset.flow, flowButton);
});

document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal(); });
document.getElementById("menuButton").addEventListener("click", () => { document.getElementById("sidebar").classList.add("open"); document.getElementById("mobileScrim").classList.remove("hidden"); });
document.getElementById("mobileScrim").addEventListener("click", closeMobileMenu);
document.getElementById("logoutButton").addEventListener("click", () => { clearSession(); location.href = "/login"; });
window.addEventListener("hashchange", renderRoute);

async function initialize() {
  if (!getToken()) { location.href = "/login"; return; }
  try {
    state.user = await request("/api/auth/me"); saveSession(getToken(), state.user);
  } catch {
    clearSession(); location.href = "/login"; return;
  }
  document.getElementById("roleLabel").textContent = state.user.role === "admin" ? "Administration" : "Personal workspace";
  document.getElementById("userName").textContent = state.user.name; document.getElementById("userRole").textContent = state.user.role; document.getElementById("userAvatar").textContent = initials(state.user.name);
  document.getElementById("appLoader").classList.add("hidden"); document.getElementById("appShell").classList.remove("hidden");
  await renderRoute();
}

initialize();
