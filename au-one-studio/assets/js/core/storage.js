/* AU ONE STUDIO · storage.js
   Storage adapter (localStorage). Swap body for Supabase/REST later
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   1 · STORAGE LAYER  (swap to Supabase by replacing adapter method bodies only)
   Interface used by every engine: list / get / upsert / remove.
   ========================================================================== */
const Store = (()=>{
  const KEY='ace_v1';
  const adapter = {
    /* --- localStorage adapter (default). Replace the 4 bodies below with
       Supabase calls, keeping signatures, and nothing else changes. --- */
    async _all(){ try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return{};} },
    async _save(db){ localStorage.setItem(KEY,JSON.stringify(db)); },
    async list(coll){ const db=await this._all(); return db[coll]||[]; },
    async get(coll,id){ return (await this.list(coll)).find(x=>x.id===id)||null; },
    async upsert(coll,rec){ const db=await this._all(); db[coll]=db[coll]||[];
      const i=db[coll].findIndex(x=>x.id===rec.id);
      rec.updatedAt=Date.now(); if(i<0){rec.createdAt=rec.createdAt||Date.now();db[coll].unshift(rec);} else db[coll][i]=rec;
      await this._save(db); return rec; },
    async remove(coll,id){ const db=await this._all(); db[coll]=(db[coll]||[]).filter(x=>x.id!==id); await this._save(db); },
    async bulk(coll,arr){ const db=await this._all(); db[coll]=arr; await this._save(db); },
    async raw(){ return this._all(); }
  };
  return adapter;
})();
