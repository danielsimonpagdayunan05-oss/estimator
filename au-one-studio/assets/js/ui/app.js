/* AU ONE STUDIO · app.js
   App state, theme, modal/toast, nav, render router, chrome
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   9 · UI ENGINE  (app state, router, rendering, toasts, modals)
   ========================================================================== */
const APP={view:'dashboard',user:null,editing:null,navOpen:false,reqView:'cards',theme:'auto'};
const DIR={people:[],roles:[],departments:[],modules:[],projects:[]};

/* ---- Theme engine (auto / light / dark), persisted ---- */
const Theme={
  order:['auto','light','dark'],
  ic:{auto:'settings',light:'star',dark:'shield'},
  apply(){const t=APP.theme;if(t==='auto')document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme',t);
    const b=$('#themeBtn');if(b)b.innerHTML=svg(t==='dark'?'shield':t==='light'?'star':'settings',17);
    try{localStorage.setItem('ace_theme',t);}catch(e){}},
  cycle(){APP.theme=this.order[(this.order.indexOf(APP.theme)+1)%3];this.apply();
    toast('Theme: '+APP.theme,'');},
  load(){try{APP.theme=localStorage.getItem('ace_theme')||'auto';}catch(e){}this.apply();}
};

function toast(msg,kind=''){const t=document.createElement('div');t.className='toast '+kind;t.textContent=msg;
  $('#toasts').appendChild(t);setTimeout(()=>{t.classList.add('out');setTimeout(()=>t.remove(),220);},2600);}

/* Phase 4: focus management — modal() remembers whatever had focus before it
   opened (so closeModal() can restore it, instead of leaving focus on a
   removed/hidden element) and moves focus into the dialog itself; adds
   role="dialog"/aria-modal/aria-labelledby for screen readers. Action-grid
   modals (objMore/objectMore/formMore/tableMore/reqMore's identical
   `.mb > <div class="grid">…btn block…</div>` shape) get real menu semantics +
   arrow-key nav (wireArrowNav, commands.js) for free — a single integration
   point instead of touching each of those 5 functions individually. */
let MODAL_LAST_FOCUS=null;
function modal({title,body,footer,wide}){
  MODAL_LAST_FOCUS=document.activeElement;
  const root=$('#modalRoot');
  root.innerHTML=`<div class="overlay" data-action="closeModalBg"><div class="modal" style="${wide?'max-width:820px':''}" data-stop tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="mh"><h3 id="modalTitle">${esc(title)}</h3><button class="x" data-action="closeModal" aria-label="Close">${svg('x',17)}</button></div>
    <div class="mb">${body}</div>${footer?`<div class="mf">${footer}</div>`:''}</div></div>`;
  const modalEl=root.querySelector('.modal');
  const grid=modalEl?modalEl.querySelector('.mb > .grid'):null;
  const menuItems=grid?[...grid.querySelectorAll('.btn.block')]:[];
  if(grid&&menuItems.length){
    grid.setAttribute('role','menu');
    menuItems.forEach(b=>{b.setAttribute('role','menuitem');b.tabIndex=-1;});
    wireArrowNav(modalEl,grid,'.btn.block');
    menuItems[0].focus({preventScroll:true});
  }else if(modalEl){
    modalEl.focus({preventScroll:true});
  }
}
/* plays the .closing exit animation (base.css: fadeout/popout/sheetdown) before
   actually clearing #modalRoot, instead of the previous instant cut to nothing;
   restores focus to whatever triggered the modal, if it's still on the page.
   Several call sites (e.g. router.js's `editResubmit` case) call closeModal()
   and then immediately open a DIFFERENT modal in the same tick — guard the
   delayed clear with a contains() check so it only ever removes the overlay it
   was scheduled for, never a newer one that has since replaced it. */
function closeModal(){
  const overlay=$('#modalRoot .overlay');
  if(!overlay){$('#modalRoot').innerHTML='';return;}
  overlay.classList.add('closing');
  setTimeout(()=>{
    if(!$('#modalRoot').contains(overlay))return; // superseded by a newer modal() call — leave it alone
    $('#modalRoot').innerHTML='';
    if(MODAL_LAST_FOCUS&&document.contains(MODAL_LAST_FOCUS))MODAL_LAST_FOCUS.focus({preventScroll:true});
    MODAL_LAST_FOCUS=null;
  },200);
}

const NAV=[
  {id:'dashboard',ic:'layout-dashboard',label:'Dashboard'},
  {id:'inbox',ic:'inbox',label:'My Approvals'},
  {id:'requests',ic:'folder',label:'Requests'},
  {id:'forms',ic:'layout-template',label:'Form Builder'},
  {id:'templates',ic:'library',label:'Templates'},
  {id:'objects',ic:'package',label:'Object Studio'},
  {id:'database',ic:'table',label:'Database'},
  {id:'settings',ic:'settings',label:'Configuration'},
];

async function renderNav(){
  const inbox=await inboxCount();
  $('#side').innerHTML=`
    <div class="logo"><div class="mark">AU</div><div><h1>AU One Studio</h1><small>Low-Code Platform</small></div></div>
    <div class="nav">${NAV.map(n=>`<button data-action="go" data-view="${n.id}" class="${APP.view===n.id?'on':''}">
      <span class="ic">${svg(n.ic,19)}</span><span>${n.label}</span>${n.id==='inbox'&&inbox?`<span class="badge">${inbox}</span>`:''}</button>`).join('')}</div>
    <div class="who"><label>Signed in as</label>
      <select data-action="switchUser">${DIR.people.map(p=>`<option value="${p.id}" ${p.id===APP.user.id?'selected':''}>${esc(p.name)}</option>`).join('')}</select>
      <div class="role" style="display:flex;align-items:center;gap:6px">${svg('badge',13)} ${esc(APP.user.role)} · ${esc(APP.user.department)}</div>
    </div>`;
}

async function inboxCount(){
  const reqs=await Store.list('requests');
  return reqs.filter(r=>['pending','inprogress'].includes(r.status)&&Permission.isApproverFor(r.steps[r.currentStep])).length;
}

const TITLES={dashboard:['Dashboard','Overview of approvals and activity'],
  inbox:['My Approvals','Requests waiting on your decision'],
  requests:['Requests','Every submission across the organisation'],
  forms:['Form Builder','Design configuration-driven request forms'],
  templates:['Templates','Start from a pre-built form template'],
  objects:['Object Studio','Business Objects — schema, form, views, workflow & approval, generated together'],
  database:['Database','Tables, records, relationships & views'],
  settings:['Configuration','Directory, roles, departments & modules']};

const BOTNAV=['dashboard','inbox','requests','forms','settings'];
async function renderChrome(){
  const inbox=await inboxCount();const un=await Notify.unread();
  const mb=$('#menuBtn');if(mb&&!mb.innerHTML)mb.innerHTML=svg('menu',18);
  $('#searchBtn').innerHTML=svg('search',17);
  $('#quickCreateBtn').innerHTML=svg('plus',18);
  Theme.apply();
  $('#bell').innerHTML=svg('bell',17)+(un?`<span class="dot"></span>`:'');
  $('#fab').innerHTML=svg('plus',26);
  const moreViews=NAV.filter(n=>!BOTNAV.includes(n.id));
  const moreOn=moreViews.some(n=>n.id===APP.view);
  $('#botnav').innerHTML=BOTNAV.map(id=>{const n=NAV.find(x=>x.id===id);
    const badge=id==='inbox'&&inbox?`<span class="nb">${inbox}</span>`:'';
    return `<button data-action="go" data-view="${id}" class="${APP.view===id?'on':''}">${svg(n.ic,20)}<span>${n.label.split(' ')[0]}</span>${badge}</button>`;}).join('')
    +`<button data-action="moreNav" class="${moreOn?'on':''}">${svg('ellipsis',20)}<span>More</span></button>`;
}
/* Phase 4: the 3 NAV entries BOTNAV's fixed 5-slot mobile bar omits (Templates/
   Objects/Database) — reachable via the 6th "More" bottom-nav button instead of
   only the off-canvas hamburger sidebar. */
function moreNav(){
  const extras=NAV.filter(n=>!BOTNAV.includes(n.id));
  modal({title:'More',body:`<div class="grid" style="grid-template-columns:1fr 1fr">
    ${extras.map(n=>`<button class="btn block" data-action="go" data-view="${n.id}">${svg(n.ic,15)} ${n.label}</button>`).join('')}
    </div>`});
}
/* Phase 4: the topbar title reflects the specific record/form/object/table being
   edited (not just the generic view name) whenever an editing-id global is set —
   falls back to undefined (caller uses TITLES[APP.view]) for every other view. */
async function editingEntityName(){
  if(APP.view==='forms'&&APP.editing){const f=await Store.get('forms',APP.editing);return f?f.name:undefined;}
  if(APP.view==='objects'&&OBJ_EDITING){const o=await Objects.get(OBJ_EDITING);return o?o.name:undefined;}
  if(APP.view==='database'&&TBL_EDITING){const t=await Tables.get(TBL_EDITING);return t?t.name:undefined;}
  if((APP.view==='database'||APP.view==='objects')&&APP.dbTable){const t=await Tables.get(APP.dbTable);return t?t.name:undefined;}
  return undefined;
}
async function render(){
  await renderNav();await renderChrome();
  const [t,s]=TITLES[APP.view]||['',''];
  $('#viewTitle').textContent=await editingEntityName()||t;$('#viewSub').textContent=s;
  const c=$('#content');
  /* page-transition rise: only when navigating to a DIFFERENT view — in-view
     re-renders (filter clicks, sorts, edits) must not flash */
  if(render._lastView!==APP.view){c.classList.remove('view-anim');void c.offsetWidth;c.classList.add('view-anim');render._lastView=APP.view;}
  if(APP.view==='dashboard')return renderDashboard(c);
  if(APP.view==='inbox')return renderInbox(c);
  if(APP.view==='requests')return renderRequests(c);
  if(APP.view==='forms')return APP.editing?renderBuilder(c):renderForms(c);
  if(APP.view==='templates')return renderTemplates(c);
  if(APP.view==='objects')return OBJ_EDITING?renderObjectEditor(c):(APP.dbTable?renderTableRecords(c):renderObjectsList(c));
  if(APP.view==='database')return TBL_EDITING?renderTableSchema(c):(APP.dbTable?renderTableRecords(c):renderTables(c));
  if(APP.view==='settings')return renderSettings(c);
}

/* ---------- Dashboard ---------- */
