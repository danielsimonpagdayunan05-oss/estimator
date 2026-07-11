/* AU ONE STUDIO · submit-form.js
   Live form renderer, validation, all field widgets, sortable
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

let SUBMIT_STATE=null;
async function useForm(id){
  const f=await Store.get('forms',id);if(!f)return;
  if(!Permission.can(f,'submit'))return toast('Your role cannot submit this form','bad');
  const values={};(f.fields||[]).forEach(fl=>{if(!FieldTypes[fl.type]?.layout)
    values[fieldKey(fl)]=(fl.defaultValue!=null&&fl.defaultValue!=='')?fl.defaultValue:clone(FieldTypes[fl.type].value);});
  SUBMIT_STATE={form:f,values,errors:{}};
  await drawSubmitModal();
}
/* owner fixes values on a returned/revision request, then resubmits into the same request (no new record) */
async function editAndResubmit(reqId){
  const r=await Store.get('requests',reqId);if(!r)return;
  const f=await Store.get('forms',r.formId);if(!f)return;
  SUBMIT_STATE={form:f,values:clone(r.values),errors:{},resubmitId:r.id};
  await drawSubmitModal();
}
/* conditional visibility: is a field currently shown given the form values? */
function fieldVisible(fl,values,form){return fl.visibleIf&&fl.visibleIf.field?WorkflowEngine.test(fl.visibleIf,values,form):true;}
function applyVisibility(){const S=SUBMIT_STATE;if(!S)return;
  S.form.fields.forEach(fl=>{const w=document.querySelector(`[data-fieldwrap="${fl.id}"]`);if(w)w.style.display=fieldVisible(fl,S.values,S.form)?'':'none';});}
async function drawSubmitModal(){
  const {form,values,errors}=SUBMIT_STATE;
  const fieldsHtml=[];
  for(const fl of (form.fields||[])){
    if(fl.type==='hidden')continue;
    fieldsHtml.push(await renderSubmitField(fl,values,errors));
  }
  const body=`<div class="row" style="margin-bottom:12px"><div class="icon" style="width:40px;height:40px;background:${form.color};border-radius:11px;display:grid;place-items:center;color:#fff">${svg(form.icon,20)}</div>
    <div><div style="font-weight:800">${esc(form.name)}</div><div class="small muted">${esc(form.description||'')}</div></div></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">${fieldsHtml.join('')}</div>`;
  const footer=`<button class="btn ghost" data-action="closeModal">Cancel</button>
    <button class="btn primary" data-action="doSubmit">${SUBMIT_STATE.resubmitId?'Save &amp; resubmit':'Submit request'}</button>`;
  modal({title:SUBMIT_STATE.resubmitId?'Edit & Resubmit':'New Request',body,footer,wide:true});
  wireSubmitInputs();
}
async function renderSubmitField(fl,values,errors){
  const d=FieldTypes[fl.type];const key=fieldKey(fl);const err=errors[fl.id];
  const wide=fl.width!=='half';
  const hidden=!fieldVisible(fl,values,SUBMIT_STATE?SUBMIT_STATE.form:{fields:[]});
  const wrap=`data-fieldwrap="${fl.id}" style="${hidden?'display:none;':''}${wide?'grid-column:1/-1':''}"`;
  if(d.layout){const inner=fl.type==='divider'?'<hr style="border:0;border-top:1px solid var(--stroke);margin:6px 0">'
    :fl.type==='heading'?`<h3 style="margin:10px 0 2px;font-size:16px">${esc(fl.label)}</h3>`
    :`<div class="small muted" style="margin-bottom:8px">${esc(fl.label)}</div>`;
    return `<div ${wrap}>${inner}</div>`;}
  const input=await previewInput(fl,values[key],false);
  return `<div class="field ${wide?'full':'half'}" ${wrap}><label>${esc(fl.label)}${fl.required?' <span class="req">*</span>':''}</label>
    ${fl.help?`<div class="help">${esc(fl.help)}</div>`:''}${input}
    ${err?`<div class="errmsg" data-err="${fl.id}">${err}</div>`:''}</div>`;
}

/* input renderer used by BOTH preview (builder) and live submit */
function previewInput(fl,val,preview){
  const d=FieldTypes[fl.type];const key=fieldKey(fl);
  const bind=preview?'':`data-bind="${key}" data-ftype="${fl.type}" data-fid="${fl.id}"`;
  const dis=preview?'disabled':(fl.readonly?'readonly':'');
  const ph=esc(fl.placeholder||fl.help||'');
  const pfx=fl.prefix?`<span style="position:absolute;left:11px;font-weight:700;color:var(--muted)">${esc(fl.prefix)}</span>`:'';
  const sfx=fl.suffix?`<span style="position:absolute;right:11px;font-weight:600;color:var(--muted)">${esc(fl.suffix)}</span>`:'';
  const afx=(inp)=>(fl.prefix||fl.suffix)?`<div class="row" style="position:relative">${pfx}${inp.replace('class="inp"',`class="inp" style="${fl.prefix?'padding-left:'+(11+fl.prefix.length*9)+'px;':''}${fl.suffix?'padding-right:'+(11+fl.suffix.length*9)+'px;':''}"`)}${sfx}</div>`:inp;
  switch(fl.type){
    case'text':case'email':case'phone':
      return afx(`<input class="inp" type="${fl.type==='email'?'email':'text'}" ${bind} ${dis} value="${esc(val||'')}" placeholder="${ph}">`);
    case'number':return afx(`<input class="inp" type="number" ${bind} ${dis} value="${esc(val||'')}" placeholder="${ph}">`);
    case'currency':return `<div class="row" style="position:relative"><span style="position:absolute;left:11px;font-weight:700;color:var(--muted)">${esc(fl.prefix||'₱')}</span><input class="inp" style="padding-left:26px" type="number" ${bind} ${dis} value="${esc(val||'')}" placeholder="${ph}"></div>`;
    case'paragraph':return `<textarea class="inp" ${bind} ${dis} placeholder="${ph}">${esc(val||'')}</textarea>`;
    case'date':return `<input class="inp" type="date" ${bind} ${dis} value="${esc(val||'')}">`;
    case'time':return `<input class="inp" type="time" ${bind} ${dis} value="${esc(val||'')}">`;
    case'dropdown':case'lookup':case'people':case'project':case'department':case'role':{
      let opts=fl.options||[];
      if(['people','project','department','role'].includes(fl.type)){const src=DIR[d.source]||[];opts=src.map(x=>({label:x.name+(x.role?' · '+x.role:''),value:x.id}));}
      if(fl.type==='lookup'){const src=DIR[fl.source]||[];opts=src.map(x=>({label:x.name,value:x.id}));}
      return `<select class="inp" ${bind} ${dis}><option value="">— select —</option>${opts.map(o=>`<option value="${esc(o.value)}" ${val==o.value?'selected':''}>${esc(o.label)}</option>`).join('')}</select>`;}
    case'yesno':return `<div class="toggle" ${dis}>${(fl.options||[{label:'Yes',value:'Yes'},{label:'No',value:'No'}]).map(o=>`<button type="button" class="${val==o.value?'on':''}" ${preview?'disabled':`data-choice="${key}" data-ftype="yesno" data-fid="${fl.id}" data-v="${esc(o.value)}"`}>${esc(o.label)}</button>`).join('')}</div>`;
    case'radio':return (fl.options||[]).map(o=>`<label class="checkline"><input type="radio" name="${fl.id}" ${preview?'disabled':`data-choice="${key}" data-ftype="radio" data-fid="${fl.id}" data-v="${esc(o.value)}"`} ${val==o.value?'checked':''}>${esc(o.label)}</label>`).join('');
    case'checkbox':return `<label class="checkline"><input type="checkbox" ${bind} ${dis} ${val?'checked':''}> ${esc(fl.help||'Yes')}</label>`;
    case'multiselect':return (fl.options||[]).map(o=>`<label class="checkline"><input type="checkbox" ${preview?'disabled':`data-multi="${key}" data-fid="${fl.id}" data-v="${esc(o.value)}"`} ${(Array.isArray(val)&&val.includes(o.value))?'checked':''}>${esc(o.label)}</label>`).join('');
    case'rating':return `<div class="stars" ${preview?'':`data-rating="${key}" data-fid="${fl.id}"`}>${[1,2,3,4,5].map(n=>`<span class="${(+val>=n)?'on':''}" ${preview?'':`data-n="${n}"`}>★</span>`).join('')}</div>`;
    case'signature':return val&&preview?`<span class="muted small" style="display:inline-flex;gap:6px;align-items:center">${svg('pen-tool',14)} signature</span>`
      :`<canvas class="sig" ${preview?'':`data-sig="${key}" data-fid="${fl.id}"`} width="600" height="150"></canvas>${preview?'':`<button type="button" class="btn sm ghost" data-action="clearSig" data-fid="${fl.id}" style="margin-top:6px">${svg('eraser',13)} Clear</button>`}`;
    case'location':return `<div class="row"><input class="inp" ${bind} ${dis} value="${esc(val||'')}" placeholder="lat, lng or address"><button type="button" class="btn sm" ${preview?'disabled':`data-action="geoloc" data-key="${key}" data-fid="${fl.id}"`}>${svg('locate-fixed',15)}</button></div>`;
    case'qrcode':case'barcode':{const v=val||'';return `<input class="inp mono" ${bind} ${dis} value="${esc(v)}" placeholder="scan / enter code">
      ${v?`<div style="margin-top:8px">${fl.type==='barcode'?barcodeVis(v):`<div class="code-vis">${esc(v)}</div>`}</div>`:''}`;}
    case'image':return `${val?`<img src="${val}" style="max-height:110px;border-radius:8px;display:block;margin-bottom:6px">`:''}<input class="inp" type="file" accept="image/*" ${preview?'disabled':`data-upload="${key}" data-fid="${fl.id}" data-img="1"`}>`;
    case'file':return `${val?`<div class="chip">${svg('paperclip',13)} file attached</div>`:''}<input class="inp" type="file" ${preview?'disabled':`data-upload="${key}" data-fid="${fl.id}"`}>`;
    case'repeating':return repeatInput(fl,val,preview);
    case'formula':case'calculated':{const r=FormEngine.evalExpression(fl.expression,SUBMIT_STATE?SUBMIT_STATE.values:{},fl.__form||SUBMIT_STATE?.form||{fields:[]});
      return `<div class="inp mono" ${preview?'':`data-calc="${key}" data-fid="${fl.id}"`} style="background:var(--glass2);font-weight:700">${preview?'= computed':r}</div>`;}
    default:return `<input class="inp" ${bind} ${dis} value="${esc(val||'')}">`;
  }
}
function repeatInput(fl,val,preview){
  const rows=Array.isArray(val)?val:[];
  return `<div data-repeat="${fieldKey(fl)}" data-fid="${fl.id}"><table class="rt-table"><thead><tr>${fl.columns.map(c=>`<th>${esc(c.label)}</th>`).join('')}<th></th></tr></thead>
    <tbody>${rows.map((row,ri)=>`<tr>${fl.columns.map(c=>`<td><input class="inp" style="padding:5px 7px;border:0;background:transparent" ${preview?'disabled':`data-rrow="${ri}" data-rcol="${c.key}"`} value="${esc(row[c.key]||'')}"></td>`).join('')}
      <td>${preview?'':`<button type="button" class="btn sm ghost" data-action="delRow" data-fid="${fl.id}" data-ri="${ri}">${svg('x',13)}</button>`}</td></tr>`).join('')}</tbody></table>
    ${preview?'':`<button type="button" class="btn sm" data-action="addRow" data-fid="${fl.id}" style="margin-top:6px">${svg('plus',14)} Add row</button>`}</div>`;
}
function barcodeVis(v){ // deterministic Code128-ish visual (representational)
  let bars='';for(let i=0;i<v.length;i++){const code=v.charCodeAt(i);for(let b=0;b<4;b++){
    const w=((code>>b)&1)?3:1;const black=(b%2===0);bars+=`<i style="width:${w}px;background:${black?'#111':'transparent'}"></i>`;}}
  return `<div class="barcode">${bars}</div><div class="mono tiny" style="text-align:center;letter-spacing:2px">${esc(v)}</div>`;
}

/* wiring for live submit inputs (delegation on modal) */
function wireSubmitInputs(){
  const root=$('#modalRoot');
  root.addEventListener('input',onSubmitInput);
  root.addEventListener('change',onSubmitInput);
  root.addEventListener('click',onSubmitChoiceClick);
  // signature pads
  $$('canvas[data-sig]',root).forEach(setupSignature);
  applyVisibility();
}
function onSubmitInput(e){
  const t=e.target;const S=SUBMIT_STATE;if(!S)return;
  if(t.dataset.bind!=null){let v=t.type==='checkbox'?t.checked:t.value;S.values[t.dataset.bind]=v;recalc();applyVisibility();}
  else if(t.dataset.choice!=null){S.values[t.dataset.choice]=t.dataset.v;recalc();applyVisibility();}
  else if(t.dataset.multi!=null){const key=t.dataset.multi;const arr=Array.isArray(S.values[key])?S.values[key]:[];
    const val=t.dataset.v;if(t.checked){if(!arr.includes(val))arr.push(val);}else{const i=arr.indexOf(val);if(i>=0)arr.splice(i,1);}S.values[key]=arr;}
  else if(t.dataset.rrow!=null){const wrap=t.closest('[data-repeat]');const key=wrap.dataset.repeat;
    const arr=Array.isArray(S.values[key])?S.values[key]:[];const ri=+t.dataset.rrow;arr[ri]=arr[ri]||{};arr[ri][t.dataset.rcol]=t.value;S.values[key]=arr;}
  else if(t.dataset.upload!=null){const file=t.files[0];if(file){const rd=new FileReader();rd.onload=()=>{S.values[t.dataset.upload]=rd.result;drawSubmitModal();};rd.readAsDataURL(file);}}
}
/* yesno buttons and rating stars don't fire native input/change events — need a click listener */
function onSubmitChoiceClick(e){
  const S=SUBMIT_STATE;if(!S)return;
  const btn=e.target.closest('button[data-choice]');
  if(btn){S.values[btn.dataset.choice]=btn.dataset.v;recalc();drawSubmitModal();return;}
  const star=e.target.closest('[data-n]');
  if(star){const wrap=star.closest('[data-rating]');if(wrap){S.values[wrap.dataset.rating]=+star.dataset.n;recalc();drawSubmitModal();}}
}
function recalc(){const S=SUBMIT_STATE;if(!S)return;
  $$('[data-calc]',$('#modalRoot')).forEach(el=>{const fl=S.form.fields.find(f=>f.id===el.dataset.fid);
    if(fl){S.values[el.dataset.calc]=FormEngine.evalExpression(fl.expression,S.values,S.form);el.textContent=S.values[el.dataset.calc];}});}
function setupSignature(cv){const ctx=cv.getContext('2d');ctx.lineWidth=2;ctx.lineCap='round';ctx.strokeStyle='#111';
  let drawing=false,last=null;const pos=e=>{const r=cv.getBoundingClientRect();const p=(e.touches?e.touches[0]:e);
    return{x:(p.clientX-r.left)*(cv.width/r.width),y:(p.clientY-r.top)*(cv.height/r.height)};};
  const start=e=>{drawing=true;last=pos(e);e.preventDefault();};
  const move=e=>{if(!drawing)return;const p=pos(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;
    SUBMIT_STATE.values[cv.dataset.sig]=cv.toDataURL();e.preventDefault();};
  const end=()=>{drawing=false;};
  cv.addEventListener('pointerdown',start);cv.addEventListener('pointermove',move);
  window.addEventListener('pointerup',end);
}

/* ---------- pointer-based sortable (touch friendly) ---------- */
function makeSortable(list,onReorder){
  let dragEl=null,startIdx=0;
  $$('[data-handle]',list).forEach(h=>{
    h.addEventListener('pointerdown',e=>{
      dragEl=h.closest('[data-idx]');if(!dragEl)return;startIdx=+dragEl.dataset.idx;
      dragEl.classList.add('dragging');dragEl.setPointerCapture?.(e.pointerId);e.preventDefault();
      const move=ev=>{const items=$$('[data-idx]',list).filter(x=>x!==dragEl);
        let placed=false;for(const it of items){const r=it.getBoundingClientRect();
          if(ev.clientY<r.top+r.height/2){list.insertBefore(dragEl,it);placed=true;break;}}
        if(!placed)list.appendChild(dragEl);};
      const up=()=>{dragEl.classList.remove('dragging');
        const order=$$('[data-idx]',list).map(x=>+x.dataset.idx);const to=order.indexOf(startIdx);
        document.removeEventListener('pointermove',move);document.removeEventListener('pointerup',up);
        if(to!==startIdx&&to>=0)onReorder(startIdx,to);dragEl=null;};
      document.addEventListener('pointermove',move);document.addEventListener('pointerup',up);
    });
  });
}
