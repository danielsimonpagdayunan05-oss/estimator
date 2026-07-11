/* AU ONE STUDIO · db-relationship-engine.js
   Database Engine — links, lookups, rollups between tables
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · RELATIONSHIPS  (rollups are computed lazily per rendered row,
   never eagerly for a whole table — this is what keeps them cheap under pagination)
   ========================================================================== */
const Relationships = {
  async create(table,{type,name,toTable,foreignKey}){
    const rel={id:uid('rel'),type:type||'one-to-many',name,fromTable:table.id,toTable,foreignKey};
    table.relationships=table.relationships||[];table.relationships.push(rel);
    await Store.upsert('tables',table);
    return rel;
  },
  async remove(table,relId){
    table.relationships=(table.relationships||[]).filter(r=>r.id!==relId);
    await Store.upsert('tables',table);
  },
  /* every record on the "many" side whose foreignKey points back at this record */
  async linked(rel,record){
    const toTable=await Tables.get(rel.toTable);if(!toTable)return [];
    const rows=await Records.list(toTable);
    return rows.filter(r=>r[rel.foreignKey]===record.id);
  },
  async rollupValue(rel,record,{fn,column}){
    const rows=await this.linked(rel,record);
    const impl=Formula.FUNCTIONS[fn];if(!impl)return 'ERR';
    return impl(...rows.map(r=>r[column]));
  },
  async lookupValue(rel,record,column){
    const toTable=await Tables.get(rel.toTable);if(!toTable)return '';
    const linkedId=record[rel.foreignKey];if(!linkedId)return '';
    const row=await Records.get(toTable,linkedId);
    return row?row[column]:'';
  }
};
