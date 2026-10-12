import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const project=fileURLToPath(new URL('../',import.meta.url));
execFileSync(process.execPath,['scripts/build.mjs'],{cwd:project});
const root=resolve(project,'dist');
const input=JSON.parse(await readFile(resolve(project,'data/snapshot.json'),'utf8'));

test('all four exported queries and the complete snapshot preserve every field',async()=>{
  assert.deepEqual(JSON.parse(await readFile(resolve(root,'exports/snapshot.json'),'utf8')),input);
  for(const [key,query] of Object.entries(input.queries)) {
    assert.deepEqual(JSON.parse(await readFile(resolve(root,`exports/${key}.json`),'utf8')),query.rows);
    assert.ok((await readFile(resolve(root,`exports/${key}.csv`),'utf8')).startsWith('\uFEFF'));
  }
});

test('every event has a shareable static detail and archive exclusion notice',async()=>{
  const ids=[];
  for(const [key,query] of Object.entries(input.queries)) if(['land_events','unverified_leads'].includes(key)) {
    for(const row of query.rows) {
      const html=await readFile(resolve(root,`events/${row.id}/index.html`),'utf8');
      assert.ok(html.includes(row.id));
      assert.ok(html.includes('核验范围'));
      if(key==='unverified_leads')assert.ok(html.includes('旧口径归档 · 不计入当前主库'));
      ids.push(row.id);
    }
  }
  assert.equal(new Set(ids).size,82);
});

test('all internal page, asset and export links resolve in the portable output',async()=>{
  async function walk(dir){const files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=resolve(dir,entry.name);files.push(...entry.isDirectory()?await walk(path):[path]);}return files;}
  for(const file of (await walk(root)).filter(path=>path.endsWith('.html'))){
    const html=await readFile(file,'utf8');
    for(const match of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[^\"]*)"/g)){
      let path=resolve(root,'.'+match[1]);const info=await stat(path).catch(()=>null);
      assert.ok(info,`broken internal link ${match[1]} in ${file}`);
      if(info.isDirectory())assert.ok(await stat(resolve(path,'index.html')));
    }
  }
});
