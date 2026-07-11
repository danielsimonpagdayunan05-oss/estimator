/* AU ONE STUDIO · db-virtual-list.js
   Database Engine — vanilla-JS list virtualization for the View Engine.
   VirtualTable: true DOM windowing for uniform-height rows (Table view), using the
   top/bottom spacer-row technique so the <table>/<tbody> structure stays valid
   (position:absolute on <tr> breaks table layout in real browsers) — only the
   visible + overscan rows ever exist in the DOM, however many rows there are.
   InfiniteList: IntersectionObserver-based incremental append for variable-height
   cards (Cards/Kanban/List) — the honest, pragmatic stand-in for full variable-
   height virtualization (see the plan's "explicitly out of scope this pass").
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · VIRTUALIZATION
   ========================================================================== */
function VirtualTable(container,{rows,rowHeight=40,renderRow,overscan=8}){
  let tbody=container.querySelector('tbody');
  if(!tbody){container.innerHTML='<table class="dtable"><tbody></tbody></table>';tbody=container.querySelector('tbody');}
  container.style.overflow=container.style.overflow||'auto';
  let _rows=rows,raf=null;
  function draw(){
    raf=null;
    const h=container.clientHeight||400;
    const first=Math.max(0,Math.floor(container.scrollTop/rowHeight)-overscan);
    const count=Math.ceil(h/rowHeight)+overscan*2;
    const last=Math.min(_rows.length,first+count);
    const topH=first*rowHeight,botH=(_rows.length-last)*rowHeight;
    const spacer=(h)=>`<tr aria-hidden="true" style="height:${h}px"><td colspan="99" style="padding:0;border:0"></td></tr>`;
    tbody.innerHTML=(topH>0?spacer(topH):'')+_rows.slice(first,last).map((r,i)=>renderRow(r,first+i)).join('')+(botH>0?spacer(botH):'');
  }
  function onScroll(){ if(raf==null)raf=requestAnimationFrame(draw); }
  container.addEventListener('scroll',onScroll);
  draw();
  return {
    update(newRows){ _rows=newRows;draw(); },
    destroy(){ container.removeEventListener('scroll',onScroll); if(raf)cancelAnimationFrame(raf); }
  };
}

function InfiniteList(container,{rows,pageSize=50,renderItem,wrapClass}){
  let _rows=rows,loaded=Math.min(pageSize,_rows.length),io=null;
  function draw(){
    const inner=_rows.slice(0,loaded).map(renderItem).join('');
    container.innerHTML=(wrapClass?`<div class="${wrapClass}">${inner}</div>`:inner)
      +(loaded<_rows.length?'<div data-sentinel style="height:1px"></div>':'');
    attachSentinel();
  }
  function attachSentinel(){
    if(io)io.disconnect();
    const sentinel=container.querySelector('[data-sentinel]');
    if(!sentinel)return;
    io=new IntersectionObserver(entries=>{
      if(entries[0].isIntersecting&&loaded<_rows.length){ loaded=Math.min(loaded+pageSize,_rows.length);draw(); }
    },{root:null,rootMargin:'400px'});
    io.observe(sentinel);
  }
  draw();
  return {
    update(newRows){ _rows=newRows;loaded=Math.min(pageSize,_rows.length);draw(); },
    destroy(){ if(io)io.disconnect(); }
  };
}
