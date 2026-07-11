/* AU ONE STUDIO · db-tables.js
   Database Engine — Tables list, new-table flow, and the schema-editing host page.
   Deliberately uses its own action names (tbl*) and its own input listener, scoped
   to TBL_EDITING/TBL_SEL, so none of Form Builder's existing router.js cases or
   onGlobalInput handling in router.js are touched by this file.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · TABLES (UI)
   ========================================================================== */
let TBL_EDITING=null;   // table id currently open in the schema editor
let TBL_SEL=null;       // selected column id within that table
let TBL_TAB='schema';   // active editor tab — Phase 4: gives Tables the same
                         // Schema/Settings tab split Forms/Objects already have,
                         // instead of the one untabbed page it had before
const TBL_ACTIONS={add:'tblAddField',sel:'tblSelField',dup:'tblDupField',del:'tblDelField',
  addOpt:'tblAddOpt',delOpt:'tblDelOpt',addCol:'tblAddCol',delCol:'tblDelCol',toggleVis:'tblToggleVis'};

async function renderTables(c){
  const all=await Tables.list();
  /* Objects (kind:'object') live in Object Studio, not here — same underlying
     Tables.create, different guided surface (see object-studio.js) */
  const tables=all.filter(t=>!t.system&&t.kind!=='object');
  const systemTables=all.filter(t=>t.system);
  c.innerHTML=listPageHeader({
    actions:`<button class="btn primary" data-action="newTable">${svg('plus',15)} New table</button>`,
    countLabel:`${tables.length} table(s)`
  })+(tables.length?`<div class="grid cols">${tables.map(tableCard).join('')}</div>`
      :emptyCard('table','No tables yet','Create a table to store structured records — every future ERP module (Construction, Finance, HR…) can define its own tables this way.'))
    +(systemTables.length?`<div class="sectitle" style="margin-top:20px">Built-in (browse only)</div>
      <div class="small muted" style="margin-bottom:10px">Forms and requests keep their own dedicated screens — this just lets you browse the same data through the Database Engine's views.</div>
      <div class="grid cols">${systemTables.map(systemTableCard).join('')}</div>`:'');
}
function tableCard(t){return `<div class="card formcard"><div class="bar" style="background:${t.color}"></div>
  <div class="body"><div class="row"><div class="icon" style="background:${t.color}">${svg(t.icon,22)}</div></div>
  <h3>${esc(t.name)}</h3><div class="small muted">${(t.columns||[]).length} columns · ${(t.relationships||[]).length} relationships</div>
  <div class="row wrap" style="margin-top:12px">
    <button class="btn sm primary" data-action="openTableRecords" data-id="${t.id}">${svg('table',13)} Records</button>
    <button class="btn sm" data-action="editTable" data-id="${t.id}">${svg('pencil',13)} Edit schema</button>
    <button class="btn sm ghost" data-action="deleteTable" data-id="${t.id}">${svg('trash-2',13)}</button>
    <button class="btn sm ghost" data-action="tableMore" data-id="${t.id}">${svg('ellipsis',15)}</button>
  </div></div></div>`;}
/* Phase 4: gives table cards an ellipsis "More" menu — mirroring objectMore/
   formMore's existing modal-grid pattern — so the new contextmenu listener
   (router.js) has something to reach on right-click, matching Objects/Forms. */
async function tableMore(id){
  const t=await Tables.get(id);if(!t)return;
  modal({title:t.name,body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    <button class="btn block" data-action="editTable" data-id="${id}">${svg('pencil',15)} Edit schema</button>
    <button class="btn block" data-action="openTableRecords" data-id="${id}">${svg('table',15)} Records</button>
    <button class="btn block bad" data-action="deleteTable" data-id="${id}">${svg('trash-2',15)} Delete</button></div>`});
}
function systemTableCard(t){return `<div class="card formcard"><div class="bar" style="background:${t.color}"></div>
  <div class="body"><div class="row"><div class="icon" style="background:${t.color}">${svg(t.icon,22)}</div></div>
  <h3>${esc(t.name)}</h3><div class="small muted">Built-in · ${esc(t.collection)}</div>
  <div class="row wrap" style="margin-top:12px">
    <button class="btn sm primary" data-action="openTableRecords" data-id="${t.id}">${svg('table',13)} Records</button>
  </div></div></div>`;}

async function newTable(){
  const t=await Tables.create({name:'Untitled Table',icon:'table',columns:[
    {...makeField('text'),key:'name',label:'Name',required:true}]});
  APP.view='database';TBL_EDITING=t.id;TBL_SEL=null;History.reset();render();
}
async function editTable(id){ APP.view='database';TBL_EDITING=id;TBL_SEL=null;TBL_TAB='schema';History.reset();render(); }
async function deleteTable(id){
  if(!await confirmModal({title:'Delete table?',message:'All its records will be kept in storage but the table will no longer be browsable.',confirmLabel:'Delete table'}))return;
  await Tables.remove(id);render();
}

async function renderTableSchema(c){
  const t=await Tables.get(TBL_EDITING);if(!t){TBL_EDITING=null;return render();}
  const tab=TBL_TAB||'schema';
  c.innerHTML=subEditorHeader({
    breadcrumbParts:[
      {label:'All tables',action:'closeTableSchema'},
      {html:`<div class="field" style="margin:0;max-width:220px"><input class="inp" id="tblNameInput" value="${esc(t.name)}" placeholder="Table name"></div>`},
    ],
    tabs:[['schema','Schema','shapes'],['settings','Settings','settings']],activeTab:tab,tabAction:'tblTab',
    actions:(tab==='schema'?`<button class="iconbtn" id="undoBtn" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${svg('corner-up-left',16)}</button>
      <button class="iconbtn" id="redoBtn" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo">${svg('forward',16)}</button>`:'')
      +`<button class="btn" data-action="openTableRecords" data-id="${t.id}">${svg('table',15)} View records</button>`
  })+`<div id="tblBody"></div>`;
  const nameInput=$('#tblNameInput');
  nameInput.addEventListener('change',async()=>{t.name=nameInput.value.trim()||'Untitled Table';await Store.upsert('tables',t);});
  if(tab==='schema'){await renderTableSchemaTab(t);History._buttons();}
  else renderTableSettingsBody(t);
}
async function renderTableSchemaTab(t){
  $('#tblBody').innerHTML=`<div id="schemaBody"></div><div id="relBody" style="margin-top:20px"></div>`;
  renderTableSchemaBody(t);
  await renderRelationshipsPanel(t);
}
/* Phase 4: gives Tables the same Settings tab Forms/Objects already have —
   reuses renderSettingsBody() exactly like renderBuilderSettings (form-
   settings.js) and renderObjectSettingsBody (object-studio.js) do, rather
   than inventing a fourth copy. No Workflow/Automations tab here: unlike
   Objects, plain Tables intentionally have no approval workflow of their own
   (see object-engine.js) — adding an empty tab for a feature that doesn't
   apply would be the "random popup / inconsistent panel" the brief warns
   against, not a fix for it. */
function renderTableSettingsBody(t){
  renderSettingsBody($('#tblBody'),{
    identityTopHtml:`
      <div class="field"><label>Table name</label><input class="inp" data-prop="name" value="${esc(t.name)}"></div>
      <div class="field"><label>Module</label><select class="inp" data-prop="module">
        <option value="">—</option>${DIR.modules.map(m=>`<option value="${m.id}" ${t.module===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>`,
    icon:{value:t.icon,action:'tblSetIcon'},
    color:{value:t.color,action:'tblSetColor'},
    permissions:{actions:['create','read','update','delete'],toggleAction:'tblTogglePerm',
      note:'Which roles may perform each action. Empty = everyone.',
      current:act=>t.permissions?.[act]||[]},
    dangerHtml:`<button class="btn bad ghost" data-action="deleteTable" data-id="${t.id}">${svg('trash-2',15)} Delete table</button>`
  });
}
async function renderRelationshipsPanel(t){
  const rels=t.relationships||[];
  const allTables=await Tables.list();
  const otherTables=allTables.filter(x=>x.id!==t.id&&!x.system);
  const nameOf=id=>(allTables.find(x=>x.id===id)||{}).name||'(deleted table)';
  const body=$('#relBody');if(!body)return;
  body.innerHTML=`<div class="sectitle">Relationships</div>
    ${rels.length?rels.map(r=>relRow(r,nameOf(r.toTable))).join(''):'<div class="muted small" style="margin-bottom:10px">No relationships yet — link this table to another (e.g. Assets → Maintenance Logs).</div>'}
    <button class="btn sm" data-action="addRelationship" data-tid="${t.id}" ${otherTables.length?'':'disabled'}>${svg('plus',14)} Add relationship</button>
    ${otherTables.length?'':'<div class="tiny muted" style="margin-top:6px">Create another table first.</div>'}`;
}
function relRow(r,targetName){
  return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--stroke)">
    <span class="chip">${svg('workflow',12)} ${esc(r.name||r.type)}</span>
    <span class="small muted">&rarr; ${esc(targetName)} &middot; key "${esc(r.foreignKey)}"</span>
    <span class="sp"></span>
    <button class="btn sm ghost" data-action="deleteRelationship" data-tid="${r.fromTable}" data-id="${r.id}">${svg('x',13)}</button>
  </div>`;
}
async function addRelationshipModal(tableId){
  const t=await Tables.get(tableId);if(!t)return;
  const otherTables=(await Tables.list()).filter(x=>x.id!==t.id&&!x.system);
  if(!otherTables.length)return;
  const body=`<div class="field"><label>Relationship name</label><input class="inp" id="relName" placeholder="e.g. Maintenance logs"></div>
    <div class="field"><label>Linked table</label><select class="inp" id="relTarget">${otherTables.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select></div>
    <div class="field"><label>Foreign key column on the linked table</label>
    <div class="small muted" style="margin-bottom:6px">Add a text column on the linked table (e.g. "asset_id") that stores this record's id, then pick it here.</div>
    <select class="inp" id="relKey"></select></div>`;
  modal({title:'Add relationship',body,footer:`<button class="btn ghost" data-action="closeModal">Cancel</button><button class="btn primary" data-action="doAddRelationship" data-tid="${t.id}">Create</button>`});
  const targetSel=$('#relTarget'),keySel=$('#relKey');
  const fillKeys=async()=>{const tt=await Tables.get(targetSel.value);
    keySel.innerHTML=(tt.columns||[]).filter(c=>!FieldTypes[c.type]?.layout).map(c=>`<option value="${fieldKey(c)}">${esc(c.label)}</option>`).join('')||'<option value="">(no columns yet)</option>';};
  targetSel.addEventListener('change',fillKeys);
  await fillKeys();
}
async function doAddRelationship(tableId){
  const t=await Tables.get(tableId);if(!t)return;
  const name=$('#relName').value.trim()||'Related records';
  const toTable=$('#relTarget').value;
  const foreignKey=$('#relKey').value;
  if(!toTable||!foreignKey)return toast('Pick a linked table and key','warn');
  await Relationships.create(t,{type:'one-to-many',name,toTable,foreignKey});
  closeModal();toast('Relationship added','ok');
  renderRelationshipsPanel(await Tables.get(tableId));
}
async function deleteRelationshipAction(tableId,relId){
  const t=await Tables.get(tableId);if(!t)return;
  await Relationships.remove(t,relId);
  renderRelationshipsPanel(await Tables.get(tableId));
}
function renderTableSchemaBody(t){
  renderSchemaEditor($('#schemaBody'),{columns:t.columns,selectedId:TBL_SEL,actions:TBL_ACTIONS});
  if(t.columns?.length)makeSortable($('#schemaCanvas'),async(from,to)=>{
    const arr=t.columns;arr.splice(to,0,arr.splice(from,1)[0]);await Store.upsert('tables',t);renderTableSchemaBody(t);
  });
}

/* live property edits for the schema editor — scoped to TBL_EDITING, so this never
   fires while APP.editing (Form Builder) is set, and vice versa */
document.addEventListener('input',onTableSchemaInput);
document.addEventListener('change',onTableSchemaInput);
async function onTableSchemaInput(e){
  if(!TBL_EDITING)return;
  const t=e.target;if(!t.dataset)return;
  const table=await Tables.get(TBL_EDITING);if(!table)return;
  if(t.dataset.prop!=null&&TBL_SEL){
    const v=t.type==='checkbox'?t.checked:t.value;
    const fl=table.columns.find(x=>x.id===TBL_SEL);if(!fl)return;
    setPath(fl,t.dataset.prop,v);await Store.upsert('tables',table);
    const row=$(`.fitem[data-fid="${fl.id}"] .t`);if(row&&t.dataset.prop==='label')row.innerHTML=esc(v)+(fl.required?' <span class="req">*</span>':'');
    return;
  }
  if(t.dataset.prop!=null&&!TBL_SEL){
    /* Settings tab — table-level metadata, mirrors onObjectBuilderInput's
       identical else-branch for Object Studio's Settings tab */
    const v=t.type==='checkbox'?t.checked:t.value;
    setPath(table,t.dataset.prop,v);await Store.upsert('tables',table);
    return;
  }
  if(t.dataset.opt!=null&&TBL_SEL){const fl=table.columns.find(x=>x.id===TBL_SEL);const i=+t.dataset.opt;fl.options[i]={label:t.value,value:t.value};await Store.upsert('tables',table);return;}
  if(t.dataset.col!=null&&TBL_SEL){const fl=table.columns.find(x=>x.id===TBL_SEL);const i=+t.dataset.col;fl.columns[i].label=t.value;fl.columns[i].key=t.value.toLowerCase().replace(/\s+/g,'_')||('c'+i);await Store.upsert('tables',table);return;}
  if(t.dataset.visif!=null&&TBL_SEL){const fl=table.columns.find(x=>x.id===TBL_SEL);if(fl){fl.visibleIf=fl.visibleIf||{field:'',op:'eq',value:''};fl.visibleIf[t.dataset.visif]=t.value;await Store.upsert('tables',table);}return;}
}
