/* AU ONE STUDIO · router.js
   Event delegation, action handlers, search, notifications
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   10 · ACTION ROUTER  (event delegation)
   ========================================================================== */
const SNAP_ACTIONS=new Set(['addField','delField','dupField','addOpt','delOpt','addCol','delCol','addStep','addStepAt','addStepMode','delStep','moveStep','toggleCond','addAuto','delAuto']);
function wfNewStep(mode){return {id:uid('s'),name:mode==='parallel'?'Parallel review':mode==='optional'?'Optional review':'Approval',approverType:'role',role:DIR.roles[0].id,mode:mode||'sequential',condition:null,slaHours:24};}
document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el)return;
  const a=el.dataset.action, id=el.dataset.id;
  const F=async()=>APP.editing?await Store.get('forms',APP.editing):null;
  if(APP.editing&&SNAP_ACTIONS.has(a)){const cf=await Store.get('forms',APP.editing);if(cf)History.snap(cf);}
  switch(a){
    case'undo':await History.undo();break;
    case'redo':await History.redo();break;
    case'addAuto':{const f=await F();f.automations=f.automations||[];f.automations.push({on:'final',do:'notify',role:DIR.roles[0].id,text:''});await Store.upsert('forms',f);renderBuilderRules(f);break;}
    case'delAuto':{const f=await F();f.automations.splice(+el.dataset.i,1);await Store.upsert('forms',f);renderBuilderRules(f);break;}
    case'go':APP.view=el.dataset.view;APP.editing=null;APP.navOpen=false;$('#side').classList.remove('open');$('#scrim').classList.remove('open');render();break;
    case'openNav':$('#side').classList.add('open');$('#scrim').classList.add('open');break;
    case'closeNav':$('#side').classList.remove('open');$('#scrim').classList.remove('open');break;
    case'switchUser':break;
    case'closeModal':closeModal();break;
    case'closeModalBg':if(e.target.classList.contains('overlay'))closeModal();break;
    case'notifs':await showNotifs();break;
    case'cycleTheme':Theme.cycle();break;
    case'search':openSearch();break;
    case'fab':await fabAction();break;

    case'searchGoForm':closeModal();APP.view='forms';APP.editing=id;APP.builderTab='fields';BUILDER_SEL=null;History.reset();render();break;

    /* data-engine views */
    case'reqView':APP.reqView=el.dataset.v;render();break;
    case'saveView':await saveCurrentView();break;
    case'loadView':{const v=await Store.get('views',id);if(v){Object.assign(APP,v.state);render();}break;}
    case'delView':{e.stopPropagation();await Store.remove('views',id);render();break;}

    /* forms */
    case'newForm':await newForm();break;
    case'aiNew':openAIModal();break;
    case'aiExample':{const t=$('#aiPrompt');if(t){t.value=el.dataset.x;t.focus();}break;}
    case'aiGenerate':await aiGenerate();break;
    case'editForm':APP.editing=id;APP.builderTab='fields';BUILDER_SEL=null;History.reset();render();break;
    case'closeBuilder':APP.editing=null;render();break;
    case'btab':APP.builderTab=el.dataset.t;render();break;
    case'useForm':await useForm(id);break;
    case'dupForm':{const f=await Store.get('forms',id);const c=clone(f);c.id=uid('form');c.name=f.name+' (copy)';c.status='draft';c.isTemplate=false;delete c.createdAt;await Store.upsert('forms',c);toast('Form duplicated','ok');render();break;}
    case'deleteForm':if(confirm('Delete this form? Existing requests are kept.')){await Store.remove('forms',id);APP.editing=null;toast('Form deleted');render();}break;
    case'formMore':await formMore(id);break;
    case'setStatus':{const f=await F();f.status=el.dataset.s;if(f.status==='published'&&!(f.fields||[]).length){toast('Add at least one field first','warn');f.status='draft';}await Store.upsert('forms',f);toast('Status: '+f.status,'ok');render();break;}
    case'saveTemplate':{const f=await Store.get('forms',id);const c=clone(f);c.id=uid('form');c.isTemplate=true;c.status='published';delete c.createdAt;await Store.upsert('forms',c);toast('Saved as template','ok');break;}

    /* builder fields */
    case'addField':{const f=await F();const nf=makeField(el.dataset.t);f.fields=f.fields||[];f.fields.push(nf);BUILDER_SEL=nf.id;await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'selField':{if(e.target.closest('.acts')||e.target.closest('[data-handle]'))break;BUILDER_SEL=el.dataset.fid;const f=await F();renderBuilderFields(f);break;}
    case'dupField':{const f=await F();const idx=f.fields.findIndex(x=>x.id===el.dataset.fid);const c=clone(f.fields[idx]);c.id=uid('f');c.key='';f.fields.splice(idx+1,0,c);await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'delField':{const f=await F();f.fields=f.fields.filter(x=>x.id!==el.dataset.fid);if(BUILDER_SEL===el.dataset.fid)BUILDER_SEL=null;await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'addOpt':{const f=await F();const fl=f.fields.find(x=>x.id===BUILDER_SEL);fl.options.push({label:'Option '+(fl.options.length+1),value:'Option '+(fl.options.length+1)});await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'delOpt':{const f=await F();const fl=f.fields.find(x=>x.id===BUILDER_SEL);fl.options.splice(+el.dataset.i,1);await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'addCol':{const f=await F();const fl=f.fields.find(x=>x.id===BUILDER_SEL);fl.columns.push({key:'c'+(fl.columns.length+1),label:'Column '+(fl.columns.length+1),type:'text'});await Store.upsert('forms',f);renderBuilderFields(f);break;}
    case'delCol':{const f=await F();const fl=f.fields.find(x=>x.id===BUILDER_SEL);fl.columns.splice(+el.dataset.i,1);await Store.upsert('forms',f);renderBuilderFields(f);break;}

    /* builder settings */
    case'setIcon':{const f=await F();f.icon=el.dataset.v;await Store.upsert('forms',f);renderBuilderSettings(f);break;}
    case'setColor':{const f=await F();f.color=el.dataset.v;await Store.upsert('forms',f);renderBuilderSettings(f);break;}
    case'togglePerm':{const f=await F();const act=el.dataset.act,r=el.dataset.r;f.permissions=f.permissions||{};const arr=f.permissions[act]||[];
      const i=arr.indexOf(r);if(i>=0)arr.splice(i,1);else arr.push(r);f.permissions[act]=arr;await Store.upsert('forms',f);renderBuilderSettings(f);break;}

    /* workflow */
    case'addStep':{const f=await F();f.workflow.steps.push(wfNewStep('sequential'));await Store.upsert('forms',f);renderBuilderWorkflow(f);break;}
    case'addStepMode':{const f=await F();f.workflow.steps.push(wfNewStep(el.dataset.m));await Store.upsert('forms',f);renderBuilderWorkflow(f);break;}
    case'addStepAt':{const f=await F();f.workflow.steps.splice(+el.dataset.i,0,wfNewStep('sequential'));await Store.upsert('forms',f);renderBuilderWorkflow(f);break;}
    case'delStep':{const f=await F();f.workflow.steps=f.workflow.steps.filter(s=>s.id!==id);await Store.upsert('forms',f);renderBuilderWorkflow(f);break;}
    case'moveStep':{const f=await F();const arr=f.workflow.steps;const i=arr.findIndex(s=>s.id===id);const j=i+(+el.dataset.dir);
      if(j>=0&&j<arr.length){[arr[i],arr[j]]=[arr[j],arr[i]];await Store.upsert('forms',f);renderBuilderWorkflow(f);}break;}
    case'toggleCond':{const f=await F();const s=f.workflow.steps.find(x=>x.id===id);s.condition=s.condition?null:{field:'',op:'gt',value:''};await Store.upsert('forms',f);renderBuilderWorkflow(f);break;}
    case'toggleVis':{const f=await F();const fl=f.fields.find(x=>x.id===el.dataset.fid);fl.visibleIf=fl.visibleIf?null:{field:'',op:'eq',value:''};await Store.upsert('forms',f);renderBuilderFields(f);break;}

    /* templates */
    case'useTemplate':{const t=await Store.get('forms',id);const c=clone(t);c.id=uid('form');c.isTemplate=false;c.status='draft';c.name=t.name;delete c.createdAt;await Store.upsert('forms',c);APP.view='forms';APP.editing=c.id;APP.builderTab='fields';History.reset();toast('Template copied to Form Builder','ok');render();break;}
    case'dupTemplatePreview':{const t=await Store.get('forms',id);SUBMIT_STATE={form:t,values:{},errors:{}};await drawSubmitModal();break;}

    /* submit */
    case'doSubmit':await doSubmit();break;
    case'geoloc':{const key=el.dataset.key;if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>{SUBMIT_STATE.values[key]=p.coords.latitude.toFixed(5)+', '+p.coords.longitude.toFixed(5);drawSubmitModal();},()=>toast('Location unavailable','warn'));break;}
    case'clearSig':{const cv=$(`canvas[data-fid="${el.dataset.fid}"]`);if(cv){cv.getContext('2d').clearRect(0,0,cv.width,cv.height);SUBMIT_STATE.values[cv.dataset.sig]='';}break;}
    case'addRow':{const S=SUBMIT_STATE;const fl=S.form.fields.find(x=>x.id===el.dataset.fid);const key=fieldKey(fl);S.values[key]=Array.isArray(S.values[key])?S.values[key]:[];S.values[key].push({});drawSubmitModal();break;}
    case'delRow':{const S=SUBMIT_STATE;const fl=S.form.fields.find(x=>x.id===el.dataset.fid);const key=fieldKey(fl);S.values[key].splice(+el.dataset.ri,1);drawSubmitModal();break;}

    /* requests */
    case'openReq':await openReq(id);break;
    case'reqFilter':APP.reqFilter=el.dataset.f;render();break;
    case'reqAct':await reqAct(id,el.dataset.act);break;
    case'reqMore':await reqMore(id);break;
    case'doReqAct':await doReqAct(el.dataset.id,el.dataset.act);break;

    /* settings */
    case'addDir':{const coll=el.dataset.coll;const inp=$('#new_'+coll);const name=(inp.value||'').trim();if(!name)break;
      await Store.upsert(coll,{id:uid(coll),name});await loadDir();render();break;}
    case'delDir':{await Store.remove(el.dataset.coll,id);await loadDir();render();break;}
    case'addPerson':{const name=$('#np_name').value.trim();if(!name)break;
      await Store.upsert('people',{id:uid('u'),name,role:$('#np_role').value,department:$('#np_dept').value,color:COLOR_CHOICES[Math.floor(Math.random()*COLOR_CHOICES.length)]});
      await loadDir();render();break;}
    case'exportData':{const raw=await Store.raw();const blob=new Blob([JSON.stringify(raw,null,2)],{type:'application/json'});
      const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='approval-center-data.json';link.click();break;}
    case'resetAll':if(confirm('Erase ALL forms, requests and data on this device?')){localStorage.removeItem('ace_v1');location.reload();}break;
  }
});
/* selects / text inputs via change+input delegation (builder props & workflow) */
document.addEventListener('change',onGlobalInput);
document.addEventListener('input',onGlobalInput);
async function onGlobalInput(e){
  const t=e.target;
  if(t.dataset&&t.dataset.action==='switchUser'){APP.user=DIR.people.find(p=>p.id===t.value);render();return;}
  if(t.dataset&&t.dataset.action==='reqSortSel'){APP.reqSort=t.value;render();return;}
  if(t.dataset&&t.dataset.action==='reqModuleSel'){APP.reqModule=t.value;render();return;}
  if(!APP.editing)return;
  const f=await Store.get('forms',APP.editing);if(!f)return;
  // field property
  if(t.dataset.prop!=null){let v=t.type==='checkbox'?t.checked:t.value;
    if(BUILDER_SEL&&APP.builderTab==='fields'){const fl=f.fields.find(x=>x.id===BUILDER_SEL);if(fl){setPath(fl,t.dataset.prop,v);await Store.upsert('forms',f);
      // live update the row label/preview without losing focus
      const row=$(`.fitem[data-fid="${fl.id}"] .t`);if(row&&t.dataset.prop==='label')row.innerHTML=esc(v)+(fl.required?' <span class="req">*</span>':'');
      if(['required','width','key'].includes(t.dataset.prop)){/*structural-ish, defer*/}
    }}
    else{setPath(f,t.dataset.prop,v);await Store.upsert('forms',f);
      if(t.dataset.prop==='name'){/*don't rerender to keep focus*/}}
    return;}
  // conditional visibility props
  if(t.dataset.visif!=null&&BUILDER_SEL){const fl=f.fields.find(x=>x.id===BUILDER_SEL);if(fl){fl.visibleIf=fl.visibleIf||{field:'',op:'eq',value:''};fl.visibleIf[t.dataset.visif]=t.value;await Store.upsert('forms',f);}return;}
  // automation rule props
  if(t.dataset.auto!=null){const i=+t.dataset.auto;f.automations=f.automations||[];const rule=f.automations[i];if(!rule)return;
    rule[t.dataset.ap]=t.value;await Store.upsert('forms',f);if(t.dataset.ap==='do')renderBuilderRules(f);return;}
  // option label edit
  if(t.dataset.opt!=null&&BUILDER_SEL){const fl=f.fields.find(x=>x.id===BUILDER_SEL);const i=+t.dataset.opt;fl.options[i]={label:t.value,value:t.value};await Store.upsert('forms',f);return;}
  if(t.dataset.col!=null&&BUILDER_SEL){const fl=f.fields.find(x=>x.id===BUILDER_SEL);const i=+t.dataset.col;fl.columns[i].label=t.value;fl.columns[i].key=t.value.toLowerCase().replace(/\s+/g,'_')||('c'+i);await Store.upsert('forms',f);return;}
  // workflow step props
  if(t.dataset.step!=null){const s=f.workflow.steps.find(x=>x.id===t.dataset.step);if(!s)return;
    if(t.dataset.sp!=null){s[t.dataset.sp]=t.value;if(t.dataset.sp==='approverType'){await Store.upsert('forms',f);renderBuilderWorkflow(f);return;}}
    if(t.dataset.cond!=null){s.condition=s.condition||{field:'',op:'gt',value:''};s.condition[t.dataset.cond]=t.value;}
    await Store.upsert('forms',f);return;}
}

/* ---------- submit / validation ---------- */
async function doSubmit(){
  const {form,values}=SUBMIT_STATE;
  const errors=Validation.form(form,values);
  SUBMIT_STATE.errors=errors;
  if(Object.keys(errors).length){await drawSubmitModal();toast('Please fix highlighted fields','bad');return;}
  const req=await Approval.submit(form,values);
  closeModal();toast('Request submitted for approval','ok');
  APP.view='requests';render();
}

/* ---------- request actions ---------- */
async function reqAct(id,act){
  const needsText=['reject','return','revision','comment','escalate'].includes(act);
  const needsPick=['delegate','forward'].includes(act);
  if(!needsText&&!needsPick){await doReqAct(id,act);return;}
  const body=needsPick?`<div class="field"><label>Send to</label><select class="inp" id="actPick">${DIR.people.map(p=>`<option value="${p.id}">${esc(p.name)} (${esc(p.role)})</option>`).join('')}</select></div>`
    :`<div class="field"><label>Remarks${act==='reject'?'':' (optional)'}</label><textarea class="inp" id="actText" placeholder="Add a note…"></textarea></div>`;
  modal({title:act[0].toUpperCase()+act.slice(1),body,
    footer:`<button class="btn ghost" data-action="closeModal">Cancel</button>
      <button class="btn ${act==='reject'?'bad':act==='approve'?'ok':'primary'}" data-action="doReqAct" data-id="${id}" data-act="${act}">Confirm ${act}</button>`});
}
async function doReqAct(id,act){
  const r=await Store.get('requests',id);if(!r)return;
  let remarks='';
  const pick=$('#actPick'),txt=$('#actText');
  if(pick)remarks=pick.value;else if(txt)remarks=txt.value.trim();
  if(act==='reject'&&!remarks){toast('A reason is required to reject','warn');return;}
  await Approval.act(r,act,remarks);
  closeModal();toast(`Request ${act}ed`.replace('approveed','approved').replace('canceled','cancelled'),act==='reject'?'bad':'ok');
  render();
}
async function reqMore(id){
  const acts=[['comment','message-square','Comment'],['delegate','share','Delegate'],['forward','forward','Forward'],['escalate','arrow-up','Escalate'],['revision','pencil','Request revision']];
  modal({title:'More actions',body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    ${acts.map(([a,ic,l])=>`<button class="btn block" data-action="reqAct" data-id="${id}" data-act="${a}">${svg(ic,15)} ${l}</button>`).join('')}</div>`});
}
async function formMore(id){
  const f=await Store.get('forms',id);
  modal({title:f.name,body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    <button class="btn block" data-action="editForm" data-id="${id}">${svg('pencil',15)} Edit</button>
    <button class="btn block" data-action="dupForm" data-id="${id}">${svg('copy',15)} Duplicate</button>
    <button class="btn block" data-action="saveTemplate" data-id="${id}">${svg('library',15)} Save as template</button>
    <button class="btn block ${f.status==='archived'?'':'ghost'}" data-action="archiveForm" data-id="${id}">${svg('archive',15)} ${f.status==='archived'?'Unarchive':'Archive'}</button>
    <button class="btn block bad" data-action="deleteForm" data-id="${id}">${svg('trash-2',15)} Delete</button></div>`});
}
document.addEventListener('click',async e=>{const el=e.target.closest('[data-action="archiveForm"]');if(!el)return;
  const f=await Store.get('forms',el.dataset.id);f.status=f.status==='archived'?'draft':'archived';await Store.upsert('forms',f);closeModal();render();});

async function showNotifs(){
  const list=await Notify.mine();await Notify.markAll();
  modal({title:'Notifications',body:list.length?`<div class="tl">${list.map(n=>`<div class="ev ${n.read?'':'info'}"><div class="mk">${svg('bell',11)}</div>
    <div class="t">${esc(n.text)}</div><div class="m">${ago(n.at)}</div>
    ${n.requestId?`<button class="btn sm" data-action="openReq" data-id="${n.requestId}" style="margin-top:6px">Open request</button>`:''}</div>`).join('')}</div>`
    :emptyCard('bell-off','No notifications','You are all caught up.')});
  render();
}

/* ---------- Global search (Ctrl/⌘+K) ---------- */
async function openSearch(){
  modal({title:'Search',body:`<input class="inp" id="searchIn" placeholder="Search forms, requests, people…" autocomplete="off">
    <div id="searchRes" style="margin-top:12px"><div class="muted small">Type to search across forms, requests, people and modules.</div></div>`});
  const inp=$('#searchIn');inp.focus();
  const run=async()=>{
    const q=inp.value.trim().toLowerCase();const box=$('#searchRes');
    if(!q){box.innerHTML='<div class="muted small">Type to search…</div>';return;}
    const forms=(await Store.list('forms')).filter(f=>!f.isTemplate);
    const reqs=await Store.list('requests');
    const hitF=forms.filter(f=>(f.name+f.description+f.module).toLowerCase().includes(q)).slice(0,6);
    const hitR=reqs.filter(r=>(r.formName+r.submittedByName+r.module+JSON.stringify(r.values)).toLowerCase().includes(q)).slice(0,8);
    const hitP=DIR.people.filter(p=>(p.name+p.role+p.department).toLowerCase().includes(q)).slice(0,5);
    const sec=(t,items)=>items.length?`<div class="sectitle" style="margin:12px 4px 6px">${t}</div>${items.join('')}`:'';
    box.innerHTML=(sec('Forms',hitF.map(f=>`<button class="btn block" style="justify-content:flex-start;margin-bottom:6px" data-action="searchGoForm" data-id="${f.id}">${svg(f.icon,15)} ${esc(f.name)}</button>`))
      +sec('Requests',hitR.map(r=>`<button class="btn block" style="justify-content:flex-start;margin-bottom:6px" data-action="openReq" data-id="${r.id}">${svg(r.icon||'file-text',15)} ${esc(r.formName)} <span class="status ${r.status}" style="margin-left:auto">${r.status}</span></button>`))
      +sec('People',hitP.map(p=>`<div class="chip" style="margin:0 6px 6px 0">${svg('user',13)} ${esc(p.name)} · ${esc(p.role)}</div>`)))
      ||'<div class="muted small">No matches.</div>';
  };
  inp.addEventListener('input',run);
}

/* ---------- FAB (context-aware create) ---------- */
async function fabAction(){
  if(APP.view==='forms'){await newForm();return;}
  if(APP.view==='templates'){toast('Pick a template below','');return;}
  // otherwise: quick-start a request from any published form
  const forms=(await Store.list('forms')).filter(f=>f.status==='published'&&!f.isTemplate);
  const tpls=(await Store.list('forms')).filter(f=>f.isTemplate);
  const pool=forms.length?forms:tpls;
  if(!pool.length){toast('No published forms yet — build one first','warn');APP.view='forms';render();return;}
  modal({title:'New request',body:`<div class="muted small" style="margin-bottom:10px">Choose a form to submit.</div>
    <div class="grid" style="grid-template-columns:1fr">${pool.slice(0,12).map(f=>`<button class="btn block" style="justify-content:flex-start;margin-bottom:8px" data-action="${f.isTemplate?'useTemplate':'useForm'}" data-id="${f.id}">${svg(f.icon,16)} ${esc(f.name)}</button>`).join('')}</div>`});
}

/* ---------- Saved views (Data Engine) ---------- */
async function saveCurrentView(){
  const name=prompt('Name this view (filters, sort & layout will be saved):','My view');
  if(!name)return;
  await Store.upsert('views',{id:uid('view'),name,owner:APP.user.id,
    state:{reqView:APP.reqView,reqFilter:APP.reqFilter,reqModule:APP.reqModule,reqSort:APP.reqSort}});
  toast('View saved','ok');render();
}
