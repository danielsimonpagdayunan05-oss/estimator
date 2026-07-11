/* AU ONE STUDIO · ai-engine.js
   AI describe-to-generate. AI.generateForm("Create a Material Request form")
   returns a complete, editable form config: fields + validation + workflow +
   automations. Works fully OFFLINE today via a heuristic generator so it runs
   on-site with no internet. To use a real LLM later, set AI.provider to an async
   function(prompt, context) -> formConfig — nothing else in the app changes. */

const AI = {
  provider: null,            // future: async (prompt, ctx) => formConfig (LLM call)

  async generateForm(prompt){
    if (typeof this.provider === 'function'){
      try { const r = await this.provider(prompt, { FieldTypes, DIR }); if (r) return this._finalize(r, prompt); }
      catch(e){ console.warn('[AI] provider failed, using offline generator', e); }
    }
    return this._finalize(this._heuristic(prompt), prompt);
  },

  /* ---- offline heuristic generator ---- */
  _archetypes: [
    {k:['material','delivery','supply'], name:'Material Request', icon:'package', color:'#d97706', module:'Construction',
      fields:['project','_rt:Materials|material,qty,unit','date:Needed by','radio:Priority|Normal,Urgent','para:Notes'], flow:['Supervisor','Construction Head','Procurement']},
    {k:['purchase','procure','po','buy','vendor'], name:'Purchase Request', icon:'shopping-cart', color:'#0284c7', module:'Procurement',
      fields:['text:Item / service*','num:Quantity*','cur:Unit price*','formula:Estimated total|{quantity} * {unit_price}','project','dept'], flow:['Supervisor','Procurement','Construction Head'], bigApprover:'CEO'},
    {k:['petty','cash','reimburse','liquidation'], name:'Petty Cash Request', icon:'banknote', color:'#059669', module:'Finance',
      fields:['text:Purpose*','cur:Amount*','project','date:Date needed','para:Justification'], flow:['Supervisor','Finance'], bigApprover:'CEO'},
    {k:['leave','vacation','absence','time off'], name:'Leave Request', icon:'plane', color:'#7c3aed', module:'HR',
      fields:['dd:Leave type*|Vacation,Sick,Emergency','date:From*','date:To*','para:Reason'], flow:['Supervisor','HR']},
    {k:['inspection','qa','qaqc','quality','checklist'], name:'Inspection Checklist', icon:'flask-conical', color:'#0d9488', module:'QAQC',
      fields:['project','head:Checklist','yn:Item complies','rate:Workmanship','image:Photo evidence','sign:Inspector signature'], flow:['QAQC','Construction Head']},
    {k:['rfi','information','clarification'], name:'Request for Information (RFI)', icon:'file-text', color:'#4f46e5', module:'Construction',
      fields:['project','text:Subject*','para:Question*','date:Response needed by'], flow:['Construction Head','Project Director']},
    {k:['variation','change order','vo'], name:'Variation Order', icon:'receipt', color:'#dc2626', module:'Construction',
      fields:['project','text:Description*','cur:Cost impact','num:Time impact (days)','para:Justification'], flow:['Construction Head','Project Director'], bigApprover:'CEO'},
    {k:['overtime','ot'], name:'Overtime Request', icon:'clock', color:'#ca8a04', module:'HR',
      fields:['date:Date*','num:Hours*','para:Reason','project'], flow:['Supervisor','HR']},
    {k:['incident','accident','safety'], name:'Incident Report', icon:'flame', color:'#dc2626', module:'QAQC',
      fields:['project','date:Date of incident*','para:Description*','radio:Severity|Minor,Major,Critical','image:Photo'], flow:['QAQC','Construction Head']},
    {k:['equipment','tool','machine'], name:'Equipment Request', icon:'wrench', color:'#475569', module:'Equipment',
      fields:['text:Equipment*','num:Quantity*','project','date:Needed by','para:Notes'], flow:['Supervisor','Procurement']},
  ],

  _heuristic(prompt){
    const p = (prompt||'').toLowerCase();
    let arch = this._archetypes.find(a => a.k.some(w => p.includes(w)));
    if (!arch){
      // generic: infer fields from the prompt words
      const fields = ['text:Title*'];
      if (/amount|cost|budget|price|₱|peso/.test(p)) fields.push('cur:Amount*');
      if (/date|deadline|when|schedule/.test(p)) fields.push('date:Date');
      if (/quantity|qty|number of|count/.test(p)) fields.push('num:Quantity');
      if (/project|site|job/.test(p)) fields.push('project');
      if (/photo|image|picture/.test(p)) fields.push('image:Photo');
      if (/sign|signature|approve by/.test(p)) fields.push('sign:Signature');
      fields.push('para:Details / justification');
      const nm = this._titleCase(prompt) || 'New Request';
      arch = { name: nm, icon:'file-text', color:'#4f46e5', module:'Construction', fields, flow:['Supervisor','Construction Head'] };
    }
    return this._build(arch);
  },

  _build(a){
    const fields = a.fields.map(spec => this._field(spec)).filter(Boolean);
    const steps = a.flow.map((role,i)=>({ id: uid('s'), name: role, approverType:'role', role, mode:'sequential', condition:null, slaHours:24 }));
    // conditional CEO step for money forms over ₱100k
    const moneyKey = (fields.find(f=>f.type==='currency'||f.type==='formula')||{}).key;
    if (a.bigApprover && moneyKey) steps.push({ id:uid('s'), name:`${a.bigApprover} (> ₱100k)`, approverType:'role', role:a.bigApprover, mode:'sequential', slaHours:24, condition:{ field:moneyKey, op:'gt', value:'100000' } });
    const automations = [{ on:'final', do:'notify', role: steps[0]?.role || 'Supervisor', text:'' }];
    return {
      id: uid('form'), name: a.name, description: `Auto-generated by AI · ${a.module}`,
      icon: a.icon, color: a.color, department: a.module, module: a.module, category:'AI', version:1,
      status:'draft', isTemplate:false, fields,
      workflow:{ steps }, automations,
      permissions:{ submit:[], approve:[], edit:[], delete:[], archive:[] }
    };
  },

  /* mini field DSL:  "type:Label*|opt1,opt2"  ·  "_rt:Label|col1,col2"  ·  bare picker names */
  _field(spec){
    if (spec==='project'||spec==='dept'){
      const t = spec==='project'?'project':'department';
      return { ...MK(t), id:uid('f'), key:spec==='project'?'project':'department', label: spec==='project'?'Project':'Department', required:true };
    }
    const m = spec.match(/^([a-z_]+):([^|]+)(?:\|(.+))?$/i);
    if (!m) return null;
    const map = { text:'text', para:'paragraph', num:'number', cur:'currency', date:'date', dd:'dropdown', radio:'radio', yn:'yesno', rate:'rating', image:'image', sign:'signature', head:'heading', formula:'formula', _rt:'repeating' };
    const type = map[m[1]]; if (!type) return null;
    let label = m[2].trim(); const req = label.endsWith('*'); if (req) label = label.slice(0,-1).trim();
    const key = label.toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    const f = { ...MK(type), id:uid('f'), key, label, required:req };
    const extra = m[3];
    if (extra && (type==='dropdown'||type==='radio')) f.options = extra.split(',').map(s=>({label:s.trim(),value:s.trim()}));
    if (extra && type==='repeating') f.columns = extra.split(',').map(s=>({key:s.trim(),label:this._titleCase(s.trim()),type:'text'}));
    if (extra && type==='formula') f.expression = extra;
    if (type==='heading') { f.label = label; }
    return f;
  },

  _finalize(form, prompt){ form._aiPrompt = prompt; return form; },
  _titleCase(s){ return (s||'').replace(/^(create|make|build|a|an|the|new|form for|form|please)\b/gi,'').trim()
    .replace(/\b\w/g,c=>c.toUpperCase()).replace(/\s+/g,' ').slice(0,48); }
};

/* MK = safe field factory shim (config.js exposes makeField) */
function MK(type){ return (typeof makeField==='function') ? makeField(type) : { type }; }
window.AI = AI;
