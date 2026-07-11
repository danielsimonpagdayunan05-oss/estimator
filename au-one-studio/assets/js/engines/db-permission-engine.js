/* AU ONE STUDIO · db-permission-engine.js
   Database Engine — table/field/record/view permissions. Same allowed-roles-array
   pattern as the existing Permission.can (permission-engine.js), kept as a separate
   object so that file — and every screen that already depends on it — is untouched.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · PERMISSIONS
   ========================================================================== */
const DBPermission = {
  _allows(allowed){ return !allowed||!allowed.length||allowed.includes('*')||allowed.includes(APP.user.role); },
  canTable(table,act){ return this._allows(table?.permissions?.[act]); },
  canField(col,act){ return this._allows(col?.permissions?.[act]); },
  /* record-level entry (if present) overrides the table default for that record only */
  canRecord(table,record,act){
    const recPerms=record?.permissions?.[act];
    if(recPerms&&recPerms.length&&!recPerms.includes('*'))return recPerms.includes(APP.user.role);
    return this.canTable(table,act);
  },
  canView(view,act){ return this._allows(view?.permissions?.[act]); },
  canComment(table,act){ return this.canTable(table,act==='delete'?'delete':'update'); }
};
