import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url)));
const current = snapshot.queries.land_events.rows;
const archive = snapshot.queries.unverified_leads.rows;
const core = await import('../src/core.mjs').catch(() => null);

test('weekly snapshot preserves 83 current events and 55 excluded archive rows', () => {
  assert.equal(current.length, 83);
  assert.equal(archive.length, 55);
  assert.equal(current.filter(r => r.period_group === '9月基准').length, 22);
  assert.equal(current.filter(r => r.period_group === '10月衔接').length, 50);
  assert.equal(current.filter(r => r.period_group === '11月续查').length, 11);
  assert.ok(current.slice(0, 62).every(r => r.transaction_price === null));
  assert.ok(current.filter(r => r.reference !== '2025Z00301').every(r => r.event_start === null));
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

test('first-party market information keeps units and textual plot-ratio constraints', () => {
  const rows = current.filter(r => r.category === '推介地块市场信息');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map(r => [r.area_value, r.area_unit, r.plot_ratio]), [[1.9, '公顷', '2.5'], [3.06, '公顷', '1.36']]);
  assert.ok(rows.every(r => r.facts.includes('具体内容以出让公告为准') && r.transaction_price === null && r.winner === null));
});

test('single-plot result prices, proposed price and multi-plot facts remain distinct', () => {
  const results = current.filter(r => r.category === '交易结果公示');
  assert.equal(results.length, 4);
  assert.deepEqual(results.map(r => r.transaction_price), [null, 1514, 10363, 655]);
  const multiple = results.find(r => r.reference === '沪告字[2026]第086号');
  assert.equal(multiple.winner, null);
  assert.ok(['12139.0万元', '2877.0万元', '1123.0万元'].every(v => multiple.facts.includes(v)));
  const proposed = current.find(r => r.reference === '沪浦协示字（2026）第10号');
  assert.equal(proposed.proposed_price, 4547.7);
  assert.equal(proposed.transaction_price, null);
  assert.equal(proposed.event_end, '2026-11-11');
});

test('November transfer update retains the actual 2025 transaction date', () => {
  const [row] = core.filterRecords(current, {period_group:'11月续查', district:'嘉定区', q:'2025Z00301'});
  assert.ok(row);
  assert.equal(row.publication_date, '2026-11-09');
  assert.equal(row.event_start, '2025-05-21');
  assert.equal(row.transaction_price, 2961);
  assert.ok(row.stage.includes('非本期新成交'));
});

test('historical announcement preserves transfer area instead of substituting total area', () => {
  const row = current.find(r => r.reference === '沪告字[2026]第088号');
  assert.equal(row.area_value, 17808.6);
  assert.equal(row.area_unit, '平方米');
  assert.ok(row.facts.includes('土地总面积22280.90平方米'));
  assert.equal(row.starting_price, 7480);
  assert.equal(row.transaction_price, null);
});
