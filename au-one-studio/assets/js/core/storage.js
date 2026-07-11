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
  /* in-memory read cache: list()/get() are called many times per render across
     dashboard/data-views/app.js — this avoids re-parsing the whole blob every time.
     Invalidated only by _save (every write goes through it), so it can never see
     stale data within a single page load; a full reload (e.g. resetAll) starts fresh. */
  let _cache=null;
  const adapter = {
    /* --- localStorage adapter (default). Replace the 4 bodies below with
       Supabase calls, keeping signatures, and nothing else changes. --- */
    async _all(){ if(_cache)return _cache;
      try{_cache=JSON.parse(localStorage.getItem(KEY))||{};}catch(e){_cache={};} return _cache; },
    async _save(db){ _cache=db;
      Bus.emit('store:saving');
      try{
        const json=JSON.stringify(db);
        if(json.length>4000000)console.warn('[Store] blob exceeds 4MB — approaching localStorage quota');
        localStorage.setItem(KEY,json);
        Bus.emit('store:saved');
      }catch(e){ Bus.emit('store:error',e); throw e; } },
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
