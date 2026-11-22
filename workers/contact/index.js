/**
 * Contact-form relay for lumost.id → Resend.
 *
 * A static page cannot call Resend directly: the API key would ship to every visitor. This Worker keeps
 * the key server-side, validates the submission and sends one email per enquiry.
 *
 * Expected POST body (what src/components/ContactForm.astro sends):
 *   { name, email, company?, hosts?, message }
 */

const MAX = { name: 100, email: 200, company: 120, hosts: 60, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (status, body, origin) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    },
  });

const escape = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const clip = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export default {
  async fetch(request, env) {
    const allowed = (env.ALLOWED_ORIGINS ?? 'https://lumost.id,https://www.lumost.id')
      .split(',').map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin') ?? '';
    const cors = allowed.includes(origin) ? origin : '';

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...(cors ? { 'Access-Control-Allow-Origin': cors, Vary: 'Origin' } : {}),
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' }, cors ? cors : undefined);
    if (!cors) return json(403, { ok: false, error: 'origin_not_allowed' });

    let body;
    try { body = await request.json(); } catch { return json(400, { ok: false, error: 'bad_json' }, cors); }

    // Honeypot: the form hides this field; anything in it is a bot.
    if (clip(body.website, 200)) return json(200, { ok: true }, cors);

    const name = clip(body.name, MAX.name);
    const email = clip(body.email, MAX.email);
    const company = clip(body.company, MAX.company);
    const hosts = clip(body.hosts, MAX.hosts);
    const message = clip(body.message, MAX.message);

    if (!name) return json(400, { ok: false, error: 'name_required' }, cors);
    if (!EMAIL_RE.test(email)) return json(400, { ok: false, error: 'email_invalid' }, cors);
    if (!message) return json(400, { ok: false, error: 'message_required' }, cors);
    if (!env.RESEND_API_KEY) return json(500, { ok: false, error: 'not_configured' }, cors);

    const to = env.TO ?? 'hasan@alimna.id';
    const from = env.FROM ?? 'Lumost <hasan@alimna.id>';
    const rows = [
      ['Nama', name], ['Email', email], ['Perusahaan', company || '—'], ['Host', hosts || '—'],
    ];
    const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${message}\n\n— dikirim dari lumost.id`;
    const html = `<table>${rows.map(([k, v]) => `<tr><td><strong>${escape(k)}</strong></td><td>${escape(v)}</td></tr>`).join('')}</table>`
      + `<p style="white-space:pre-wrap">${escape(message)}</p>`;

    let res;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to: [to], subject: `Permintaan demo — ${name}${company ? ` (${company})` : ''}`,
          text, html, reply_to: email,
        }),
      });
    } catch {
      return json(502, { ok: false, error: 'upstream_unreachable' }, cors);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('resend_failed', res.status, detail.slice(0, 300));
      // A 403 that mentions the domain means FROM is not on a Resend-verified domain —
      // the one deploy mistake worth naming instead of a generic send_failed.
      if (res.status === 403 && /domain|verif/i.test(detail)) {
        return json(502, { ok: false, error: 'from_domain_not_verified' }, cors);
      }
      return json(502, { ok: false, error: 'send_failed' }, cors);
    }
    return json(200, { ok: true }, cors);
  },
};
