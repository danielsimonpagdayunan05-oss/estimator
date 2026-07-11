/* AU ONE STUDIO · commands.js
   Phase 4 · Experience Studio — Command Palette command registry, layered on
   top of the existing openSearch() modal (same #searchIn input, same sec()
   section-rendering convention in router.js) rather than a new UI. Every
   command is just a <button class="btn block cmdrow" data-action="..."> using
   the SAME data-action names every other button in the app already dispatches
   through router.js's one delegated click listener — no new execution path,
   no duplicated business logic, and every destructive command (Delete) still
   goes through its existing confirm() gate untouched.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   ARROW-KEY LIST NAVIGATION (Stage 9 reuses this for the More-menu modals —
   objMore/objectMore/formMore/tableMore, wired generically by modal() itself)
   ========================================================================== */
/* keyTarget: element to listen for keydown on (usually a text input, or the
   modal itself for a static menu). container/itemSelector: where to find the
   navigable items. Highlights via a shared .sel class (components.css). Returns
   a small controller so a caller whose result set changes (search-as-you-type)
   can reset selection whenever it re-renders. */
function wireArrowNav(keyTarget,container,itemSelector){
  let idx=-1;
  const items=()=>[...container.querySelectorAll(itemSelector)];
  const highlight=()=>{items().forEach((el,i)=>el.classList.toggle('sel',i===idx));
    const el=items()[idx];if(el)el.scrollIntoView({block:'nearest'});};
  keyTarget.addEventListener('keydown',e=>{
    const list=items();if(!list.length)return;
    if(e.key==='ArrowDown'){e.preventDefault();idx=Math.min(idx+1,list.length-1);highlight();}
    else if(e.key==='ArrowUp'){e.preventDefault();idx=Math.max(idx-1,0);highlight();}
    else if(e.key==='Enter'&&idx>=0){e.preventDefault();list[idx].click();}
  });
  return {reset(){idx=-1;},selectFirst(){idx=0;highlight();}};
}

/* ============================================================================
   COMMAND PALETTE · command registry
   ========================================================================== */
const cmdBtn=(action,icon,label,attrs)=>
  `<button class="btn block cmdrow" style="justify-content:flex-start;margin-bottom:6px" data-action="${action}"${attrs||''}>${svg(icon,15)} ${esc(label)}</button>`;

/* generated from the existing NAV array (app.js) — reuses the exact same `go`
   action every sidebar/bottom-nav button already dispatches, not hand-copied */
function navCommands(){
  return NAV.map(n=>({label:n.label,keywords:n.label.toLowerCase(),
    html:cmdBtn('go',n.ic,n.label,` data-view="${n.id}"`)}));
}
function verbCommands(){
  return [
    {label:'Create form with AI',keywords:'create form ai new sparkles',html:cmdBtn('aiNew','sparkles','Create form with AI')},
    {label:'Blank form',keywords:'new form blank create',html:cmdBtn('newForm','plus','Blank form')},
    {label:'New Object',keywords:'new object create business',html:cmdBtn('newObjectModal','package','New Object')},
    {label:'New table',keywords:'new table database create',html:cmdBtn('newTable','table','New table')},
    {label:'Toggle theme',keywords:'theme dark light auto toggle appearance',html:cmdBtn('cycleTheme','settings','Toggle theme')},
    {label:'Export all data',keywords:'export data backup json download',html:cmdBtn('exportData','download','Export all data')},
    {label:'Quick create',keywords:'quick create new',html:cmdBtn('fab','plus','Quick create')},
  ];
}
/* only relevant while inside an editor — Undo/Redo route through the same
   context-aware History (form-builder.js, Stage 6) already wired to all three
   schema editors; Duplicate/Delete reuse each screen's own existing function,
   including Delete's existing confirm() gate. Scoped by APP.view, matching
   History._ctx()'s own scoping, so a stale editing-id from a screen you've
   navigated away from never surfaces a command that would act on the wrong
   entity. */
function contextualCommands(){
  const cmds=[];
  const undoRedo=()=>{cmds.push({label:'Undo',keywords:'undo',html:cmdBtn('undo','corner-up-left','Undo')});
    cmds.push({label:'Redo',keywords:'redo',html:cmdBtn('redo','forward','Redo')});};
  if(APP.view==='forms'&&APP.editing){
    if(APP.builderTab==='fields')undoRedo();
    cmds.push({label:'Duplicate form',keywords:'duplicate copy form',html:cmdBtn('dupForm','copy','Duplicate form',` data-id="${APP.editing}"`)});
    cmds.push({label:'Delete form',keywords:'delete remove form',html:cmdBtn('deleteForm','trash-2','Delete form',` data-id="${APP.editing}"`)});
  }else if(APP.view==='objects'&&typeof OBJ_EDITING!=='undefined'&&OBJ_EDITING){
    if(OBJ_TAB==='schema')undoRedo();
    cmds.push({label:'Duplicate object',keywords:'duplicate copy object',html:cmdBtn('dupObject','copy','Duplicate object',` data-id="${OBJ_EDITING}"`)});
    cmds.push({label:'Delete object',keywords:'delete remove object',html:cmdBtn('deleteObject','trash-2','Delete object',` data-id="${OBJ_EDITING}"`)});
  }else if(APP.view==='database'&&typeof TBL_EDITING!=='undefined'&&TBL_EDITING){
    undoRedo();
    cmds.push({label:'Delete table',keywords:'delete remove table',html:cmdBtn('deleteTable','trash-2','Delete table',` data-id="${TBL_EDITING}"`)});
  }
  return cmds;
}
function allCommands(){ return [...navCommands(),...verbCommands(),...contextualCommands()]; }
