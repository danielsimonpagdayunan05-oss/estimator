/* AU ONE STUDIO · data-views.js
   Data engine: cards/table/kanban/calendar + filters
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

const REQ_STATUSES=['pending','approved','rejected','returned','revision','cancelled'];
const DATA_VIEWS=[['cards','Cards','layout-dashboard'],['table','Table','list'],['kanban','Kanban','shapes'],['calendar','Calendar','calendar']];
async function renderRequests(c){
  const reqs=await Store.list('requests');
  const f=APP.reqFilter||'all';
  const mod=APP.reqModule||'all';
  const sort=APP.reqSort||'new';
  const view=APP.reqView||'cards';
  const counts=k=>reqs.filter(r=>r.status===k).length;
  const savedViews=(await Store.list('views')).filter(v=>(v.context||'requests')==='requests');
  const toolbar=viewToolbar({
    views:DATA_VIEWS,activeView:view,viewAction:'reqView',
    quickFilter:{id:'reqQuickFilter',value:APP.reqQuery,placeholder:'Quick filter…'},
    sortSelect:{options:[['new','Newest'],['old','Oldest'],['name','Name A–Z']],action:'reqSortSel',value:sort},
    saveViewAction:'saveView',savedViews
  })+`
    <div class="row wrap" style="margin-bottom:6px;gap:7px">
      ${['all',...REQ_STATUSES].map(k=>`<button class="chip" data-action="reqFilter" data-f="${k}"
        style="${f===k?'background:var(--brand);color:#fff;border-color:transparent':''}">${k[0].toUpperCase()+k.slice(1)} ${k==='all'?reqs.length:counts(k)}</button>`).join('')}
      <select class="inp" style="width:auto;padding:6px 28px 6px 10px;font-size:12.5px" data-action="reqModuleSel">
        <option value="all" ${mod==='all'?'selected':''}>All modules</option>
        ${DIR.modules.map(m=>`<option value="${m.id}" ${mod===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
    </div>
    <div id="reqBody"></div>`;
  c.innerHTML=toolbar;
  const qf=$('#reqQuickFilter');
  qf.addEventListener('input',()=>{APP.reqQuery=qf.value;refreshReqView();});
  return refreshReqView();
}
/* re-renders only #reqBody (like db-records.js's refreshDbView) so typing in
   the quick-filter, or switching view/sort, never steals the input's own focus */
async function refreshReqView(){
  const reqs=await Store.list('requests');
  const f=APP.reqFilter||'all';
  const mod=APP.reqModule||'all';
  const sort=APP.reqSort||'new';
  const view=APP.reqView||'cards';
  const q=(APP.reqQuery||'').trim().toLowerCase();
  let list=reqs.filter(r=>(f==='all'||r.status===f)&&(mod==='all'||r.module===mod)
    &&(!q||(r.formName+r.submittedByName+(r.module||'')).toLowerCase().includes(q)));
  list.sort((a,b)=> sort==='new'?b.submittedAt-a.submittedAt : sort==='old'?a.submittedAt-b.submittedAt : esc(a.formName).localeCompare(esc(b.formName)));
  const body=$('#reqBody');if(!body)return;
  if(!list.length){body.innerHTML=emptyCard('folder','No requests','Nothing matches this filter.');return;}
  if(view==='cards'){body.innerHTML=`<div class="grid cols">${list.map(reqCard).join('')}</div>`;
    enhanceMobileCards(body,null,()=>renderSelectionBar({onBulkDelete:false}));}
  else if(view==='table')reqTable(list,body);
  else if(view==='kanban'){body.innerHTML=reqKanban(list);
    $$('.kcol',body).forEach(col=>enhanceMobileCards(col,null,()=>renderSelectionBar({onBulkDelete:false})));}
  else if(view==='calendar')body.innerHTML=reqCalendar(list);
}
/* the one view genuinely worth virtualizing at request-list scale — a real
   scrollable <table> with thousands of rows, via the Database Engine's
   VirtualTable (db-virtual-list.js). Cards/Kanban/Calendar keep their existing
   string-returning renderers unchanged: they already produce the same markup a
   generic View Engine renderer would, and neither benefits from virtualization
   at today's usage (dashboard/inbox already cap or don't need it) — rewriting
   them into mount-based delegators would be pure risk for zero behavior change. */
function reqTable(list,mountEl){
  mountEl.innerHTML=`<div class="tablewrap" style="max-height:60vh;overflow:auto"></div>`;
  const host=mountEl.querySelector('.tablewrap');
  host.innerHTML=`<table class="dtable"><thead><tr>
    <th>Request</th><th>Submitted by</th><th>Module</th><th class="hide-sm">Current step</th><th>Date</th><th>Status</th></tr></thead><tbody></tbody></table>`;
  return VirtualTable(host,{rows:list,rowHeight:43,renderRow:r=>{const step=r.steps[r.currentStep];
    return `<tr data-action="openReq" data-id="${r.id}"><td><div class="row" style="gap:8px"><span style="color:${r.color||'var(--brand)'};display:inline-flex">${svg(r.icon||'file-text',16)}</span><b>${esc(r.formName)}</b></div></td>
      <td>${esc(r.submittedByName)}</td><td>${esc(r.module||'—')}</td>
      <td class="hide-sm">${r.status==='pending'&&step?esc(step.name):'—'}</td>
      <td>${fmtDate(r.submittedAt)}</td><td><span class="status ${r.status}">${r.status}</span></td></tr>`;}});
}
function reqKanban(list){
  const cols=REQ_STATUSES.filter(s=>list.some(r=>r.status===s));
  const use=cols.length?cols:['pending'];
  return `<div class="kanban">${use.map(s=>{const items=list.filter(r=>r.status===s);
    return `<div class="kcol"><div class="kh"><span class="status ${s}">${s}</span><span class="cnt">${items.length}</span></div>
      ${items.map(reqCard).join('')||`<div class="tiny muted" style="text-align:center;padding:16px">Empty</div>`}</div>`;}).join('')}</div>`;
}
function reqCalendar(list){
  const byDay={};list.forEach(r=>{const d=new Date(r.submittedAt);const k=d.getFullYear()+'-'+d.getMonth()+'-'+d.getDate();(byDay[k]=byDay[k]||[]).push(r);});
  const now=list.length?new Date(list[0].submittedAt):new Date(APP.__now||Date.now());
  const y=now.getFullYear(),m=now.getMonth();
  const first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const cells=[];for(let i=0;i<first;i++)cells.push('<div></div>');
  for(let d=1;d<=days;d++){const k=y+'-'+m+'-'+d;const items=byDay[k]||[];
    cells.push(`<div class="cd"><div class="dn">${d}</div>${items.slice(0,3).map(r=>`<span class="dot2" data-action="openReq" data-id="${r.id}">${esc(r.formName)}</span>`).join('')}${items.length>3?`<span class="tiny muted">+${items.length-3}</span>`:''}</div>`);}
  const dow=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  return `<div class="card pad"><div style="font-weight:800;margin-bottom:10px">${new Date(y,m,1).toLocaleDateString('en-PH',{month:'long',year:'numeric'})}</div>
    <div class="cal">${dow.map(d=>`<div class="head">${d}</div>`).join('')}${cells.join('')}</div></div>`;
}

/* ---------- Request detail ---------- */
