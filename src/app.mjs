import { filterRecords } from './core.mjs';

const browser=document.querySelector('[data-query]');
if (browser) {
  const form=document.querySelector('#filters');
  const status=document.querySelector('#load-status');
  const count=document.querySelector('#result-count');
  const cards=[...document.querySelectorAll('[data-record-id]')];
  const key=browser.dataset.query;
  try {
    const rows=cards.map(card=>JSON.parse(card.dataset.record));
    const params=new URLSearchParams(location.search);
    for (const element of form.elements) if (element.name && params.has(element.name)) element.value=params.get(element.name);
    function update() {
      const filters=Object.fromEntries(new FormData(form));
      const visible=filterRecords(rows,filters);
      const ids=new Set(visible.map(row=>row.id));
      for (const card of cards) card.hidden=!ids.has(card.dataset.recordId);
      count.textContent=`显示 ${visible.length} / ${rows.length} 条${key==='unverified_leads'?'归档':'当前'}记录`;
      document.querySelector('#empty').hidden=visible.length!==0;
      const next=new URLSearchParams();
      for (const [k,v] of Object.entries(filters)) if (v) next.set(k,v);
      history.replaceState(null,'',location.pathname+(next.size?'?'+next:'')+location.hash);
    }
    form.addEventListener('submit',e=>e.preventDefault());
    form.addEventListener('input',update);
    form.addEventListener('change',update);
    form.addEventListener('reset',()=>setTimeout(update,0));
    update();
    status.hidden=true;
    const focused=params.get('focus');
    const selected=cards.find(card=>card.dataset.recordId===focused);
    if (selected) {selected.querySelector('h2 a').focus({preventScroll:true});selected.scrollIntoView({block:'center'});}
  } catch {
    for (const control of form.elements) control.disabled=true;
    status.textContent='筛选初始化失败。当前完整列表与事件详情仍可阅读；刷新页面后可重试。';
    status.setAttribute('role','alert');
  }
}
