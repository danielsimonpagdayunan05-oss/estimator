/* AU ONE STUDIO · config.js
   Field-type registry, seed directory, field factory
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   2 · CONFIGURATION LAYER
   Field-type registry (the low-code catalogue) + seed directory/modules/templates.
   Adding a field type = one entry here. Nothing else hardcoded.
   ========================================================================== */
const FieldTypes = {
  // input fields ------------------------------------------------------------
  text:{label:'Single Line Text',ic:'type',cat:'Basic',value:''},
  paragraph:{label:'Paragraph',ic:'align-left',cat:'Basic',value:''},
  number:{label:'Number',ic:'hash',cat:'Basic',value:''},
  currency:{label:'Currency',ic:'banknote',cat:'Basic',value:''},
  date:{label:'Date',ic:'calendar',cat:'Basic',value:''},
  time:{label:'Time',ic:'clock',cat:'Basic',value:''},
  email:{label:'Email',ic:'mail',cat:'Basic',value:''},
  phone:{label:'Phone',ic:'smartphone',cat:'Basic',value:''},
  // choice ------------------------------------------------------------------
  dropdown:{label:'Dropdown',ic:'list',cat:'Choice',opts:true,value:''},
  radio:{label:'Radio',ic:'circle-dot',cat:'Choice',opts:true,value:''},
  checkbox:{label:'Checkbox',ic:'square-check',cat:'Choice',value:false},
  multiselect:{label:'Multi Select',ic:'list-checks',cat:'Choice',opts:true,value:[]},
  yesno:{label:'Yes / No',ic:'toggle-left',cat:'Choice',value:''},
  rating:{label:'Rating',ic:'star',cat:'Choice',value:0},
  // advanced ----------------------------------------------------------------
  signature:{label:'Signature',ic:'pen-tool',cat:'Advanced',value:''},
  location:{label:'Location',ic:'map-pin',cat:'Advanced',value:''},
  qrcode:{label:'QR Code',ic:'qr-code',cat:'Advanced',value:''},
  barcode:{label:'Barcode',ic:'barcode',cat:'Advanced',value:''},
  image:{label:'Image Upload',ic:'image',cat:'Advanced',value:''},
  file:{label:'File Upload',ic:'paperclip',cat:'Advanced',value:''},
  repeating:{label:'Repeating Table',ic:'table',cat:'Advanced',value:[]},
  // pickers (data-driven) ---------------------------------------------------
  people:{label:'People Picker',ic:'user',cat:'Picker',source:'people',value:''},
  project:{label:'Project Picker',ic:'hard-hat',cat:'Picker',source:'projects',value:''},
  department:{label:'Department Picker',ic:'building-2',cat:'Picker',source:'departments',value:''},
  role:{label:'Role Picker',ic:'shield',cat:'Picker',source:'roles',value:''},
  lookup:{label:'Dynamic Lookup',ic:'search',cat:'Picker',opts:true,value:''},
  // computed / layout -------------------------------------------------------
  formula:{label:'Formula Field',ic:'calculator',cat:'Computed',value:''},
  calculated:{label:'Calculated Field',ic:'sigma',cat:'Computed',value:''},
  hidden:{label:'Hidden Field',ic:'eye-off',cat:'Computed',value:''},
  divider:{label:'Section Divider',ic:'minus',cat:'Layout',layout:true},
  heading:{label:'Heading',ic:'heading',cat:'Layout',layout:true},
  description:{label:'Description',ic:'text',cat:'Layout',layout:true},
};
const FIELD_CATS=['Basic','Choice','Advanced','Picker','Computed','Layout'];

const ICON_CHOICES=['file-text','banknote','hard-hat','receipt','clipboard-list','wrench','truck','shield-check','flame','package','calendar-days','plane','user','badge','files','flask-conical','settings','building-2','shopping-cart','send'];
const COLOR_CHOICES=['#4f46e5','#0284c7','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0d9488','#ca8a04','#475569'];
const ACTION_TYPES=['approve','reject','return','revision','comment','delegate','escalate','forward','cancel'];

/* -- seed data (only written once, on first run) -- */
const SEED = {
  people:[
    {id:'u1',name:'Juan Dela Cruz',role:'Employee',department:'Construction',color:'#4f46e5'},
    {id:'u2',name:'Ramon Silva',role:'Supervisor',department:'Construction',color:'#0284c7'},
    {id:'u3',name:'Engr. Vic Reyes',role:'Construction Head',department:'Construction',color:'#059669'},
    {id:'u4',name:'Grace Tan',role:'Finance',department:'Finance',color:'#d97706'},
    {id:'u5',name:'Arch. Dan Pagdayunan',role:'CEO',department:'Executive',color:'#dc2626'},
    {id:'u6',name:'Liza Cruz',role:'HR',department:'HR',color:'#db2777'},
    {id:'u7',name:'Mark Uy',role:'Procurement',department:'Procurement',color:'#7c3aed'},
    {id:'u8',name:'Engr. Paolo Lim',role:'Project Director',department:'Construction',color:'#0d9488'},
  ],
  roles:['Employee','Supervisor','Construction Head','Project Director','Finance','Procurement','HR','QAQC','CEO'].map(r=>({id:r,name:r})),
  departments:['Construction','Finance','Design','HR','Sales','Procurement','QAQC','Executive'].map(d=>({id:d,name:d})),
  modules:['Construction','Finance','Design','HR','Sales','Procurement','QAQC','Incentive','Inventory','Equipment','Documents'].map(m=>({id:m,name:m})),
  projects:[
    {id:'p1',name:'LP House'},{id:'p2',name:'Dela Cruz Residence'},
    {id:'p3',name:'Skyline Tower'},{id:'p4',name:'Coastal Villa'},
  ],
};

/* -- field factory -- */
function makeField(type){
  const def=FieldTypes[type];const f={id:uid('f'),type,key:'',label:def.label,help:'',required:false,width:'full'};
  if(def.opts)f.options=[{label:'Option 1',value:'Option 1'},{label:'Option 2',value:'Option 2'}];
  if(type==='yesno')f.options=[{label:'Yes',value:'Yes'},{label:'No',value:'No'}];
  if(type==='repeating')f.columns=[{key:'item',label:'Item',type:'text'},{key:'qty',label:'Qty',type:'number'}];
  if(type==='formula'||type==='calculated')f.expression='';
  if(type==='lookup')f.source='';
  if(def.layout){f.required=false;delete f.key;}
  if(type==='heading')f.label='Section Heading';
  if(type==='description')f.label='Add descriptive text here.';
  return f;
}
function fieldKey(f){return f.key||('f_'+f.id.slice(-6));}
