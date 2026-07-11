/* AU ONE STUDIO · settings.js
   Directory / roles / departments / modules config
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

async function renderSettings(c){
  const sec=(title,coll,rows,extra)=>`<div class="sectitle">${title}</div><div class="card pad">
    ${rows.map(r=>`<div class="row" style="margin-bottom:7px"><span class="chip">${extra?extra(r):''}${esc(r.name)}</span>
      <span class="sp"></span><button class="btn sm ghost" data-action="delDir" data-coll="${coll}" data-id="${r.id}">${svg('x',14)}</button></div>`).join('')||'<div class="muted small">None.</div>'}
    <div class="row" style="margin-top:8px"><input class="inp" id="new_${coll}" placeholder="Add ${title.toLowerCase()}…">
      <button class="btn sm primary" data-action="addDir" data-coll="${coll}">Add</button></div></div>`;
  c.innerHTML=`
    <div class="sectitle">People / Directory</div><div class="card pad">
      ${DIR.people.map(p=>`<div class="row" style="margin-bottom:7px"><span class="icon" style="width:30px;height:30px;font-size:13px;border-radius:8px;background:${p.color}">${esc(p.name[0])}</span>
        <div><div style="font-weight:700;font-size:13.5px">${esc(p.name)}</div><div class="tiny muted">${esc(p.role)} · ${esc(p.department)}</div></div>
        <span class="sp"></span><button class="btn sm ghost" data-action="delDir" data-coll="people" data-id="${p.id}">${svg('x',14)}</button></div>`).join('')}
      <div class="f2" style="margin-top:8px"><input class="inp" id="np_name" placeholder="Full name">
        <select class="inp" id="np_role">${DIR.roles.map(r=>`<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select>
        <select class="inp" id="np_dept">${DIR.departments.map(d=>`<option value="${d.id}">${esc(d.name)}</option>`).join('')}</select>
        <button class="btn primary" data-action="addPerson">${svg('plus',15)} Add person</button></div>
    </div>
    ${sec('Roles','roles',DIR.roles)}
    ${sec('Departments','departments',DIR.departments)}
    ${sec('Modules','modules',DIR.modules)}
    ${sec('Projects','projects',DIR.projects)}
    <div class="sectitle">Data</div><div class="card pad row wrap">
      <button class="btn" data-action="exportData">${svg('download',15)} Export all data (JSON)</button>
      <button class="btn bad ghost" data-action="resetAll">Reset everything</button>
    </div>`;
}

/* ---------- Form submission (renderer) ---------- */
