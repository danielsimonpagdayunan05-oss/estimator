/* AU ONE STUDIO · archiunite-seed.js
   One-time migration: rebuilds Archiunite Design & Construction's real approval
   suite (captured from their live Jotform app) as Business Objects in Object
   Studio. Mirrors main.js's tpl() helper pattern for Forms, but for Objects —
   objTpl() builds the {columns,steps} envelope via the same {...makeField(type),
   ...override} idiom already used everywhere in this codebase.
   Idempotent: seedArchiuniteBusinessObjects() no-ops after its first successful
   run (isSeed:true marker on every Object it creates), so it's safe to call on
   every boot.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   ARCHIUNITE SEED · reference data + business object definitions
   ========================================================================== */
const tradeOptions=()=>[
  {label:'Carpentry',value:'Carpentry'},{label:'Electrical',value:'Electrical'},
  {label:'Plumbing',value:'Plumbing'},{label:'Masonry',value:'Masonry'},
  {label:'Painting',value:'Painting'},{label:'Other',value:'Other'},
];

function objTpl(name,pluralName,icon,color,module,category,fields,steps){
  return {
    name,pluralName,icon,color,module,category,
    columns:fields.map(f=>({...makeField(f.type),...f,id:uid('f')})),
    primaryColumn:'submittedByName',subtitleColumn:'',
    steps:steps.map(s=>({id:uid('s'),name:s.name,approverType:'role',role:s.role,
      mode:'sequential',condition:s.condition||null,slaHours:s.slaHours||24})),
  };
}

/* idempotent — reads current collections and appends via Store.bulk, never a loop
   of Store.upsert (which unshifts new records and would silently displace
   DIR.people[0] === APP.user, the app's simulated logged-in identity) */
async function seedArchiuniteRefData(){
  const roles=await Store.list('roles');
  await Store.bulk('roles',roles.concat([
    {id:'Design & Construction Head',name:'Design & Construction Head'},
    {id:'Finance Head',name:'Finance Head'},
  ]));

  const people=await Store.list('people');
  const newPeople=[
    {id:'u9',name:'Ar. Jeff',role:'Design & Construction Head',department:'Construction'},
    {id:'u10',name:'Maam Aurora',role:'Finance Head',department:'Finance'},
    {id:'u11',name:'Daniel',role:'Employee',department:'Construction'},
    {id:'u12',name:'Kylee',role:'Employee',department:'Construction'},
    {id:'u13',name:'Joshua',role:'Employee',department:'Construction'},
    {id:'u14',name:'Lois',role:'Employee',department:'Construction'},
    {id:'u15',name:'Brice',role:'Employee',department:'Construction'},
    {id:'u16',name:'Kyla',role:'Employee',department:'Construction'},
    {id:'u17',name:'Gian',role:'Employee',department:'Construction'},
    {id:'u18',name:'Karlos',role:'Employee',department:'Construction'},
    {id:'u19',name:'Harry',role:'Employee',department:'Construction'},
    {id:'u20',name:'Anne',role:'Employee',department:'Construction'},
    {id:'u21',name:'Jessline',role:'Employee',department:'Construction'},
    {id:'u22',name:'Allysa',role:'Employee',department:'Construction'},
    {id:'u23',name:'Rino',role:'Employee',department:'Construction'},
    {id:'u24',name:'Aidan',role:'Employee',department:'Construction'},
    {id:'u25',name:'Ulrich',role:'Employee',department:'Construction'},
  ].map((p,i)=>({...p,color:COLOR_CHOICES[i%COLOR_CHOICES.length]}));
  await Store.bulk('people',people.concat(newPeople));

  const projects=await Store.list('projects');
  await Store.bulk('projects',projects.concat([
    {id:'p5',name:'RTD'},{id:'p6',name:'OBP'},{id:'p7',name:'SHUTTER'},{id:'p8',name:'CHVZ'},
    {id:'p9',name:'SWAY'},{id:'p10',name:'SYNC'},{id:'p11',name:'VALLEY'},{id:'p12',name:'TWIN'},
    {id:'p13',name:'AURA'},{id:'p14',name:'CENTRADE'},{id:'p15',name:'PEAK+'},{id:'p16',name:'VERDELLA'},
    {id:'p17',name:'NEXUS'},{id:'p18',name:'WEAVE'},{id:'p19',name:'OASIS'},
  ]));
}

function buildArchiuniteObjectDefs(){
  const raw=[
    {
      name:'Construction PO Form',pluralName:'Construction PO Forms',icon:'truck',color:'#0284c7',
      module:'Construction',category:'Design & Construction',subtitleColumn:'price',
      fields:[
        {type:'people',key:'project_in_charge',label:'Project-In-Charge',required:true},
        {type:'project',key:'site',label:'SITE',required:true},
        {type:'date',key:'date_needed',label:'Date Needed',required:true},
        {type:'file',key:'file_upload',label:'File Upload',required:true},
        {type:'dropdown',key:'price',label:'Price',required:true,
          options:[{label:'Below 50k',value:'Below 50k'},{label:'Above 50k',value:'Above 50k'}]},
        {type:'paragraph',key:'remarks',label:'Remarks'},
        {type:'rating',key:'urgency',label:'URGENCY',help:'1 = TYT (take your time), 5 = ASAP'},
      ],
      steps:[
        {name:'Design & Construction Head',role:'Design & Construction Head'},
        {name:'Finance Head (Above 50k)',role:'Finance Head',
          condition:{field:'price',op:'eq',value:'Above 50k'}},
      ],
    },
    {
      name:'C.A Tools Tracker',pluralName:'C.A Tools Trackers',icon:'wrench',color:'#d97706',
      module:'Construction',category:'Design & Construction',subtitleColumn:'trade',
      fields:[
        {type:'project',key:'site',label:'SITE',required:true},
        {type:'date',key:'date_submitted',label:'Date Submitted',required:true},
        {type:'date',key:'date_needed',label:'Date Needed',required:true},
        {type:'dropdown',key:'trade',label:'Trade',required:true,options:tradeOptions()},
        {type:'text',key:'tools_needed',label:'Tools Needed',required:true},
        {type:'currency',key:'price',label:'Price',required:true},
      ],
      steps:[{name:'Design & Construction Head',role:'Design & Construction Head'}],
    },
    {
      name:'QPAD & RFA',pluralName:'QPAD & RFA Requests',icon:'file-text',color:'#7c3aed',
      module:'Procurement',category:'Design & Construction',subtitleColumn:'specify_if',
      fields:[
        {type:'date',key:'date',label:'Date',required:true},
        {type:'people',key:'name',label:'Name',required:true},
        {type:'project',key:'site',label:'Site',required:true},
        {type:'dropdown',key:'specify_if',label:'Specify If',required:true,
          options:[{label:'Materials',value:'Materials'},{label:'Labor',value:'Labor'},
                   {label:'Equipment',value:'Equipment'},{label:'Other',value:'Other'}]},
        {type:'dropdown',key:'value',label:'Value',required:true,
          options:[{label:'Below 50k',value:'Below 50k'},{label:'Above 50k',value:'Above 50k'}]},
        {type:'text',key:'purpose',label:'Specific/Purpose of item',required:true,
          help:'saan gagamitin? specify'},
        {type:'currency',key:'client_budget',label:'Client Budget',required:true},
        {type:'currency',key:'internal_budget',label:'Internal Budget',required:true},
        {type:'currency',key:'initial_expenses',label:'Initial Expense/s'},
        {type:'currency',key:'total_quoted_budget',label:'Total Quoted Budget',required:true},
        {type:'currency',key:'request_for_payment',label:'Request for PAYMENT'},
        {type:'formula',key:'estimate_profit',label:'Estimate Profit',
          expression:'{client_budget} - {total_quoted_budget}'},
        {type:'repeating',key:'supplier_comparison',label:'Supplier Comparison',columns:[
          {key:'product',label:'Product',type:'text'},
          {key:'price_per_unit',label:'Price per unit',type:'currency'},
          {key:'qty',label:'QTY',type:'number'},
          {key:'total_cost',label:'Total Cost',type:'number'},
          {key:'days_weeks',label:'No. Days/Weeks',type:'text'},
          {key:'notes',label:'Notes',type:'text'},
        ]},
        {type:'currency',key:'best_supplier_price',label:'Best Supplier Price'},
        {type:'file',key:'quotation_upload',label:'Quotation Upload',required:true},
        {type:'file',key:'design_upload',label:'Design Upload'},
        {type:'file',key:'osm_upload',label:'OSM Upload'},
        {type:'file',key:'additional_upload',label:'Additional Upload'},
        {type:'file',key:'material_upload',label:'Material Upload'},
        {type:'file',key:'office_upload',label:'Office Upload'},
        {type:'dropdown',key:'type_of_payment',label:'Type of Payment',
          options:[{label:'Full Payment',value:'Full Payment'},{label:'Down Payment',value:'Down Payment'},
                   {label:'Partial Payment',value:'Partial Payment'},{label:'Other',value:'Other'}]},
        {type:'multiselect',key:'payment_method',label:'Payment method',
          options:[{label:'Bank Transfer',value:'Bank Transfer'},{label:'Cash',value:'Cash'},
                   {label:'Cash on Delivery',value:'Cash on Delivery'},{label:'Gcash',value:'Gcash'},
                   {label:'Other',value:'Other'}]},
        {type:'dropdown',key:'type_of_delivery',label:'Type of Delivery',
          options:[{label:'Pick-up',value:'Pick-up'},{label:'Delivery',value:'Delivery'},
                   {label:'Courier',value:'Courier'},{label:'Other',value:'Other'}]},
        {type:'number',key:'days_of_delivery_after_dp',label:'Days of Delivery after DP'},
        {type:'paragraph',key:'notes_remarks',label:'Notes/Remarks'},
        {type:'rating',key:'priority',label:'Priority'},
      ],
      steps:[
        {name:'Design & Construction Head',role:'Design & Construction Head'},
        {name:'Finance Head (large budget)',role:'Finance Head',slaHours:48,
          condition:{field:'total_quoted_budget',op:'gt',value:'100000'}},
      ],
    },
    {
      name:'Professional Request Form',pluralName:'Professional Requests',icon:'badge',color:'#0d9488',
      module:'Construction',category:'Design & Construction',subtitleColumn:'professional',
      fields:[
        {type:'description',label:'For our professionals (Engineers, Master Plumber, Outsource Professionals).'},
        {type:'department',key:'department',label:'Department',required:true},
        {type:'text',key:'name',label:'Name',required:true,help:"Professional's name"},
        {type:'project',key:'project_name',label:'Project Name',required:true},
        {type:'dropdown',key:'professional',label:'Professional',required:true,
          options:[{label:'Engineer',value:'Engineer'},{label:'Master Plumber',value:'Master Plumber'},
                   {label:'Electrician',value:'Electrician'},{label:'Outsource Professional',value:'Outsource Professional'},
                   {label:'Other',value:'Other'}]},
        {type:'file',key:'quotation',label:'Quotation'},
        {type:'currency',key:'professional_fee',label:'Professional Fee',required:true},
      ],
      steps:[{name:'Design & Construction Head',role:'Design & Construction Head'}],
    },
    {
      name:'Leave Request',pluralName:'Leave Requests',icon:'plane',color:'#7c3aed',
      module:'HR',category:'Request Form',subtitleColumn:'leave_type',
      fields:[
        {type:'people',key:'name',label:'Name',required:true},
        {type:'text',key:'position',label:'Position'},
        {type:'department',key:'department',label:'Department',required:true},
        {type:'date',key:'leave_start',label:'Leave Start',required:true,width:'half'},
        {type:'date',key:'leave_end',label:'Leave End',required:true,width:'half'},
        {type:'radio',key:'leave_type',label:'Leave Type',required:true,
          options:['Vacation Leave','Sick Leave','Maternity Leave','Paternity Leave','Emergency Leave','Half Day','Other']
            .map(v=>({label:v,value:v}))},
        {type:'radio',key:'leave_status',label:'Leave Status',required:true,
          options:['Paid Leave','Unpaid leave','Other'].map(v=>({label:v,value:v}))},
        {type:'file',key:'upload_proof',label:'Upload Proof'},
        {type:'paragraph',key:'comments',label:'Comments'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
    {
      name:'Overtime Request',pluralName:'Overtime Requests',icon:'clipboard-list',color:'#0284c7',
      module:'HR',category:'Request Form',subtitleColumn:'date_request_overtime',
      fields:[
        {type:'people',key:'name',label:'Name',required:true},
        {type:'department',key:'department',label:'Department',required:true},
        {type:'checkbox',key:'filed_by_admin',label:'Filed by Admin',
          help:'Check if HR/Admin is filing this on behalf of the employee'},
        {type:'date',key:'date_today',label:'Date Today',required:true,width:'half'},
        {type:'date',key:'date_request_overtime',label:'Date Request Overtime',required:true,width:'half'},
        {type:'paragraph',key:'reason',label:'Reason for Overtime work',required:true},
        {type:'time',key:'start_time',label:'Start Time',required:true,width:'half'},
        {type:'time',key:'end_time',label:'End Time',required:true,width:'half'},
        {type:'number',key:'hours_requested',label:'No. of Hours Requested',required:true,
          help:'Enter total hours as a decimal, e.g. 2.5 for 2h30m — start/end time cannot be auto-subtracted'},
        {type:'file',key:'photo_proof',label:'Photo proof',help:'if On-site'},
        {type:'file',key:'minutes_of_meeting',label:'Minutes of the Meeting'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
    {
      name:'Undertime Request',pluralName:'Undertime Requests',icon:'clipboard-list',color:'#dc2626',
      module:'HR',category:'Request Form',subtitleColumn:'date',
      fields:[
        {type:'people',key:'name',label:'Name',required:true},
        {type:'department',key:'department',label:'Department',required:true},
        {type:'date',key:'date',label:'Date',required:true},
        {type:'time',key:'time_left',label:'Time Left',required:true},
        {type:'paragraph',key:'reason',label:'Reason for Undertime',required:true},
        {type:'number',key:'hours_undertime',label:'No. of Hours Undertime',required:true,
          help:'Enter total hours as a decimal, e.g. 1.5 — start/end time cannot be auto-subtracted'},
        {type:'file',key:'upload_approval',label:'Upload Approval'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
    {
      name:'Site Visit Form',pluralName:'Site Visit Forms',icon:'hard-hat',color:'#059669',
      module:'Construction',category:'Request Form',subtitleColumn:'site_visit_type',
      fields:[
        {type:'project',key:'site',label:'Site',required:true},
        {type:'dropdown',key:'site_visit_type',label:'Site Visit',required:true,
          options:['Inspection','Progress Check','Client Meeting','Delivery','Other'].map(v=>({label:v,value:v}))},
        {type:'text',key:'location',label:'Location'},
        {type:'people',key:'name',label:'Name',required:true},
        {type:'date',key:'date',label:'Date',required:true},
        {type:'paragraph',key:'purpose',label:'Purpose of Site Visit',required:true},
        {type:'paragraph',key:'accomplishment',label:'Site Visit Accomplishment'},
        {type:'file',key:'report',label:'Site Visit Report'},
        {type:'phone',key:'phone_number',label:'Phone Number'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
    {
      name:'Late Arrival Form',pluralName:'Late Arrival Forms',icon:'clipboard-list',color:'#ca8a04',
      module:'HR',category:'Request Form',subtitleColumn:'date',
      fields:[
        {type:'people',key:'name',label:'Name',required:true},
        {type:'department',key:'department',label:'Site/Dept',required:true},
        {type:'date',key:'date',label:'Date',required:true},
        {type:'time',key:'time_of_arrival',label:'Time of Arrival',required:true},
        {type:'paragraph',key:'reason',label:'Reason for Tardiness',required:true},
        {type:'file',key:'upload_approval',label:'Upload Approval'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
    {
      name:'General Approval Request',pluralName:'General Approval Requests',icon:'shield-check',color:'#475569',
      module:'Documents',category:'For Admins',subtitleColumn:'remarks',
      fields:[
        {type:'people',key:'name',label:'Name',required:true},
        {type:'file',key:'file_upload',label:'File Upload',required:true},
        {type:'paragraph',key:'remarks',label:'Remarks'},
      ],
      steps:[{name:'HR',role:'HR'}],
    },
    {
      name:'Finance PO Log',pluralName:'Finance PO Logs',icon:'receipt',color:'#0d9488',
      module:'Finance',category:'For Admins',subtitleColumn:'submittedByName',
      primaryColumn:'po_number',
      fields:[
        {type:'description',label:'For Finance Head only.'},
        {type:'text',key:'po_number',label:'PO Number',required:true},
        {type:'file',key:'file_upload',label:'File Upload',required:true},
        {type:'paragraph',key:'remarks',label:'Remarks'},
      ],
      steps:[{name:'Finance Head',role:'Finance Head'}],
    },
    {
      name:'Pakyaw Form',pluralName:'Pakyaw Forms',icon:'hard-hat',color:'#dc2626',
      module:'Finance',category:'PACQ',subtitleColumn:'contract',
      fields:[
        {type:'rating',key:'urgency',label:'Urgency'},
        {type:'people',key:'project_in_charge',label:'Project-In-Charge',required:true},
        {type:'project',key:'site',label:'SITE',required:true},
        {type:'dropdown',key:'contract',label:'CONTRACT',required:true,
          options:['Labor Only','Labor + Materials','Full Package','Other'].map(v=>({label:v,value:v}))},
        {type:'dropdown',key:'trade',label:'Trade',required:true,options:tradeOptions()},
        {type:'currency',key:'internal_budget',label:'Internal Budget',required:true},
        {type:'currency',key:'client_budget',label:'Client Budget',required:true},
        {type:'currency',key:'contract_offer',label:'Contract Offer',required:true},
        {type:'currency',key:'to_be_released',label:'To be Release',required:true},
        {type:'currency',key:'additional_offer',label:'Additional Offer'},
        {type:'file',key:'pakyaw_contract',label:'Pakyaw Contract',required:true},
      ],
      steps:[
        {name:'Finance Head',role:'Finance Head',slaHours:48},
        {name:'CEO (large contracts)',role:'CEO',slaHours:48,
          condition:{field:'contract_offer',op:'gt',value:'300000'}},
      ],
    },
    {
      name:'Employee Feedback Form',pluralName:'Employee Feedback',icon:'send',color:'#7c3aed',
      module:'HR',category:'Feedback',subtitleColumn:'',
      primaryColumn:'department',
      fields:[
        {type:'description',label:"Your identity isn't tied to what you share here — we don't tolerate direct attacks, but honest feedback helps us grow."},
        {type:'text',key:'name',label:'Name'},
        {type:'department',key:'department',label:'Department'},
        {type:'paragraph',key:'thoughts',label:"What's your thoughts",required:true,
          help:"note: we are not tolerating any direct attack, you're here to give feedback to help us grow"},
        {type:'paragraph',key:'comments',label:'Comments/feedback/suggestions'},
      ],
      steps:[],
    },
    {
      name:'Petty Request',pluralName:'Petty Requests',icon:'banknote',color:'#059669',
      module:'Finance',category:'Petty Request',subtitleColumn:'department',
      fields:[
        {type:'department',key:'department',label:'Department',required:true},
        {type:'date',key:'date',label:'Date',required:true},
        {type:'people',key:'name',label:'Name',required:true},
        {type:'project',key:'site',label:'Site'},
        {type:'text',key:'description',label:'Description/Reason',required:true},
        {type:'date',key:'due_date',label:'Due Date',required:true},
        {type:'currency',key:'amount',label:'Amount',required:true},
        {type:'file',key:'quotation',label:'Quotation/PO/Sales or Service Invoice'},
      ],
      steps:[{name:'Supervisor',role:'Supervisor'}],
    },
  ];

  return raw.map(r=>{
    const def=objTpl(r.name,r.pluralName,r.icon,r.color,r.module,r.category,r.fields,r.steps);
    def.subtitleColumn=r.subtitleColumn||'';
    if(r.primaryColumn)def.primaryColumn=r.primaryColumn;
    return def;
  });
}

/* idempotent — safe every boot; no-ops once the Archiunite suite has been seeded */
async function seedArchiuniteBusinessObjects(){
  const existing=await Store.list('tables');
  if(existing.some(o=>o.isSeed))return;
  await seedArchiuniteRefData();
  for(const def of buildArchiuniteObjectDefs()){
    const t=await Tables.create({name:def.name,icon:def.icon,color:def.color,
      module:def.module,columns:def.columns,primaryColumn:def.primaryColumn});
    Object.assign(t,{
      kind:'object',pluralName:def.pluralName,description:'',category:def.category||'',
      status:'published',version:1,owner:'',tags:[],favorite:false,isTemplate:false,
      workflow:{steps:def.steps},automations:[],groupColumn:'status',
      subtitleColumn:def.subtitleColumn||'',isSeed:true,
    });
    await Store.upsert('tables',t);
  }
}
