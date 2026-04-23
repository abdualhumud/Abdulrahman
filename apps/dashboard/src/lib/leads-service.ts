/**
 * leads-service.ts — Multi-channel lead capture for REMS landing page
 *
 * Submission pipeline (all run in parallel, each fails gracefully):
 *   1. localStorage  — always persisted, primary store for Super-Admin view
 *   2. EmailJS REST  — real-time email to alhumudab@gmail.com
 *                      Requires: NEXT_PUBLIC_EMAILJS_SERVICE_ID
 *                                NEXT_PUBLIC_EMAILJS_TEMPLATE_ID
 *                                NEXT_PUBLIC_EMAILJS_PUBLIC_KEY
 *   3. Google Sheets — append row via Apps Script webhook
 *                      Requires: NEXT_PUBLIC_SHEETS_WEBHOOK (Apps Script Web App URL)
 *   4. Supabase      — insert to `leads` table when credentials are configured
 *
 * None of the optional channels block submission — if env vars are missing the
 * step is skipped silently and the lead is still saved to localStorage.
 */

export type LeadSource = 'demo' | 'contact';
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'closed';

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  business: string;
  message: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
}

export interface SubmitResult {
  ok: boolean;
  channels: { localStorage: boolean; email: boolean; sheets: boolean; supabase: boolean };
}

/* ── Storage ─────────────────────────────────────────────────────────────── */

const LEADS_KEY = 'rems-leads';

export function getLeads(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(LEADS_KEY) ?? '[]') as Lead[];
  } catch { return []; }
}

export function updateLeadStatus(id: string, status: LeadStatus): void {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return;
  leads[idx] = { ...leads[idx], status };
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

export function deleteLead(id: string): void {
  const leads = getLeads().filter(l => l.id !== id);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
}

function saveLead(lead: Lead): void {
  const leads = getLeads();
  leads.unshift(lead);
  localStorage.setItem(LEADS_KEY, JSON.stringify(leads.slice(0, 500)));
}

/* ── EmailJS REST API ────────────────────────────────────────────────────── */

async function sendEmailJS(lead: Lead): Promise<void> {
  const serviceId  = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
  const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
  const publicKey  = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;
  if (!serviceId || !templateId || !publicKey) return;

  const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id:  serviceId,
      template_id: templateId,
      user_id:     publicKey,
      template_params: {
        to_email:      'alhumudab@gmail.com',
        lead_source:   lead.source === 'demo' ? 'Demo Request' : 'Contact Inquiry',
        lead_name:     lead.name,
        lead_email:    lead.email,
        lead_phone:    lead.phone || '—',
        lead_business: lead.business || '—',
        lead_message:  lead.message || '—',
        lead_time:     new Date(lead.createdAt).toLocaleString('en-SA', { timeZone: 'Asia/Riyadh' }),
      },
    }),
  });
  if (!res.ok) throw new Error(`EmailJS ${res.status}`);
}

/* ── Google Sheets via Apps Script Webhook ───────────────────────────────── */

async function logToSheets(lead: Lead): Promise<void> {
  const webhookUrl = process.env.NEXT_PUBLIC_SHEETS_WEBHOOK;
  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      timestamp: new Date(lead.createdAt).toLocaleString('en-SA', { timeZone: 'Asia/Riyadh' }),
      name:      lead.name,
      email:     lead.email,
      phone:     lead.phone,
      business:  lead.business,
      message:   lead.message,
      source:    lead.source === 'demo' ? 'Demo Request' : 'Contact Inquiry',
      status:    'New',
    }),
  });
}

/* ── Supabase Insert ─────────────────────────────────────────────────────── */

async function saveToSupabase(lead: Lead): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || supabaseUrl.includes('placeholder') || !supabaseKey || supabaseKey.includes('placeholder')) return;

  const res = await fetch(`${supabaseUrl}/rest/v1/leads`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      id:        lead.id,
      name:      lead.name,
      email:     lead.email,
      phone:     lead.phone || null,
      business:  lead.business || null,
      message:   lead.message || null,
      source:    lead.source,
      status:    lead.status,
      created_at: lead.createdAt,
    }),
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}`);
}

/* ── Validation ──────────────────────────────────────────────────────────── */

export interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export function validateLeadForm(data: Partial<Lead>): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!data.name?.trim()) errors.name = 'required';
  if (!data.email?.trim()) {
    errors.email = 'required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'invalid';
  }
  if (data.phone && !/^[\d\s+\-()]{7,20}$/.test(data.phone)) {
    errors.phone = 'invalid';
  }
  return errors;
}

/* ── Main Submission Entry Point ─────────────────────────────────────────── */

export async function submitLead(
  data: { name: string; email: string; phone: string; business: string; message: string },
  source: LeadSource,
): Promise<SubmitResult> {
  const lead: Lead = {
    id:        `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ...data,
    source,
    status:    'new',
    createdAt: new Date().toISOString(),
  };

  let lsOk = false, emailOk = false, sheetsOk = false, supabaseOk = false;

  // 1. localStorage — always first, never fails
  try { saveLead(lead); lsOk = true; } catch { /* ignore */ }

  // 2–4. Remote channels in parallel
  const [emailResult, sheetsResult, supabaseResult] = await Promise.allSettled([
    sendEmailJS(lead),
    logToSheets(lead),
    saveToSupabase(lead),
  ]);
  emailOk    = emailResult.status === 'fulfilled';
  sheetsOk   = sheetsResult.status === 'fulfilled';
  supabaseOk = supabaseResult.status === 'fulfilled';

  return {
    ok: lsOk,
    channels: { localStorage: lsOk, email: emailOk, sheets: sheetsOk, supabase: supabaseOk },
  };
}
