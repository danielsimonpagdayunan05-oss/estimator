/* AU ONE STUDIO · object-studio.js
   OBJECT STUDIO — the guided, business-user-facing surface for creating Business
   Objects (Purchase Request, Equipment, Supplier, Project, …). An Object IS a
   `tables` record (kind:'object') — see object-engine.js — so this file is UI
   only: Objects list + lifecycle actions, and a 4-tab editor (Schema/Workflow/
   Automations/Settings) that reuses the exact same renderers the Database Tables
   screen and Form Builder already use (renderSchemaEditor, renderWorkflowCanvas,
   renderRulesEditor) — zero duplicated markup.

   Fully self-contained, mirroring db-tables.js's isolation: its own state
   (OBJ_EDITING/OBJ_SEL/OBJ_TAB), its own action-name maps, its own input
   listener gated on OBJ_EDITING. Never touches onGlobalInput (gated on
   APP.editing, which stays null throughout Object Studio) or TBL_EDITING.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   OBJECT STUDIO (UI)
   ========================================================================== */
let OBJ_EDITING=null;   // object id currently open in the editor
let OBJ_SEL=null;       // selected column id (Schema tab)
let OBJ_TAB='schema';   // active editor tab
const OBJ_SCHEMA_ACTIONS={add:'objAddField',sel:'objSelField',dup:'objDupField',del:'objDelField',
  addOpt:'objAddOpt',delOpt:'objDelOpt',addCol:'objAddCol',delCol:'objDelCol',toggleVis:'objToggleVis'};
const OBJ_WF_ACTIONS={addMode:'objAddStepMode',addAt:'objAddStepAt',move:'objMoveStep',del:'objDelStep',
  toggleCond:'objToggleCond',rulesTab:'objTab'};
const OBJ_AUTO_ACTIONS={add:'objAddAuto',del:'objDelAuto'};

/* ---------- Objects list ---------- */
async function renderObjectsList(c){
  const objs=await Objects.list();
  c.innerHTML=listPageHeader({
    actions:`<button class="btn primary" data-action="newObjectModal">${svg('plus',15)} New Object</button>`,
    countLabel:`${objs.length} object(s)`
  })+(objs.length?`<div class="grid cols">${objs.map(objectCard).join('')}</div>`
      :emptyCard('package','No Objects yet','Create a Business Object — Material Request, Equipment, Supplier, Project — and get a Table, Form, Views, Approval Workflow, Timeline and Permissions automatically.'));
}
function objectCard(o){
  const stepCount=(o.workflow?.steps||[]).length;
  return `<div class="card formcard"><div class="bar" style="background:${o.color}"></div>
    <div class="body"><div class="row"><div class="icon" style="background:${o.color}">${svg(o.icon,22)}</div><span class="sp"></span>
      <button class="iconbtn" style="width:32px;height:32px;${o.favorite?'color:#f59e0b':''}" data-action="objToggleFav" data-id="${o.id}" title="Favorite" aria-label="${o.favorite?'Remove from favorites':'Add to favorites'}">${svg('star',15)}</button>
      <span class="status ${o.status}">${o.status}</span></div>
    <h3>${esc(o.name)}</h3><div class="small muted">${esc(o.description||o.category||'No description')}</div>
    <div class="meta"><span class="chip">${svg('shapes',13)} ${esc(o.module||'—')}</span>
      ${stepCount?`<span class="chip">${svg('workflow',13)} ${stepCount} step(s)</span>`:`<span class="chip">${svg('ban',13)} No workflow</span>`}
      <span class="chip">${(o.columns||[]).length} fields</span></div>
    <div class="row wrap" style="margin-top:12px">
      <button class="btn sm primary" data-action="editObject" data-id="${o.id}">${svg('pencil',13)} Edit</button>
      <button class="btn sm ok" data-action="openTableRecords" data-id="${o.id}">${svg('table',13)} Records</button>
      <button class="btn sm" data-action="dupObject" data-id="${o.id}">${svg('copy',13)} Duplicate</button>
      <button class="btn sm ghost" data-action="objectMore" data-id="${o.id}">${svg('ellipsis',15)}</button>
    </div></div></div>`;
}
async function objectMore(id){
  const o=await Objects.get(id);if(!o)return;
  modal({title:o.name,body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    <button class="btn block" data-action="editObject" data-id="${id}">${svg('pencil',15)} Edit</button>
    <button class="btn block" data-action="dupObject" data-id="${id}">${svg('copy',15)} Duplicate</button>
    <button class="btn block" data-action="exportObject" data-id="${id}">${svg('download',15)} Export</button>
    <button class="btn block ${o.status==='archived'?'':'ghost'}" data-action="setObjectStatus" data-id="${id}" data-s="${o.status==='archived'?'draft':'archived'}">${svg('archive',15)} ${o.status==='archived'?'Unarchive':'Archive'}</button>
    <button class="btn block bad" data-action="deleteObject" data-id="${id}">${svg('trash-2',15)} Delete</button></div>`});
}

/* ---------- New Object ---------- */
function newObjectModal(){
  modal({title:'New Object',body:`
    <div class="row" style="gap:10px;margin-bottom:12px"><div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;display:grid;place-items:center;flex:none">${svg('package',20)}</div>
      <div class="small muted">A Business Object gets a Table, a Form, Views, an Approval Workflow, Timeline, Comments and Permissions automatically — nothing to assemble by hand.</div></div>
    <div class="field"><label>Object name</label><input class="inp" id="objName" placeholder="e.g. Purchase Request"></div>
    <div class="field"><label>Plural name</label><input class="inp" id="objPlural" placeholder="e.g. Purchase Requests"></div>
    <div class="f2">
      <div class="field" style="margin:0"><label>Module</label><select class="inp" id="objModule">${DIR.modules.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field" style="margin:0"><label>Category</label><input class="inp" id="objCategory" placeholder="e.g. Procurement"></div>
    </div>`,
    footer:`<button class="btn ghost" data-action="closeModal">Cancel</button><button class="btn primary" data-action="doNewObject">${svg('sparkles',15)} Create Object</button>`});
  setTimeout(()=>{const el=$('#objName');if(el)el.focus();},60);
}
async function doNewObject(){
  const name=($('#objName').value||'').trim();
  if(!name)return toast('Name your object first','warn');
  const obj=await Objects.create({name,pluralName:($('#objPlural').value||'').trim(),
    module:$('#objModule').value,category:($('#objCategory').value||'').trim()});
  closeModal();
  APP.view='objects';OBJ_EDITING=obj.id;OBJ_SEL=null;OBJ_TAB='schema';History.reset();
  toast(`"${obj.name}" created — schema, form, views, workflow, timeline and permissions ready`,'ok');
  render();
}
async function editObject(id){ APP.view='objects';OBJ_EDITING=id;OBJ_SEL=null;OBJ_TAB='schema';History.reset();render(); }
async function closeObjectEditor(){ OBJ_EDITING=null;render(); }
async function dupObject(id){
  const c=await Objects.duplicate(id);
  toast(`Duplicated as "${c.name}"`,'ok');render();
}
async function deleteObject(id){
  if(!confirm('Delete this object? Its records will be kept in storage but the object will no longer be browsable.'))return;
  await Objects.remove(id);OBJ_EDITING=null;closeModal();toast('Object deleted');render();
}
async function setObjectStatus(id,status){
  const o=await Objects.setStatus(id,status);
  toast('Status: '+o.status,'ok');render();
}
async function toggleObjectFav(id){ await Objects.toggleFavorite(id);render(); }
function exportObject(id){
  Objects.get(id).then(o=>{
    if(!o)return;
    const blob=new Blob([JSON.stringify(Objects.export(o),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');
    link.href=url;link.download=(o.name||'object').toLowerCase().replace(/\s+/g,'-')+'.json';link.click();
  });
}

/* ---------- Object editor (4 tabs) ---------- */
async function renderObjectEditor(c){
  const o=await Objects.get(OBJ_EDITING);if(!o){OBJ_EDITING=null;return render();}
  const tab=OBJ_TAB||'schema';
  c.innerHTML=subEditorHeader({
    breadcrumbParts:[
      {label:'All objects',action:'closeObjectEditor'},
      {html:`<span class="icon" style="width:28px;height:28px;background:${o.color}">${svg(o.icon,16)}</span><b>${esc(o.name)}</b>`},
    ],
    tabs:[['schema','Schema','shapes'],['workflow','Workflow','workflow'],['rules','Automations','wrench'],['settings','Settings','settings']],
    activeTab:tab,tabAction:'objTab',
    actions:(tab==='schema'?`<button class="iconbtn" id="undoBtn" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${svg('corner-up-left',16)}</button>
      <button class="iconbtn" id="redoBtn" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo">${svg('forward',16)}</button>`:'')
      +`<span class="status ${o.status}">${o.status}</span>`
      +(o.status==='published'?`<button class="btn" data-action="setObjectStatus" data-id="${o.id}" data-s="draft">${svg('archive',15)} Unpublish</button>`
        :`<button class="btn primary" data-action="setObjectStatus" data-id="${o.id}" data-s="published">${svg('send',15)} Publish</button>`)
      +(o.status==='published'?`<button class="btn ok" data-action="openTableRecords" data-id="${o.id}">${svg('table',15)} Records</button>`:'')
  })+`<div id="objBody"></div>`;
  if(tab==='schema'){renderObjectSchemaBody(o);History._buttons();}
  else if(tab==='workflow')renderObjectWorkflowBody(o);
  else if(tab==='rules')renderObjectRulesBody(o);
  else renderObjectSettingsBody(o);
}
function renderObjectSchemaBody(o){
  renderSchemaEditor($('#objBody'),{columns:o.columns,selectedId:OBJ_SEL,actions:OBJ_SCHEMA_ACTIONS});
  if(o.columns?.length)makeSortable($('#schemaCanvas'),async(from,to)=>{
    const arr=o.columns;arr.splice(to,0,arr.splice(from,1)[0]);await Store.upsert('tables',o);renderObjectSchemaBody(o);
  });
}
function renderObjectWorkflowBody(o){
  o.workflow=o.workflow||{steps:[]};
  renderWorkflowCanvas($('#objBody'),{steps:o.workflow.steps,fields:o.columns||[],
    automationsCount:(o.automations||[]).length,actions:OBJ_WF_ACTIONS});
}
function renderObjectRulesBody(o){
  o.automations=o.automations||[];
  renderRulesEditor($('#objBody'),{automations:o.automations,actions:OBJ_AUTO_ACTIONS});
}
function renderObjectSettingsBody(o){
  renderSettingsBody($('#objBody'),{
    identityTopHtml:`
      <div class="field"><label>Object name</label><input class="inp" data-prop="name" value="${esc(o.name)}"></div>
      <div class="field"><label>Plural name</label><input class="inp" data-prop="pluralName" value="${esc(o.pluralName||'')}"></div>
      <div class="field"><label>Description</label><textarea class="inp" data-prop="description">${esc(o.description||'')}</textarea></div>`,
    icon:{value:o.icon,action:'objSetIcon'},
    color:{value:o.color,action:'objSetColor'},
    identityBottomHtml:`<div class="f2">
      <div class="field"><label>Module</label><select class="inp" data-prop="module">${DIR.modules.map(m=>`<option value="${m.id}" ${o.module===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Category</label><input class="inp" data-prop="category" value="${esc(o.category||'')}"></div>
      <div class="field"><label>Tags (comma separated)</label><input class="inp" data-prop="tagsText" value="${esc((o.tags||[]).join(', '))}"></div>
      <div class="field"><label>Version</label><input class="inp" data-prop="version" value="${o.version||1}"></div>
    </div>`,
    permissions:{actions:['create','read','update','delete'],toggleAction:'objTogglePerm',
      note:"Which roles may perform each action. Empty = everyone. Approval authority is defined by the Workflow tab's steps, not here.",
      current:act=>o.permissions?.[act]||[]},
    dangerHtml:`<div class="row wrap"><button class="btn" data-action="exportObject" data-id="${o.id}">${svg('download',15)} Export</button>
      <button class="btn bad ghost" data-action="deleteObject" data-id="${o.id}">${svg('trash-2',15)} Delete object</button></div>`
  });
}

/* live property edits — scoped to OBJ_EDITING, mirrors onTableSchemaInput
   (Schema tab) extended with Workflow/Automations/Settings, and mirrors
   onGlobalInput's data-prop dual-purpose (column-level when OBJ_SEL is active
   on the Schema tab, object-level metadata otherwise) */
document.addEventListener('input',onObjectBuilderInput);
document.addEventListener('change',onObjectBuilderInput);
async function onObjectBuilderInput(e){
  if(!OBJ_EDITING)return;
  const t=e.target;if(!t.dataset)return;
  const o=await Objects.get(OBJ_EDITING);if(!o)return;

  if(t.dataset.prop!=null){
    let v=t.type==='checkbox'?t.checked:t.value;
    if(OBJ_SEL&&OBJ_TAB==='schema'){
      const fl=o.columns.find(x=>x.id===OBJ_SEL);if(fl){setPath(fl,t.dataset.prop,v);await Store.upsert('tables',o);
        const row=$(`.fitem[data-fid="${fl.id}"] .t`);if(row&&t.dataset.prop==='label')row.innerHTML=esc(v)+(fl.required?' <span class="req">*</span>':'');}
    }else{
      if(t.dataset.prop==='tagsText'){o.tags=v.split(',').map(s=>s.trim()).filter(Boolean);}
      else setPath(o,t.dataset.prop,v);
      await Store.upsert('tables',o);
    }
    return;
  }
  if(t.dataset.visif!=null&&OBJ_SEL){const fl=o.columns.find(x=>x.id===OBJ_SEL);if(fl){fl.visibleIf=fl.visibleIf||{field:'',op:'eq',value:''};fl.visibleIf[t.dataset.visif]=t.value;await Store.upsert('tables',o);}return;}
  if(t.dataset.opt!=null&&OBJ_SEL){const fl=o.columns.find(x=>x.id===OBJ_SEL);const i=+t.dataset.opt;fl.options[i]={label:t.value,value:t.value};await Store.upsert('tables',o);return;}
  if(t.dataset.col!=null&&OBJ_SEL){const fl=o.columns.find(x=>x.id===OBJ_SEL);const i=+t.dataset.col;fl.columns[i].label=t.value;fl.columns[i].key=t.value.toLowerCase().replace(/\s+/g,'_')||('c'+i);await Store.upsert('tables',o);return;}
  if(t.dataset.step!=null){const s=(o.workflow.steps||[]).find(x=>x.id===t.dataset.step);if(!s)return;
    if(t.dataset.sp!=null){s[t.dataset.sp]=t.value;if(t.dataset.sp==='approverType'){await Store.upsert('tables',o);renderObjectWorkflowBody(o);return;}}
    if(t.dataset.cond!=null){s.condition=s.condition||{field:'',op:'gt',value:''};s.condition[t.dataset.cond]=t.value;}
    await Store.upsert('tables',o);return;}
  if(t.dataset.auto!=null){const i=+t.dataset.auto;o.automations=o.automations||[];const rule=o.automations[i];if(!rule)return;
    rule[t.dataset.ap]=t.value;await Store.upsert('tables',o);if(t.dataset.ap==='do')renderObjectRulesBody(o);return;}
}
