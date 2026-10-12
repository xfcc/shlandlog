export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function safeURL(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; }
  catch { return null; }
}

export function filterRecords(rows, filters = {}) {
  const terms = (filters.q ?? '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return rows.filter(row => {
    for (const key of ['period_group','district','stage','verification_group','theme']) {
      if (filters[key] && (row[key] ?? '') !== filters[key]) return false;
    }
    if (filters.date && (!row.publication_date || row.publication_date > filters.date)) return false;
    const text = Object.values(row).map(v => typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')).join(' ').toLocaleLowerCase();
    return terms.every(term => text.includes(term));
  }).sort((a,b) => String(b.publication_date ?? '').localeCompare(String(a.publication_date ?? '')) || a.id.localeCompare(b.id));
}

export function validateRecords(current, archive) {
  const ids = new Set();
  for (const [rows, archived] of [[current,false],[archive,true]]) {
    for (const row of rows) {
      if (!/^[A-Za-z0-9-]+$/.test(row.id) || !row.name) throw new Error('记录ID或名称缺失');
      if (ids.has(row.id)) throw new Error('重复记录ID：' + row.id);
      ids.add(row.id);
      if (!row.verification || !row.verification_group) throw new Error('核验范围缺失：' + row.id);
      if (!archived) {
        const url = safeURL(row.source_url) && new URL(row.source_url);
        if (!url || url.hostname !== 'biz.ghzyj.sh.gov.cn' || !url.pathname.startsWith('/shtdsc/') || row.official_publisher !== '上海市土地交易事务中心（上海市土地交易市场）') {
          throw new Error('当前记录缺少交易中心第一方准入依据：' + row.id);
        }
        if (row.admission_status !== '当前收录') throw new Error('当前准入状态有误：' + row.id);
      } else if (!row.archive_reason || !row.archive_status || row.period_group !== '旧口径归档') {
        throw new Error('归档标记或退出原因缺失：' + row.id);
      }
      for (const key of ['source_url','supplement_url']) {
        if (row[key] != null && !safeURL(row[key])) throw new Error('不安全来源链接：' + row.id);
      }
      for (const key of ['publication_date','event_start','event_end','checked_at','first_recorded','archived_at']) {
        if (row[key] != null && (!/^\d{4}-\d{2}-\d{2}$/.test(row[key]) || !Number.isFinite(Date.parse(row[key])) || new Date(row[key]).toISOString().slice(0,10) !== row[key])) throw new Error('日期格式错误：' + row.id + ' ' + key);
      }
    }
  }
}
