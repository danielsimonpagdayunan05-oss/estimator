/* AU ONE STUDIO · object-engine.js
   Object Studio — Business Object lifecycle, layered on the Database Engine's
   Tables registry. An Object IS a `tables` record (kind:'object') — this file
   adds metadata/lifecycle ops on top; it does not duplicate Tables' schema/
   column CRUD (Tables.create/addColumn/removeColumn/reorderColumns are reused
   as-is by the Object Builder's Schema tab, same as db-tables.js already does).
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   OBJECT ENGINE
   ========================================================================== */
const Objects = {
  async list(){ return (await Tables.list()).filter(t=>t.kind==='object'); },
  async get(id){ return Tables.get(id); },

  /* seeds exactly mirror newForm()/newTable(): one primary text column, one
     default Supervisor approval step — "never manually assemble" starts here */
  async create({name,pluralName,icon,color,module,category}){
    const nm=name||'Untitled Object';
    const t=await Tables.create({
      name:nm,icon:icon||'package',color:color||'#4f46e5',module:module||'',
      columns:[{...makeField('text'),key:'name',label:'Name',required:true}],
      primaryColumn:'name'
    });
    Object.assign(t,{
      kind:'object',pluralName:pluralName||(nm+'s'),description:'',
      category:category||'',status:'draft',version:1,owner:APP.user?APP.user.id:'',
      tags:[],favorite:false,isTemplate:false,
      workflow:{steps:[{id:uid('s'),name:'Supervisor',approverType:'role',role:'Supervisor',mode:'sequential',condition:null,slaHours:24}]},
      automations:[],groupColumn:'status'
    });
    await Store.upsert('tables',t);
    return t;
  },
  async update(id,patch){
    const t=await this.get(id);if(!t)return null;
    Object.assign(t,patch);
    await Store.upsert('tables',t);
    return t;
  },
  async remove(id){ await Tables.remove(id); },
  async setStatus(id,status){ return this.update(id,{status}); },
  async duplicate(id){
    const t=await this.get(id);if(!t)return null;
    const c=clone(t);c.id=uid('tbl');c.collection=uid('tbl')+'_records';
    c.name=t.name+' (copy)';c.status='draft';c.favorite=false;
    delete c.createdAt;delete c.updatedAt;
    await Store.upsert('tables',c);
    return c;
  },
  async toggleFavorite(id){
    const t=await this.get(id);if(!t)return null;
    t.favorite=!t.favorite;await Store.upsert('tables',t);
    return t;
  },

  hasWorkflow(obj){ return !!(obj?.workflow?.steps?.length); },
  /* adapter: WorkflowEngine.buildRuntime/test and renderReadonly expect `.fields`
     on a form-shaped object; a Table/Object's schema array is `.columns`. This
     shim is what lets Object Studio reuse both engines with zero edits to either. */
  asFormShim(obj){
    return {id:obj.id,name:obj.name,icon:obj.icon,color:obj.color,module:obj.module,
      fields:obj.columns,workflow:obj.workflow,automations:obj.automations,permissions:obj.permissions};
  },

  /* schema+workflow+automations+metadata only — never records */
  export(obj){
    return {name:obj.name,pluralName:obj.pluralName,description:obj.description,icon:obj.icon,color:obj.color,
      module:obj.module,category:obj.category,columns:obj.columns,primaryColumn:obj.primaryColumn,
      workflow:obj.workflow,automations:obj.automations,permissions:obj.permissions,groupColumn:obj.groupColumn};
  },
  async import(json){
    const t=await Tables.create({name:(json.name||'Imported Object')+' (imported)',icon:json.icon,color:json.color,
      module:json.module,columns:json.columns||[],primaryColumn:json.primaryColumn});
    Object.assign(t,{kind:'object',pluralName:json.pluralName||'',description:json.description||'',
      category:json.category||'',status:'draft',version:1,owner:APP.user?APP.user.id:'',
      tags:[],favorite:false,isTemplate:false,
      workflow:json.workflow||{steps:[]},automations:json.automations||[],
      permissions:json.permissions||{create:['*'],read:['*'],update:['*'],delete:['*']},
      groupColumn:json.groupColumn||'status'});
    await Store.upsert('tables',t);
    return t;
  }
};
