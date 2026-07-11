/* AU ONE STUDIO · chrome.js
   Phase 4 · Experience Studio — shared page chrome. Extracted from the near-
   identical header markup Forms/Objects/Database/Templates each hand-built
   independently (list-page "create row" headers, sub-editor back+tabs+status
   headers). Every existing caller passes today's exact labels/actions as
   defaults, so converting a screen to use these produces byte-identical output
   unless the caller opts into something new (see call sites for what changed).
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   CHROME · list-page header + sub-editor header
   ========================================================================== */
/* actions: raw HTML for the row's leading buttons (create/etc). countLabel:
   e.g. "6 form(s)" — omit for a header with no count chip. */
function listPageHeader({actions,countLabel}={}){
  return `<div class="row wrap" style="margin-bottom:14px">${actions||''}
    <span class="sp"></span>${countLabel?`<span class="chip">${esc(countLabel)}</span>`:''}</div>`;
}

/* parts: array of {label,action,id} | {html}. All parts except the last are
   clickable crumbs (data-action=action, data-id=id); the last is the current
   page — rendered as raw `html` if given, else a bold escaped label. Lets a
   user jump back more than one level (e.g. straight from Records to the
   table's schema editor) instead of only one back-button hop at a time. */
function breadcrumb(parts){
  return `<div class="row" style="gap:6px;flex-wrap:wrap;min-width:0">${parts.map((p,i)=>{
    const last=i===parts.length-1;
    if(last)return p.html||`<b class="small">${esc(p.label)}</b>`;
    return `<button class="btn ghost sm" data-action="${p.action}" ${p.id?`data-id="${p.id}"`:''}>${esc(p.label)}</button><span class="muted small">/</span>`;
  }).join('')}</div>`;
}

/* backAction/backLabel: the single-level back button (default nav). breadcrumbParts:
   pass to replace the back button with a multi-level breadcrumb() instead — when
   supplied, entityNameHtml is ignored (fold the current page's icon/name into the
   crumb's last part via {html:...} instead, to avoid showing it twice). entityNameHtml:
   raw HTML for the icon+name (or live-editable input) slot, used only when
   breadcrumbParts is omitted. tabs: array of [tabKey,label,icon] or omit for no tab
   strip. actions: raw HTML for the trailing status/publish/etc buttons. */
function subEditorHeader({backAction,backLabel,breadcrumbParts,entityNameHtml,tabs,activeTab,tabAction,actions}={}){
  const tabsHtml=tabs?`<div class="toggle">${tabs.map(([t,l,ic])=>
    `<button class="${activeTab===t?'on':''}" data-action="${tabAction}" data-t="${t}">${svg(ic,15)}<span class="hide-sm">${l}</span></button>`).join('')}</div>`:'';
  const navHtml=(breadcrumbParts&&breadcrumbParts.length)?breadcrumb(breadcrumbParts):
    `<button class="btn ghost" data-action="${backAction}">${svg('chevron-left',16)} ${backLabel}</button>
     ${entityNameHtml?`<div class="row" style="gap:8px;min-width:0">${entityNameHtml}</div>`:''}`;
  return `<div class="row wrap" style="margin-bottom:14px">
    ${navHtml}
    ${tabsHtml}
    <span class="sp"></span>
    ${actions||''}
  </div>`;
}

/* ============================================================================
   CHROME · view toolbar (segmented view-switcher + surrounding controls)
   ========================================================================== */
/* views: [[key,label,icon],...] for the segmented switcher. quickFilter:
   {id,value,placeholder} — free-text input (Database Records style). groupBy:
   {options:[[value,label],...],action,value} — a <select>, e.g. Kanban-only.
   sortSelect: {options:[[value,label],...],action,value} — a <select> (Requests
   style). saveViewAction: action name for a "Save view" button — omit to hide
   it. savedViews: array of {id,name} — renders a chip row (data-action=
   "loadView"/"delView", matching router.js's existing handlers) when non-empty.
   Returns the view-switcher row plus, if savedViews is non-empty, a second row
   beneath it — concatenate the caller's own filter-chip row (if any) after this
   return value, not inside it, since status/module filtering is business logic
   specific to Requests, not generic view chrome. */
function viewToolbar({views,activeView,viewAction,quickFilter,groupBy,sortSelect,saveViewAction,savedViews}={}){
  const segmented=`<div class="segmented">${(views||[]).map(([v,l,ic])=>
    `<button data-action="${viewAction}" data-v="${v}" class="${activeView===v?'on':''}">${svg(ic,14)}<span class="hide-sm">${l}</span></button>`).join('')}</div>`;
  const qf=quickFilter?`<input class="inp" style="width:200px" id="${quickFilter.id}" placeholder="${esc(quickFilter.placeholder||'Quick filter…')}" value="${esc(quickFilter.value||'')}">`:'';
  const gb=groupBy?`<select class="inp" style="width:auto" data-action="${groupBy.action}">${groupBy.options.map(([v,l])=>`<option value="${v}" ${groupBy.value===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`:'';
  const ss=sortSelect?`<select class="inp" style="width:auto;padding:8px 30px 8px 11px" data-action="${sortSelect.action}">${sortSelect.options.map(([v,l])=>`<option value="${v}" ${sortSelect.value===v?'selected':''}>${esc(l)}</option>`).join('')}</select>`:'';
  const saveBtn=saveViewAction?`<button class="btn sm" data-action="${saveViewAction}">${svg('star',14)} Save view</button>`:'';
  const savedRow=(savedViews&&savedViews.length)?`<div class="row wrap" style="margin-bottom:12px;gap:6px">${savedViews.map(v=>
    `<span class="chip" data-action="loadView" data-id="${v.id}">${svg('star',12)} ${esc(v.name)}<button data-action="delView" data-id="${v.id}" style="margin-left:4px;color:var(--muted)">${svg('x',11)}</button></span>`).join('')}</div>`:'';
  return `<div class="viewbar">${segmented}<span class="sp"></span>${qf}${gb}${ss}${saveBtn}</div>${savedRow}`;
}
