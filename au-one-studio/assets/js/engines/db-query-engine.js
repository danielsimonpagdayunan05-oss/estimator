/* AU ONE STUDIO · db-query-engine.js
   Database Engine — Filter / Sort / Group / Paginate. Pure, synchronous array
   operations with no DOM — trivially reusable by any screen (this is what
   WorkflowEngine.test's condition evaluator generalizes into a real query engine).
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · QUERY
   ========================================================================== */
const Query = {
  _cmp(a,b,type){
    const isNum=type==='number'||type==='currency'||type==='formula'||type==='calculated';
    return isNum?[num(a),num(b)]:[String(a??'').toLowerCase(),String(b??'').toLowerCase()];
  },
  /* filter node: {field,op,value,fieldType} | {and:[node,...]} | {or:[node,...]} —
     nested groups compose naturally since and/or recurse into matches() */
  matches(record,node){
    if(!node)return true;
    if(node.and)return node.and.every(n=>this.matches(record,n));
    if(node.or)return node.or.some(n=>this.matches(record,n));
    const {field,op,value,fieldType}=node;
    const raw=record[field];
    switch(op){
      case'empty':return raw===''||raw==null||(Array.isArray(raw)&&!raw.length);
      case'notEmpty':return !(raw===''||raw==null||(Array.isArray(raw)&&!raw.length));
      case'contains':return String(raw??'').toLowerCase().includes(String(value??'').toLowerCase());
      case'notContains':return !String(raw??'').toLowerCase().includes(String(value??'').toLowerCase());
      case'startsWith':return String(raw??'').toLowerCase().startsWith(String(value??'').toLowerCase());
      case'endsWith':return String(raw??'').toLowerCase().endsWith(String(value??'').toLowerCase());
      case'between':{const lo=this._cmp(raw,value?.[0],fieldType),hi=this._cmp(raw,value?.[1],fieldType);return lo[0]>=lo[1]&&hi[0]<=hi[1];}
      case'gt':{const[a,b]=this._cmp(raw,value,fieldType);return a>b;}
      case'gte':{const[a,b]=this._cmp(raw,value,fieldType);return a>=b;}
      case'lt':{const[a,b]=this._cmp(raw,value,fieldType);return a<b;}
      case'lte':{const[a,b]=this._cmp(raw,value,fieldType);return a<=b;}
      case'eq':{const[a,b]=this._cmp(raw,value,fieldType);return a===b;}
      case'neq':{const[a,b]=this._cmp(raw,value,fieldType);return a!==b;}
      default:return true;
    }
  },
  filter(records,node){ return node?records.filter(r=>this.matches(r,node)):records.slice(); },
  /* specs: [{field,dir:'asc'|'desc',type}] — multi-sort, first spec wins ties broken by the next */
  sort(records,specs){
    if(!specs||!specs.length)return records.slice();
    return records.slice().sort((a,b)=>{
      for(const s of specs){
        const[x,y]=this._cmp(a[s.field],b[s.field],s.type);
        if(x<y)return s.dir==='desc'?1:-1;
        if(x>y)return s.dir==='desc'?-1:1;
      }
      return 0;
    });
  },
  group(records,field){
    const groups={};
    for(const r of records){const k=r[field]??'—';(groups[k]=groups[k]||[]).push(r);}
    return groups;
  },
  paginate(records,{page=1,pageSize=50}={}){
    const start=(page-1)*pageSize;
    return {rows:records.slice(start,start+pageSize),total:records.length,page,pageSize,
      pages:Math.max(1,Math.ceil(records.length/pageSize))};
  }
};
