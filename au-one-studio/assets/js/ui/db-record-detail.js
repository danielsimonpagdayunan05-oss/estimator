/* AU ONE STUDIO · db-record-detail.js
   Database Engine — generic record create/edit modal + detail (timeline/comments),
   generalizing the pattern already proven by request-detail.js's approval chain
   without duplicating it (reuses renderApprovalChain from request-detail.js).
   Reuses submit-form.js's previewInput() for every column type except formula/
   calculated (which use the new Formula engine, not FormEngine.evalExpression) —
   and owns its OWN input wiring (RECORD_STATE) rather than reusing SUBMIT_STATE,
   since record editing is a distinct concern from form submission and the two
   must never cross-contaminate each other's modal state.

   Object Studio integration (Phase 3): when the table/Object has a workflow
   (Objects.hasWorkflow), new records route through ObjectApproval.submit instead
   of plain Records.create, and once a record carries `.steps` (proof it went
   through approval), the modal shows the approval chain + approve/reject/return
   actions gated by Permission.isApproverFor — mirroring request-detail.js's
   openReq exactly, generalized to any table. Plain tables/Objects without a
   workflow are completely unaffected: Records.create/update paths are untouched.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · RECORD DETAIL (UI)
   ========================================================================== */
let RECORD_STATE=null;

async function newRecord(tableId){
  const t=await Tables.get(tableId);if(!t)return;
  if(t.system)return; // system tables (Forms/Requests/…) are browse-only here — use their dedicated screens to create
  if(!DBPermission.canTable(t,'create'))return toast('Your role cannot create records in this table','bad');
  const values={};(t.columns||[]).forEach(fl=>{if(!FieldTypes[fl.type]?.layout)
    values[fieldKey(fl)]=(fl.defaultValue!=null&&fl.defaultValue!=='')?fl.defaultValue:clone(FieldTypes[fl.type].value);});
  RECORD_STATE={table:t,values,errors:{},isNew:true};
  await drawRecordModal();
}
async function openRecord(tableId,recordId){
  const t=await Tables.get(tableId);if(!t)return;
  const rec=await Records.get(t,recordId);if(!rec)return;
  RECORD_STATE={table:t,record:rec,values:clone(rec),errors:{},isNew:false};
  await drawRecordModal();
}
async function drawRecordModal(){
  const {table,values,errors,record,isNew}=RECORD_STATE;
  const readOnly=!!table.system; // Forms/Requests/… are browsed here, not edited — their own screens own writes
  const objHasWorkflow=Objects.hasWorkflow(table);
  const hasChain=!isNew&&Array.isArray(record.steps); // this record has already been through approval
  const isOwner=!isNew&&record.submittedBy===APP.user.id;
  const canAct=hasChain&&['pending','inprogress'].includes(record.status)&&Permission.isApproverFor(record.steps[record.currentStep]);
  const canEdit=!readOnly&&(!hasChain||(isOwner&&['returned','revision'].includes(record.status)));
  const fieldsHtml=(table.columns||[]).filter(fl=>fl.type!=='hidden').map(fl=>recordFieldHtml(fl,values,errors,!canEdit)).join('');
  const body=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">${fieldsHtml}</div>`
    +(hasChain?`<div class="sectitle" style="margin-top:6px">Approval chain</div>${renderApprovalChain(record.steps,record.currentStep,record.status)}`:'')
    +(!isNew?await recordRelationshipsHtml(table,record):'')
    +(!isNew?recordActivityHtml(record,readOnly):'');
  const canDelete=!readOnly&&!isNew&&!hasChain&&DBPermission.canRecord(table,record,'delete');

  let footer;
  if(readOnly){
    footer=`<button class="btn ghost" data-action="closeModal">Close</button>`;
  }else if(canEdit){
    const label=isNew?(objHasWorkflow?'Submit for approval':'Create record'):(hasChain?'Save & resubmit':'Save changes');
    footer=`<button class="btn ghost" data-action="closeModal">Cancel</button>
      ${canDelete?`<button class="btn bad ghost" data-action="deleteRecord" data-tid="${table.id}" data-id="${record?record.id:''}">${svg('trash-2',14)} Delete</button>`:''}
      <button class="btn primary" data-action="saveRecord">${label}</button>`;
  }else{
    footer=recordApprovalFooter({
      canAct,isOwner,status:record.status,
      idAttrs:`data-tid="${table.id}" data-id="${record.id}"`,
      moreAction:'objMore',actAction:'objAct',entityNoun:'record'
    });
  }
  modal({title:isNew?'New '+table.name.replace(/s$/,''):esc(Tables.summarize(table,record).title),body,footer,wide:true});
  if(canEdit)wireRecordInputs();
}
function recordFieldHtml(fl,values,errors,readOnly){
  const d=FieldTypes[fl.type];const key=fieldKey(fl);const err=errors[fl.id];
  const wide=fl.width!=='half';
  if(d.layout){
    const inner=fl.type==='divider'?'<hr style="border:0;border-top:1px solid var(--stroke);margin:6px 0">'
      :fl.type==='heading'?`<h3 style="margin:10px 0 2px;font-size:16px">${esc(fl.label)}</h3>`
      :`<div class="small muted" style="margin-bottom:8px">${esc(fl.label)}</div>`;
    return `<div style="${wide?'grid-column:1/-1':''}">${inner}</div>`;
  }
  const input=(fl.type==='formula'||fl.type==='calculated')
    ?`<div class="inp mono" style="background:var(--glass2);font-weight:700">${Formula.evaluate(fl.expression,values)}</div>`
    :previewInput(fl,values[key],readOnly);
  return `<div class="field ${wide?'full':'half'}"><label>${esc(fl.label)}${fl.required?' <span class="req">*</span>':''}</label>
    ${fl.help?`<div class="help">${esc(fl.help)}</div>`:''}${input}
    ${err?`<div class="errmsg">${err}</div>`:''}</div>`;
}
/* linked records + a live rollup preview (SUM/COUNT of the first numeric column
   on the linked table) — proves Relationships.linked/rollupValue end-to-end
   without needing a full rollup-column authoring UI in this pass */
async function recordRelationshipsHtml(table,record){
  const rels=table.relationships||[];
  if(!rels.length)return '';
  const sections=await Promise.all(rels.map(async rel=>{
    const toTable=await Tables.get(rel.toTable);if(!toTable)return '';
    const linked=await Relationships.linked(rel,record);
    const numCol=(toTable.columns||[]).find(c=>c.type==='number'||c.type==='currency');
    const rollup=numCol?await Relationships.rollupValue(rel,record,{fn:'SUM',column:fieldKey(numCol)}):null;
    return `<div class="sectitle">${esc(rel.name||'Linked records')} (${linked.length})${numCol?` &middot; SUM ${esc(numCol.label)}: ${numCol.type==='currency'?peso(rollup):esc(rollup)}`:''}</div>
      ${linked.length?linked.slice(0,10).map(r=>`<div class="row" style="padding:5px 0;cursor:pointer" data-action="openRecord" data-tid="${toTable.id}" data-id="${r.id}">
        <span style="color:${toTable.color};display:inline-flex">${svg(toTable.icon,14)}</span>${esc(Tables.summarize(toTable,r).title)}</div>`).join('')
      :'<div class="muted small">None yet.</div>'}`;
  }));
  return sections.join('');
}
function recordActivityHtml(record,readOnly){
  const timeline=(record.timeline||[]).slice().reverse();
  return (readOnly?'':commentComposerHtml(record,'addRecordComment'))
    +`<div class="sectitle">Activity</div>
    <div class="tl">${timeline.map(ev=>
      `<div class="ev"><div class="mk">•</div><div class="t">${esc(ev.text||ev.type)}</div><div class="m">${esc(ev.by)} · ${ago(ev.at)}</div></div>`).join('')||'<div class="muted small">No activity yet.</div>'}</div>`;
}

/* wiring for live record inputs — mirrors submit-form.js's pattern but targets
   RECORD_STATE, never SUBMIT_STATE, so a record edit can never corrupt an
   in-progress form submission (or vice versa) */
function wireRecordInputs(){
  const root=$('#modalRoot');
  root.addEventListener('input',onRecordInput);
  root.addEventListener('change',onRecordInput);
  root.addEventListener('click',onRecordChoiceClick);
}
function onRecordInput(e){
  const t=e.target;const S=RECORD_STATE;if(!S)return;
  if(t.dataset.bind!=null){let v=t.type==='checkbox'?t.checked:t.value;S.values[t.dataset.bind]=v;}
  else if(t.dataset.choice!=null){S.values[t.dataset.choice]=t.dataset.v;}
  else if(t.dataset.multi!=null){const key=t.dataset.multi;const arr=Array.isArray(S.values[key])?S.values[key]:[];
    const val=t.dataset.v;if(t.checked){if(!arr.includes(val))arr.push(val);}else{const i=arr.indexOf(val);if(i>=0)arr.splice(i,1);}S.values[key]=arr;}
  else if(t.dataset.rrow!=null){const wrap=t.closest('[data-repeat]');const key=wrap.dataset.repeat;
    const arr=Array.isArray(S.values[key])?S.values[key]:[];const ri=+t.dataset.rrow;arr[ri]=arr[ri]||{};arr[ri][t.dataset.rcol]=t.value;S.values[key]=arr;}
  else if(t.dataset.upload!=null){const file=t.files[0];if(file){const rd=new FileReader();rd.onload=()=>{S.values[t.dataset.upload]=rd.result;drawRecordModal();};rd.readAsDataURL(file);}}
}
function onRecordChoiceClick(e){
  const S=RECORD_STATE;if(!S)return;
  const btn=e.target.closest('button[data-choice]');
  if(btn){S.values[btn.dataset.choice]=btn.dataset.v;drawRecordModal();return;}
  const star=e.target.closest('[data-n]');
  if(star){const wrap=star.closest('[data-rating]');if(wrap){S.values[wrap.dataset.rating]=+star.dataset.n;drawRecordModal();}}
}

async function saveRecord(){
  const S=RECORD_STATE;if(!S)return;
  const errors={};
  (S.table.columns||[]).forEach(f=>{const e=Validation.field(f,S.values[fieldKey(f)]);if(e)errors[f.id]=e;});
  S.errors=errors;
  if(Object.keys(errors).length){await drawRecordModal();toast('Please fix highlighted fields','bad');return;}
  let msg;
  if(S.isNew){
    if(Objects.hasWorkflow(S.table)){await ObjectApproval.submit(S.table,S.values);msg='Submitted for approval';}
    else{await Records.create(S.table,S.values);msg='Record created';}
  }else if(Array.isArray(S.record.steps)){
    const rec=await Records.get(S.table,S.record.id);
    Object.assign(rec,S.values);
    await ObjectApproval.resubmit(S.table,rec);
    msg='Resubmitted for approval';
  }else{
    await Records.update(S.table,S.record.id,S.values);msg='Record saved';
  }
  closeModal();toast(msg,'ok');
  refreshDbView(S.table);
}
async function deleteRecordAction(tableId,recordId){
  if(!confirm('Delete this record?'))return;
  const t=await Tables.get(tableId);if(!t)return;
  await Records.remove(t,recordId);
  closeModal();toast('Record deleted');
  refreshDbView(t);
}
async function addRecordComment(){
  const S=RECORD_STATE;if(!S||S.isNew)return;
  const box=$('#recCommentText');const text=(box?box.value:'').trim();if(!text)return;
  const rec=await Records.addComment(S.table,S.record.id,text);
  RECORD_STATE={table:S.table,record:rec,values:clone(rec),errors:{},isNew:false};
  await drawRecordModal();
}

/* ---------- approval actions on a record — mirrors router.js's reqAct/doReqAct ---------- */
async function objMore(tableId,recordId){
  const acts=[['comment','message-square','Comment'],['delegate','share','Delegate'],['forward','forward','Forward'],['escalate','arrow-up','Escalate'],['revision','pencil','Request revision']];
  modal({title:'More actions',body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    ${acts.map(([a,ic,l])=>`<button class="btn block" data-action="objAct" data-tid="${tableId}" data-id="${recordId}" data-act="${a}">${svg(ic,15)} ${l}</button>`).join('')}</div>`});
}
async function objAct(tableId,recordId,action){
  const needsText=['reject','return','revision','comment','escalate'].includes(action);
  const needsPick=['delegate','forward'].includes(action);
  if(!needsText&&!needsPick){await doObjAct(tableId,recordId,action);return;}
  const body=needsPick?`<div class="field"><label>Send to</label><select class="inp" id="objActPick">${DIR.people.map(p=>`<option value="${p.id}">${esc(p.name)} (${esc(p.role)})</option>`).join('')}</select></div>`
    :`<div class="field"><label>Remarks${action==='reject'?'':' (optional)'}</label><textarea class="inp" id="objActText" placeholder="Add a note…"></textarea></div>`;
  modal({title:action[0].toUpperCase()+action.slice(1),body,
    footer:`<button class="btn ghost" data-action="closeModal">Cancel</button>
      <button class="btn ${action==='reject'?'bad':action==='approve'?'ok':'primary'}" data-action="doObjAct" data-tid="${tableId}" data-id="${recordId}" data-act="${action}">Confirm ${action}</button>`});
}
async function doObjAct(tableId,recordId,action){
  const t=await Tables.get(tableId);if(!t)return;
  const rec=await Records.get(t,recordId);if(!rec)return;
  let remarks='';
  const pick=$('#objActPick'),txt=$('#objActText');
  if(pick)remarks=pick.value;else if(txt)remarks=txt.value.trim();
  if(action==='reject'&&!remarks){toast('A reason is required to reject','warn');return;}
  await ObjectApproval.act(t,rec,action,remarks);
  closeModal();
  const PAST_TENSE={approve:'approved',reject:'rejected',return:'returned',revision:'sent back for revision',
    cancel:'cancelled',delegate:'delegated',forward:'forwarded',escalate:'escalated',comment:'commented'};
  toast(`Record ${PAST_TENSE[action]||action}`,action==='reject'?'bad':'ok');
  refreshDbView(t);
}
