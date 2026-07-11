/* AU ONE STUDIO · dashboard.js
   Dashboard KPIs + request cards + inbox
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function renderDashboard(c){
  const reqs=await Store.list('requests');const forms=await Store.list('forms');
  const mine=reqs.filter(r=>r.submittedBy===APP.user.id);
  const inbox=reqs.filter(r=>['pending','inprogress'].includes(r.status)&&Permission.isApproverFor(r.steps[r.currentStep]));
  const pending=reqs.filter(r=>r.status==='pending').length;
  const approved=reqs.filter(r=>r.status==='approved').length;
  const rejected=reqs.filter(r=>r.status==='rejected').length;
  c.innerHTML=`
  <div class="kpis">
    <div class="card kpi"><div class="n" style="color:var(--warn)">${inbox.length}</div><div class="l">Awaiting you</div></div>
    <div class="card kpi"><div class="n">${pending}</div><div class="l">In progress</div></div>
    <div class="card kpi"><div class="n" style="color:var(--ok)">${approved}</div><div class="l">Approved</div></div>
    <div class="card kpi"><div class="n" style="color:var(--bad)">${rejected}</div><div class="l">Rejected</div></div>
    <div class="card kpi"><div class="n">${forms.filter(f=>f.status==='published').length}</div><div class="l">Live forms</div></div>
  </div>
  <div class="sectitle">Waiting on you</div>
  ${inbox.length?`<div class="grid cols">${inbox.slice(0,6).map(reqCard).join('')}</div>`:emptyCard('party-popper','You are all caught up','No approvals need your attention.')}
  <div class="sectitle">Your recent requests</div>
  ${mine.length?`<div class="grid cols">${mine.slice(0,6).map(reqCard).join('')}</div>`:emptyCard('file-text','No requests yet','Submit one from a published form.')}
  <div style="margin-top:20px" class="row wrap">
    <button class="btn primary" data-action="go" data-view="forms">${svg('layout-template',16)} Build a form</button>
    <button class="btn" data-action="go" data-view="templates">${svg('library',16)} Use a template</button>
  </div>`;
}
function emptyCard(ic,t,m){return `<div class="card pad empty"><div class="big" style="color:var(--muted2)">${svg(ic,38)}</div><div style="font-size:15px;color:var(--ink)">${t}</div><div class="small">${m}</div></div>`;}
function reqCard(r){const step=r.steps[r.currentStep];
  return `<div class="card formcard" data-action="openReq" data-id="${r.id}"><div class="bar" style="background:${r.color||'#4f46e5'}"></div>
    <div class="body"><div class="row"><div class="icon" style="background:${r.color||'#4f46e5'}">${svg(r.icon||'file-text',22)}</div>
      <span class="sp"></span><span class="status ${r.status}">${r.status}</span></div>
    <h3>${esc(r.formName)}</h3>
    <div class="small muted">by ${esc(r.submittedByName)} · ${ago(r.submittedAt)}</div>
    <div class="meta">${r.status==='pending'&&step?`<span class="chip">${svg('clock',13)} ${esc(step.name)}</span>`:''}
      ${r.module?`<span class="chip">${svg('shapes',13)} ${esc(r.module)}</span>`:''}</div></div></div>`;}

/* ---------- Inbox ---------- */
async function renderInbox(c){
  const reqs=await Store.list('requests');
  const list=reqs.filter(r=>['pending','inprogress'].includes(r.status)&&Permission.isApproverFor(r.steps[r.currentStep]));
  c.innerHTML=list.length?`<div class="grid cols">${list.map(reqCard).join('')}</div>`
    :emptyCard('inbox','Inbox zero','No requests are waiting on your role right now. Switch user in the sidebar to test other approvers.');
}

/* ---------- Requests · DATA ENGINE (Cards/Table/Kanban/Calendar + filter/sort/saved views) ---------- */
