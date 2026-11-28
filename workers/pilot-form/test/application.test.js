// SPDX-License-Identifier: AGPL-3.0-or-later
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRawEmail, validateApplication } from '../src/application.js';

const good = {
  organization: 'Randolph County Planning',
  orgType: 'Agency',
  users: '8',
  today: ['ArcGIS Online', 'Paper or spreadsheets'],
  workflows: 'Culvert inspections with photos.',
  contactName: 'Jo Smith, GIS lead',
  email: 'jo@example.org',
  caseStudy: 'Maybe',
};

test('a complete application passes and joins checkbox groups', () => {
  const r = validateApplication(good);
  assert.equal(r.ok, true);
  assert.equal(r.values.today, 'ArcGIS Online, Paper or spreadsheets');
});

test('missing, oversized and off-list values are refused by field', () => {
  const r = validateApplication({ ...good, organization: '  ', orgType: 'Cult', email: 'nope', workflows: 'x'.repeat(5000) });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'orgType', 'organization', 'workflows']);
});

test('the email cannot gain headers from a submission', () => {
  const r = validateApplication({ ...good, contactName: 'Jo\r\nBcc: x@evil.test', organization: 'A\nB' });
  const raw = buildRawEmail({ from: 'pilot@gratisgis.org', to: 'me@example.org', values: r.values, messageId: 'id@gratisgis.org', date: new Date(0) });
  const headers = raw.split('\r\n\r\n')[0];
  assert.doesNotMatch(headers, /^Bcc:/m);
  assert.match(headers, /^Reply-To: Jo Bcc: x@evil\.test <jo@example\.org>$/m);
});

test('non-ASCII text survives in the subject and body', () => {
  const r = validateApplication({ ...good, organization: 'Município de São Paulo' });
  const raw = buildRawEmail({ from: 'pilot@gratisgis.org', to: 'me@example.org', values: r.values, messageId: 'id@gratisgis.org', date: new Date(0) });
  const [headers, body] = raw.split('\r\n\r\n');
  assert.match(headers, /^Subject: =\?UTF-8\?B\?/m);
  assert.match(Buffer.from(body.replace(/\r\n/g, ''), 'base64').toString('utf8'), /São Paulo/);
});
