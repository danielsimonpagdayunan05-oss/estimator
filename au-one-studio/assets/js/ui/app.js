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
  $('#toasts').appendChild(t);setTimeout(()=>{t.style.opacity=0;t.style.transition='.3s';setTimeout(()=>t.remove(),300);},2600);}

function modal({title,body,footer,wide}){
  const root=$('#modalRoot');
  root.innerHTML=`<div class="overlay" data-action="closeModalBg"><div class="modal" style="${wide?'max-width:820px':''}" data-stop>
    <div class="mh"><h3>${esc(title)}</h3><button class="x" data-action="closeModal">${svg('x',17)}</button></div>
    <div class="mb">${body}</div>${footer?`<div class="mf">${footer}</div>`:''}</div></div>`;
}
function closeModal(){$('#modalRoot').innerHTML='';}

const NAV=[
  {id:'dashboard',ic:'layout-dashboard',label:'Dashboard'},
  {id:'inbox',ic:'inbox',label:'My Approvals'},
  {id:'requests',ic:'folder',label:'Requests'},
  {id:'forms',ic:'layout-template',label:'Form Builder'},
  {id:'templates',ic:'library',label:'Templates'},
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
  settings:['Configuration','Directory, roles, departments & modules']};

const BOTNAV=['dashboard','inbox','requests','forms','settings'];
async function renderChrome(){
  const inbox=await inboxCount();const un=await Notify.unread();
  const mb=$('#menuBtn');if(mb&&!mb.innerHTML)mb.innerHTML=svg('menu',18);
  $('#searchBtn').innerHTML=svg('search',17);
  Theme.apply();
  $('#bell').innerHTML=svg('bell',17)+(un?`<span class="dot"></span>`:'');
  $('#fab').innerHTML=svg('plus',26);
  $('#botnav').innerHTML=BOTNAV.map(id=>{const n=NAV.find(x=>x.id===id);
    const badge=id==='inbox'&&inbox?`<span class="nb">${inbox}</span>`:'';
    return `<button data-action="go" data-view="${id}" class="${APP.view===id?'on':''}">${svg(n.ic,20)}<span>${n.label.split(' ')[0]}</span>${badge}</button>`;}).join('');
}
async function render(){
  await renderNav();await renderChrome();
  const [t,s]=TITLES[APP.view]||['',''];
  $('#viewTitle').textContent=t;$('#viewSub').textContent=s;
  const c=$('#content');
  if(APP.view==='dashboard')return renderDashboard(c);
  if(APP.view==='inbox')return renderInbox(c);
  if(APP.view==='requests')return renderRequests(c);
  if(APP.view==='forms')return APP.editing?renderBuilder(c):renderForms(c);
  if(APP.view==='templates')return renderTemplates(c);
  if(APP.view==='settings')return renderSettings(c);
}

/* ---------- Dashboard ---------- */
