/* AU ONE STUDIO · form-builder.js
   Form list, drag builder, inspector, automation rules
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function renderForms(c){
  const forms=(await Store.list('forms')).filter(f=>!f.isTemplate);
  c.innerHTML=`<div class="row" style="margin-bottom:14px"><button class="btn primary" data-action="newForm">${svg('plus',15)} Create Form</button>
    <span class="sp"></span><span class="chip">${forms.length} form(s)</span></div>
    ${forms.length?`<div class="grid cols">${forms.map(formCard).join('')}</div>`
      :emptyCard('layout-template','No forms yet','Click “Create Form” to build one with drag-and-drop, or start from a template.')}`;
}
function formCard(f){return `<div class="card formcard"><div class="bar" style="background:${f.color}"></div>
  <div class="body"><div class="row"><div class="icon" style="background:${f.color}">${svg(f.icon,22)}</div><span class="sp"></span>
    <span class="status ${f.status}">${f.status}</span></div>
  <h3>${esc(f.name)}</h3><div class="small muted">${esc(f.description||'No description')}</div>
  <div class="meta"><span class="chip">${svg('shapes',13)} ${esc(f.module||'—')}</span><span class="chip">v${f.version||1}</span>
    <span class="chip">${(f.fields||[]).length} fields</span><span class="chip">${(f.workflow?.steps||[]).length} steps</span></div>
  <div class="row wrap" style="margin-top:12px">
    <button class="btn sm primary" data-action="editForm" data-id="${f.id}">${svg('pencil',13)} Edit</button>
    ${f.status==='published'?`<button class="btn sm ok" data-action="useForm" data-id="${f.id}">${svg('send',13)} Submit</button>`:''}
    <button class="btn sm" data-action="dupForm" data-id="${f.id}">${svg('copy',13)} Duplicate</button>
    <button class="btn sm ghost" data-action="formMore" data-id="${f.id}">${svg('ellipsis',15)}</button>
  </div></div></div>`;}

async function newForm(){
  const f={id:uid('form'),name:'Untitled Form',description:'',icon:'file-text',color:'#4f46e5',
    department:DIR.departments[0]?.id||'',module:DIR.modules[0]?.id||'',category:'General',
    version:1,status:'draft',isTemplate:false,fields:[],
    workflow:{steps:[{id:uid('s'),name:'Supervisor',approverType:'role',role:'Supervisor',mode:'sequential',condition:null,slaHours:24}]},
    permissions:{create:['*'],submit:['*'],edit:['*'],approve:['*'],delete:['*'],archive:['*']}};
  await Store.upsert('forms',f);APP.editing=f.id;APP.builderTab='fields';render();
}

/* ---------- FORM BUILDER ---------- */
let BUILDER_SEL=null;
/* ---- Undo/redo history for the form builder ---- */
const History={u:[],r:[],max:60,
  _snap(f){return JSON.stringify({fields:f.fields,workflow:f.workflow,permissions:f.permissions});},
  snap(f){if(!f)return;this.u.push(this._snap(f));if(this.u.length>this.max)this.u.shift();this.r=[];this._buttons();},
  reset(){this.u=[];this.r=[];this._buttons();},
  _buttons(){const u=$('#undoBtn'),r=$('#redoBtn');if(u)u.disabled=!this.u.length;if(r)r.disabled=!this.r.length;},
  async _apply(json){const f=await Store.get('forms',APP.editing);if(!f)return;const s=JSON.parse(json);
    f.fields=s.fields;f.workflow=s.workflow;f.permissions=s.permissions;await Store.upsert('forms',f);render();},
  async undo(){if(!this.u.length){toast('Nothing to undo','');return;}const f=await Store.get('forms',APP.editing);
    this.r.push(this._snap(f));await this._apply(this.u.pop());toast('Undo','');},
  async redo(){if(!this.r.length){toast('Nothing to redo','');return;}const f=await Store.get('forms',APP.editing);
    this.u.push(this._snap(f));await this._apply(this.r.pop());toast('Redo','');}
};
async function renderBuilder(c){
  const f=await Store.get('forms',APP.editing);if(!f){APP.editing=null;return render();}
  const tab=APP.builderTab||'fields';
  c.innerHTML=`
  <div class="row wrap" style="margin-bottom:14px">
    <button class="btn ghost" data-action="closeBuilder">${svg('chevron-left',16)} All forms</button>
    <div class="toggle">
      <button class="${tab==='fields'?'on':''}" data-action="btab" data-t="fields">${svg('shapes',15)} Fields</button>
      <button class="${tab==='workflow'?'on':''}" data-action="btab" data-t="workflow">${svg('workflow',15)} Workflow</button>
      <button class="${tab==='settings'?'on':''}" data-action="btab" data-t="settings">${svg('settings',15)} Settings</button>
      <button class="${tab==='rules'?'on':''}" data-action="btab" data-t="rules">${svg('workflow',15)} Rules</button>
    </div>
    ${tab==='fields'?`<button class="iconbtn" id="undoBtn" data-action="undo" title="Undo (Ctrl+Z)">${svg('corner-up-left',16)}</button>
      <button class="iconbtn" id="redoBtn" data-action="redo" title="Redo (Ctrl+Y)">${svg('forward',16)}</button>`:''}
    <span class="sp"></span>
    <span class="status ${f.status}">${f.status}</span>
    ${f.status==='published'?`<button class="btn" data-action="setStatus" data-s="draft">${svg('archive',15)} Unpublish</button>`
      :`<button class="btn primary" data-action="setStatus" data-s="published">${svg('send',15)} Publish</button>`}
    ${f.status==='published'?`<button class="btn ok" data-action="useForm" data-id="${f.id}">${svg('eye',15)} Preview / Submit</button>`:''}
  </div>
  <div id="builderBody"></div>`;
  if(tab==='fields'){renderBuilderFields(f);History._buttons();}
  else if(tab==='workflow')renderBuilderWorkflow(f);
  else if(tab==='rules')renderBuilderRules(f);
  else renderBuilderSettings(f);
}

/* ---------- AUTOMATION ENGINE (no-code rules per form) ---------- */
const AUTO_TRIGGERS=[['submit','When submitted'],['approve','When a step is approved'],['final','When fully approved'],['reject','When rejected']];
const AUTO_ACTIONS=[['notify','Notify a role'],['comment','Add a system comment'],['archive','Archive the form after N approvals'],['tag','Set a status tag']];
function renderBuilderRules(f){
  f.automations=f.automations||[];
  const roleOpts=DIR.roles.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  $('#builderBody').innerHTML=`<div style="max-width:720px">
    <div class="card pad" style="margin-bottom:12px"><div class="small muted">No-code automations. Each rule runs on a workflow event. Example: <b>When fully approved → Notify Finance</b>, or <b>When submitted → Add a system comment</b>. More actions (webhook, generate PO, e-mail) plug in through the same engine later.</div></div>
    ${f.automations.map((a,i)=>`<div class="card pad" style="margin-bottom:10px"><div class="row" style="margin-bottom:8px"><b class="small">Rule ${i+1}</b><span class="sp"></span><button class="btn sm ghost" data-action="delAuto" data-i="${i}">${svg('trash-2',14)}</button></div>
      <div class="f2">
        <div class="field" style="margin:0"><label>Trigger</label><select class="inp" data-auto="${i}" data-ap="on">${AUTO_TRIGGERS.map(([v,l])=>`<option value="${v}" ${a.on===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label>Action</label><select class="inp" data-auto="${i}" data-ap="do">${AUTO_ACTIONS.map(([v,l])=>`<option value="${v}" ${a.do===v?'selected':''}>${l}</option>`).join('')}</select></div>
        ${a.do==='notify'?`<div class="field" style="margin:0"><label>Notify role</label><select class="inp" data-auto="${i}" data-ap="role">${roleOpts.replace(`value="${a.role}"`,`value="${a.role}" selected`)}</select></div>`:''}
        ${a.do==='comment'||a.do==='tag'?`<div class="field" style="margin:0"><label>${a.do==='tag'?'Tag':'Text'}</label><input class="inp" data-auto="${i}" data-ap="text" value="${esc(a.text||'')}"></div>`:''}
      </div></div>`).join('')||'<div class="empty">No automation rules yet.</div>'}
    <button class="btn primary" data-action="addAuto">${svg('plus',15)} Add rule</button>
  </div>`;
}

function renderBuilderFields(f){
  const sel=(f.fields||[]).find(x=>x.id===BUILDER_SEL)||null;
  const palette=FIELD_CATS.map(cat=>`<div class="pal-cat">${cat}</div>`+
    Object.entries(FieldTypes).filter(([k,d])=>d.cat===cat).map(([k,d])=>
      `<div class="pal-item" data-action="addField" data-t="${k}"><span class="ic">${svg(d.ic,16)}</span>${d.label}</div>`).join('')).join('');
  $('#builderBody').innerHTML=`<div class="builder">
    <div class="palette"><div class="small muted" style="margin-bottom:6px;font-weight:700">Tap a field to add it</div>${palette}</div>
    <div><div class="canvas" id="canvas" data-sortable>
      ${(f.fields||[]).length?f.fields.map((fl,i)=>builderFieldRow(fl,i)).join(''):'<div class="drophint">Your form is empty.<br>Tap fields from the left to add them, then drag ⋮⋮ to reorder.</div>'}
    </div></div>
    <div class="inspector">${sel?inspector(sel,f):'<div class="card pad muted small">Select a field to edit its properties, options, validation and width.</div>'}</div>
  </div>`;
  if(f.fields?.length)makeSortable($('#canvas'),async(from,to)=>{
    const arr=f.fields;arr.splice(to,0,arr.splice(from,1)[0]);await Store.upsert('forms',f);renderBuilderFields(f);
  });
}
function builderFieldRow(fl,i){const d=FieldTypes[fl.type];const layout=d.layout;
  return `<div class="fitem ${fl.id===BUILDER_SEL?'sel':''} ${layout?'layout':''}" data-idx="${i}" data-fid="${fl.id}" data-action="selField">
    <div class="handle" data-handle>⋮⋮</div>
    <div class="fh"><span style="color:var(--muted);display:inline-flex">${svg(d.ic,16)}</span><span class="t">${esc(fl.label)}${fl.required?' <span class="req">*</span>':''}</span>
      <span class="ty">${d.label}</span>
      <div class="acts">
        <button data-action="dupField" data-fid="${fl.id}" title="Duplicate">${svg('copy',14)}</button>
        <button data-action="delField" data-fid="${fl.id}" title="Delete">${svg('trash-2',14)}</button>
      </div></div>
    <div class="prev">${previewInput(fl,'',true)}</div></div>`;}

function inspector(fl,f){const d=FieldTypes[fl.type];
  let extra='';
  if(d.opts){extra=`<div class="field"><label>Options</label>
    <div id="optList">${(fl.options||[]).map((o,i)=>`<div class="opt-row"><input class="inp" data-opt="${i}" value="${esc(o.label)}">
      <button class="btn sm ghost" data-action="delOpt" data-i="${i}">${svg('x',14)}</button></div>`).join('')}</div>
    <button class="btn sm" data-action="addOpt">${svg('plus',14)} Add option</button></div>`;}
  if(fl.type==='lookup'){extra+=`<div class="field"><label>Lookup source</label>
    <select class="inp" data-prop="source"><option value="">— choose —</option>
    ${['people','projects','departments','roles','modules'].map(s=>`<option value="${s}" ${fl.source===s?'selected':''}>${s}</option>`).join('')}</select></div>`;}
  if(fl.type==='formula'||fl.type==='calculated'){extra=`<div class="field"><label>Expression</label>
    <input class="inp mono" data-prop="expression" value="${esc(fl.expression||'')}" placeholder="e.g. {qty} * {unit_price}">
    <div class="help">Reference other fields by their <b>key</b> in braces. Operators: + − * / ( ).</div></div>`;}
  if(fl.type==='repeating'){extra=`<div class="field"><label>Table columns</label>
    <div id="colList">${(fl.columns||[]).map((col,i)=>`<div class="opt-row"><input class="inp" data-col="${i}" value="${esc(col.label)}">
      <button class="btn sm ghost" data-action="delCol" data-i="${i}">${svg('x',14)}</button></div>`).join('')}</div>
    <button class="btn sm" data-action="addCol">${svg('plus',14)} Add column</button></div>`;}
  const isLayout=d.layout;
  return `<div class="card pad"><div class="row" style="margin-bottom:8px"><b style="display:inline-flex;align-items:center;gap:7px">${svg(d.ic,17)} ${d.label}</b>
    <span class="sp"></span><button class="btn sm ghost" data-action="delField" data-fid="${fl.id}">Delete</button></div>
    <div class="field"><label>${isLayout?'Text':'Label'}</label><input class="inp" data-prop="label" value="${esc(fl.label)}"></div>
    ${isLayout?'':`
    <div class="field"><label>Field key <span class="muted tiny">(for formulas & conditions)</span></label>
      <input class="inp mono" data-prop="key" value="${esc(fl.key||'')}" placeholder="${fieldKey(fl)}"></div>
    <div class="field"><label>Help / description</label><input class="inp" data-prop="help" value="${esc(fl.help||'')}"></div>
    ${['divider','heading','description'].includes(fl.type)?'':`
    <div class="f2">
      <div class="field" style="margin:0"><label>Placeholder</label><input class="inp" data-prop="placeholder" value="${esc(fl.placeholder||'')}"></div>
      <div class="field" style="margin:0"><label>Default value</label><input class="inp" data-prop="defaultValue" value="${esc(fl.defaultValue||'')}"></div>
      <div class="field" style="margin:0"><label>Prefix</label><input class="inp" data-prop="prefix" value="${esc(fl.prefix||'')}" placeholder="e.g. ₱"></div>
      <div class="field" style="margin:0"><label>Suffix</label><input class="inp" data-prop="suffix" value="${esc(fl.suffix||'')}" placeholder="e.g. kg"></div>
    </div>`}
    ${extra}
    <div class="f2">
      <label class="checkline"><input type="checkbox" data-prop="required" ${fl.required?'checked':''}> Required</label>
      <label class="checkline"><input type="checkbox" data-prop="readonly" ${fl.readonly?'checked':''}> Read only</label>
    </div>
    <div class="field"><label>Width / column span</label><select class="inp" data-prop="width">
        <option value="full" ${fl.width==='full'?'selected':''}>Full width</option>
        <option value="half" ${fl.width==='half'?'selected':''}>Half (2 columns)</option></select></div>
    <div class="wf-cond"><div class="row"><b class="small">Conditional visibility</b><span class="sp"></span>
      <label class="checkline" style="margin:0;padding:5px 9px"><input type="checkbox" data-action="toggleVis" data-fid="${fl.id}" ${fl.visibleIf?'checked':''}> show only if…</label></div>
      ${fl.visibleIf?`<div class="f2" style="margin-top:8px">
        <select class="inp" data-visif="field">${[['','— field —'],...f.fields.filter(x=>x.id!==fl.id&&!FieldTypes[x.type]?.layout).map(x=>[fieldKey(x),x.label])].map(([v,l])=>`<option value="${v}" ${fl.visibleIf.field===v?'selected':''}>${esc(l)}</option>`).join('')}</select>
        <select class="inp" data-visif="op">${WorkflowEngine.condOps.map(([v,l])=>`<option value="${v}" ${fl.visibleIf.op===v?'selected':''}>${l}</option>`).join('')}</select>
        <input class="inp full" data-visif="value" value="${esc(fl.visibleIf.value||'')}" placeholder="value"></div>`:''}
    </div>`}
  </div>`;
}
