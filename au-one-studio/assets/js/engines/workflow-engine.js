/* AU ONE STUDIO · workflow-engine.js
   Build runtime approval steps + condition tests
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   5 · WORKFLOW ENGINE  (build runtime steps from form.workflow + conditions)
   ========================================================================== */
const WorkflowEngine = {
  condOps:[['gt','>'],['gte','≥'],['lt','<'],['lte','≤'],['eq','='],['neq','≠']],
  test(cond,values,form){
    if(!cond||!cond.field)return true;
    const f=(form.fields||[]).find(ff=>fieldKey(ff)===cond.field);
    const raw=values[cond.field];
    const isNumType=f && (f.type==='number'||f.type==='currency'||f.type==='formula'||f.type==='calculated');
    const a=isNumType?num(raw):String(raw??'').toLowerCase();
    const b=isNumType?num(cond.value):String(cond.value??'').toLowerCase();
    switch(cond.op){case'gt':return a>b;case'gte':return a>=b;case'lt':return a<b;
      case'lte':return a<=b;case'eq':return a===b;case'neq':return a!==b;default:return true;}
  },
  buildRuntime(form,values){
    const steps=(form.workflow?.steps||[]).filter(s=>this.test(s.condition,values,form));
    return steps.map((s,i)=>({
      idx:i,stepId:s.id,name:s.name,approverType:s.approverType,role:s.role,userId:s.userId,
      mode:s.mode||'sequential',slaHours:s.slaHours||0,
      status:i===0?'pending':'waiting',decidedBy:'',decidedAt:0,action:'',remarks:''
    }));
  },
  approverLabel(step){
    if(step.approverType==='user'){const u=DIR.people.find(p=>p.id===step.userId);return u?u.name:'(user)';}
    return step.role||'(role)';
  }
};
