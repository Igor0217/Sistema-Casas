// ── FIREBASE ──────────────────────────────────────────
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getFirestore, doc, getDoc, setDoc, onSnapshot }
  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            "AIzaSyCH1771AFZyfSD_PvNxR9AQoZ30dg_Dc0g",
  authDomain:        "fortalezasas-25e42.firebaseapp.com",
  projectId:         "fortalezasas-25e42",
  storageBucket:     "fortalezasas-25e42.firebasestorage.app",
  messagingSenderId: "383032445971",
  appId:             "1:383032445971:web:490f92170d2f36be70c3e6"
};

const app    = initializeApp(firebaseConfig);
const db     = getFirestore(app);
const DB_DOC = doc(db, 'hogar', 'finanzas');

// ── CONSTANTS ─────────────────────────────────────────
const SESSION_KEY = 'finanzas_familiares_v34_session';
const LOGIN  = { users: ['Alexander', 'Nuri'], pass: 'hogar2026' };
const OWNERS = ['Alexander', 'Nuri', 'Hogar'];

const BASE_INCOME_CATS  = ['Salario','Prima','Bono','Honorarios','Comisiones','Aporte al hogar','Reembolso','Otros ingresos'];
const BASE_EXPENSE_CATS = ['Mercado','Servicios','Transporte','Salud','Educación','Arriendo','Entretenimiento','Regalos','Mascotas','Otros'];
const BASE_DEBT_CATS    = ['Tarjeta de crédito','Préstamo','Cuota hogar','Crédito','Deuda personal','Otros'];

const CHART_COLORS = [
  '#6ea8f7','#6dd4b0','#f7a96e','#b39ef7','#f7d96e',
  '#f78ea0','#7ecfea','#a8d97a','#f7b3d4','#9ecfe0','#d4b3f7','#f7c96e',
];
const PAGE_META = {
  dashboard:    { kicker:'Resumen',       title:'Flujo del hogar' },
  ingresos:     { kicker:'Ingresos',      title:'Registrar ingresos' },
  gastos:       { kicker:'Gastos',        title:'Registrar gastos' },
  traslados:    { kicker:'Traslados',     title:'Mover dinero entre cuentas' },
  planificacion:{ kicker:'Planificación', title:'Metas y objetivos' },
  movimientos:  { kicker:'Historial',     title:'Todos los movimientos' },
  reportes:     { kicker:'Reportes',      title:'Estado financiero' },
  cuentas:      { kicker:'Cuentas',       title:'Mis cuentas y saldos' },
  categorias:   { kicker:'Ajustes',       title:'Gestión de categorías' },
};

// ── WALLET HELPERS ────────────────────────────────────
// Map transaction method → wallet key suffix
const METHOD_MAP = { 'Banco':'Banco', 'Efectivo':'Efectivo', 'Tarjeta':'Tarjeta',
                     'Nequi':'Banco', 'Transferencia':'Banco' };
const WALLET_DEFS = [
  { key:'Banco',    label:'Banco',    icon:'🏦', cls:'bank'  },
  { key:'Efectivo', label:'Efectivo', icon:'💵', cls:'cash'  },
  { key:'Tarjeta',  label:'Tarjeta',  icon:'💳', cls:'card'  },
];

// Calculate current real balance for owner+method — includes traslados
function walletBalance(owner, methodKey) {
  const walletKey = owner + '-' + methodKey;
  const initial = Number(state.wallets[walletKey] || 0);
  // movements from transactions
  const txDelta = state.transactions.reduce((acc, t) => {
    const tMethod = METHOD_MAP[t.method] || t.method;
    if (t.owner !== owner || tMethod !== methodKey) return acc;
    if (t.type === 'ingreso') return acc + Number(t.amount || 0);
    if (t.type === 'deuda' && t.debtStatus === 'pagada') return acc - Number(t.amount || 0);
    if (t.type === 'gasto') return acc - Number(t.amount || 0);
    return acc;
  }, 0);
  // movements from traslados
  const trDelta = (state.traslados || []).reduce((acc, tr) => {
    if (tr.owner !== owner) return acc;
    if (tr.to   === methodKey) return acc + Number(tr.amount || 0);
    if (tr.from === methodKey) return acc - Number(tr.amount || 0);
    return acc;
  }, 0);
  return initial + txDelta + trDelta;
}

// ── RENDER: TRASLADOS ─────────────────────────────────
const METHOD_ICON = { Banco:'🏦', Efectivo:'💵', Tarjeta:'💳' };

function updateTrasladoPreview() {
  const owner  = $('trasladoOwner').value;
  const from   = $('trasladoFrom').value;
  const to     = $('trasladoTo').value;
  const amount = Number($('trasladoAmount').value || 0);
  const prev   = $('trasladoPreview');
  if (!amount || from === to) { prev.style.display='none'; return; }
  const balFrom = walletBalance(owner, from);
  prev.style.display = 'block';
  prev.innerHTML = `
    <strong>${owner}</strong>: 
    ${METHOD_ICON[from]} ${from} <span style="color:var(--red)">−${fmt(amount)}</span> → saldo ${fmt(balFrom - amount)}
    &nbsp;&nbsp;|&nbsp;&nbsp;
    ${METHOD_ICON[to]} ${to} <span style="color:var(--green)">+${fmt(amount)}</span> → saldo ${fmt(walletBalance(owner, to) + amount)}
  `;
}

function saveTraslado() {
  const owner  = $('trasladoOwner').value;
  const from   = $('trasladoFrom').value;
  const to     = $('trasladoTo').value;
  const amount = Number($('trasladoAmount').value || 0);
  const date   = $('trasladoDate').value || new Date().toISOString().slice(0,10);
  const desc   = ($('trasladoDescription').value || '').trim() || `Retiro ${from} → ${to}`;

  if (!amount)        return alert('Ingresa un valor.');
  if (from === to)    return alert('El origen y destino deben ser diferentes.');

  state.traslados.push({ id:uid(), owner, from, to, amount, date, description:desc });
  clearTraslado();
  saveData(state);
  showToast('✓ Traslado registrado');
}

function clearTraslado() {
  $('trasladoOwner').value = 'Alexander';
  $('trasladoDate').value  = new Date().toISOString().slice(0,10);
  $('trasladoAmount').value = '';
  $('trasladoFrom').value  = 'Banco';
  $('trasladoTo').value    = 'Efectivo';
  $('trasladoDescription').value = '';
  $('trasladoPreview').style.display = 'none';
}

function renderTrasladoList() {
  const list = $('trasladoList');
  const rows = [...(state.traslados||[])].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if (!rows.length) { list.innerHTML='<div class="empty">Sin traslados registrados.</div>'; return; }
  list.innerHTML = rows.map(tr=>`
    <div class="traslado-item">
      <div class="traslado-arrow">⇄</div>
      <div class="traslado-info">
        <div class="traslado-name">${esc(tr.description)}</div>
        <div class="traslado-meta">${esc(tr.date)} · ${esc(tr.owner)} · ${METHOD_ICON[tr.from]||''} ${esc(tr.from)} → ${METHOD_ICON[tr.to]||''} ${esc(tr.to)}</div>
      </div>
      <div class="traslado-amount">${fmt(tr.amount)}</div>
      <button class="btn btn-danger btn-sm" data-del="${tr.id}" style="flex-shrink:0">✕</button>
    </div>`).join('');
  list.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
    if (!confirm('¿Eliminar este traslado?')) return;
    state.traslados = state.traslados.filter(t => t.id !== btn.dataset.del);
    saveData(state);
  }));
}

// ── APP STATE ─────────────────────────────────────────
const $ = id => document.getElementById(id);
let editingId = null, editingMode = 'income';
let chartMonthOffset = 0;
let modalEditId = null;
let isSaving = false;

const state = defaultState();

function defaultState() {
  return {
    goals: { monthly:0, total:0 },
    goalItems: [], budgets: [], transactions: [],
    traslados: [],
    customIncomeCats: [], customExpenseCats: [], customDebtCats: [],
    wallets: {
      'Alexander-Banco':0, 'Alexander-Efectivo':0, 'Alexander-Tarjeta':0,
      'Nuri-Banco':0,      'Nuri-Efectivo':0,      'Nuri-Tarjeta':0,
      'Hogar-Banco':0,     'Hogar-Efectivo':0,     'Hogar-Tarjeta':0,
    },
    savedAt: null,
  };
}
function normalize(data) {
  const b = defaultState();
  return {
    goals:             { ...b.goals, ...(data.goals||{}) },
    goalItems:         Array.isArray(data.goalItems)         ? data.goalItems         : [],
    budgets:           Array.isArray(data.budgets)           ? data.budgets           : [],
    transactions:      Array.isArray(data.transactions)      ? data.transactions      : [],
    traslados:         Array.isArray(data.traslados)         ? data.traslados         : [],
    customIncomeCats:  Array.isArray(data.customIncomeCats)  ? data.customIncomeCats  : [],
    customExpenseCats: Array.isArray(data.customExpenseCats) ? data.customExpenseCats : [],
    customDebtCats:    Array.isArray(data.customDebtCats)    ? data.customDebtCats    : [],
    wallets:           (data.wallets && typeof data.wallets==='object') ? {...b.wallets,...data.wallets} : b.wallets,
    savedAt: data.savedAt||null,
  };
}

// ── FIREBASE LOAD + SYNC ──────────────────────────────
// Normalize owner names — old data may have "Alejandro" instead of "Alexander"
function fixOwnerNames(data) {
  if (Array.isArray(data.transactions)) {
    data.transactions = data.transactions.map(t => ({
      ...t,
      owner: t.owner === 'Alejandro' ? 'Alexander' : t.owner
    }));
  }
  return data;
}
async function loadInitialData() {
  showLoading(true);
  try {
    const snap = await getDoc(DB_DOC);
    if (snap.exists()) {
      Object.assign(state, normalize(fixOwnerNames(snap.data())));
    } else {
      // Try to migrate old localStorage data to Firebase
      const LEGACY = ['finanzas_familiares_v36','finanzas_familiares_v34_ejecutiva','finanzas_familiares_v33_flujo'];
      for (const key of LEGACY) {
        try {
          const local = localStorage.getItem(key);
          if (local) {
            Object.assign(state, normalize(JSON.parse(local)));
            await setDoc(DB_DOC, JSON.parse(JSON.stringify(state)));
            showToast('✓ Datos locales migrados a la nube', 'success');
            break;
          }
        } catch(e) {}
      }
    }
  } catch(e) {
    console.error('Firebase load error:', e);
    showToast('⚠️ Sin conexión. Revisa tu internet.', 'error');
  }
  showLoading(false);
  render();
  // Start listening for real-time updates from other devices
  onSnapshot(DB_DOC, (snap) => {
    if (!snap.exists() || isSaving) return;
    Object.assign(state, normalize(fixOwnerNames(snap.data())));
    render();
  });
}

async function saveData(next = state) {
  next.savedAt = new Date().toISOString();
  Object.assign(state, next);
  isSaving = true;
  try {
    await setDoc(DB_DOC, JSON.parse(JSON.stringify(next)));
    showToast('✓ Guardado', 'success');
  } catch(e) {
    console.error('Firebase save error:', e);
    showToast('⚠️ Error al guardar. Revisa tu conexión.', 'error');
  }
  isSaving = false;
  render();
}

// ── TOAST ─────────────────────────────────────────────
function showToast(msg, type='success') {
  let t = document.getElementById('appToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToast';
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;padding:11px 18px;border-radius:12px;font-size:13px;font-weight:600;font-family:"Sora",sans-serif;box-shadow:0 4px 20px rgba(0,0,0,.12);transition:opacity .3s;pointer-events:none';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = type==='error'?'#fceef0':'#e0f7f2';
  t.style.color      = type==='error'?'#e8344c':'#00a878';
  t.style.border     = `1px solid ${type==='error'?'rgba(232,52,76,.2)':'rgba(0,168,120,.2)'}`;
  t.style.opacity    = '1';
  clearTimeout(t._t);
  t._t = setTimeout(()=>{ t.style.opacity='0'; }, 2500);
}

// ── LOADING ───────────────────────────────────────────
function showLoading(show) {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.style.cssText = 'position:fixed;inset:0;background:rgba(13,13,18,.45);backdrop-filter:blur(4px);z-index:200;display:grid;place-items:center;font-family:"Sora",sans-serif';
    el.innerHTML = '<div style="background:#fff;border-radius:18px;padding:32px 40px;text-align:center;box-shadow:0 8px 40px rgba(0,0,0,.12)"><div style="font-size:28px;margin-bottom:12px">🏠</div><div style="font-size:15px;font-weight:700;color:#0d0d12;margin-bottom:4px">Cargando datos...</div><div style="font-size:13px;color:#aaa">Conectando con la nube</div></div>';
    document.body.appendChild(el);
  }
  el.style.display = show ? 'grid' : 'none';
}

// ── CATEGORY HELPERS ──────────────────────────────────
function allIncomeCats()  { return [...BASE_INCOME_CATS,  ...state.customIncomeCats]; }
function allExpenseCats() { return [...BASE_EXPENSE_CATS, ...state.customExpenseCats]; }
function allDebtCats()    { return [...BASE_DEBT_CATS,    ...state.customDebtCats]; }

// ── UTILS ─────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const sum  = arr => arr.reduce((a,b) => a+(Number(b)||0), 0);
const fmt  = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const labelType = t => t==='ingreso'?'Ingreso':t==='gasto'?'Gasto':'Deuda';
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function getNavYM(offset=0){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()+offset);return d.toISOString().slice(0,7);}
function getNavLabel(ym){const[y,m]=ym.split('-');return['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][parseInt(m,10)-1]+' '+y;}
function rowsForYM(ym){return state.transactions.filter(t=>(t.date||'').slice(0,7)===ym);}

// ── LOGIN ─────────────────────────────────────────────
function setLogin() {
  const logged = sessionStorage.getItem(SESSION_KEY)==='ok';
  $('loginScreen').classList.toggle('hidden', logged);
  $('appScreen').classList.toggle('hidden', !logged);
  $('btnLogin').addEventListener('click', doLogin);
  $('loginPass').addEventListener('keydown', e => { if(e.key==='Enter') doLogin(); });
  $('btnLogout').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); });
}
function doLogin() {
  const user=($('loginUser').value||'').trim(), pass=($('loginPass').value||'').trim();
  if (LOGIN.users.includes(user) && pass===LOGIN.pass) {
    sessionStorage.setItem(SESSION_KEY,'ok');
    $('loginScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
    loadInitialData();
  } else { $('loginMsg').textContent='Usuario o clave incorrectos.'; }
}

// ── NAVIGATION ────────────────────────────────────────
function setTabs() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-page').forEach(s=>s.classList.remove('active'));
      $('tab-'+tab).classList.add('active');
      const m = PAGE_META[tab]||{};
      $('pageKicker').textContent = m.kicker||'';
      $('pageTitle').textContent  = m.title||'';
    });
  });
}

// ── SELECTS ───────────────────────────────────────────
function populateSelects() {
  const today = new Date().toISOString().slice(0,10);
  $('incomeDate').value=$('expenseDate').value=today;
  refreshCategorySelects();
}
function refreshCategorySelects() {
  $('incomeCategory').innerHTML  = allIncomeCats().map(c=>`<option>${esc(c)}</option>`).join('');
  $('expenseCategory').innerHTML = ($('expenseType').value==='deuda'?allDebtCats():allExpenseCats()).map(c=>`<option>${esc(c)}</option>`).join('');
  $('budgetCategory').innerHTML  = [...new Set([...allExpenseCats(),...allDebtCats()])].map(c=>`<option>${esc(c)}</option>`).join('');
}
function updateExpenseCategories(){refreshCategorySelects();}

// ── COMPUTATIONS ──────────────────────────────────────
function totals(){
  const i=sum(state.transactions.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const e=sum(state.transactions.filter(t=>t.type==='gasto').map(t=>t.amount));
  const d=sum(state.transactions.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return{income:i,expense:e,debt:d,balance:i-e-d};
}
function byOwner(owner){
  const rows=state.transactions.filter(t=>t.owner===owner);
  const i=sum(rows.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const e=sum(rows.filter(t=>t.type==='gasto').map(t=>t.amount));
  const d=sum(rows.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return{income:i,expense:e,debt:d,balance:i-e-d};
}
function byOwnerMonth(owner){
  const ym=new Date().toISOString().slice(0,7);
  const rows=state.transactions.filter(t=>t.owner===owner&&(t.date||'').slice(0,7)===ym);
  const i=sum(rows.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const e=sum(rows.filter(t=>t.type==='gasto').map(t=>t.amount));
  const d=sum(rows.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return{income:i,expense:e,debt:d,balance:i-e-d};
}
function currentMonthRows(){const ym=new Date().toISOString().slice(0,7);return state.transactions.filter(t=>(t.date||'').slice(0,7)===ym);}
function expenseByCategory(rows=state.transactions){
  const map={};
  rows.filter(t=>t.type==='gasto'||t.type==='deuda').forEach(t=>{map[t.category]=(map[t.category]||0)+Number(t.amount||0);});
  return Object.entries(map).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount);
}
function computeBudgetStatus(){
  const mm=Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  if(!state.budgets.length)return{percent:0,text:'Sin presupuesto configurado.'};
  const limit=sum(state.budgets.map(b=>b.amount)),spent=sum(state.budgets.map(b=>mm[b.category]||0));
  const pct=limit?Math.round((spent/limit)*100):0;
  let text=`${fmt(spent)} de ${fmt(limit)}.`;
  if(pct>100)text+=' Superaron el límite.';else if(pct>=80)text+=' Cerca del tope.';else text+=' Dentro del rango.';
  return{percent:pct,text};
}
function getBudgetAlerts(){
  const mm=Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  return state.budgets.map(b=>{const s=mm[b.category]||0,p=b.amount?Math.round((s/b.amount)*100):0;return{category:b.category,spent:s,limit:b.amount,percent:p};}).filter(x=>x.percent>=80).sort((a,b)=>b.percent-a.percent);
}

// ── RENDER: DASHBOARD ─────────────────────────────────
function renderDashboard(){
  const all=totals();
  $('metricBalance').textContent=fmt(all.balance);
  const mr=currentMonthRows();
  const mi=sum(mr.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const me=sum(mr.filter(t=>t.type==='gasto').map(t=>t.amount));
  const md=sum(mr.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  const mb=mi-me-md;
  $('monthIncome').textContent=fmt(mi);$('monthExpense').textContent=fmt(me+md);$('monthBalance').textContent=fmt(mb);

  // (debug removed)

  for(const{key,name}of[{key:'alex',name:'Alexander'},{key:'nuri',name:'Nuri'},{key:'hogar',name:'Hogar'}]){
    const d=byOwnerMonth(name);
    $(key+'Income').textContent=fmt(d.income);$(key+'Income').className='pstat-val pos';
    $(key+'Expense').textContent=fmt(d.expense);$(key+'Expense').className='pstat-val neg';
    $(key+'Debt').textContent=fmt(d.debt);$(key+'Debt').className='pstat-val neg';
    const b=$(key+'Balance');b.textContent=fmt(d.balance);b.className='pstat-val '+(d.balance>=0?'pos':'neg');
  }
  const mg=Number(state.goals.monthly||0),save=Math.max(0,mb),mpct=mg>0?Math.min(100,Math.round((save/mg)*100)):0;
  $('goalMonthPct').textContent=mpct+'%';$('goalMonthBar').style.width=mpct+'%';
  $('goalMonthText').textContent=mg?`${fmt(save)} de ${fmt(mg)}`:'Sin meta definida';
  const bud=computeBudgetStatus();
  $('budgetStatusLabel').textContent=bud.percent+'%';
  $('budgetStatusBar').style.width=Math.min(100,bud.percent)+'%';
  $('budgetStatusBar').className='prog-fill '+(bud.percent>100?'red':bud.percent>=80?'amber':'blue');
  $('budgetStatusText').textContent=bud.text;
  $('monthSummary').textContent=!mr.length?'Sin movimientos este mes.':mb>=0?`Mes positivo — saldo de ${fmt(mb)}.`:`Mes con faltante de ${fmt(Math.abs(mb))}.`;
}

// ── RENDER: RECENT ────────────────────────────────────
function renderRecent(){
  const list=$('recentList');
  const rows=[...state.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  if(!rows.length){list.innerHTML='<div class="empty">Sin movimientos registrados.</div>';return;}
  list.innerHTML=rows.map(t=>`
    <div class="tx-item">
      <div class="tx-dot ${esc(t.type)}"></div>
      <div class="tx-info">
        <div class="tx-name">${esc(t.description)}</div>
        <div class="tx-meta">${esc(t.date)} · ${esc(t.owner)} · ${esc(labelType(t.type))}</div>
      </div>
      <div class="tx-amount ${esc(t.type)}" style="margin-right:12px">${fmt(t.amount)}</div>
      <div style="display:flex;gap:6px;flex-shrink:0">
        <button class="btn btn-ghost btn-sm" data-edit="${t.id}">✎ Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${t.id}">✕ Borrar</button>
      </div>
    </div>`).join('');
  list.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openEditModal(btn.dataset.edit)));
  list.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{
    if(!confirm('¿Eliminar este movimiento?'))return;
    state.transactions=state.transactions.filter(t=>t.id!==btn.dataset.delete);saveData(state);
  }));
}

// ── RENDER: INCOME SUMMARY ────────────────────────────
const OWNER_EMOJI={Alexander:'👨',Nuri:'👩',Hogar:'🏠'};
function ownerCard(owner,d){return`
  <div class="owner-card">
    <div class="owner-avatar" style="background:var(--surface-2)">${OWNER_EMOJI[owner]||'👤'}</div>
    <div><div style="font-size:15px;font-weight:800">${esc(owner)}</div><div style="font-size:12px;color:#aaa">${owner==='Hogar'?'Cuenta compartida':'Cuenta personal'}</div></div>
    <div class="owner-stats">
      <div><div class="owner-stat-val pos">${fmt(d.income)}</div><div class="owner-stat-label">Ingresos</div></div>
      <div><div class="owner-stat-val neg">${fmt(d.expense)}</div><div class="owner-stat-label">Gastos</div></div>
      <div><div class="owner-stat-val neg">${fmt(d.debt)}</div><div class="owner-stat-label">Deudas</div></div>
      <div><div class="owner-stat-val ${d.balance>=0?'pos':'neg'}">${fmt(d.balance)}</div><div class="owner-stat-label">Balance</div></div>
    </div>
  </div>`;}
function renderIncomeSummary(){$('incomeSummary').innerHTML=OWNERS.map(o=>ownerCard(o,byOwner(o))).join('');}

// ── RENDER: BUDGET LIST ───────────────────────────────
function renderBudgetList(){
  const list=$('budgetList');
  if(!state.budgets.length){list.innerHTML='<div class="empty">Sin presupuestos definidos.</div>';return;}
  const mm=Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  list.innerHTML=state.budgets.map(b=>{
    const s=mm[b.category]||0,p=b.amount?Math.round((s/b.amount)*100):0;
    const col=p>100?'red':p>=80?'amber':'green',badge=p>100?'gasto':p>=80?'deuda':'ingreso';
    return`<div class="tx-item"><div class="tx-info"><div class="tx-name">${esc(b.category)}</div><div style="margin-top:6px"><div class="prog-track" style="max-width:300px"><div class="prog-fill ${col}" style="width:${Math.min(100,p)}%"></div></div></div><div class="tx-meta" style="margin-top:4px">${fmt(s)} de ${fmt(b.amount)}</div></div><span class="badge ${badge}">${p}%</span></div>`;
  }).join('');
}

// ── RENDER: GOALS ─────────────────────────────────────
function renderGoals(){
  if(state.goalItems.length)state.goals.total=sum(state.goalItems.map(g=>g.amount));
  $('goalMonthly').value=state.goals.monthly||'';
  const list=$('goalList');
  if(!state.goalItems.length){list.innerHTML='<div class="empty">Sin objetivos de ahorro.</div>';return;}
  list.innerHTML=state.goalItems.map(g=>{
    const p=g.amount?Math.min(100,Math.round((g.saved/g.amount)*100)):0,col=p>=100?'green':p>=70?'amber':'blue';
    return`<div class="goal-item"><div class="goal-head"><div class="goal-name">${esc(g.name)}</div><div class="goal-pct">${p}%</div></div><div class="prog-track"><div class="prog-fill ${col}" style="width:${p}%"></div></div><div class="goal-meta">${esc(g.owner)} · ${fmt(g.saved)} de ${fmt(g.amount)}</div></div>`;
  }).join('');
}

// ── RENDER: CHART ─────────────────────────────────────
function renderChartInto(id,ym){
  const area=$(id);if(!area)return;
  const rows=expenseByCategory(rowsForYM(ym));
  if(!rows.length){area.innerHTML='<div class="empty">Sin gastos para este mes.</div>';return;}
  const max=rows[0].amount||1;
  area.innerHTML=rows.slice(0,10).map((r,i)=>{
    const c=CHART_COLORS[i%CHART_COLORS.length],w=Math.max(4,Math.round((r.amount/max)*100));
    return`<div class="bar-row"><div class="bar-label"><div class="bar-dot" style="background:${c}"></div><div class="bar-name">${esc(r.category)}</div></div><div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${c}"></div></div><div class="bar-val">${fmt(r.amount)}</div></div>`;
  }).join('');
}
function renderChart(){
  renderChartInto('chartArea',getNavYM(0));
  const ym=getNavYM(chartMonthOffset);
  renderChartInto('dashChartArea',ym);
  const lb=$('monthNavLabel'),bg=$('monthCurrentBadge'),nb=$('btnMonthNext');
  if(lb)lb.textContent=getNavLabel(ym);
  if(bg)bg.style.display=chartMonthOffset===0?'inline-flex':'none';
  if(nb)nb.style.opacity=chartMonthOffset>=0?'0.3':'1';
}

// ── RENDER: RECURRING ─────────────────────────────────
function renderRecurring(){
  const list=$('recurringList'),items=state.transactions.filter(t=>t.recurring==='si');
  if(!items.length){list.innerHTML='<div class="empty">Sin pagos recurrentes.</div>';return;}
  list.innerHTML=items.map(t=>`<div class="rec-item"><div><div style="font-size:14px;font-weight:600">${esc(t.description)}</div><div style="font-size:12px;color:#aaa">${esc(t.owner)} · ${esc(labelType(t.type))}</div></div><div class="rec-amount">${fmt(t.amount)}</div></div>`).join('');
}

// ── RENDER: TRANSACTIONS ──────────────────────────────
function filteredTransactions(){
  const o=$('filterOwner').value,tp=$('filterType').value;
  return[...state.transactions].filter(t=>o==='Todos'||t.owner===o).filter(t=>tp==='Todos'||t.type===tp).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
function renderTransactions(){
  const tbody=$('txTable'),rows=filteredTransactions();
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#bbb;padding:24px">Sin movimientos.</td></tr>';return;}
  tbody.innerHTML=rows.map(t=>`
    <tr>
      <td style="color:#888;font-size:12px;font-family:var(--mono)">${esc(t.date||'')}</td>
      <td><span class="badge ${esc(t.type)}">${esc(labelType(t.type))}</span></td>
      <td>${esc(t.owner)}</td>
      <td style="color:#888">${esc(t.category)}</td>
      <td>${esc(t.description)}</td>
      <td class="right ${t.type==='ingreso'?'money-pos':'money-neg'}">${fmt(t.amount)}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" data-edit="${t.id}">✎ Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${t.id}">✕ Borrar</button>
      </div></td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-edit]').forEach(btn=>btn.addEventListener('click',()=>openEditModal(btn.dataset.edit)));
  tbody.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{
    if(!confirm('¿Eliminar este movimiento?'))return;
    state.transactions=state.transactions.filter(t=>t.id!==btn.dataset.delete);saveData(state);
  }));
}

// ── RENDER: REPORTS ───────────────────────────────────
function renderReports(){
  $('reportAccounts').innerHTML=OWNERS.map(o=>ownerCard(o,byOwner(o))).join('');
  const alerts=getBudgetAlerts(),c=$('budgetAlerts');
  if(!alerts.length){c.innerHTML='<div class="empty">Todo dentro del presupuesto.</div>';return;}
  c.innerHTML=alerts.map(a=>`<div class="budget-alert ${a.percent>100?'danger':'warn'}"><div><strong>${esc(a.category)}</strong><div style="font-size:12px;margin-top:2px;opacity:.7">${fmt(a.spent)} de ${fmt(a.limit)}</div></div><span style="font-family:var(--mono);font-weight:800;font-size:14px">${a.percent}%</span></div>`).join('');
}

// ── RENDER: CATEGORY MANAGER ─────────────────────────
function renderCategoryManager(){
  renderCatGroup('incomeCatTags', BASE_INCOME_CATS, state.customIncomeCats,'income');
  renderCatGroup('expenseCatTags',BASE_EXPENSE_CATS,state.customExpenseCats,'expense');
  renderCatGroup('debtCatTags',   BASE_DEBT_CATS,   state.customDebtCats,  'debt');
}
function renderCatGroup(cid,base,custom,type){
  const c=$(cid);
  c.innerHTML=base.map(x=>`<span class="cat-tag">${esc(x)}</span>`).join('')+
    custom.map(x=>`<span class="cat-tag custom">${esc(x)}<button class="cat-tag-x" data-type="${type}" data-cat="${esc(x)}">×</button></span>`).join('');
  c.querySelectorAll('[data-cat]').forEach(btn=>btn.addEventListener('click',()=>removeCustomCat(btn.dataset.type,btn.dataset.cat)));
}
function addCustomCat(type){
  const iid=type==='income'?'newIncomeCat':type==='expense'?'newExpenseCat':'newDebtCat';
  const raw=($(iid).value||'').trim();if(!raw)return;
  const arr=type==='income'?state.customIncomeCats:type==='expense'?state.customExpenseCats:state.customDebtCats;
  const base=type==='income'?BASE_INCOME_CATS:type==='expense'?BASE_EXPENSE_CATS:BASE_DEBT_CATS;
  if([...base,...arr].some(c=>c.toLowerCase()===raw.toLowerCase())){alert('Esa categoría ya existe.');return;}
  arr.push(raw);$(iid).value='';saveData(state);
}
function removeCustomCat(type,cat){
  if(!confirm(`¿Eliminar "${cat}"?`))return;
  if(type==='income')state.customIncomeCats=state.customIncomeCats.filter(c=>c!==cat);
  if(type==='expense')state.customExpenseCats=state.customExpenseCats.filter(c=>c!==cat);
  if(type==='debt')state.customDebtCats=state.customDebtCats.filter(c=>c!==cat);
  saveData(state);
}

// ── LAST SAVED ────────────────────────────────────────
function updateLastSaved(){
  const s=state.savedAt?'✓ Sincronizado '+new Date(state.savedAt).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}):'⊙ Sin guardar';
  $('lastSaved').textContent=$('savedChipSidebar').textContent=s;
}

// ── SAVE INCOME ───────────────────────────────────────
function saveIncome(){
  const tx={id:editingMode==='income'&&editingId?editingId:uid(),type:'ingreso',owner:$('incomeOwner').value,date:$('incomeDate').value||new Date().toISOString().slice(0,10),category:$('incomeCategory').value,amount:Number($('incomeAmount').value||0),method:$('incomeMethod').value,description:($('incomeDescription').value||'').trim(),note:($('incomeNote').value||'').trim(),split:'no',debtStatus:'pagada',recurring:'no'};
  if(!tx.amount||!tx.description)return alert('Completa valor y descripción.');
  if(editingMode==='income'&&editingId){const i=state.transactions.findIndex(t=>t.id===editingId);if(i>=0)state.transactions[i]=tx;editingId=null;clearIncomeForm();return saveData(state);}
  state.transactions.push(tx);clearIncomeForm();saveData(state);
}

// ── SAVE EXPENSE ──────────────────────────────────────
function saveExpense(){
  const tx={id:editingMode==='expense'&&editingId?editingId:uid(),type:$('expenseType').value,owner:$('expenseOwner').value,date:$('expenseDate').value||new Date().toISOString().slice(0,10),category:$('expenseCategory').value,amount:Number($('expenseAmount').value||0),method:$('expenseMethod').value,description:($('expenseDescription').value||'').trim(),note:($('expenseNote').value||'').trim(),split:$('expenseSplit').value,debtStatus:$('expenseDebtStatus').value,recurring:$('expenseRecurring').value};
  if(!tx.amount||!tx.description)return alert('Completa valor y descripción.');
  if(editingMode==='expense'&&editingId){const i=state.transactions.findIndex(t=>t.id===editingId);if(i>=0)state.transactions[i]=tx;editingId=null;clearExpenseForm();return saveData(state);}
  if(tx.type==='gasto'&&tx.split==='si'){const h=Math.round(tx.amount/2),o=tx.amount-h;state.transactions.push({...tx,id:uid(),owner:'Alexander',amount:h,description:tx.description+' (50/50)'},{...tx,id:uid(),owner:'Nuri',amount:o,description:tx.description+' (50/50)'});}
  else state.transactions.push(tx);
  clearExpenseForm();saveData(state);
}

// ── CLEAR FORMS ───────────────────────────────────────
function clearIncomeForm(){
  $('incomeOwner').value='Alexander';$('incomeDate').value=new Date().toISOString().slice(0,10);refreshCategorySelects();
  $('incomeAmount').value='';$('incomeMethod').value='Efectivo';$('incomeDescription').value='';$('incomeNote').value='';
  editingMode='income';editingId=null;$('incomeFormTitle').textContent='Nuevo ingreso';$('incomeEditBadge').textContent='Ingreso';$('incomeEditBadge').className='badge personal';
}
function clearExpenseForm(){
  $('expenseType').value='gasto';refreshCategorySelects();$('expenseOwner').value='Hogar';$('expenseDate').value=new Date().toISOString().slice(0,10);
  $('expenseAmount').value='';$('expenseMethod').value='Efectivo';$('expenseDescription').value='';$('expenseNote').value='';
  $('expenseSplit').value='no';$('expenseDebtStatus').value='pendiente';$('expenseRecurring').value='no';
  editingMode='expense';editingId=null;$('expenseFormTitle').textContent='Nuevo gasto';$('expenseEditBadge').textContent='Gasto';$('expenseEditBadge').className='badge gasto';
}

// ── SAVE BUDGET / GOAL ────────────────────────────────
function saveBudget(){const cat=$('budgetCategory').value,amt=Number($('budgetAmount').value||0);if(!cat||amt<=0)return alert('Categoría y monto válido.');const f=state.budgets.find(b=>b.category===cat);if(f)f.amount=amt;else state.budgets.push({id:uid(),category:cat,amount:amt});$('budgetAmount').value='';saveData(state);}
function saveGoalItem(){
  const n=($('goalName').value||'').trim(),a=Number($('goalAmount').value||0),s=Number($('goalSaved').value||0),o=$('goalOwner').value,m=Number($('goalMonthly').value||0);
  if(m>0)state.goals.monthly=m;if(!n||a<=0){saveData(state);return;}
  state.goalItems.push({id:uid(),name:n,amount:a,saved:s,owner:o});
  $('goalName').value='';$('goalAmount').value='';$('goalSaved').value='';$('goalOwner').value='Hogar';saveData(state);
}

// ── EXPORT / IMPORT ───────────────────────────────────
function exportBackup(){download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'backup-hogar-finanzas.json');}
function importBackup(ev){const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{saveData(normalize(JSON.parse(r.result)));showToast('✓ Backup importado');ev.target.value='';}catch{alert('Archivo inválido.');}};r.readAsText(f);}
function exportCSV(){const h=['fecha','tipo','responsable','categoria','descripcion','valor','metodo','nota','split','estado_deuda','recurrente'];const rows=state.transactions.map(t=>[t.date,t.type,t.owner,t.category,t.description||'',t.amount,t.method,t.note||'',t.split,t.debtStatus,t.recurring]);const csv=[h.join(','),...rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');download(new Blob([csv],{type:'text/csv;charset=utf-8;'}),'movimientos-hogar.csv');}
function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(u);}

// ── EDIT MODAL ────────────────────────────────────────
function openEditModal(id){
  const tx=state.transactions.find(t=>t.id===id);if(!tx)return;
  modalEditId=id;const isI=tx.type==='ingreso';
  $('modalTitle').textContent=isI?'Editar ingreso':'Editar gasto / deuda';
  ['modalTypeRow','modalSplitRow','modalDebtRow','modalRecurringRow'].forEach(i=>$(i).style.display=isI?'none':'block');
  if(isI){$('modalCategory').innerHTML=allIncomeCats().map(c=>`<option>${esc(c)}</option>`).join('');}
  else{$('modalType').value=tx.type;$('modalCategory').innerHTML=(tx.type==='deuda'?allDebtCats():allExpenseCats()).map(c=>`<option>${esc(c)}</option>`).join('');$('modalSplit').value=tx.split||'no';$('modalDebtStatus').value=tx.debtStatus||'pendiente';$('modalRecurring').value=tx.recurring||'no';}
  $('modalOwner').value=tx.owner;$('modalDate').value=tx.date||'';$('modalCategory').value=tx.category;
  $('modalAmount').value=tx.amount;$('modalMethod').value=tx.method||'Efectivo';
  $('modalDescription').value=tx.description||'';$('modalNote').value=tx.note||'';
  $('editModal').classList.remove('hidden');setTimeout(()=>$('modalAmount').focus(),100);
}
function closeEditModal(){$('editModal').classList.add('hidden');modalEditId=null;}
function saveEditModal(){
  const tx=state.transactions.find(t=>t.id===modalEditId);if(!tx)return;
  const amt=Number($('modalAmount').value||0),desc=($('modalDescription').value||'').trim();
  if(!amt||!desc){alert('Completa valor y descripción.');return;}
  tx.owner=$('modalOwner').value;tx.date=$('modalDate').value;tx.category=$('modalCategory').value;
  tx.amount=amt;tx.method=$('modalMethod').value;tx.description=desc;tx.note=($('modalNote').value||'').trim();
  if(tx.type!=='ingreso'){tx.type=$('modalType').value;tx.split=$('modalSplit').value;tx.debtStatus=$('modalDebtStatus').value;tx.recurring=$('modalRecurring').value;}
  closeEditModal();saveData(state);
}

// ── SETUP EVENTS ─────────────────────────────────────
function setupEvents(){
  $('btnSaveIncome').addEventListener('click',saveIncome);
  $('btnClearIncome').addEventListener('click',clearIncomeForm);
  $('btnSaveExpense').addEventListener('click',saveExpense);
  $('btnClearExpense').addEventListener('click',clearExpenseForm);
  $('expenseType').addEventListener('change',updateExpenseCategories);
  $('btnSaveBudget').addEventListener('click',saveBudget);
  $('btnSaveGoalItem').addEventListener('click',saveGoalItem);
  $('filterOwner').addEventListener('change',renderTransactions);
  $('filterType').addEventListener('change',renderTransactions);
  $('btnBackup').addEventListener('click',exportBackup);
  $('btnImport').addEventListener('click',()=>$('fileImport').click());
  $('fileImport').addEventListener('change',importBackup);
  $('btnExcel').addEventListener('click',exportCSV);
  $('btnReset').addEventListener('click',()=>{if(confirm('¿Reiniciar todos los datos? Se borrará todo en la nube también.')){saveData(defaultState());clearIncomeForm();clearExpenseForm();}});
  $('btnSaveTraslado').addEventListener('click', saveTraslado);
  $('btnClearTraslado').addEventListener('click', clearTraslado);
  // live preview when fields change
  ['trasladoOwner','trasladoFrom','trasladoTo','trasladoAmount'].forEach(id => {
    $(id).addEventListener('change', updateTrasladoPreview);
    $(id).addEventListener('input',  updateTrasladoPreview);
  });
  $('btnAddIncomeCat').addEventListener('click',()=>addCustomCat('income'));
  $('btnAddExpenseCat').addEventListener('click',()=>addCustomCat('expense'));
  $('btnAddDebtCat').addEventListener('click',()=>addCustomCat('debt'));
  $('newIncomeCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('income');});
  $('newExpenseCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('expense');});
  $('newDebtCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('debt');});
  $('modalClose').addEventListener('click',closeEditModal);
  $('modalCancel').addEventListener('click',closeEditModal);
  $('modalSave').addEventListener('click',saveEditModal);
  $('editModal').addEventListener('click',e=>{if(e.target===$('editModal'))closeEditModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeEditModal();});
  $('modalType').addEventListener('change',()=>{$('modalCategory').innerHTML=($('modalType').value==='deuda'?allDebtCats():allExpenseCats()).map(c=>`<option>${esc(c)}</option>`).join('');});
  $('btnMonthPrev').addEventListener('click',()=>{chartMonthOffset--;renderChart();});
  $('btnMonthNext').addEventListener('click',()=>{if(chartMonthOffset>=0)return;chartMonthOffset++;renderChart();});
}

// ── RENDER: WALLET CARDS (dashboard) ─────────────────
function renderWalletCards() {
  const container = $('walletCards');
  if (!container) return;
  // Show one card per owner × method, only if initial > 0 or has transactions
  const cards = [];
  for (const owner of OWNERS) {
    for (const w of WALLET_DEFS) {
      const bal = walletBalance(owner, w.key);
      const initial = Number(state.wallets[owner+'-'+w.key]||0);
      // Only show card if configured or has activity
      const hasTx = state.transactions.some(t => t.owner===owner && (METHOD_MAP[t.method]||t.method)===w.key);
      if (initial === 0 && !hasTx) continue;
      if (owner === 'Hogar' && w.key === 'Tarjeta') continue;
      cards.push({ owner, w, bal });
    }
  }
  if (!cards.length) {
    container.innerHTML = `<div class="empty" style="grid-column:1/-1">Configura tus saldos iniciales en <strong>Cuentas</strong> para ver el estado real de cada bolsillo.</div>`;
    return;
  }
  container.innerHTML = cards.map(({owner, w, bal}) => `
    <div class="wallet-card ${w.cls}">
      <div class="wallet-icon">${w.icon}</div>
      <div class="wallet-label">${owner} · ${w.label}</div>
      <div class="wallet-amount ${bal<0?'neg':''}">${fmt(bal)}</div>
      <div class="wallet-sub">Saldo real disponible</div>
    </div>`).join('');
}

// ── RENDER: WALLET SETUP + DETAIL (tab Cuentas) ──────
function renderWalletTab() {
  const detail = $('walletDetailList');
  if (!detail) return;
  detail.innerHTML = OWNERS.flatMap(owner =>
    WALLET_DEFS.map(w => {
      if (owner === 'Hogar' && w.key === 'Tarjeta') return '';
      const bal = walletBalance(owner, w.key);
      const hasTx = state.transactions.some(t => t.owner===owner && (METHOD_MAP[t.method]||t.method)===w.key)
                 || (state.traslados||[]).some(t => t.owner===owner && (t.from===w.key||t.to===w.key));
      if (!hasTx && bal === 0) return '';
      return `
        <div class="owner-card">
          <div class="owner-avatar" style="background:var(--surface-2);font-size:18px">${w.icon}</div>
          <div>
            <div style="font-size:14px;font-weight:800">${owner} · ${w.label}</div>
            <div style="font-size:12px;color:#aaa">${w.label === 'Banco' ? 'Cuenta bancaria' : w.label === 'Efectivo' ? 'Dinero en efectivo' : 'Tarjeta de crédito'}</div>
          </div>
          <div class="owner-stats">
            <div><div class="owner-stat-val ${bal>=0?'pos':'neg'}" style="font-size:17px">${fmt(bal)}</div><div class="owner-stat-label">Saldo actual</div></div>
          </div>
        </div>`;
    })
  ).filter(Boolean).join('') || '<div class="empty">Registra movimientos para ver el saldo de cada cuenta.</div>';
}

function saveWallets() {
  for (const owner of OWNERS) {
    for (const w of WALLET_DEFS) {
      const key = owner+'-'+w.key;
      const inputId = 'wallet_'+key.replace('-','_');
      const el = $(inputId);
      if (el) state.wallets[key] = Number(el.value||0);
    }
  }
  saveData(state);
  showToast('✓ Saldos iniciales guardados');
}

// ── RENDER ALL ────────────────────────────────────────
function render(){
  renderDashboard();renderRecent();renderIncomeSummary();renderBudgetList();
  renderGoals();renderChart();renderRecurring();renderTransactions();
  renderReports();renderCategoryManager();renderWalletCards();renderWalletTab();
  renderTrasladoList();
  refreshCategorySelects();updateLastSaved();
}

// ── INIT ─────────────────────────────────────────────
populateSelects();updateExpenseCategories();setTabs();setLogin();setupEvents();clearIncomeForm();clearExpenseForm();clearTraslado();render();
if(sessionStorage.getItem(SESSION_KEY)==='ok') loadInitialData();
