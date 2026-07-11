/* AU ONE STUDIO · form-engine.js
   Config→live form + formula evaluation
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   4 · FORM ENGINE  (config -> live form; also computes formulas)
   ========================================================================== */
const FormEngine = {
  async pickerOptions(source){
    if(!source)return[];
    const rows=await Store.list(source);
    return rows.map(r=>({label:r.name,value:r.id,sub:r.role||r.department||''}));
  },
  evalExpression(expr,values,form){
    if(!expr)return '';
    let s=expr.replace(/\{([^}]+)\}/g,(_,k)=>{
      const f=(form.fields||[]).find(ff=>fieldKey(ff)===k.trim());
      const v=f?values[fieldKey(f)]:values[k.trim()];
      return '('+num(v)+')';
    });
    if(!/^[0-9+\-*/(). ]*$/.test(s))return 'ERR';
    try{const r=Function('"use strict";return('+(s||'0')+')')();return isFinite(r)?Math.round(r*100)/100:'ERR';}catch(e){return 'ERR';}
  }
};
