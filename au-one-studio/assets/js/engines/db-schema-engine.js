/* AU ONE STUDIO · db-schema-engine.js
   Database Engine — Table/Schema/Column registry
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · SCHEMA  (Tables registry — columns ARE FieldTypes/makeField,
   extended not duplicated, so any existing field-type work applies here for free)
   ========================================================================== */
const Tables = {
  async list(){ return Store.list('tables'); },
  async get(id){ return Store.get('tables',id); },
  async getByCollection(collection){ return (await this.list()).find(t=>t.collection===collection)||null; },

  async create({name,icon,color,module,collection,columns,primaryColumn}){
    const cols=(columns||[]).map(c=>({...c}));
    const t={id:uid('tbl'),name,icon:icon||'table',color:color||'#4f46e5',module:module||'',
      collection:collection||uid('tbl')+'_records',system:false,
      primaryColumn:primaryColumn||(cols[0]?fieldKey(cols[0]):''),
      columns:cols,relationships:[],
      permissions:{create:['*'],read:['*'],update:['*'],delete:['*']}};
    await Store.upsert('tables',t);
    Bus.emit('table:created',t);
    return t;
  },
  /* idempotent — safe to call every boot; registers an existing collection as a
     browsable system table without moving or touching its data */
  async registerSystem(defs){
    for(const d of defs){
      if(await this.getByCollection(d.collection))continue;
      await Store.upsert('tables',{id:uid('tbl'),name:d.name,icon:d.icon||'table',color:d.color||'#4f46e5',
        module:d.module||'',collection:d.collection,system:true,primaryColumn:d.primaryColumn||'name',
        columns:d.columns||[],relationships:[],
        groupColumn:d.groupColumn||'',subtitleColumn:d.subtitleColumn||'',dateColumn:d.dateColumn||'',
        permissions:{create:['*'],read:['*'],update:['*'],delete:['*']}});
    }
  },
  async addColumn(tableId,type){
    const t=await this.get(tableId);if(!t)return null;
    const col=makeField(type);t.columns=t.columns||[];t.columns.push(col);
    await Store.upsert('tables',t);return col;
  },
  async removeColumn(tableId,colId){
    const t=await this.get(tableId);if(!t)return;
    t.columns=(t.columns||[]).filter(c=>c.id!==colId);
    await Store.upsert('tables',t);
  },
  async reorderColumns(tableId,from,to){
    const t=await this.get(tableId);if(!t)return;
    const arr=t.columns;arr.splice(to,0,arr.splice(from,1)[0]);
    await Store.upsert('tables',t);
  },
  async remove(id){ await Store.remove('tables',id); },

  /* column === field: reuse the field-type registry as-is, don't reinvent it */
  columnKey: (...a)=>fieldKey(...a),
  makeColumn: (...a)=>makeField(...a),
};
