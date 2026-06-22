// ============================================================================
//  Логика «Типовые работы» — редакция v6 (справочник + назначения на стримы)
//
//  МОДЕЛЬ
//  • Справочник типовых работ (catalog): name + архитектурный компонент +
//    описание + рекомендуемые стримы. Самостоятельная переиспользуемая сущность.
//  • Назначение «работа-в-стриме»: для каждого стрима у работы СВОИ нормативы,
//    триггеры, параметры трудоёмкости, формула и округление (per-stream).
//    Хранится в work.byStream[stream] = {norms, triggers, labor, formula, round}.
//  • Стримы можно объединять в группы (предзаданные и собранные вручную) —
//    добавление/обзор работают по группе, конфигурация остаётся пер-стрим.
// ============================================================================
(function(){
  function translit(s){
    const m={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'i',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
    let o='',up=false;
    for(const ch of (s||'').toLowerCase()){
      if(ch===' '||ch==='/'||ch===','||ch==='('||ch===')'||ch==='-'){up=true;continue;}
      const r=m[ch]!==undefined?m[ch]:(/[a-z0-9]/.test(ch)?ch:'');
      if(up&&r){o+=r.charAt(0).toUpperCase()+r.slice(1);up=false;} else o+=r;
    }
    return o.slice(0,26);
  }
  const normComp = s => (s||'')
    .replace(/Арх\.?\s*Компонент\.?\s*/i,'')
    .replace(/процесс\s+обработки/i,'Процесс обработки')
    .replace(/объект\s+данных/i,'Объект данных')
    .replace(/система[-\s]источник/i,'Система-источник')
    .replace(/модельный\s+сервис/i,'Модельный сервис')
    .trim() || '—';

  // Полный перечень стримов-исполнителей
  const STREAMS = ['Источники данных','Витрины данных','Интеграции','Контроль моделей','ПиРМ (правила и развитие модели)','Модельный сервис','Сопровождение и поддержка','Архитектура данных'];
  // Предзаданные группы стримов (по ролёвке)
  const GROUPS = [
    { id:'g_data',  name:'Данные (ИД + Витрины + Интеграции)', streams:['Источники данных','Витрины данных','Интеграции'] },
    { id:'g_model', name:'Моделирование (КМ + ПиРМ + МС)',     streams:['Контроль моделей','ПиРМ (правила и развитие модели)','Модельный сервис'] },
    { id:'g_ops',   name:'Эксплуатация (Сопровождение + Арх.)', streams:['Сопровождение и поддержка','Архитектура данных'] },
  ];
  const RECOMMEND = {
    'Система-источник':       ['Источники данных','ПиРМ (правила и развитие модели)'],
    'Объект данных':          ['Источники данных','Витрины данных'],
    'Процесс обработки данных':['Источники данных','Интеграции'],
    'Модель':                 ['Контроль моделей','ПиРМ (правила и развитие модели)'],
    'Модельный сервис':       ['Модельный сервис','Сопровождение и поддержка'],
  };
  const recommendFor = c => RECOMMEND[normComp(c)] || ['ПиРМ (правила и развитие модели)'];
  function mapStream(s){
    s=(s||'').toLowerCase();
    if(s.includes('источник')) return 'Источники данных';
    if(s.includes('контрол')) return 'Контроль моделей';
    if(s.includes('модельн')||s.includes('сервис')) return 'Модельный сервис';
    if(s.includes('пирм')||s.includes('правил')||s.includes('развит')) return 'ПиРМ (правила и развитие модели)';
    if(s.includes('витрин')) return 'Витрины данных';
    if(s.includes('интеграц')) return 'Интеграции';
    return null;
  }

  function build(){
    const D = window.SA_DATA || {params:[],works:[]};
    const params = {}; const usedId = {};
    D.params.forEach(p=>{
      let id = translit(p.name) || 'p';
      if(usedId[id]) id = id+(usedId[id]++); else usedId[id]=1;
      const section = normComp(p.section);
      let values=[];
      if(p.type==='bool') values=[{v:'Да',coef:1.2},{v:'Нет',coef:1.0}];
      else if(p.type==='dict') values=(p.values||[]).map((v,i)=>({v, coef:+(1+0.25*i).toFixed(2)}));
      params[id]={ id, label:p.name, section, type:p.type, values, cur:(values[0]?values[0].v:'') };
    });
    const bySection = {};
    Object.values(params).forEach(p=>{ if(p.type!=='bool'&&p.type!=='dict') return; (bySection[p.section]=bySection[p.section]||[]).push(p.id); });
    const general = bySection['Параметры'] || [];
    function paramsForComponent(compFull){
      const sec = normComp(compFull);
      const own = bySection[sec] || [];
      return own.concat(general.filter(g=>own.indexOf(g)<0));
    }

    // streamData теперь включает формулу и округление (per-stream)
    function defStreamData(baseN, primary, pool){
      const norms = primary
        ? [ {id:'n0', value:+(baseN*0.8).toFixed(2), from:'01.01.2024', to:'31.12.2024'},
            {id:'n1', value:baseN, from:'01.01.2025', to:''} ]
        : [ {id:'n0', value:baseN, from:'01.01.2025', to:''} ];
      return { norms, triggers:[], labor:[], formula:{tokens:[{t:'N'}]}, round:{mode:'CEIL', step:0.1} };
    }

    // СПРАВОЧНИК + начальные назначения на стримы
    const catalog = D.works.map((w,i)=>{
      const id='c'+i;
      const comp=normComp(w.component);
      const rec=recommendFor(comp);
      const pool=paramsForComponent(comp);
      const home=mapStream(w.stream) || rec[0];
      const desc='Типовая работа арх. компонента «'+comp+'».';
      const byStream={};
      // основной стрим
      const primary=defStreamData(w.norm||1, true, pool);
      if(pool.length){
        if(i%2===0){ const tp=params[pool[i%pool.length]]; if(tp) primary.triggers.push({id:'t0', p:tp.id, vals:[tp.values[0]?tp.values[0].v:'']}); }
        if(pool.length>1){ const lp=params[pool[(i+1)%pool.length]]; if(lp&&lp.type==='dict'){ primary.labor.push({id:'l0', p:lp.id}); primary.formula={tokens:[{t:'N'},{t:'op',op:'×'},{t:'coef',p:lp.id}]}; } }
      }
      byStream[home]=primary;
      // ~каждая 3-я работа назначена и на второй (рекомендованный) стрим — для демонстрации мультистрима
      if(i%3===0){ const s2=rec.find(s=>s!==home)||rec[0]; if(s2&&s2!==home){ byStream[s2]=defStreamData(+( (w.norm||1)*1.15 ).toFixed(2), false, pool); } }
      return { id, name:w.name, component:comp, desc, recommend:rec, byStream };
    });
    // несколько транзитивных примеров
    catalog.forEach((w,i)=>{ if(i%41===40 && catalog[i-1]){ const s=Object.keys(w.byStream)[0]; if(s) w.byStream[s].formula={tokens:[{t:'work',ref:catalog[i-1].id}]}; } });

    window.SA_LOGIC = { params, catalog, works:catalog, paramsForComponent, normComp, recommendFor, mapStream, STREAMS, GROUPS, defStreamData:(n,p)=>defStreamData(n,p,[]) };
    return window.SA_LOGIC;
  }

  // ---------- активная норма на дату ----------
  const TODAY = new Date(2026,5,17);
  function parseDate(s){ if(!s) return null; const m=/(\d{2})\.(\d{2})\.(\d{4})/.exec(s); return m? new Date(+m[3],+m[2]-1,+m[1]) : null; }
  function activeNorm(norms){
    if(!norms||!norms.length) return null;
    for(const n of norms){ const f=parseDate(n.from), t=parseDate(n.to);
      if(f && f<=TODAY && (!t || t>=TODAY)) return n; }
    return null;
  }

  // ---------- Вычислитель (formula/round берутся из streamData) ----------
  const PREC={'×':2,'÷':2,'+':1,'−':1};
  function opNorm(o){ return o==='*'||o==='·'?'×':o==='/'?'÷':o==='-'?'−':o; }
  window.SA_EVAL = {
    TODAY, parseDate, activeNorm, recommendFor,
    streamData(work, stream){ return (work.byStream&&work.byStream[stream]) || {norms:[],triggers:[],labor:[],formula:{tokens:[{t:'N'}]},round:{mode:'NONE'}}; },
    assignedStreams(work){ return Object.keys(work.byStream||{}); },
    isAssigned(work, stream){ return !!(work.byStream && work.byStream[stream]); },
    ans(answers,p){ return (answers&&answers[p.id]!=null)?answers[p.id]:p.cur; },
    coefOf(answers,p){ const a=this.ans(answers,p); const row=(p.values||[]).find(x=>x.v===a); return row?row.coef:1; },
    normValue(work, stream){ const n=activeNorm(this.streamData(work,stream).norms); return n?n.value:null; },
    formulaOf(work, stream){ const sd=this.streamData(work,stream); return (sd.formula&&sd.formula.tokens)?sd.formula.tokens:[{t:'N'}]; },
    roundOf(work, stream){ return this.streamData(work,stream).round||{mode:'NONE'}; },

    operandVal(tok, work, stream, params, answers, results){
      if(tok.t==='N'){ const v=this.normValue(work,stream); return v==null?0:v; }
      if(tok.t==='num') return (+tok.val)||0;
      if(tok.t==='coef'){ const p=params[tok.p]; return p?this.coefOf(answers,p):1; }
      if(tok.t==='work'){ return (results && results[tok.ref]!=null)? results[tok.ref] : 0; }
      return 0;
    },
    evalTokens(tokens, work, stream, params, answers, results){
      const out=[], ops=[];
      for(const tk of tokens){
        if(tk.t==='op'){ const o=opNorm(tk.op);
          while(ops.length){ const top=ops[ops.length-1]; if(top!=='(' && PREC[top]>=PREC[o]) out.push({op:ops.pop()}); else break; }
          ops.push(o);
        } else if(tk.t==='lp') ops.push('(');
        else if(tk.t==='rp'){ while(ops.length && ops[ops.length-1]!=='(') out.push({op:ops.pop()}); if(ops[ops.length-1]==='(') ops.pop(); }
        else out.push({val:this.operandVal(tk,work,stream,params,answers,results)});
      }
      while(ops.length) out.push({op:ops.pop()});
      const stk=[];
      for(const r of out){ if(r.op!==undefined){ const b=stk.pop()||0,a=stk.pop()||0; stk.push(r.op==='×'?a*b:r.op==='÷'?a/(b||1):r.op==='−'?a-b:a+b); } else stk.push(r.val); }
      return stk.length?stk[0]:0;
    },
    applyRound(raw, round){
      if(!round||round.mode==='NONE'||!round.step) return +raw.toFixed(4);
      const s=round.step;
      if(round.mode==='CEIL')  return +(Math.ceil(raw/s)*s).toFixed(4);
      if(round.mode==='FLOOR') return +(Math.floor(raw/s)*s).toFixed(4);
      return +(Math.round(raw/s)*s).toFixed(4);
    },
    evalWork(work, stream, params, answers, results){
      const toks=this.formulaOf(work,stream);
      const raw=this.evalTokens(toks, work, stream, params, answers, results);
      return { raw:+(+raw).toFixed(4), value:this.applyRound(+raw, this.roundOf(work,stream)) };
    },
    hasWorkRef(work, stream){ return this.formulaOf(work,stream).some(t=>t.t==='work'); },
    isPureTransitive(work, stream){ const t=this.formulaOf(work,stream); return t.length===1 && t[0].t==='work'; },
    kindOf(work, stream){
      const toks=this.formulaOf(work,stream);
      if(this.isPureTransitive(work,stream)) return 'транзитивная';
      const hasWork=toks.some(t=>t.t==='work');
      const opers=toks.filter(t=>t.t==='op').map(t=>opNorm(t.op));
      const hasParen=toks.some(t=>t.t==='lp');
      let base = opers.some(o=>o==='+'||o==='−') ? 'аддитивно-мультипликативная'
               : opers.some(o=>o==='÷') ? 'мультипликативная (÷)'
               : opers.length ? 'мультипликативная' : 'фиксированная';
      if(hasWork) base='транзитивная составная';
      return hasParen? base+' · скобки' : base;
    },
    trigState(work, stream, params, answers){
      const t=this.streamData(work,stream).triggers||[];
      if(!t.length) return {appears:false, empty:true, count:0};
      const ok=t.every(c=>{ const p=params[c.p]; if(!p) return false; const a=this.ans(answers,p); return (c.vals||[]).indexOf(a)>=0; });
      return {appears:ok, empty:false, count:t.length};
    },
    stringify(work, stream, params){
      return this.formulaOf(work,stream).map(t=>{
        if(t.t==='N') return 'N'; if(t.t==='num') return String(t.val);
        if(t.t==='op') return opNorm(t.op); if(t.t==='lp') return '('; if(t.t==='rp') return ')';
        if(t.t==='coef'){ const p=params[t.p]; return 'P['+(p?p.label:t.p)+']'; }
        if(t.t==='work'){ const w=window.SA_LOGIC.catalog.find(x=>x.id===t.ref); return '[Работа: '+(w?w.name:t.ref)+']'; }
        return '';
      }).join(' ');
    },
    parse(str, laborParams, params){
      const tokens=[]; const errors=[];
      const re=/\s*(N|Н|P\[[^\]]+\]|k\d+|\d+(?:[.,]\d+)?|[()+\-\u2212\u00d7\u00f7*/\u00b7])/giy;
      let m, last=0; str=(str||'').trim();
      while((m=re.exec(str))){ last=re.lastIndex; const tok=m[1];
        if(/^(N|Н)$/i.test(tok)) tokens.push({t:'N'});
        else if(/^k\d+$/i.test(tok)){ const idx=parseInt(tok.slice(1))-1; const lp=laborParams[idx]; if(lp) tokens.push({t:'coef',p:lp}); else errors.push('нет '+tok); }
        else if(/^P\[/i.test(tok)){ const name=tok.slice(2,-1).trim().toLowerCase(); const id=Object.keys(params).find(k=>params[k].label.toLowerCase()===name||params[k].label.toLowerCase().startsWith(name)); if(id) tokens.push({t:'coef',p:id}); else errors.push('нет P['+tok.slice(2,-1)+']'); }
        else if(/^\d/.test(tok)) tokens.push({t:'num',val:parseFloat(tok.replace(',','.'))});
        else if(tok==='(') tokens.push({t:'lp'});
        else if(tok===')') tokens.push({t:'rp'});
        else tokens.push({t:'op',op:opNorm(tok)});
      }
      const rest=str.slice(last).trim(); if(rest) errors.push('не разобрано: '+rest);
      return { tokens, errors };
    },
  };

  if(window.SA_DATA) build(); else window.SA_LOGIC_BUILD = build;
})();
