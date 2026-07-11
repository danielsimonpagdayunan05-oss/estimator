/* AU ONE STUDIO · form-builder.js
   Form list, drag builder, inspector, automation rules
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function renderForms(c){
  const forms=(await Store.list('forms')).filter(f=>!f.isTemplate);
  c.innerHTML=listPageHeader({
    actions:`<button class="btn primary" data-action="aiNew">${svg('sparkles',15)} Create with AI</button>
      <button class="btn" data-action="newForm">${svg('plus',15)} Blank form</button>`,
    countLabel:`${forms.length} form(s)`
  })+(forms.length?`<div class="grid cols">${forms.map(formCard).join('')}</div>`
      :emptyCard('layout-template','No forms yet','Click “Create Form” to build one with drag-and-drop, or start from a template.'));
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

/* ---------- AI: describe-to-generate ---------- */
function openAIModal(){
  const examples=['Create a Material Request form','Purchase request over ₱100k needs CEO','QA inspection checklist','Leave request','Variation order','Petty cash request'];
  modal({title:'Create with AI',body:`
    <div class="row" style="gap:10px;margin-bottom:12px"><div style="width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,var(--brand),var(--brand2));color:#fff;display:grid;place-items:center;flex:none">${svg('sparkles',20)}</div>
      <div class="small muted">Describe the form you need in plain language. AU One Studio generates the fields, validation, approval workflow and automations — all fully editable afterward.</div></div>
    <textarea class="inp" id="aiPrompt" placeholder="e.g. Create a Material Request form for site deliveries" style="min-height:96px"></textarea>
    <div class="small muted" style="margin:12px 2px 6px;font-weight:700">Try one of these</div>
    <div class="row wrap" style="gap:6px">${examples.map(x=>`<button class="chip" data-action="aiExample" data-x="${esc(x)}">${svg('sparkles',12)} ${esc(x)}</button>`).join('')}</div>`,
    footer:`<button class="btn ghost" data-action="closeModal">Cancel</button><button class="btn primary" data-action="aiGenerate">${svg('sparkles',15)} Generate form</button>`});
  setTimeout(()=>{const el=$('#aiPrompt');if(el)el.focus();},60);
}
async function aiGenerate(){
  const el=$('#aiPrompt');const prompt=(el?el.value:'').trim();
  if(!prompt){toast('Describe the form first','warn');return;}
  const form=await AI.generateForm(prompt);
  await Store.upsert('forms',form);
  Bus.emit('form:generated',form);
  closeModal();
  APP.view='forms';APP.editing=form.id;APP.builderTab='fields';BUILDER_SEL=null;History.reset();
  toast(`Generated "${form.name}" — ${form.fields.length} fields, ${form.workflow.steps.length} steps`,'ok');
  render();
}

async function newForm(){
  const f={id:uid('form'),name:'Untitled Form',description:'',icon:'file-text',color:'#4f46e5',
    department:DIR.departments[0]?.id||'',module:DIR.modules[0]?.id||'',category:'General',
    version:1,status:'draft',isTemplate:false,fields:[],
    workflow:{steps:[{id:uid('s'),name:'Supervisor',approverType:'role',role:'Supervisor',mode:'sequential',condition:null,slaHours:24}]},
    permissions:{create:['*'],submit:['*'],edit:['*'],approve:['*'],delete:['*'],archive:['*']}};
  await Store.upsert('forms',f);APP.editing=f.id;APP.builderTab='fields';History.reset();render();
}

/* ---------- FORM BUILDER ---------- */
let BUILDER_SEL=null;
/* ---- Undo/redo history — auto-detects which editor is active (Form Builder's
   APP.editing/.fields, Object Studio's OBJ_EDITING/.columns, or Database's Table
   Schema TBL_EDITING/.columns) so one stack works for all three instead of each
   screen reimplementing its own. Unkeyed (no editing-id set) resolves to null —
   snap()/undo()/redo() all no-op, exactly as before Form Builder was the only
   possible caller. Phase 4: deliberate expansion — Object Studio's Schema tab
   and Table Schema now get real Undo/Redo, closing the gap where two
   structurally-identical schema editors (both reuse renderSchemaEditor) had
   Undo/Redo on only one of them. */
const History={u:[],r:[],max:60,
  /* scoped by APP.view, not just by which editing-id happens to be truthy —
     OBJ_EDITING/TBL_EDITING are never cleared on plain navigation (only their
     own close/edit actions touch them), so after editing an Object then
     navigating to Database without explicitly closing it, OBJ_EDITING is still
     stale-truthy. Gating on APP.view too means a stale global from a screen
     you're no longer on can never shadow the one you're actually editing. */
  _ctx(){
    if(APP.view==='forms'&&APP.editing)return{collection:'forms',id:APP.editing,columnsKey:'fields'};
    if(APP.view==='objects'&&typeof OBJ_EDITING!=='undefined'&&OBJ_EDITING)return{collection:'tables',id:OBJ_EDITING,columnsKey:'columns'};
    if(APP.view==='database'&&typeof TBL_EDITING!=='undefined'&&TBL_EDITING)return{collection:'tables',id:TBL_EDITING,columnsKey:'columns'};
    return null;
  },
  _snap(e,ctx){return JSON.stringify({cols:e[ctx.columnsKey],workflow:e.workflow,permissions:e.permissions});},
  async snap(){
    const ctx=this._ctx();if(!ctx)return;
    const e=await Store.get(ctx.collection,ctx.id);if(!e)return;
    this.u.push(this._snap(e,ctx));if(this.u.length>this.max)this.u.shift();this.r=[];this._buttons();
  },
  reset(){this.u=[];this.r=[];this._buttons();},
  _buttons(){const u=$('#undoBtn'),r=$('#redoBtn');if(u)u.disabled=!this.u.length;if(r)r.disabled=!this.r.length;},
  async _apply(json,ctx){const e=await Store.get(ctx.collection,ctx.id);if(!e)return;const s=JSON.parse(json);
    e[ctx.columnsKey]=s.cols;e.workflow=s.workflow;e.permissions=s.permissions;await Store.upsert(ctx.collection,e);render();},
  async undo(){const ctx=this._ctx();if(!ctx)return;
    if(!this.u.length){toast('Nothing to undo','');return;}const e=await Store.get(ctx.collection,ctx.id);
    this.r.push(this._snap(e,ctx));await this._apply(this.u.pop(),ctx);toast('Undo','');},
  async redo(){const ctx=this._ctx();if(!ctx)return;
    if(!this.r.length){toast('Nothing to redo','');return;}const e=await Store.get(ctx.collection,ctx.id);
    this.u.push(this._snap(e,ctx));await this._apply(this.r.pop(),ctx);toast('Redo','');}
};
async function renderBuilder(c){
  const f=await Store.get('forms',APP.editing);if(!f){APP.editing=null;return render();}
  const tab=APP.builderTab||'fields';
  c.innerHTML=subEditorHeader({
    backAction:'closeBuilder',backLabel:'All forms',
    entityNameHtml:`<span class="icon" style="width:28px;height:28px;background:${f.color}">${svg(f.icon,16)}</span><b>${esc(f.name)}</b>`,
    tabs:[['fields','Fields','shapes'],['workflow','Workflow','workflow'],['rules','Automations','wrench'],['settings','Settings','settings']],
    activeTab:tab,tabAction:'btab',
    actions:(tab==='fields'?`<button class="iconbtn" id="undoBtn" data-action="undo" title="Undo (Ctrl+Z)" aria-label="Undo">${svg('corner-up-left',16)}</button>
      <button class="iconbtn" id="redoBtn" data-action="redo" title="Redo (Ctrl+Y)" aria-label="Redo">${svg('forward',16)}</button>`:'')
      +`<span class="status ${f.status}">${f.status}</span>`
      +(f.status==='published'?`<button class="btn" data-action="setStatus" data-s="draft">${svg('archive',15)} Unpublish</button>`
        :`<button class="btn primary" data-action="setStatus" data-s="published">${svg('send',15)} Publish</button>`)
      +(f.status==='published'?`<button class="btn ok" data-action="useForm" data-id="${f.id}">${svg('eye',15)} Preview / Submit</button>`:'')
  })+`<div id="builderBody"></div>`;
  if(tab==='fields'){renderBuilderFields(f);History._buttons();}
  else if(tab==='workflow')renderBuilderWorkflow(f);
  else if(tab==='rules')renderBuilderRules(f);
  else renderBuilderSettings(f);
}

/* ---------- AUTOMATION ENGINE (no-code rules per form) ---------- */
const AUTO_TRIGGERS=[['submit','When submitted'],['approve','When a step is approved'],['final','When fully approved'],['reject','When rejected']];
const AUTO_ACTIONS=[['notify','Notify a role'],['comment','Add a system comment'],['archive','Archive the form after N approvals'],['tag','Set a status tag']];
const AUTO_DEFAULT_ACTIONS={add:'addAuto',del:'delAuto'};
/* data-agnostic — Object Studio's Automations tab reuses this for Objects the
   same way it reuses renderWorkflowCanvas; only the click-action names vary. */
function renderRulesEditor(mountEl,{automations,actions}){
  const A=Object.assign({},AUTO_DEFAULT_ACTIONS,actions||{});
  const autos=automations||[];
  const roleOpts=DIR.roles.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('');
  mountEl.innerHTML=`<div style="max-width:720px">
    <div class="card pad" style="margin-bottom:12px"><div class="small muted">No-code automations. Each rule runs on a workflow event. Example: <b>When fully approved → Notify Finance</b>, or <b>When submitted → Add a system comment</b>. More actions (webhook, generate PO, e-mail) plug in through the same engine later.</div></div>
    ${autos.map((a,i)=>`<div class="card pad" style="margin-bottom:10px"><div class="row" style="margin-bottom:8px"><b class="small">Rule ${i+1}</b><span class="sp"></span><button class="btn sm ghost" data-action="${A.del}" data-i="${i}">${svg('trash-2',14)}</button></div>
      <div class="f2">
        <div class="field" style="margin:0"><label>Trigger</label><select class="inp" data-auto="${i}" data-ap="on">${AUTO_TRIGGERS.map(([v,l])=>`<option value="${v}" ${a.on===v?'selected':''}>${l}</option>`).join('')}</select></div>
        <div class="field" style="margin:0"><label>Action</label><select class="inp" data-auto="${i}" data-ap="do">${AUTO_ACTIONS.map(([v,l])=>`<option value="${v}" ${a.do===v?'selected':''}>${l}</option>`).join('')}</select></div>
        ${a.do==='notify'?`<div class="field" style="margin:0"><label>Notify role</label><select class="inp" data-auto="${i}" data-ap="role">${roleOpts.replace(`value="${a.role}"`,`value="${a.role}" selected`)}</select></div>`:''}
        ${a.do==='comment'||a.do==='tag'?`<div class="field" style="margin:0"><label>${a.do==='tag'?'Tag':'Text'}</label><input class="inp" data-auto="${i}" data-ap="text" value="${esc(a.text||'')}"></div>`:''}
      </div></div>`).join('')||'<div class="empty">No automation rules yet.</div>'}
    <button class="btn primary" data-action="${A.add}">${svg('plus',15)} Add rule</button>
  </div>`;
}
function renderBuilderRules(f){
  f.automations=f.automations||[];
  renderRulesEditor($('#builderBody'),{automations:f.automations,actions:AUTO_DEFAULT_ACTIONS});
}

/* thin wrapper over the Database Engine's generic table-schema-editor.js — a
   form's fields ARE a table's columns (both are FieldTypes/makeField/fieldKey
   instances), so this reuses the exact same palette/canvas/inspector renderer
   the Database "Tables" screen uses, instead of hand-building the same markup
   twice. Default action names (addField/selField/dupField/delField/...) match
   what router.js's existing form-builder cases already consume unchanged. */
function renderBuilderFields(f){
  renderSchemaEditor($('#builderBody'),{columns:f.fields||[],selectedId:BUILDER_SEL});
  if(f.fields?.length)makeSortable($('#schemaCanvas'),async(from,to)=>{
    const arr=f.fields;arr.splice(to,0,arr.splice(from,1)[0]);await Store.upsert('forms',f);renderBuilderFields(f);
  });
}
