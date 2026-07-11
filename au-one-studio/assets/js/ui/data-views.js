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
  let list=reqs.filter(r=>(f==='all'||r.status===f)&&(mod==='all'||r.module===mod));
  list.sort((a,b)=> sort==='new'?b.submittedAt-a.submittedAt : sort==='old'?a.submittedAt-b.submittedAt : esc(a.formName).localeCompare(esc(b.formName)));
  const counts=k=>reqs.filter(r=>r.status===k).length;
  const savedViews=await Store.list('views');
  const toolbar=`
    <div class="viewbar">
      <div class="segmented">${DATA_VIEWS.map(([v,l,ic])=>`<button data-action="reqView" data-v="${v}" class="${view===v?'on':''}">${svg(ic,14)}<span class="hide-sm">${l}</span></button>`).join('')}</div>
      <span class="sp"></span>
      <select class="inp" style="width:auto;padding:8px 30px 8px 11px" data-action="reqSortSel">
        ${[['new','Newest'],['old','Oldest'],['name','Name A–Z']].map(([v,l])=>`<option value="${v}" ${sort===v?'selected':''}>${l}</option>`).join('')}</select>
      <button class="btn sm" data-action="saveView">${svg('star',14)} Save view</button>
    </div>
    <div class="row wrap" style="margin-bottom:6px;gap:7px">
      ${['all',...REQ_STATUSES].map(k=>`<button class="chip" data-action="reqFilter" data-f="${k}"
        style="${f===k?'background:var(--brand);color:#fff;border-color:transparent':''}">${k[0].toUpperCase()+k.slice(1)} ${k==='all'?reqs.length:counts(k)}</button>`).join('')}
      <select class="inp" style="width:auto;padding:6px 28px 6px 10px;font-size:12.5px" data-action="reqModuleSel">
        <option value="all" ${mod==='all'?'selected':''}>All modules</option>
        ${DIR.modules.map(m=>`<option value="${m.id}" ${mod===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select>
    </div>
    ${savedViews.length?`<div class="row wrap" style="margin-bottom:12px;gap:6px">${savedViews.map(v=>`<span class="chip" data-action="loadView" data-id="${v.id}">${svg('star',12)} ${esc(v.name)}<button data-action="delView" data-id="${v.id}" style="margin-left:4px;color:var(--muted)">${svg('x',11)}</button></span>`).join('')}</div>`:''}`;
  let bodyHtml;
  if(!list.length)bodyHtml=emptyCard('folder','No requests','Nothing matches this filter.');
  else if(view==='cards')bodyHtml=`<div class="grid cols">${list.map(reqCard).join('')}</div>`;
  else if(view==='table')bodyHtml=reqTable(list);
  else if(view==='kanban')bodyHtml=reqKanban(list);
  else if(view==='calendar')bodyHtml=reqCalendar(list);
  c.innerHTML=toolbar+bodyHtml;
}
function reqTable(list){
  return `<div class="tablewrap"><table class="dtable"><thead><tr>
    <th>Request</th><th>Submitted by</th><th>Module</th><th class="hide-sm">Current step</th><th>Date</th><th>Status</th></tr></thead>
    <tbody>${list.map(r=>{const step=r.steps[r.currentStep];
      return `<tr data-action="openReq" data-id="${r.id}"><td><div class="row" style="gap:8px"><span style="color:${r.color||'#4f46e5'};display:inline-flex">${svg(r.icon||'file-text',16)}</span><b>${esc(r.formName)}</b></div></td>
      <td>${esc(r.submittedByName)}</td><td>${esc(r.module||'—')}</td>
      <td class="hide-sm">${r.status==='pending'&&step?esc(step.name):'—'}</td>
      <td>${fmtDate(r.submittedAt)}</td><td><span class="status ${r.status}">${r.status}</span></td></tr>`;}).join('')}</tbody></table></div>`;
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
