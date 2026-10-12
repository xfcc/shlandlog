import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url)));
const current = snapshot.queries.land_events.rows;
const archive = snapshot.queries.unverified_leads.rows;
const core = await import('../src/core.mjs').catch(() => null);

test('migration preserves 27 current events and 55 excluded archive rows', () => {
  assert.equal(current.length, 27);
  assert.equal(archive.length, 55);
  assert.equal(current.filter(r => r.period_group === '9月基准').length, 20);
  assert.equal(current.filter(r => r.period_group === '10月衔接').length, 7);
  assert.ok(current.every(r => r.transaction_price === null));
  assert.ok(current.every(r => r.event_start === null));
});

test('search combines Chinese query, period and district', () => {
  assert.ok(core, 'filter engine exists');
  const rows = core.filterRecords(current, {period_group:'9月基准', district:'浦东新区', q:'录播'});
  assert.ok(rows.length > 0);
  assert.ok(rows.every(r => r.period_group === '9月基准' && r.district === '浦东新区'));
  assert.equal(core.filterRecords(current, {q:'不存在的检索词'}).length, 0);
});

test('validation rejects independent government sources in the current ledger', () => {
  assert.ok(core, 'data validator exists');
  assert.doesNotThrow(() => core.validateRecords(current, archive));
  const invalid = structuredClone(current);
  invalid[0].source_url = 'https://www.shanghai.gov.cn/example';
  assert.throws(() => core.validateRecords(invalid, archive), /第一方/);
});

test('validation rejects duplicate event IDs and unlabelled archive rows', () => {
  assert.ok(core, 'data validator exists');
  assert.throws(() => core.validateRecords([...current,current[0]],archive), /重复/);
  const invalid = structuredClone(archive); invalid[0].archive_reason = null;
  assert.throws(() => core.validateRecords(current,invalid), /归档/);
});

test('HTML escapes untrusted titles and URL allowlist blocks scripts', () => {
  assert.ok(core, 'safe rendering utilities exist');
  assert.equal(core.escapeHTML('<script>"&'), '&lt;script&gt;&quot;&amp;');
  assert.equal(core.safeURL('javascript:alert(1)'), null);
  assert.equal(core.safeURL('https://biz.ghzyj.sh.gov.cn/shtdsc/'), 'https://biz.ghzyj.sh.gov.cn/shtdsc/');
});

test('invalid calendar dates fail instead of silently rolling into another month', () => {
  const invalid=structuredClone(current); invalid[0].publication_date='2026-02-31';
  assert.throws(()=>core.validateRecords(invalid,archive),/日期/);
});

test('event detail routes cannot collide between current and archived IDs', () => {
  const invalid=structuredClone(archive); invalid[0].id=current[0].id;
  assert.throws(()=>core.validateRecords(current,invalid),/重复/);
});
