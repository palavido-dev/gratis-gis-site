// SPDX-License-Identifier: AGPL-3.0-or-later
// Receives the hosted pilot form from gratisgis.org/pilot/ and emails
// it to the maintainer through Cloudflare Email Routing. Nothing is
// stored here: a submission is checked, sent, and forgotten.
//
// The browser posts with fetch and gets JSON back. Without JavaScript
// the form posts normally and the reply is a redirect back to the page
// (?sent=1 or ?error=...), so it still works.
import { EmailMessage } from 'cloudflare:email';
import { buildRawEmail, validateApplication } from './application.js';

const TURNSTILE_VERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_BODY_BYTES = 32 * 1024;

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function reply(request, env, status, body) {
  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  if (wantsJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
    });
  }
  const back = new URL(env.RETURN_URL);
  if (body.ok) back.searchParams.set('sent', '1');
  else back.searchParams.set('error', body.error || 'failed');
  return Response.redirect(back.toString(), 303);
}

/** Form fields as name -> string or list of strings. */
async function readFields(request) {
  const type = request.headers.get('Content-Type') || '';
  if (type.includes('application/json')) return await request.json();
  const form = await request.formData();
  const out = {};
  for (const [k, v] of form.entries()) {
    if (typeof v !== 'string') continue;
    if (k in out) out[k] = [].concat(out[k], v);
    else out[k] = v;
  }
  return out;
}

async function turnstileOk(token, ip, secret) {
  if (!token) return false;
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch(TURNSTILE_VERIFY, { method: 'POST', body });
  if (!res.ok) return false;
  const data = await res.json();
  return data.success === true;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(env) });
    if (request.method !== 'POST') return new Response('Not found', { status: 404 });

    const origin = request.headers.get('Origin');
    if (origin && origin !== env.ALLOWED_ORIGIN) return new Response('Forbidden', { status: 403 });
    const length = Number(request.headers.get('Content-Length') || '0');
    if (length > MAX_BODY_BYTES) return reply(request, env, 413, { ok: false, error: 'too-large' });

    let fields;
    try {
      fields = await readFields(request);
    } catch {
      return reply(request, env, 400, { ok: false, error: 'unreadable' });
    }

    // A field people never see. Bots fill it; pretend it worked.
    if (typeof fields.website === 'string' && fields.website.trim() !== '') {
      return reply(request, env, 200, { ok: true });
    }

    const human = await turnstileOk(
      fields['cf-turnstile-response'],
      request.headers.get('CF-Connecting-IP'),
      env.TURNSTILE_SECRET,
    );
    if (!human) return reply(request, env, 400, { ok: false, error: 'check' });

    const result = validateApplication(fields);
    if (!result.ok) return reply(request, env, 422, { ok: false, error: 'invalid', fields: result.errors });

    const date = new Date();
    const raw = buildRawEmail({
      from: env.FROM_ADDRESS,
      to: env.TO_ADDRESS,
      values: result.values,
      messageId: `${crypto.randomUUID()}@${env.FROM_ADDRESS.split('@')[1]}`,
      date,
    });
    try {
      await env.PILOT_EMAIL.send(new EmailMessage(env.FROM_ADDRESS, env.TO_ADDRESS, raw));
    } catch (err) {
      console.error('send failed', err instanceof Error ? err.message : String(err));
      return reply(request, env, 502, { ok: false, error: 'send' });
    }
    return reply(request, env, 200, { ok: true });
  },
};
