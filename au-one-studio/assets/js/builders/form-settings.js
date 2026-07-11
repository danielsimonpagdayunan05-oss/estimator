/* AU ONE STUDIO · form-settings.js
   Form settings + permission matrix
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

function renderBuilderSettings(f){
  $('#builderBody').innerHTML=`<div style="max-width:720px">
  <div class="card pad">
    <div class="field"><label>Form name</label><input class="inp" data-prop="name" value="${esc(f.name)}"></div>
    <div class="field"><label>Description</label><textarea class="inp" data-prop="description">${esc(f.description||'')}</textarea></div>
    <div class="field"><label>Icon</label><div class="row wrap">${ICON_CHOICES.map(ic=>`<button class="btn sm ${f.icon===ic?'primary':''}" data-action="setIcon" data-v="${ic}">${svg(ic,18)}</button>`).join('')}</div></div>
    <div class="field"><label>Colour</label><div class="row wrap">${COLOR_CHOICES.map(col=>`<button data-action="setColor" data-v="${col}" style="width:30px;height:30px;border-radius:9px;background:${col};border:2px solid ${f.color===col?'var(--ink)':'transparent'}"></button>`).join('')}</div></div>
    <div class="f2">
      <div class="field"><label>Department</label><select class="inp" data-prop="department">${DIR.departments.map(d=>`<option value="${d.id}" ${f.department===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Module</label><select class="inp" data-prop="module">${DIR.modules.map(m=>`<option value="${m.id}" ${f.module===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Category</label><input class="inp" data-prop="category" value="${esc(f.category||'')}"></div>
      <div class="field"><label>Version</label><input class="inp" data-prop="version" value="${f.version||1}"></div>
    </div>
  </div>
  <div class="card pad" style="margin-top:12px">
    <b>Permissions</b><div class="small muted" style="margin-bottom:10px">Which roles may perform each action. Empty = everyone.</div>
    ${['submit','approve','edit','delete','archive'].map(act=>`<div class="field"><label>Who can ${act}</label>
      <div class="row wrap">${DIR.roles.map(r=>{const on=(f.permissions?.[act]||[]).includes(r.id);
        return `<button class="chip" data-action="togglePerm" data-act="${act}" data-r="${r.id}" style="${on?'background:var(--brand);color:#fff;border-color:transparent':''}">${esc(r.name)}</button>`;}).join('')}</div>
      <div class="tiny muted">${(f.permissions?.[act]||[]).length?'':'Everyone allowed'}</div></div>`).join('')}
  </div>
  <div class="card pad" style="margin-top:12px">
    <div class="row wrap"><button class="btn" data-action="saveTemplate" data-id="${f.id}">${svg('library',15)} Save as template</button>
      <button class="btn bad ghost" data-action="deleteForm" data-id="${f.id}">${svg('trash-2',15)} Delete form</button></div>
  </div></div>`;
}

/* ---------- Templates ---------- */
