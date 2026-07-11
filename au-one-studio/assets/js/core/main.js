/* AU ONE STUDIO · main.js
   Seeding, templates, keyboard, pull-to-refresh, boot
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   11 · SEEDING + BOOT
   ========================================================================== */
async function loadDir(){
  DIR.people=await Store.list('people');DIR.roles=await Store.list('roles');
  DIR.departments=await Store.list('departments');DIR.modules=await Store.list('modules');
  DIR.projects=await Store.list('projects');
}
function tpl(name,desc,icon,color,module,fields,steps){
  return {id:uid('form'),name,description:desc,icon,color,department:module,module,category:'Template',version:1,
    status:'published',isTemplate:true,fields:fields.map(f=>({...makeField(f.type),...f,id:uid('f')})),
    workflow:{steps:steps.map(s=>({id:uid('s'),mode:'sequential',condition:null,slaHours:24,approverType:'role',...s}))},
    permissions:{submit:[],approve:[],edit:[],delete:[],archive:[]}};
}
async function seedIfEmpty(){
  const raw=await Store.raw();
  if(!raw.people){for(const c in SEED)await Store.bulk(c,SEED[c]);}
  const forms=await Store.list('forms');
  if(!forms.some(f=>f.isTemplate)){
    const templates=[
      tpl('Petty Cash Request','Request petty cash for site expenses','banknote','#059669','Finance',
        [{type:'text',key:'purpose',label:'Purpose',required:true},
         {type:'currency',key:'amount',label:'Amount',required:true},
         {type:'project',key:'project',label:'Project',required:true},
         {type:'date',key:'needed',label:'Date needed'},
         {type:'paragraph',key:'notes',label:'Justification'}],
        [{name:'Supervisor',role:'Supervisor'},{name:'Finance',role:'Finance'},
         {name:'CEO (large amounts)',role:'CEO',condition:{field:'amount',op:'gt',value:'50000'}}]),
      tpl('Purchase Request','Procure materials or services','shopping-cart','#0284c7','Procurement',
        [{type:'text',key:'item',label:'Item / service',required:true},
         {type:'number',key:'qty',label:'Quantity',required:true,width:'half'},
         {type:'currency',key:'unit_price',label:'Unit price',required:true,width:'half'},
         {type:'formula',key:'total',label:'Estimated total',expression:'{qty} * {unit_price}'},
         {type:'project',key:'project',label:'Project'},
         {type:'department',key:'dept',label:'Requesting dept'}],
        [{name:'Supervisor',role:'Supervisor'},{name:'Procurement',role:'Procurement'},
         {name:'Construction Head',role:'Construction Head'},
         {name:'CEO (> ₱100k)',role:'CEO',condition:{field:'total',op:'gt',value:'100000'}}]),
      tpl('Leave Request','Apply for leave','plane','#7c3aed','HR',
        [{type:'dropdown',key:'leave_type',label:'Leave type',required:true,options:[{label:'Vacation',value:'Vacation'},{label:'Sick',value:'Sick'},{label:'Emergency',value:'Emergency'}]},
         {type:'date',key:'from',label:'From',required:true,width:'half'},
         {type:'date',key:'to',label:'To',required:true,width:'half'},
         {type:'paragraph',key:'reason',label:'Reason'}],
        [{name:'Supervisor',role:'Supervisor'},{name:'HR',role:'HR'}]),
      tpl('Material Request','Request materials for delivery to site','package','#d97706','Construction',
        [{type:'project',key:'project',label:'Project',required:true},
         {type:'repeating',key:'items',label:'Materials',columns:[{key:'material',label:'Material',type:'text'},{key:'qty',label:'Qty',type:'number'},{key:'unit',label:'Unit',type:'text'}]},
         {type:'date',key:'needed',label:'Needed by'},
         {type:'radio',key:'priority',label:'Priority',options:[{label:'Normal',value:'Normal'},{label:'Urgent',value:'Urgent'}]}],
        [{name:'Supervisor',role:'Supervisor'},{name:'Construction Head',role:'Construction Head'},{name:'Procurement',role:'Procurement'}]),
      tpl('Site Inspection / QAQC','Quality inspection checklist','flask-conical','#0d9488','QAQC',
        [{type:'project',key:'project',label:'Project',required:true},
         {type:'heading',label:'Checklist'},
         {type:'yesno',key:'formworks_ok',label:'Formworks aligned & braced'},
         {type:'yesno',key:'rebar_ok',label:'Rebar size & spacing correct'},
         {type:'rating',key:'workmanship',label:'Workmanship rating'},
         {type:'image',key:'photo',label:'Photo evidence'},
         {type:'signature',key:'inspector_sig',label:'Inspector signature'}],
        [{name:'QAQC Head',role:'QAQC'},{name:'Construction Head',role:'Construction Head'}]),
      tpl('Cash Advance','Employee cash advance','receipt','#dc2626','Finance',
        [{type:'currency',key:'amount',label:'Amount',required:true},
         {type:'paragraph',key:'purpose',label:'Purpose',required:true},
         {type:'date',key:'payback',label:'Expected liquidation date'}],
        [{name:'Supervisor',role:'Supervisor'},{name:'Finance',role:'Finance'},
         {name:'CEO',role:'CEO',condition:{field:'amount',op:'gt',value:'20000'}}]),
    ];
    for(const t of templates)await Store.upsert('forms',t);
  }
}
/* keyboard shortcuts: ⌘/Ctrl+K search · Esc close · ⌘/Ctrl+Z/Y undo/redo in builder */
document.addEventListener('keydown',e=>{
  const k=e.key.toLowerCase();
  if((e.metaKey||e.ctrlKey)&&k==='k'){e.preventDefault();openSearch();return;}
  if(e.key==='Escape'&&$('#modalRoot').innerHTML){closeModal();return;}
  if((e.metaKey||e.ctrlKey)&&APP.editing&&APP.builderTab==='fields'){
    if(k==='z'){e.preventDefault();History.undo();}
    else if(k==='y'||(k==='z'&&e.shiftKey)){e.preventDefault();History.redo();}
  }
});
/* pull-to-refresh (mobile) */
(function(){let sy=0,pulling=false;const pull=()=>$('#pull');
  window.addEventListener('touchstart',e=>{if(window.scrollY<=0&&innerWidth<=820){sy=e.touches[0].clientY;pulling=true;}},{passive:true});
  window.addEventListener('touchmove',e=>{if(!pulling)return;const dy=e.touches[0].clientY-sy;
    if(dy>0&&window.scrollY<=0){const h=Math.min(dy*.4,60);pull().style.height=h+'px';pull().textContent=h>48?'Release to refresh':'Pull to refresh';}},{passive:true});
  window.addEventListener('touchend',()=>{if(!pulling)return;pulling=false;const h=parseFloat(pull().style.height)||0;
    pull().style.height='0px';if(h>48){render();toast('Refreshed','');}});
})();

async function boot(){
  Theme.load();
  await seedIfEmpty();
  if(typeof Plugins!=='undefined')await Plugins.bootAll();   // let registered modules contribute
  await loadDir();
  APP.user=DIR.people[0];
  await render();
  Bus.emit('app:ready',AUS);
}
boot();
