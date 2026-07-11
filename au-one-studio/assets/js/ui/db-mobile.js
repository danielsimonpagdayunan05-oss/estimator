/* AU ONE STUDIO · db-mobile.js
   Database Engine — mobile view affordances: long-press-to-select + bulk action
   bar. Attached by CSS-class presence (`.card.formcard`) rather than tied to one
   specific renderer's JS identity — this is what lets both Database tables
   (db-views.js) AND the Requests screen (data-views.js) pick these up without a
   shared mount function. No existing mobile.css class is redefined — this is
   purely new, opt-in surface.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · MOBILE
   ========================================================================== */
const MOBILE_BREAKPOINT=820; // matches the existing app-shell breakpoint in mobile.css

/* selection mode: entered via long-press, exited when the last item is deselected
   or explicitly via SelectionMode.exit(). `context` (e.g. {tableId}) travels with
   the selection so a bulk action bar knows what collection it's operating on. */
const SelectionMode={
  active:false,ids:new Set(),context:null,onchange:null,
  enter(id,context){this.active=true;this.ids.clear();if(id!=null)this.ids.add(id);this.context=context||null;this._fire();},
  exit(){this.active=false;this.ids.clear();this.context=null;this._fire();},
  toggle(id){if(this.ids.has(id))this.ids.delete(id);else this.ids.add(id);if(!this.ids.size){this.active=false;this.context=null;}this._fire();},
  has(id){return this.ids.has(id);},
  _fire(){Bus.emit('selectionMode:changed',this);if(this.onchange)this.onchange(this);}
};

/* delegates on the CONTAINER (not each card) so this keeps working across
   db-virtual-list.js's InfiniteList redraws, which replace card elements on every
   incremental-load tick without this function being called again. Mobile-only
   (desktop keeps plain click-to-open, matching every other breakpoint in the app). */
/* selector: optional override for non-card markup (Table/List views' <tr>/.row
   elements) — defaults to the original card selector, so every existing caller
   (Cards/Kanban, both Database and Requests) is unaffected. */
function enhanceMobileCards(container,context,onSelectionChange,selector){
  if(!container||innerWidth>MOBILE_BREAKPOINT||container.dataset.mobileEnhanced)return;
  container.dataset.mobileEnhanced='1';
  const CARD_SEL=selector||'.card.formcard[data-action="openRecord"],.card.formcard[data-action="openReq"]';
  let timer=null,moved=false,startX=0,startY=0,activeCard=null;
  const pos=e=>e.touches?e.touches[0]:e;
  container.addEventListener('pointerdown',e=>{
    const card=e.target.closest(CARD_SEL);if(!card)return;
    activeCard=card;moved=false;const p=pos(e);startX=p.clientX;startY=p.clientY;
    timer=setTimeout(()=>{if(moved||!activeCard)return;
      if(navigator.vibrate)navigator.vibrate(12);
      SelectionMode.enter(activeCard.dataset.id,context);activeCard.classList.add('selected');
      if(onSelectionChange)onSelectionChange();},550);
  });
  container.addEventListener('pointermove',e=>{if(!activeCard)return;const p=pos(e);
    if(Math.abs(p.clientX-startX)>8||Math.abs(p.clientY-startY)>8){moved=true;clearTimeout(timer);}});
  container.addEventListener('pointerup',()=>{clearTimeout(timer);activeCard=null;});
  container.addEventListener('pointercancel',()=>{clearTimeout(timer);activeCard=null;});
  container.addEventListener('click',e=>{
    if(!SelectionMode.active)return;
    const card=e.target.closest(CARD_SEL);if(!card)return;
    e.preventDefault();e.stopImmediatePropagation();
    SelectionMode.toggle(card.dataset.id);card.classList.toggle('selected');
    if(onSelectionChange)onSelectionChange();
  },true);
}

function renderSelectionBar({onBulkDelete}={}){
  const old=document.querySelector('.selection-bar');if(old)old.remove();
  if(!SelectionMode.active)return;
  const bar=document.createElement('div');bar.className='selection-bar';
  bar.innerHTML=`<b>${SelectionMode.ids.size} selected</b><span class="sp"></span>
    <button class="btn sm ghost" data-action="exitSelectionMode">Cancel</button>
    ${onBulkDelete?`<button class="btn sm bad" data-action="bulkDeleteSelection">${svg('trash-2',14)} Delete</button>`:''}`;
  document.body.appendChild(bar);
}
