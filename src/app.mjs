import { filterRecords, toCSV } from './core.mjs';

const browser=document.querySelector('[data-query]');
if (browser) {
  const form=document.querySelector('#filters');
  const status=document.querySelector('#load-status');
  const count=document.querySelector('#result-count');
  const exporter=document.querySelector('#export-filtered');
  const cards=[...document.querySelectorAll('[data-record-id]')];
  const key=browser.dataset.query;
  let rows=[],visible=[];
  try {
    const response=await fetch(`/exports/${key}.json`);
    if (!response.ok) throw new Error('response');
    rows=await response.json();
    const params=new URLSearchParams(location.search);
    for (const element of form.elements) if (element.name && params.has(element.name)) element.value=params.get(element.name);
    function update() {
      const filters=Object.fromEntries(new FormData(form));
      visible=filterRecords(rows,filters);
      const ids=new Set(visible.map(row=>row.id));
      for (const card of cards) card.hidden=!ids.has(card.dataset.recordId);
      count.textContent=`显示 ${visible.length} / ${rows.length} 条${key==='unverified_leads'?'归档':'当前'}记录`;
      document.querySelector('#empty').hidden=visible.length!==0;
      exporter.disabled=visible.length===0;
      const next=new URLSearchParams();
      for (const [k,v] of Object.entries(filters)) if (v) next.set(k,v);
      history.replaceState(null,'',location.pathname+(next.size?'?'+next:'')+location.hash);
    }
    form.addEventListener('submit',e=>e.preventDefault());
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    form.addEventListener('reset',()=>setTimeout(update,0));
    exporter.addEventListener('click',()=>{
      const url=URL.createObjectURL(new Blob([toCSV(visible)],{type:'text/csv;charset=utf-8'}));
      const a=document.createElement('a');a.href=url;a.download=key+'-filtered.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    });
    update();
    status.hidden=true;
    const focused=params.get('focus');
    const selected=cards.find(card=>card.dataset.recordId===focused);
    if (selected) {selected.querySelector('h2 a').focus({preventScroll:true});selected.scrollIntoView({block:'center'});}
  } catch {
    for (const control of form.elements) control.disabled=true;
    status.textContent='筛选数据加载失败。当前完整列表、事件详情和全部导出仍可阅读；刷新页面后可重试。';
    status.setAttribute('role','alert');
  }
}
