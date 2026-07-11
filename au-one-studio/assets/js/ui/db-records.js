/* AU ONE STUDIO · db-records.js
   Database Engine — records host page for a table: toolbar (view switch, quick
   filter, group-by) + db-views.js render. The quick-filter input is wired directly
   (like router.js's own openSearch()) rather than through a full page re-render,
   so typing doesn't steal its own focus.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · RECORDS (UI)
   ========================================================================== */
/* routes back into whichever section the table belongs to — Objects (kind:'object')
   stay in Object Studio, everything else stays in Database — so "back" from a
   record list returns to the right list, not always the raw Tables grid */
async function openTableRecords(id){
  const t=await Tables.get(id);
  APP.view=(t&&t.kind==='object')?'objects':'database';
  APP.dbTable=id;APP.dbView=APP.dbView||'table';TBL_EDITING=null;OBJ_EDITING=null;
  render();
}
async function closeTableRecords(){ APP.dbTable=null;render(); }

async function renderTableRecords(c){
  const t=await Tables.get(APP.dbTable);if(!t){APP.dbTable=null;return render();}
  const view=APP.dbView||'table';
  const groupableCols=(t.columns||[]).filter(col=>!FieldTypes[col.type]?.layout);
  const savedViews=t.system?[]:(await Store.list('views')).filter(v=>v.context==='db:'+t.id);
  c.innerHTML=subEditorHeader({
    breadcrumbParts:t.system?[
      {label:'All tables',action:'closeTableRecords'},
      {html:`<span class="icon" style="width:28px;height:28px;background:${t.color}">${svg(t.icon,16)}</span><b>${esc(t.name)}</b>`},
    ]:[
      {label:t.kind==='object'?'All objects':'All tables',action:'closeTableRecords'},
      {label:t.name,action:t.kind==='object'?'editObject':'editTable',id:t.id},
      {html:`<span class="icon" style="width:28px;height:28px;background:${t.color}">${svg(t.icon,16)}</span><b>Records</b>`},
    ],
    actions:t.system?'<span class="chip">Browse only</span>':`<button class="btn primary" data-action="newRecord" data-tid="${t.id}">${svg('plus',15)} New record</button>`
  })+viewToolbar({
    views:DB_VIEWS,activeView:view,viewAction:'dbView',
    quickFilter:{id:'dbQuickFilter',value:APP.dbQuery,placeholder:'Quick filter…'},
    groupBy:(view==='kanban'&&groupableCols.length)?{
      options:groupableCols.map(col=>[fieldKey(col),col.label]),
      action:'dbGroupSel',value:APP.dbGroupField||t.groupColumn||'status'
    }:null,
    saveViewAction:t.system?null:'saveView',savedViews
  })+`
  <div id="dbViewMount" style="margin-top:12px"></div>
  <div class="tiny muted" id="dbRecCount" style="margin-top:8px"></div>`;
  const qf=$('#dbQuickFilter');
  qf.addEventListener('input',()=>{APP.dbQuery=qf.value;refreshDbView(t);});
  return refreshDbView(t);
}
async function refreshDbView(t){
  let rows=await Records.list(t);
  const q=(APP.dbQuery||'').trim().toLowerCase();
  if(q){const cols=(t.columns||[]).filter(col=>!FieldTypes[col.type]?.layout);
    rows=rows.filter(r=>cols.some(col=>String(r[fieldKey(col)]??'').toLowerCase().includes(q)));}
  const view=APP.dbView||'table';
  const renderer=DB_VIEW_TYPES[view]||viewTable;
  const mount=$('#dbViewMount');if(!mount)return;
  renderer(t,rows,{groupField:APP.dbGroupField,dateField:t.dateColumn},mount);
  const cnt=$('#dbRecCount');if(cnt)cnt.textContent=rows.length+' record(s)';
}
