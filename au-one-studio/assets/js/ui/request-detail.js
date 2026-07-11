/* AU ONE STUDIO · request-detail.js
   Request detail: chain, values, timeline
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function openReq(id){
  const r=await Store.get('requests',id);if(!r)return;
  const form=await Store.get('forms',r.formId);
  const step=r.steps[r.currentStep];
  const canAct=['pending','inprogress'].includes(r.status)&&Permission.isApproverFor(step);
  const isOwner=r.submittedBy===APP.user.id;
  const body=`
    <div class="row" style="margin-bottom:10px"><div class="icon formcard" style="width:44px;height:44px;background:${r.color||'#4f46e5'};border-radius:12px;display:grid;place-items:center;color:#fff">${svg(r.icon||'file-text',22)}</div>
      <div><div style="font-weight:800;font-size:16px">${esc(r.formName)}</div>
      <div class="small muted">by ${esc(r.submittedByName)} · ${fmtDT(r.submittedAt)}</div></div>
      <span class="sp"></span><span class="status ${r.status}">${r.status}</span></div>

    <div class="sectitle" style="margin-top:6px">Approval chain</div>
    <div>${r.steps.map((s,i)=>`<div class="wf-step"><div class="num"><div class="dot" style="${s.status==='approved'?'background:var(--ok)':s.status==='rejected'?'background:var(--bad)':i===r.currentStep&&r.status==='pending'?'':'background:var(--muted2)'}">${s.status==='approved'?svg('check',15):s.status==='rejected'?svg('x',15):i+1}</div>${i<r.steps.length-1?'<div class="line"></div>':''}</div>
      <div class="box"><div class="row"><b>${esc(s.name)}</b><span class="sp"></span><span class="status ${s.status==='approved'?'approved':s.status==='rejected'?'rejected':s.status==='pending'?'pending':'draft'}">${s.status}</span></div>
      <div class="small muted">${esc(WorkflowEngine.approverLabel(s))}${s.decidedBy?` · ${esc(s.decidedBy)} ${ago(s.decidedAt)}`:''}</div>
      ${s.remarks?`<div class="small" style="margin-top:4px;display:flex;gap:6px;align-items:flex-start">${svg('message-square',13)} ${esc(s.remarks)}</div>`:''}</div></div>`).join('')}</div>

    <div class="sectitle">Submitted details</div>
    <div class="card pad" style="box-shadow:none">${renderReadonly(form,r.values)}</div>

    <div class="sectitle">Activity timeline</div>
    <div class="tl">${r.timeline.slice().reverse().map(ev=>{
      const k=['approved','completed'].includes(ev.type)?'ok':['rejected','cancel'].includes(ev.type)?'bad':['return','revision','delegate','forward','escalate'].includes(ev.type)?'info':'';
      const mk=ev.type==='approved'||ev.type==='completed'?svg('check',12):ev.type==='rejected'?svg('x',12):ev.type==='comment'?svg('message-square',11):'•';
      return `<div class="ev ${k}"><div class="mk">${mk}</div><div class="t">${esc(ev.text||ev.type)}</div>
        <div class="m">${esc(ev.by)} · ${fmtDT(ev.at)}</div>${ev.remarks?`<div class="c">${esc(ev.remarks)}</div>`:''}</div>`;}).join('')}</div>`;

  let footer='';
  if(canAct){footer=`<button class="btn ghost" data-action="reqMore" data-id="${r.id}">${svg('ellipsis',16)} More</button>
    <button class="btn bad" data-action="reqAct" data-id="${r.id}" data-act="reject">${svg('x',15)} Reject</button>
    <button class="btn" data-action="reqAct" data-id="${r.id}" data-act="return">${svg('corner-up-left',15)} Return</button>
    <button class="btn ok" data-action="reqAct" data-id="${r.id}" data-act="approve">${svg('check',15)} Approve</button>`;}
  else if(isOwner&&['pending','returned','revision'].includes(r.status)){footer=`<button class="btn bad" data-action="reqAct" data-id="${r.id}" data-act="cancel">Cancel request</button>`;}
  modal({title:'Request',body,footer,wide:true});
}
function renderReadonly(form,values){
  if(!form)return '<div class="muted small">Form definition not found.</div>';
  return (form.fields||[]).filter(f=>!FieldTypes[f.type]?.layout&&f.type!=='hidden').map(f=>{
    let v=values[fieldKey(f)];let disp;
    if(f.type==='currency')disp=peso(v);
    else if(f.type==='signature'&&v)disp=`<img src="${v}" style="max-height:70px;border:1px solid var(--stroke);border-radius:8px;background:#fff">`;
    else if((f.type==='image')&&v)disp=`<img src="${v}" style="max-height:120px;border-radius:8px">`;
    else if(f.type==='file'&&v)disp=`<a href="${v}" download>Download file</a>`;
    else if(f.type==='multiselect'&&Array.isArray(v))disp=v.join(', ')||'—';
    else if(f.type==='rating')disp='★'.repeat(+v||0)+'☆'.repeat(5-(+v||0));
    else if(f.type==='repeating'&&Array.isArray(v))disp=repeatReadonly(f,v);
    else if(['people','project','department','role'].includes(f.type)){const src=DIR[FieldTypes[f.type].source]||[];disp=esc((src.find(x=>x.id===v)||{}).name||v||'—');}
    else disp=esc(v||'—');
    return `<div class="field" style="margin-bottom:10px"><label>${esc(f.label)}</label><div style="font-weight:600">${disp||'—'}</div></div>`;
  }).join('')||'<div class="muted small">No fields.</div>';
}
function repeatReadonly(f,rows){if(!rows.length)return '—';
  return `<table class="rt-table"><thead><tr>${f.columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r=>`<tr>${f.columns.map(c=>`<td>${esc(r[c.key]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;}

/* ---------- Forms list ---------- */
