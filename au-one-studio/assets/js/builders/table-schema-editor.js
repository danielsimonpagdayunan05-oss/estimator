/* AU ONE STUDIO · table-schema-editor.js
   Database Engine — data-agnostic Table Schema editor (palette + canvas +
   inspector). Structurally mirrors form-builder.js's existing builderFieldRow/
   inspector/palette so Form Builder can eventually wrap this instead of hand-
   building the same markup twice (see plan Stage 5) — but takes its data-action
   names via `actions` so it can be pointed at either forms or tables without
   either one's router.js handlers touching the other.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · SCHEMA EDITOR (UI)
   ========================================================================== */
const SCHEMA_EDITOR_DEFAULT_ACTIONS={add:'addField',sel:'selField',dup:'dupField',del:'delField',
  addOpt:'addOpt',delOpt:'delOpt',addCol:'addCol',delCol:'delCol',toggleVis:'toggleVis'};

function renderSchemaEditor(mountEl,{columns,selectedId,actions,showPalette}){
  const A=Object.assign({},SCHEMA_EDITOR_DEFAULT_ACTIONS,actions||{});
  const cols=columns||[];
  const sel=cols.find(x=>x.id===selectedId)||null;
  const palette=showPalette===false?'':FIELD_CATS.map(cat=>`<div class="pal-cat">${cat}</div>`+
    Object.entries(FieldTypes).filter(([k,d])=>d.cat===cat).map(([k,d])=>
      `<div class="pal-item" data-action="${A.add}" data-t="${k}"><span class="ic">${svg(d.ic,16)}</span>${d.label}</div>`).join('')).join('');
  mountEl.innerHTML=`<div class="builder">
    <div class="palette"><div class="small muted" style="margin-bottom:6px;font-weight:700">Tap a field to add it</div>${palette}</div>
    <div><div class="canvas" id="schemaCanvas" data-sortable>
      ${cols.length?cols.map((fl,i)=>schemaColumnRow(fl,i,selectedId,A)).join(''):'<div class="drophint">No columns yet.<br>Tap fields from the left to add them, then drag ⋮⋮ to reorder.</div>'}
    </div></div>
    <div class="inspector">${sel?schemaInspector(sel,cols,A):'<div class="card pad muted small">Select a column to edit its properties, options, validation and width.</div>'}</div>
  </div>`;
  return $('#schemaCanvas');
}
function schemaColumnRow(fl,i,selectedId,A){
  const d=FieldTypes[fl.type];const layout=d.layout;
  return `<div class="fitem ${fl.id===selectedId?'sel':''} ${layout?'layout':''}" data-idx="${i}" data-fid="${fl.id}" data-action="${A.sel}">
    <div class="handle" data-handle>⋮⋮</div>
    <div class="fh"><span style="color:var(--muted);display:inline-flex">${svg(d.ic,16)}</span><span class="t">${esc(fl.label)}${fl.required?' <span class="req">*</span>':''}</span>
      <span class="ty">${d.label}</span>
      <div class="acts">
        <button data-action="${A.dup}" data-fid="${fl.id}" title="Duplicate">${svg('copy',14)}</button>
        <button data-action="${A.del}" data-fid="${fl.id}" title="Delete">${svg('trash-2',14)}</button>
      </div></div>
    <div class="prev">${previewInput(fl,'',true)}</div></div>`;
}
function schemaInspector(fl,columns,A){
  const d=FieldTypes[fl.type];
  let extra='';
  if(d.opts){extra=`<div class="field"><label>Options</label>
    <div id="optList">${(fl.options||[]).map((o,i)=>`<div class="opt-row"><input class="inp" data-opt="${i}" value="${esc(o.label)}">
      <button class="btn sm ghost" data-action="${A.delOpt}" data-i="${i}">${svg('x',14)}</button></div>`).join('')}</div>
    <button class="btn sm" data-action="${A.addOpt}">${svg('plus',14)} Add option</button></div>`;}
  if(fl.type==='lookup'){extra+=`<div class="field"><label>Lookup source</label>
    <select class="inp" data-prop="source"><option value="">— choose —</option>
    ${['people','projects','departments','roles','modules'].map(s=>`<option value="${s}" ${fl.source===s?'selected':''}>${s}</option>`).join('')}</select></div>`;}
  if(fl.type==='formula'||fl.type==='calculated'){extra=`<div class="field"><label>Expression</label>
    <input class="inp mono" data-prop="expression" value="${esc(fl.expression||'')}" placeholder="e.g. {qty} * {unit_price}">
    <div class="help">Reference other columns by their <b>key</b> in braces. Operators + functions: + − * / ( ) SUM AVERAGE COUNT MIN MAX ROUND TEXT DATE TODAY NOW IF.</div></div>`;}
  if(fl.type==='repeating'){extra=`<div class="field"><label>Table columns</label>
    <div id="colList">${(fl.columns||[]).map((col,i)=>`<div class="opt-row"><input class="inp" data-col="${i}" value="${esc(col.label)}">
      <button class="btn sm ghost" data-action="${A.delCol}" data-i="${i}">${svg('x',14)}</button></div>`).join('')}</div>
    <button class="btn sm" data-action="${A.addCol}">${svg('plus',14)} Add column</button></div>`;}
  const isLayout=d.layout;
  return `<div class="card pad"><div class="row" style="margin-bottom:8px"><b style="display:inline-flex;align-items:center;gap:7px">${svg(d.ic,17)} ${d.label}</b>
    <span class="sp"></span><button class="btn sm ghost" data-action="${A.del}" data-fid="${fl.id}">Delete</button></div>
    <div class="field"><label>${isLayout?'Text':'Label'}</label><input class="inp" data-prop="label" value="${esc(fl.label)}"></div>
    ${isLayout?'':`
    <div class="field"><label>Column key <span class="muted tiny">(for formulas & conditions)</span></label>
      <input class="inp mono" data-prop="key" value="${esc(fl.key||'')}" placeholder="${fieldKey(fl)}"></div>
    <div class="field"><label>Help / description</label><input class="inp" data-prop="help" value="${esc(fl.help||'')}"></div>
    ${['divider','heading','description'].includes(fl.type)?'':`
    <div class="f2">
      <div class="field" style="margin:0"><label>Placeholder</label><input class="inp" data-prop="placeholder" value="${esc(fl.placeholder||'')}"></div>
      <div class="field" style="margin:0"><label>Default value</label><input class="inp" data-prop="defaultValue" value="${esc(fl.defaultValue||'')}"></div>
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
      <label class="checkline" style="margin:0;padding:5px 9px"><input type="checkbox" data-action="${A.toggleVis}" data-fid="${fl.id}" ${fl.visibleIf?'checked':''}> show only if…</label></div>
      ${fl.visibleIf?`<div class="f2" style="margin-top:8px">
        <select class="inp" data-visif="field">${[['','— field —'],...columns.filter(x=>x.id!==fl.id&&!FieldTypes[x.type]?.layout).map(x=>[fieldKey(x),x.label])].map(([v,l])=>`<option value="${v}" ${fl.visibleIf.field===v?'selected':''}>${esc(l)}</option>`).join('')}</select>
        <select class="inp" data-visif="op">${WorkflowEngine.condOps.map(([v,l])=>`<option value="${v}" ${fl.visibleIf.op===v?'selected':''}>${l}</option>`).join('')}</select>
        <input class="inp full" data-visif="value" value="${esc(fl.visibleIf.value||'')}" placeholder="value"></div>`:''}
    </div>`}
  </div>`;
}
