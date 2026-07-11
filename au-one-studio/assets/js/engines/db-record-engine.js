/* AU ONE STUDIO · db-record-engine.js
   Database Engine — generic Record CRUD over Store, scoped to a table's collection
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · RECORDS  (timeline/comments generalize the pattern already
   proven by approval-engine.js's requests, instead of duplicating it)
   ========================================================================== */
const Records = {
  /* forms/requests keep their own dedicated lifecycle owners (Approval.submit/act,
     form-builder's router.js cases) — writing through here instead would let two
     code paths race on the same records, so it's refused loudly rather than silently
     allowed. Reading (list/get) is fine and used by the Database nav to browse them. */
  _guardSystemWrite(table){
    if(table.system && (table.collection==='requests'||table.collection==='forms'))
      throw new Error('Records.update/remove is not permitted on the "'+table.collection+
        '" system table — use Approval.act/Approval.submit or the form-builder actions instead.');
  },

  async list(table){ return Store.list(table.collection); },
  async get(table,id){ return Store.get(table.collection,id); },

  async create(table,values){
    const rec={id:uid('rec'),...values,
      timeline:[{at:Date.now(),by:APP.user?APP.user.name:'System',type:'created',text:'Record created'}],
      comments:[]};
    await Store.upsert(table.collection,rec);
    Bus.emit('record:created',{table,record:rec});
    return rec;
  },
  async update(table,id,patch){
    this._guardSystemWrite(table);
    const rec=await Store.get(table.collection,id);if(!rec)return null;
    Object.assign(rec,patch);
    rec.timeline=rec.timeline||[];
    rec.timeline.push({at:Date.now(),by:APP.user.name,type:'updated',text:'Record updated'});
    await Store.upsert(table.collection,rec);
    Bus.emit('record:updated',{table,record:rec});
    return rec;
  },
  async remove(table,id){
    this._guardSystemWrite(table);
    await Store.remove(table.collection,id);
    Bus.emit('record:deleted',{table,id});
  },
  async addComment(table,id,text){
    const rec=await Store.get(table.collection,id);if(!rec||!text)return null;
    rec.comments=rec.comments||[];rec.comments.push({by:APP.user.name,at:Date.now(),text});
    rec.timeline=rec.timeline||[];rec.timeline.push({at:Date.now(),by:APP.user.name,type:'comment',text:'Commented'});
    await Store.upsert(table.collection,rec);
    return rec;
  }
};
