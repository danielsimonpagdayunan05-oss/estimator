/* AU ONE STUDIO · approval-engine.js
   Submit + approve/reject/route + automation hooks
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   7 · APPROVAL ENGINE
   ========================================================================== */
const Approval = {
  async submit(form,values){
    const steps=WorkflowEngine.buildRuntime(form,values);
    const req={
      id:uid('req'),formId:form.id,formName:form.name,icon:form.icon,color:form.color,
      module:form.module,department:form.department,
      values,submittedBy:APP.user.id,submittedByName:APP.user.name,submittedAt:Date.now(),
      status:steps.length?'pending':'approved',currentStep:0,steps,
      timeline:[{at:Date.now(),by:APP.user.name,type:'submitted',text:'Submitted request'}],
      comments:[],version:1
    };
    if(!steps.length)req.timeline.push({at:Date.now(),by:'System',type:'approved',text:'Auto-approved (no workflow steps)'});
    await this._runAuto(req,form,'submit');
    if(!steps.length)await this._runAuto(req,form,'final');
    await Store.upsert('requests',req);
    await this._notifyCurrent(req,form);
    return req;
  },
  async _runAuto(req,form,trigger){
    for(const a of (form?.automations||[])){
      if(a.on!==trigger)continue;
      if(a.do==='notify'&&a.role){for(const p of DIR.people.filter(x=>x.role===a.role))await Notify.push(p.id,`Automation: "${req.formName}" — ${trigger}`,req.id);}
      else if(a.do==='comment'){req.comments.push({by:'Automation',at:Date.now(),text:a.text||'(rule)'});
        req.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Rule: '+(a.text||'comment')});}
      else if(a.do==='tag'){req.tag=a.text||'';req.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Tagged: '+(a.text||'')});}
      else if(a.do==='archive'){req.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Marked for archive'});}
    }
  },
  async _notifyCurrent(req){
    const step=req.steps[req.currentStep];
    if(!step)return;
    const targets=DIR.people.filter(p=>step.approverType==='user'?p.id===step.userId:p.role===step.role);
    for(const t of targets)await Notify.push(t.id,`"${req.formName}" needs your approval (${step.name})`,req.id);
  },
  async act(req,action,remarks){
    const step=req.steps[req.currentStep];
    const form=await Store.get('forms',req.formId);
    const evt={at:Date.now(),by:APP.user.name,type:action,text:'',remarks:remarks||''};
    const label={approve:'Approved',reject:'Rejected',return:'Returned',revision:'Requested revision',
      comment:'Commented',delegate:'Delegated',escalate:'Escalated',forward:'Forwarded',cancel:'Cancelled'}[action];
    if(action==='comment'){evt.text='Comment';req.comments.push({by:APP.user.name,at:Date.now(),text:remarks||''});
      req.timeline.push(evt);await Store.upsert('requests',req);return req;}
    if(step){step.decidedBy=APP.user.name;step.decidedAt=Date.now();step.remarks=remarks||'';step.action=action;}
    if(action==='approve'){
      if(step)step.status='approved';
      evt.text=`${label} · ${step?step.name:''}`;
      req.timeline.push(evt);
      await this._runAuto(req,form,'approve');
      const next=req.currentStep+1;
      if(next>=req.steps.length){req.status='approved';
        req.timeline.push({at:Date.now(),by:'System',type:'completed',text:'All approvals complete'});
        await this._runAuto(req,form,'final');
        await Notify.push(req.submittedBy,`Your "${req.formName}" was fully approved`,req.id);}
      else{req.currentStep=next;req.steps[next].status='pending';await this._notifyCurrent(req);}
    }else if(action==='reject'){
      if(step)step.status='rejected';req.status='rejected';evt.text=`${label} · ${step?step.name:''}`;req.timeline.push(evt);
      await this._runAuto(req,form,'reject');
      await Notify.push(req.submittedBy,`Your "${req.formName}" was rejected`,req.id);
    }else if(action==='return'||action==='revision'){
      if(step)step.status='pending';req.status=action==='return'?'returned':'revision';
      evt.text=label;req.timeline.push(evt);
      await Notify.push(req.submittedBy,`Your "${req.formName}" needs changes`,req.id);
    }else if(action==='cancel'){
      req.status='cancelled';evt.text=label;req.timeline.push(evt);
    }else if(action==='delegate'||action==='forward'){
      const to=DIR.people.find(p=>p.id===remarks);
      if(to&&step){step.approverType='user';step.userId=to.id;step.status='pending';step.decidedAt=0;step.decidedBy='';}
      evt.text=`${label} to ${to?to.name:'?'}`;evt.remarks='';req.timeline.push(evt);
      if(to)await Notify.push(to.id,`"${req.formName}" was ${label.toLowerCase()} to you`,req.id);
    }else if(action==='escalate'){
      evt.text=label;req.timeline.push(evt);
    }
    await Store.upsert('requests',req);
    return req;
  }
};
