// Runs the Worker's handler with a stubbed fetch: no network, no secrets.
import assert from 'node:assert/strict';
import worker from './index.js';

const env = { RESEND_API_KEY: 're_test', TO: 'hasan@alimna.id', FROM: 'Lumost <hasan@alimna.id>' };
const ORIGIN = 'https://lumost.id';

let sent = null;
const stub = async (url, init) => {
  sent = { url, init, body: JSON.parse(init.body) };
  return new Response(JSON.stringify({ id: 'mail_1' }), { status: 200 });
};
globalThis.fetch = stub;

const post = (body, headers = {}) => worker.fetch(new Request('https://relay.test/', {
  method: 'POST',
  headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body),
}), env);

const good = { name: 'Sari', email: 'sari@contoh.id', company: 'Toko Sari', hosts: '10–50', message: 'Checkout lambat.' };

// 1. preflight
const pre = await worker.fetch(new Request('https://relay.test/', { method: 'OPTIONS', headers: { Origin: ORIGIN } }), env);
assert.equal(pre.status, 204);
assert.equal(pre.headers.get('Access-Control-Allow-Origin'), ORIGIN);
assert.equal(pre.headers.get('Access-Control-Allow-Headers'), 'Content-Type');

// 2. success: one email, reply goes to the enquirer, subject carries the lead
sent = null;
let res = await post(good);
assert.equal(res.status, 200);
assert.deepEqual(await res.json(), { ok: true });
assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
assert.equal(sent.url, 'https://api.resend.com/emails');
assert.equal(sent.init.headers.Authorization, 'Bearer re_test');
assert.deepEqual(sent.body.to, ['hasan@alimna.id']);
assert.equal(sent.body.reply_to, 'sari@contoh.id');
assert.equal(sent.body.subject, 'Permintaan demo — Sari (Toko Sari)');
assert.match(sent.body.text, /Checkout lambat\./);

// 3. foreign origin is refused and never reaches Resend
sent = null;
res = await worker.fetch(new Request('https://relay.test/', {
  method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' }, body: JSON.stringify(good),
}), env);
assert.equal(res.status, 403);
assert.equal(sent, null);

// 4. honeypot answers 200 (so bots learn nothing) and sends nothing
sent = null;
res = await post({ ...good, website: 'http://spam' });
assert.equal(res.status, 200);
assert.equal(sent, null);

// 5. validation
sent = null;
assert.equal((await post({ ...good, email: 'nope' })).status, 400);
assert.equal((await post({ ...good, name: '   ' })).status, 400);
assert.equal((await post({ ...good, message: '' })).status, 400);
assert.equal((await post('not json')).status, 400);
assert.equal(sent, null);

// 6. long message is clipped, not rejected
sent = null;
await post({ ...good, message: 'x'.repeat(5000) });
assert.equal(sent.body.text.includes('x'.repeat(4000)), true);
assert.equal(sent.body.text.includes('x'.repeat(4001)), false);

// 7. upstream failure surfaces as 502 and does not leak the key
//    an unverified FROM domain is named, so the deploy mistake is obvious in the UI/logs
globalThis.fetch = async () => new Response('{"message":"domain not verified"}', { status: 403 });
res = await post(good);
assert.equal(res.status, 502);
const payload = await res.text();
assert.equal(payload.includes('re_test'), false);
assert.equal(JSON.parse(payload).error, 'from_domain_not_verified');

// 7b. any other upstream rejection stays generic
sent = null;
globalThis.fetch = async () => new Response('{"message":"rate limited"}', { status: 429 });
res = await post(good);
assert.equal(res.status, 502);
assert.equal((await res.json()).error, 'send_failed');

// 8. missing key is a configuration error, not a send
globalThis.fetch = stub;
res = await worker.fetch(new Request('https://relay.test/', {
  method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json' }, body: JSON.stringify(good),
}), { TO: 'x@y.z' });
assert.equal(res.status, 500);
assert.deepEqual(await res.json(), { ok: false, error: 'not_configured' });

console.log('worker tests: 8 groups passed');
