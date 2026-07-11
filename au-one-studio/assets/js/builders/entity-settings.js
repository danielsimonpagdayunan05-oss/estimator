/* AU ONE STUDIO · entity-settings.js
   Phase 4 · Experience Studio — shared Settings-tab body (identity fields +
   icon/color picker + permissions matrix + danger zone), extracted from the
   near-duplicate renderBuilderSettings (form-settings.js) and
   renderObjectSettingsBody (object-studio.js) — both already independently used
   the same identity→icon→color→f2→permissions→danger card order; this shares
   exactly the parts that were byte-identical (icon/color picker, permissions
   card, card wrapper structure) while leaving the genuinely different identity
   fields and danger-zone actions as caller-supplied HTML.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   ENTITY SETTINGS · shared identity/permissions/danger body
   ========================================================================== */
/* identityTopHtml/identityBottomHtml: raw HTML rendered before/after the icon+
   color picker inside the identity card (split so both callers keep their exact
   original field order without forcing a shared field schema). icon/color:
   {value,action}. permissions: {actions:[...], toggleAction, note,
   current(act)=>string[]} — current() keeps each caller's own permissions object
   shape private to this function. dangerHtml: raw HTML for the trailing card. */
function renderSettingsBody(mountEl,{identityTopHtml,icon,color,identityBottomHtml,permissions,dangerHtml}){
  const iconPicker=`<div class="field"><label>Icon</label><div class="row wrap">${ICON_CHOICES.map(ic=>
    `<button class="btn sm ${icon.value===ic?'primary':''}" data-action="${icon.action}" data-v="${ic}">${svg(ic,18)}</button>`).join('')}</div></div>`;
  const colorPicker=`<div class="field"><label>Colour</label><div class="row wrap">${COLOR_CHOICES.map(col=>
    `<button data-action="${color.action}" data-v="${col}" style="width:30px;height:30px;border-radius:9px;background:${col};border:2px solid ${color.value===col?'var(--ink)':'transparent'}"></button>`).join('')}</div></div>`;
  const permHtml=`<div class="card pad" style="margin-top:12px">
    <b>Permissions</b><div class="small muted" style="margin-bottom:10px">${permissions.note}</div>
    ${permissions.actions.map(act=>{const allowed=permissions.current(act);
      return `<div class="field"><label>Who can ${act}</label>
      <div class="row wrap">${DIR.roles.map(r=>{const on=allowed.includes(r.id);
        return `<button class="chip" data-action="${permissions.toggleAction}" data-act="${act}" data-r="${r.id}" style="${on?'background:var(--brand);color:#fff;border-color:transparent':''}">${esc(r.name)}</button>`;}).join('')}</div>
      <div class="tiny muted">${allowed.length?'':'Everyone allowed'}</div></div>`;}).join('')}
  </div>`;
  mountEl.innerHTML=`<div style="max-width:720px">
    <div class="card pad">${identityTopHtml||''}${iconPicker}${colorPicker}${identityBottomHtml||''}</div>
    ${permHtml}
    <div class="card pad" style="margin-top:12px">${dangerHtml||''}</div>
  </div>`;
}
