/* AU ONE STUDIO · form-settings.js
   Form settings + permission matrix
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

function renderBuilderSettings(f){
  renderSettingsBody($('#builderBody'),{
    identityTopHtml:`
      <div class="field"><label>Form name</label><input class="inp" data-prop="name" value="${esc(f.name)}"></div>
      <div class="field"><label>Description</label><textarea class="inp" data-prop="description">${esc(f.description||'')}</textarea></div>`,
    icon:{value:f.icon,action:'setIcon'},
    color:{value:f.color,action:'setColor'},
    identityBottomHtml:`<div class="f2">
      <div class="field"><label>Department</label><select class="inp" data-prop="department">${DIR.departments.map(d=>`<option value="${d.id}" ${f.department===d.id?'selected':''}>${esc(d.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Module</label><select class="inp" data-prop="module">${DIR.modules.map(m=>`<option value="${m.id}" ${f.module===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></div>
      <div class="field"><label>Category</label><input class="inp" data-prop="category" value="${esc(f.category||'')}"></div>
      <div class="field"><label>Version</label><input class="inp" data-prop="version" value="${f.version||1}"></div>
    </div>`,
    permissions:{actions:['submit','approve','edit','delete','archive'],toggleAction:'togglePerm',
      note:'Which roles may perform each action. Empty = everyone.',
      current:act=>f.permissions?.[act]||[]},
    dangerHtml:`<div class="row wrap"><button class="btn" data-action="saveTemplate" data-id="${f.id}">${svg('library',15)} Save as template</button>
      <button class="btn bad ghost" data-action="deleteForm" data-id="${f.id}">${svg('trash-2',15)} Delete form</button></div>`
  });
}

/* ---------- Templates ---------- */
