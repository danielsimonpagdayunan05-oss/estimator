/* AU ONE STUDIO · object-approval-engine.js
   Object Studio — generalized submit/approve/reject/route, parameterized on
   (table, record) instead of the hardcoded 'requests'/'forms' collections
   approval-engine.js uses. Deliberately a PARALLEL engine, not a generalization
   of Approval in place: Requests is the single most business-critical live flow
   in the app, and approval-engine.js stays byte-for-byte untouched — the same
   safe pattern Phase 2 used for Formula (kept separate from FormEngine.
   evalExpression) and DBPermission (kept separate from Permission). Reuses
   WorkflowEngine.buildRuntime, Permission.isApproverFor and Notify exactly as
   they already exist — no edits to any of those three files.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   OBJECT APPROVAL ENGINE
   ========================================================================== */
const ObjectApproval = {
  async submit(table,values){
    const steps=WorkflowEngine.buildRuntime(Objects.asFormShim(table),values);
    const rec={
      id:uid('rec'),...values,
      steps,currentStep:0,status:steps.length?'pending':'approved',
      submittedBy:APP.user.id,submittedByName:APP.user.name,submittedAt:Date.now(),
      timeline:[{at:Date.now(),by:APP.user.name,type:'submitted',text:'Submitted'}],
      comments:[],version:1
    };
    if(!steps.length)rec.timeline.push({at:Date.now(),by:'System',type:'approved',text:'Auto-approved (no workflow steps)'});
    await this._runAuto(table,rec,'submit');
    if(!steps.length)await this._runAuto(table,rec,'final');
    await Store.upsert(table.collection,rec);
    Bus.emit('record:created',{table,record:rec});
    await this._notifyCurrent(table,rec);
    return rec;
  },
  async _runAuto(table,rec,trigger){
    for(const a of (table?.automations||[])){
      if(a.on!==trigger)continue;
      if(a.do==='notify'&&a.role){for(const p of DIR.people.filter(x=>x.role===a.role))await Notify.push(p.id,`Automation: "${Tables.summarize(table,rec).title}" — ${trigger}`,rec.id);}
      else if(a.do==='comment'){rec.comments.push({by:'Automation',at:Date.now(),text:a.text||'(rule)'});
        rec.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Rule: '+(a.text||'comment')});}
      else if(a.do==='tag'){rec.tag=a.text||'';rec.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Tagged: '+(a.text||'')});}
      else if(a.do==='archive'){rec.timeline.push({at:Date.now(),by:'Automation',type:'auto',text:'Marked for archive'});}
    }
  },
  async _notifyCurrent(table,rec){
    const step=rec.steps[rec.currentStep];
    if(!step)return;
    const targets=DIR.people.filter(p=>step.approverType==='user'?p.id===step.userId:p.role===step.role);
    for(const t of targets)await Notify.push(t.id,`"${Tables.summarize(table,rec).title}" needs your approval (${step.name})`,rec.id);
  },
  async act(table,rec,action,remarks){
    const step=rec.steps[rec.currentStep];
    const evt={at:Date.now(),by:APP.user.name,type:action,text:'',remarks:remarks||''};
    const label=ACTION_LABEL[action];
    if(action==='comment'){evt.text='Comment';rec.comments.push({by:APP.user.name,at:Date.now(),text:remarks||''});
      rec.timeline.push(evt);await Store.upsert(table.collection,rec);return rec;}
    if(step){step.decidedBy=APP.user.name;step.decidedAt=Date.now();step.remarks=remarks||'';step.action=action;}
    if(action==='approve'){
      if(step)step.status='approved';
      evt.text=`${label} · ${step?step.name:''}`;
      rec.timeline.push(evt);
      await this._runAuto(table,rec,'approve');
      const next=rec.currentStep+1;
      if(next>=rec.steps.length){rec.status='approved';
        rec.timeline.push({at:Date.now(),by:'System',type:'completed',text:'All approvals complete'});
        await this._runAuto(table,rec,'final');
        await Notify.push(rec.submittedBy,`Your "${Tables.summarize(table,rec).title}" was fully approved`,rec.id);}
      else{rec.currentStep=next;rec.steps[next].status='pending';await this._notifyCurrent(table,rec);}
    }else if(action==='reject'){
      if(step)step.status='rejected';rec.status='rejected';evt.text=`${label} · ${step?step.name:''}`;rec.timeline.push(evt);
      await this._runAuto(table,rec,'reject');
      await Notify.push(rec.submittedBy,`Your "${Tables.summarize(table,rec).title}" was rejected`,rec.id);
    }else if(action==='return'||action==='revision'){
      if(step)step.status='pending';rec.status=action==='return'?'returned':'revision';
      evt.text=label;rec.timeline.push(evt);
      await Notify.push(rec.submittedBy,`Your "${Tables.summarize(table,rec).title}" needs changes`,rec.id);
    }else if(action==='cancel'){
      rec.status='cancelled';evt.text=label;rec.timeline.push(evt);
    }else if(action==='delegate'||action==='forward'){
      const to=DIR.people.find(p=>p.id===remarks);
      if(to&&step){step.approverType='user';step.userId=to.id;step.status='pending';step.decidedAt=0;step.decidedBy='';}
      evt.text=`${label} to ${to?to.name:'?'}`;evt.remarks='';rec.timeline.push(evt);
      if(to)await Notify.push(to.id,`"${Tables.summarize(table,rec).title}" was ${label.toLowerCase()} to you`,rec.id);
    }else if(action==='escalate'){
      evt.text=label;rec.timeline.push(evt);
    }
    await Store.upsert(table.collection,rec);
    return rec;
  },
  async resubmit(table,rec){
    const step=rec.steps[rec.currentStep];
    if(step){step.status='pending';step.decidedBy='';step.decidedAt=0;step.remarks='';}
    rec.status=rec.currentStep>0?'inprogress':'pending';
    rec.timeline.push({at:Date.now(),by:APP.user.name,type:'resubmit',text:'Resubmitted for approval'});
    await Store.upsert(table.collection,rec);
    await this._notifyCurrent(table,rec);
    return rec;
  }
};
