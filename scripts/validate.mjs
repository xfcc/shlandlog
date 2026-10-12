import { readFile } from 'node:fs/promises';
import { validateRecords } from '../src/core.mjs';

export async function loadSnapshot() {
  const snapshot = JSON.parse(await readFile(new URL('../data/snapshot.json', import.meta.url),'utf8'));
  const schema = JSON.parse(await readFile(new URL('../data/schema.json', import.meta.url),'utf8'));
  const keys = ['land_events','unverified_leads','source_coverage','field_definitions'];
  for (const key of keys) {
    if (!Array.isArray(snapshot.queries[key]?.rows)) throw new Error('缺少查询：' + key);
    for (const row of snapshot.queries[key].rows) {
      if (Object.keys(row).some(field => !schema[key].fields.includes(field))) throw new Error('未定义字段：' + key);
    }
  }
  if (!snapshot.generatedAt || !snapshot.metadata.cutoff || !snapshot.metadata.verificationLimit) throw new Error('快照时间或核验限制缺失');
  validateRecords(snapshot.queries.land_events.rows,snapshot.queries.unverified_leads.rows);
  return snapshot;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const snapshot = await loadSnapshot();
  console.log('数据校验通过：' + Object.entries(snapshot.queries).map(([k,v]) => `${k}=${v.rows.length}`).join('，'));
}
