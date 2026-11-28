// SPDX-License-Identifier: AGPL-3.0-or-later
// The hosted pilot application: which fields it has, how a submission
// is checked, and the plain-text email it becomes. No Cloudflare APIs
// here, so the tests run under plain Node.

/** The fields, in the order the email lists them. */
export const FIELDS = [
  { name: 'organization', label: 'Organization', max: 200, required: true },
  { name: 'orgType', label: 'Type', max: 40, required: true },
  { name: 'users', label: 'How many people would use it', max: 100, required: true },
  { name: 'today', label: 'What they use today', max: 300, required: false },
  { name: 'workflows', label: 'Workflows they would run on it', max: 4000, required: true },
  { name: 'contactName', label: 'Contact name and role', max: 200, required: true },
  { name: 'email', label: 'Contact email', max: 254, required: true },
  { name: 'caseStudy', label: 'Open to a public case study', max: 20, required: true },
  { name: 'notes', label: 'Anything else', max: 4000, required: false },
];

export const ORG_TYPES = ['Agency', 'School', 'Nonprofit', 'Company', 'Other'];
export const CASE_STUDY = ['Yes', 'Maybe', 'No'];

// Deliberately loose: one @, something on each side, a dot in the
// domain, no spaces or line breaks. The reply is what proves it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Collapse a value to a trimmed string; arrays (checkbox groups) join with ", ". */
function text(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join(', ');
  return value == null ? '' : String(value).trim();
}

/**
 * Check one submission. Returns { ok: true, values } or
 * { ok: false, errors: { field: message } }. `input` maps a field name
 * to a string or a list of strings.
 */
export function validateApplication(input) {
  const values = {};
  const errors = {};
  for (const f of FIELDS) {
    const v = text(input[f.name]);
    if (f.required && v.length === 0) errors[f.name] = 'Required.';
    else if (v.length > f.max) errors[f.name] = `Keep it under ${f.max} characters.`;
    values[f.name] = v;
  }
  if (values.orgType && !ORG_TYPES.includes(values.orgType)) errors.orgType = 'Pick one.';
  if (values.caseStudy && !CASE_STUDY.includes(values.caseStudy)) errors.caseStudy = 'Pick one.';
  if (values.email && !EMAIL_RE.test(values.email)) errors.email = 'That does not look like an email address.';
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, values };
}

/** A header value with no line breaks, so a submission cannot add headers. */
function headerSafe(value) {
  return String(value).replace(/[\r\n]+/g, ' ').trim();
}

/** RFC 2047 encoded-word for a header value that may hold non-ASCII text. */
function encodeHeader(value) {
  const safe = headerSafe(value);
  // eslint-disable-next-line no-control-regex
  if (/^[\x20-\x7e]*$/.test(safe)) return safe;
  const b64 = Buffer.from(safe, 'utf8').toString('base64');
  return `=?UTF-8?B?${b64}?=`;
}

/** The email body: one labelled block per field. */
export function applicationText(values, meta = {}) {
  const lines = ['A new hosted pilot application came in from gratisgis.org/pilot/.', ''];
  for (const f of FIELDS) {
    const v = values[f.name];
    if (!v) continue;
    lines.push(`${f.label}:`);
    lines.push(v);
    lines.push('');
  }
  if (meta.receivedAt) lines.push(`Received: ${meta.receivedAt}`);
  lines.push('Reply to this email to answer the applicant directly.');
  return lines.join('\n');
}

/**
 * The whole message as raw MIME text: plain text, UTF-8, with the
 * applicant as Reply-To.
 */
export function buildRawEmail({ from, to, values, messageId, date }) {
  const subject = `Pilot application: ${values.organization} (${values.orgType})`;
  const body = applicationText(values, { receivedAt: date.toISOString() });
  const b64 = Buffer.from(body, 'utf8').toString('base64').replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: GratisGIS pilot form <${from}>`,
    `To: ${to}`,
    `Reply-To: ${encodeHeader(values.contactName)} <${headerSafe(values.email)}>`,
    `Subject: ${encodeHeader(subject)}`,
    `Message-ID: <${messageId}>`,
    `Date: ${date.toUTCString()}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    b64,
  ].join('\r\n');
}
