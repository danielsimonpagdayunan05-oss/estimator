/* AU ONE STUDIO · db-views.js
   Database Engine — the shared View Engine. One rendering engine for Table/Cards/
   Kanban/Calendar/List, built on db-virtual-list.js and the *existing* CSS
   (.dtable, .kanban/.kcol, .cal/.cd, .card.formcard, .grid.cols) — no new CSS
   needed. Gallery/Timeline/Tree/Hierarchy are deferred (see plan's "out of scope").
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · VIEWS
   ========================================================================== */
/* maps ANY record to a generic summary shape — this is the one contract every
   view type needs, instead of each view knowing a specific table's field names */
Tables.summarize=function(table,record){
  const titleCol=table.primaryColumn;
  const title=(titleCol&&record[titleCol]!=null&&record[titleCol]!=='')?record[titleCol]:(record.name??record.title??('#'+String(record.id).slice(-6)));
  return {
    id:record.id,
    title:String(title||'—'),
    subtitle:table.subtitleColumn?String(record[table.subtitleColumn]??''):'',
    timestamp:record.createdAt||0,
    status:record.status||'',
    groupKey:record[table.groupColumn||'status']??'—',
    color:table.color||'#4f46e5',
    icon:table.icon||'table',
    badge:''
  };
};

function displayValue(col,v){
  if(col.type==='currency')return peso(v);
  if(col.type==='rating')return '★'.repeat(+v||0)+'☆'.repeat(5-(+v||0));
  if(col.type==='multiselect'&&Array.isArray(v))return v.join(', ')||'—';
  if(col.type==='date')return fmtDate(v);
  if(col.type==='checkbox')return v?'Yes':'No';
  if(v==null||v==='')return '—';
  return esc(String(v));
}

function viewTable(table,rows,viewConfig,mountEl){
  const cols=(table.columns||[]).filter(c=>!FieldTypes[c.type]?.layout).slice(0,6);
  mountEl.innerHTML=`<div class="tablewrap" style="max-height:60vh;overflow:auto"></div>`;
  const host=mountEl.querySelector('.tablewrap');
  host.innerHTML=`<table class="dtable"><thead><tr>${cols.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody></tbody></table>`;
  const ctrl=VirtualTable(host,{rows,rowHeight:44,renderRow:r=>
    `<tr data-action="openRecord" data-tid="${table.id}" data-id="${r.id}">
      ${cols.map(c=>`<td>${displayValue(c,r[fieldKey(c)])}</td>`).join('')}</tr>`});
  enhanceMobileCards(host,{tableId:table.id},()=>renderSelectionBar({onBulkDelete:true}),'tr[data-action="openRecord"]');
  return ctrl;
}
function viewCards(table,rows,viewConfig,mountEl){
  mountEl.innerHTML='';
  const ctrl=InfiniteList(mountEl,{rows,pageSize:30,wrapClass:'grid cols',renderItem:r=>{
    const s=Tables.summarize(table,r);
    return `<div class="card formcard" data-action="openRecord" data-tid="${table.id}" data-id="${r.id}"><div class="bar" style="background:${s.color}"></div>
      <div class="body"><div class="row"><div class="icon" style="background:${s.color}">${svg(s.icon,22)}</div></div>
      <h3>${esc(s.title)}</h3>${s.subtitle?`<div class="small muted">${esc(s.subtitle)}</div>`:''}
      ${s.status?`<div class="meta"><span class="chip">${esc(s.status)}</span></div>`:''}</div></div>`;
  }});
  enhanceMobileCards(mountEl,{tableId:table.id},()=>renderSelectionBar({onBulkDelete:true}));
  return ctrl;
}
function viewKanban(table,rows,viewConfig,mountEl){
  const groups=Query.group(rows,viewConfig?.groupField||table.groupColumn||'status');
  const keys=Object.keys(groups);
  mountEl.innerHTML=`<div class="kanban">${keys.map((k,i)=>`<div class="kcol"><div class="kh"><span class="status">${esc(k)}</span><span class="cnt">${groups[k].length}</span></div><div data-kcol="${i}"></div></div>`).join('')}</div>`;
  const lists=keys.map((k,i)=>{
    const colEl=mountEl.querySelector(`[data-kcol="${i}"]`);
    const ctrl=InfiniteList(colEl,{rows:groups[k],pageSize:20,renderItem:r=>{
      const s=Tables.summarize(table,r);
      return `<div class="card formcard" data-action="openRecord" data-tid="${table.id}" data-id="${r.id}"><div class="bar" style="background:${s.color}"></div>
        <div class="body"><h3>${esc(s.title)}</h3>${s.subtitle?`<div class="small muted">${esc(s.subtitle)}</div>`:''}</div></div>`;
    }});
    enhanceMobileCards(colEl,{tableId:table.id},()=>renderSelectionBar({onBulkDelete:true}));
    return ctrl;
  });
  return {destroy(){lists.forEach(l=>l.destroy());}};
}
function viewCalendar(table,rows,viewConfig,mountEl){
  const dateField=viewConfig?.dateField||'createdAt';
  const byDay={};rows.forEach(r=>{const ts=r[dateField];if(!ts)return;const d=new Date(ts);const k=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();(byDay[k]=byDay[k]||[]).push(r);});
  const now=rows.length?new Date(rows[0][dateField]||Date.now()):new Date();
  const y=now.getFullYear(),m=now.getMonth();
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const cells=[];for(let i=0;i<first;i++)cells.push('<div></div>');
  for(let d=1;d<=days;d++){const k=y+'-'+m+'-'+d;const items=byDay[k]||[];
    cells.push(`<div class="cd"><div class="dn">${d}</div>${items.slice(0,3).map(r=>`<span class="dot2" data-action="openRecord" data-tid="${table.id}" data-id="${r.id}">${esc(Tables.summarize(table,r).title)}</span>`).join('')}${items.length>3?`<span class="tiny muted">+${items.length-3}</span>`:''}</div>`);}
  const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  mountEl.innerHTML=`<div class="card pad"><div style="font-weight:800;margin-bottom:10px">${new Date(y,m,1).toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</div>
    <div class="cal">${dow.map(d=>`<div class="head">${d}</div>`).join('')}${cells.join('')}</div></div>`;
}
function viewList(table,rows,viewConfig,mountEl){
  mountEl.innerHTML='';
  const ctrl=InfiniteList(mountEl,{rows,pageSize:50,renderItem:r=>{
    const s=Tables.summarize(table,r);
    return `<div class="row" style="padding:9px 4px;border-bottom:1px solid var(--stroke)" data-action="openRecord" data-tid="${table.id}" data-id="${r.id}">
      <span style="color:${s.color};display:inline-flex">${svg(s.icon,15)}</span><b>${esc(s.title)}</b>
      ${s.subtitle?`<span class="small muted">${esc(s.subtitle)}</span>`:''}<span class="sp"></span>
      ${s.status?`<span class="status ${esc(s.status)}">${esc(s.status)}</span>`:''}</div>`;
  }});
  enhanceMobileCards(mountEl,{tableId:table.id},()=>renderSelectionBar({onBulkDelete:true}),'.row[data-action="openRecord"]');
  return ctrl;
}

/* dispatch table so Plugins.ctx.registerView() can add new view types without
   touching this file — DATA_VIEWS-style [id,label,icon] tuples for the toolbar */
const DB_VIEW_TYPES={table:viewTable,cards:viewCards,kanban:viewKanban,calendar:viewCalendar,list:viewList};
const DB_VIEWS=[['table','Table','list'],['cards','Cards','layout-dashboard'],['kanban','Kanban','shapes'],['calendar','Calendar','calendar'],['list','List','align-left']];
