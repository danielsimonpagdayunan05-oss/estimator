/* AU ONE STUDIO · templates.js
   Template gallery
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function renderTemplates(c){
  let tpls=(await Store.list('forms')).filter(f=>f.isTemplate);
  c.innerHTML=listPageHeader({countLabel:`${tpls.length} template(s)`})
    +`<div class="small muted" style="margin-bottom:12px">Start from a ready-made form. “Use” creates an editable copy in your Form Builder.</div>
    <div class="grid cols">${tpls.map(t=>`<div class="card formcard"><div class="bar" style="background:${t.color}"></div>
      <div class="body"><div class="row"><div class="icon" style="background:${t.color}">${svg(t.icon,22)}</div><span class="sp"></span><span class="chip">${svg('library',13)} Template</span></div>
      <h3>${esc(t.name)}</h3><div class="small muted">${esc(t.description||'')}</div>
      <div class="meta"><span class="chip">${(t.fields||[]).length} fields</span><span class="chip">${(t.workflow?.steps||[]).length} steps</span></div>
      <div class="row" style="margin-top:12px"><button class="btn sm primary" data-action="useTemplate" data-id="${t.id}">${svg('plus',13)} Use template</button>
        <button class="btn sm" data-action="dupTemplatePreview" data-id="${t.id}">${svg('eye',13)} Preview</button></div></div></div>`).join('')}</div>`;
}

/* ---------- Settings / Directory ---------- */
