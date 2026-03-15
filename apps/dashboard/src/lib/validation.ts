/**
 * validation.ts — Centralised field-level and form-level validation helpers.
 *
 * All validators return `null` on success or an English error message string on
 * failure. Higher-level validators compose the field validators and return an
 * array of FieldError objects so callers can highlight specific fields.
 *
 * None of these helpers import from React — they are pure functions safe to
 * call in any context (component, hook, test).
 */

export interface FieldError {
  field:   string;
  message: string;
}

/* ── Field-level validators ──────────────────────────────────────────── */

export function validateEmail(email: string): string | null {
  const v = email.trim();
  if (!v) return 'Email is required';
  if (!v.includes('@') || !v.includes('.')) return 'Invalid email address';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

/** Saudi CR Number — min 7 characters. */
export function validateCRNumber(cr: string): string | null {
  if (!cr.trim()) return 'CR Number is required';
  if (cr.trim().length < 7) return 'CR Number must be at least 7 characters';
  return null;
}

/** Saudi VAT Number — min 10 characters (starts with 3). */
export function validateVATNumber(vat: string): string | null {
  if (!vat.trim()) return 'VAT Number is required';
  if (vat.trim().length < 10) return 'VAT Number must be at least 10 characters';
  return null;
}

/** Phone number — min 9 digits (ignores spaces, dashes, and +). */
export function validatePhone(phone: string): string | null {
  const digits = phone.replace(/[\s\-+()]/g, '');
  if (!digits) return 'Phone number is required';
  if (digits.length < 9) return 'Phone number must be at least 9 digits';
  return null;
}

/** Saudi National ID — min 9 characters. */
export function validateNationalId(id: string): string | null {
  if (!id.trim()) return 'National ID is required';
  if (id.trim().length < 9) return 'National ID must be at least 9 characters';
  return null;
}

/** Required text field — just non-empty. */
export function validateRequired(value: string, label: string): string | null {
  return value.trim() ? null : `${label} is required`;
}

/* ── Form-level validators ───────────────────────────────────────────── */

/** Onboarding Step 1 — Business Info. */
export function validateOnboardingStep1(fields: {
  crNumber: string;
  vatNumber: string;
  city:     string;
  district: string;
  street:   string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const push = (field: string, msg: string | null) => { if (msg) errors.push({ field, message: msg }); };
  push('crNumber', validateCRNumber(fields.crNumber));
  push('vatNumber', validateVATNumber(fields.vatNumber));
  push('city',     validateRequired(fields.city,     'City'));
  push('district', validateRequired(fields.district, 'District'));
  push('street',   validateRequired(fields.street,   'Street'));
  return errors;
}

/** Onboarding Step 2 — Personal Info. */
export function validateOnboardingStep2(fields: {
  fullName:   string;
  email:      string;
  phone:      string;
  nationalId: string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const push = (field: string, msg: string | null) => { if (msg) errors.push({ field, message: msg }); };
  push('fullName',   validateRequired(fields.fullName, 'Full Name'));
  push('email',      validateEmail(fields.email));
  push('phone',      validatePhone(fields.phone));
  push('nationalId', validateNationalId(fields.nationalId));
  return errors;
}

/** Staging trial — registration form. */
export function validateStagingRegister(fields: {
  email:    string;
  password: string;
  name:     string;
  company:  string;
}): FieldError[] {
  const errors: FieldError[] = [];
  const push = (field: string, msg: string | null) => { if (msg) errors.push({ field, message: msg }); };
  push('email',    validateEmail(fields.email));
  push('password', validatePassword(fields.password));
  push('name',     validateRequired(fields.name,    'Name'));
  push('company',  validateRequired(fields.company, 'Company'));
  return errors;
}

/** Manual booking form — guest name, dates, nights, amount. */
export function validateManualBooking(fields: {
  guestName: string;
  checkIn:   string;
  checkOut:  string;
  nights:    number;
  amount:    number;
}): FieldError[] {
  const errors: FieldError[] = [];
  const push = (field: string, msg: string | null) => { if (msg) errors.push({ field, message: msg }); };
  push('guestName', validateRequired(fields.guestName, 'Guest Name'));
  push('checkIn',   fields.checkIn  ? null : 'Check-in date is required');
  push('checkOut',  fields.checkOut ? null : 'Check-out date is required');
  if (fields.checkIn && fields.checkOut && fields.nights <= 0) {
    errors.push({ field: 'checkOut', message: 'Check-out must be after check-in' });
  }
  if (fields.amount <= 0) errors.push({ field: 'amount', message: 'Amount must be greater than 0' });
  return errors;
}

/** Returns true when a form has no errors — convenience for boolean checks. */
export function isValid(errors: FieldError[]): boolean {
  return errors.length === 0;
}
