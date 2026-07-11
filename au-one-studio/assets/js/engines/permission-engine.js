/* AU ONE STUDIO · permission-engine.js
   Role/action permission checks
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   6 · PERMISSION ENGINE
   ========================================================================== */
const Permission = {
  can(form,act){ // act: create/submit/edit/approve/reject/delete/archive
    const perms=form?.permissions||{};
    const allowed=perms[act];
    if(!allowed||!allowed.length||allowed.includes('*'))return true;
    return allowed.includes(APP.user.role);
  },
  isApproverFor(step){
    if(!step)return false;
    if(step.approverType==='user')return step.userId===APP.user.id;
    return step.role===APP.user.role;
  }
};
