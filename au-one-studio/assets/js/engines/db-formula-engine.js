/* AU ONE STUDIO · db-formula-engine.js
   Database Engine — function-based Formula engine (tokenizer + recursive-descent
   parser, not `new Function`/eval — required so functions like IF/SUM are safe to
   support). UI-independent: takes an expression string + a plain record object.
   Kept separate from form-engine.js's FormEngine.evalExpression — existing form
   formula/calculated fields keep using that one, untouched.
   Part of the AU One Studio low-code platform. Classic script (module pattern):
   shares one global scope across all <script> files — no build step, opens via file://. */

/* ============================================================================
   DATABASE ENGINE · FORMULA
   ========================================================================== */
const Formula = {
  FUNCTIONS: {
    SUM:(...a)=>a.reduce((s,n)=>s+num(n),0),
    AVERAGE:(...a)=>a.length?a.reduce((s,n)=>s+num(n),0)/a.length:0,
    COUNT:(...a)=>a.filter(v=>v!==''&&v!=null).length,
    MIN:(...a)=>a.length?Math.min(...a.map(num)):0,
    MAX:(...a)=>a.length?Math.max(...a.map(num)):0,
    ROUND:(n,d)=>{const f=Math.pow(10,num(d??0));return Math.round(num(n)*f)/f;},
    TEXT:v=>String(v??''),
    DATE:v=>v?new Date(v).toISOString().slice(0,10):'',
    TODAY:()=>new Date().toISOString().slice(0,10),
    NOW:()=>Date.now(),
    IF:(cond,a,b)=>cond?a:b,
  },
  registerFunction(name,fn){ this.FUNCTIONS[name]=fn; },

  _tokenize(src){
    const toks=[];let i=0;
    while(i<src.length){
      const c=src[i];
      if(/\s/.test(c)){i++;continue;}
      if(/[0-9.]/.test(c)){let j=i;while(j<src.length&&/[0-9.]/.test(src[j]))j++;toks.push({t:'num',v:parseFloat(src.slice(i,j))});i=j;continue;}
      if(c==='"'||c==="'"){const q=c;let j=i+1;while(j<src.length&&src[j]!==q)j++;toks.push({t:'str',v:src.slice(i+1,j)});i=j+1;continue;}
      if(/[A-Za-z_]/.test(c)){let j=i;while(j<src.length&&/[A-Za-z0-9_]/.test(src[j]))j++;toks.push({t:'ident',v:src.slice(i,j)});i=j;continue;}
      if('>=<!'.includes(c)&&src[i+1]==='='){toks.push({t:'op',v:c+'='});i+=2;continue;}
      if('+-*/(),<>'.includes(c)){toks.push({t:(c==='('||c===')'||c===',')?'punc':'op',v:c});i++;continue;}
      throw new Error('Unexpected character: '+c);
    }
    return toks;
  },
  /* expr := comparison ; comparison := term ((> < >= <= == !=) term)? ;
     term := factor ((+ -) factor)* ; factor := unary ((* /) unary)* ;
     unary := '-' unary | primary ; primary := num | str | IDENT'('args')' | '(' expr ')' */
  _parse(toks){
    let pos=0;
    const peek=()=>toks[pos],next=()=>toks[pos++];
    const expr=()=>comparison();
    const comparison=()=>{
      let l=term();const t=peek();
      if(t&&t.t==='op'&&['>','<','>=','<=','==','!='].includes(t.v)){
        next();const r=term();
        switch(t.v){case'>':return l>r;case'<':return l<r;case'>=':return l>=r;case'<=':return l<=r;case'==':return l==r;case'!=':return l!=r;}
      }
      return l;
    };
    const term=()=>{
      let l=factor();
      while(peek()&&peek().t==='op'&&(peek().v==='+'||peek().v==='-')){
        const op=next().v,r=factor();
        l=op==='+'?((typeof l==='string'||typeof r==='string')?String(l)+String(r):l+r):l-r;
      }
      return l;
    };
    const factor=()=>{
      let l=unary();
      while(peek()&&peek().t==='op'&&(peek().v==='*'||peek().v==='/')){
        const op=next().v,r=unary();l=op==='*'?l*r:l/r;
      }
      return l;
    };
    const unary=()=>{ if(peek()&&peek().t==='op'&&peek().v==='-'){next();return -unary();} return primary(); };
    const primary=()=>{
      const t=next();
      if(!t)throw new Error('Unexpected end of expression');
      if(t.t==='num'||t.t==='str')return t.v;
      if(t.t==='ident'){
        if(peek()&&peek().t==='punc'&&peek().v==='('){
          next();const args=[];
          if(!(peek()&&peek().t==='punc'&&peek().v===')')){
            args.push(expr());
            while(peek()&&peek().t==='punc'&&peek().v===','){next();args.push(expr());}
          }
          if(!(peek()&&peek().t==='punc'&&peek().v===')'))throw new Error('Expected )');
          next();
          const fn=Formula.FUNCTIONS[t.v];if(!fn)throw new Error('Unknown function: '+t.v);
          return fn(...args);
        }
        throw new Error('Unexpected identifier: '+t.v);
      }
      if(t.t==='punc'&&t.v==='('){
        const v=expr();if(!(peek()&&peek().t==='punc'&&peek().v===')'))throw new Error('Expected )');next();return v;
      }
      throw new Error('Unexpected token');
    };
    const result=expr();
    if(pos<toks.length)throw new Error('Unexpected trailing tokens');
    return result;
  },

  /* record: plain object keyed by column key (same convention as fieldKey/values) */
  evaluate(expr,record){
    if(!expr)return '';
    const src=expr.replace(/\{([^}]+)\}/g,(_,k)=>{
      const v=record?record[k.trim()]:undefined;
      if(v==null||v==='')return '""';
      if(typeof v==='number')return String(v);
      if(!isNaN(parseFloat(v))&&isFinite(v))return String(v);
      return JSON.stringify(String(v));
    });
    try{
      const r=this._parse(this._tokenize(src));
      if(typeof r==='number')return isFinite(r)?Math.round(r*100)/100:'ERR';
      return r;
    }catch(e){return 'ERR';}
  }
};
