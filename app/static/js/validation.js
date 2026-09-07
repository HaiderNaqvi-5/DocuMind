const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizePhone(value) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^03\d{9}$/.test(compact)) return `+92${compact.slice(1)}`;
  if (/^923\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

export function normalizeCnic(value) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 13 ? `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}` : value.trim();
}

export function validateValue(key, value, required = false) {
  const clean = String(value ?? "").trim();
  if (!clean) return required ? "This field is required." : "";
  if (key === "email" && !emailPattern.test(clean)) return "Enter a valid email address.";
  if (key === "phone_number") {
    const compact = clean.replace(/[\s()-]/g, "");
    if (!/^(?:03\d{9}|\+?923\d{9})$/.test(compact)) return "Enter a valid Pakistani mobile number, e.g. 03001234567.";
  }
  if (key === "cnic" && !/^\d{5}-?\d{7}-?\d$/.test(clean.replace(/\s/g, ""))) return "CNIC must contain 13 digits, e.g. 35202-1234567-1.";
  if (key === "date_of_birth") {
    const date = new Date(`${clean}T00:00:00`);
    if (Number.isNaN(date.getTime())) return "Enter a valid date of birth.";
    if (date > new Date()) return "Date of birth cannot be in the future.";
  }
  if (key === "full_name" && clean.length < 2) return "Enter your full name.";
  return "";
}

export function normalizeValue(key, value) {
  if (key === "phone_number") return normalizePhone(value);
  if (key === "cnic") return normalizeCnic(value);
  return String(value ?? "").trim();
}

export function fieldInput(field) {
  const key = field.field_key;
  const required = field.required ? "required" : "";
  const autocomplete = { full_name: "name", email: "email", phone_number: "tel", address: "street-address", date_of_birth: "bday" }[key] || "off";
  if (key === "gender") {
    return `<select id="field-${key}" name="${key}" ${required}><option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option></select>`;
  }
  if (key === "address" || field.field_type === "textarea") return `<textarea id="field-${key}" name="${key}" autocomplete="${autocomplete}" placeholder="Enter ${field.label.toLowerCase()}" ${required}></textarea>`;
  const type = key === "date_of_birth" ? "date" : key === "email" ? "email" : key === "phone_number" ? "tel" : ["date", "email", "number"].includes(field.field_type) ? field.field_type : "text";
  const placeholder = key === "phone_number" ? "03001234567" : key === "cnic" ? "35202-1234567-1" : `Enter ${field.label.toLowerCase()}`;
  const max = key === "date_of_birth" ? `max="${new Date().toISOString().slice(0, 10)}"` : "";
  return `<input id="field-${key}" name="${key}" type="${type}" autocomplete="${autocomplete}" placeholder="${placeholder}" ${max} ${required}>`;
}
