/* AU ONE STUDIO · workflow-builder.js
   VISUAL WORKFLOW DESIGNER — a node canvas (Start → approval nodes → Completed)
   with SVG-style connectors and insert-between buttons. Nodes map 1:1 to
   f.workflow.steps, so the Approval Engine keeps working unchanged; side-effect
   nodes (notify/webhook) are configured in the Rules tab and cross-referenced.
   Keeps the original data-step / data-sp / data-cond contract so the router and
   onGlobalInput handlers are untouched. */

/* visual style per approval mode */
const WF_MODES = {
  sequential: { ic: 'user', color: 'var(--brand)', badge: 'var(--brandS)', badgeInk: 'var(--brand)', label: 'Sequential' },
  parallel:   { ic: 'shapes', color: 'var(--info)', badge: 'var(--infoS)', badgeInk: 'var(--info)', label: 'Parallel' },
  optional:   { ic: 'circle-dot', color: 'var(--warn)', badge: 'var(--warnS)', badgeInk: 'var(--warn)', label: 'Optional' },
  automatic:  { ic: 'send', color: 'var(--ok)', badge: 'var(--okS)', badgeInk: 'var(--ok)', label: 'Automatic' },
};

function renderBuilderWorkflow(f){
  const steps = f.workflow?.steps || [];
  const autos = (f.automations||[]).length;
  $('#builderBody').innerHTML = `
    <div class="wfhint card pad"><div class="small muted">Design the approval flow as a node graph. Each node is an approval step; drag order with the arrows, insert steps with the <b>+</b> on a connector, and add a <b>condition</b> so a node only runs in certain cases (e.g. amount &gt; ₱100,000 → CEO). Side-effects like notify / webhook live in the <b>Rules</b> tab${autos?` (<b>${autos}</b> active)`:''}.</div></div>
    <div class="wfcanvas">
      ${wfTerm('start')}
      ${connector(0)}
      ${steps.map((s,i)=>wfNode(s,i,f)+connector(i+1)).join('')}
      ${wfTerm('end')}
    </div>
    <div class="wfpalette">
      <button class="btn" data-action="addStepMode" data-m="sequential">${svg('plus',15)} Approval</button>
      <button class="btn" data-action="addStepMode" data-m="parallel">${svg('shapes',15)} Parallel</button>
      <button class="btn" data-action="addStepMode" data-m="optional">${svg('circle-dot',15)} Optional</button>
      <button class="btn" data-action="btab" data-t="rules">${svg('workflow',15)} Notify / Webhook (Rules)</button>
    </div>`;
}

function wfTerm(kind){
  const start = kind==='start';
  return `<div class="wfnode term"><div class="nic" style="background:${start?'var(--muted2)':'var(--ok)'}">${svg(start?'user':'check',17)}</div>
    <div><b>${start?'Start':'Completed'}</b><div class="small muted">${start?'Submitter fills out & submits the form':'All approvals granted'}</div></div></div>`;
}
function connector(i){
  return `<div class="wfconn"><div class="ln"></div>
    <button class="ins" data-action="addStepAt" data-i="${i}" title="Insert step here">${svg('plus',14)}</button></div>`;
}

function wfNode(s,i,f){
  const mode = WF_MODES[s.mode] || WF_MODES.sequential;
  const roleOpts = DIR.roles.map(r=>`<option value="${r.id}" ${s.role===r.id?'selected':''}>${esc(r.name)}</option>`).join('');
  const userOpts = DIR.people.map(p=>`<option value="${p.id}" ${s.userId===p.id?'selected':''}>${esc(p.name)} (${esc(p.role)})</option>`).join('');
  const fieldOpts = (f.fields||[]).filter(fl=>!FieldTypes[fl.type]?.layout).map(fl=>`<option value="${fieldKey(fl)}" ${s.condition?.field===fieldKey(fl)?'selected':''}>${esc(fl.label)}</option>`).join('');
  return `<div class="wfnode">
    <div class="nhead" style="border-left:4px solid ${mode.color}">
      <div class="nic" style="width:28px;height:28px;background:${mode.color}">${svg(mode.ic,15)}</div>
      <div class="nt"><input data-step="${s.id}" data-sp="name" value="${esc(s.name)}" placeholder="Step name"></div>
      <span class="nmode" style="background:${mode.badge};color:${mode.badgeInk}">${mode.label}</span>
      <div class="nctl">
        <button data-action="moveStep" data-id="${s.id}" data-dir="-1" title="Move up">${svg('chevron-up',15)}</button>
        <button data-action="moveStep" data-id="${s.id}" data-dir="1" title="Move down">${svg('chevron-down',15)}</button>
        <button data-action="delStep" data-id="${s.id}" title="Delete">${svg('trash-2',14)}</button>
      </div>
    </div>
    <div class="nbody">
      <div class="f2">
        <div class="field" style="margin:0"><label>Approver</label><select class="inp" data-step="${s.id}" data-sp="approverType"><option value="role" ${s.approverType==='role'?'selected':''}>By role</option><option value="user" ${s.approverType==='user'?'selected':''}>Specific person</option></select></div>
        <div class="field" style="margin:0"><label>${s.approverType==='user'?'Person':'Role'}</label>
          ${s.approverType==='user'?`<select class="inp" data-step="${s.id}" data-sp="userId">${userOpts}</select>`:`<select class="inp" data-step="${s.id}" data-sp="role">${roleOpts}</select>`}</div>
        <div class="field" style="margin:0"><label>Mode</label><select class="inp" data-step="${s.id}" data-sp="mode">
          ${Object.keys(WF_MODES).map(m=>`<option value="${m}" ${s.mode===m?'selected':''}>${WF_MODES[m].label}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label>SLA (hours)</label><input class="inp" data-step="${s.id}" data-sp="slaHours" value="${s.slaHours||''}" placeholder="e.g. 24"></div>
      </div>
      <div class="wf-cond" style="margin-top:10px"><div class="row"><b class="small">Condition</b><span class="sp"></span>
        <label class="checkline" style="margin:0;padding:5px 9px"><input type="checkbox" data-action="toggleCond" data-id="${s.id}" ${s.condition?'checked':''}> run only if…</label></div>
        ${s.condition?`<div class="f2" style="margin-top:8px">
          <select class="inp" data-step="${s.id}" data-cond="field"><option value="">— field —</option>${fieldOpts}</select>
          <select class="inp" data-step="${s.id}" data-cond="op">${WorkflowEngine.condOps.map(([v,l])=>`<option value="${v}" ${s.condition.op===v?'selected':''}>${l}</option>`).join('')}</select>
          <input class="inp full" data-step="${s.id}" data-cond="value" value="${esc(s.condition.value||'')}" placeholder="value (e.g. 100000 or Finance)"></div>`:''}
      </div>
    </div></div>`;
}
