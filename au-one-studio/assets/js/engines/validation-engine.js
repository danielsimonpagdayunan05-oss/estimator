/* AU ONE STUDIO · validation-engine.js
   Field + form validation
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   3 · VALIDATION ENGINE
   ========================================================================== */
const Validation = {
  field(f,val){
    if(FieldTypes[f.type]?.layout)return null;
    const empty = val===''||val==null||(Array.isArray(val)&&!val.length)||val===false&&f.type!=='checkbox';
    if(f.required && (val===''||val==null||(Array.isArray(val)&&!val.length)))return 'Required';
    if(empty)return null;
    if(f.type==='email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))return 'Invalid email';
    if(f.type==='phone' && !/^[0-9+()\-\s]{7,}$/.test(val))return 'Invalid phone';
    if((f.type==='number'||f.type==='currency') && isNaN(parseFloat(val)))return 'Must be a number';
    return null;
  },
  form(form,values){
    const errs={};
    (form.fields||[]).forEach(f=>{const e=this.field(f,values[fieldKey(f)]);if(e)errs[f.id]=e;});
    return errs;
  }
};
