const STORAGE_KEY = 'finanzas_familiares_v36';
const SESSION_KEY = 'finanzas_familiares_v34_session';
const LEGACY_KEYS = [
  'finanzas_familiares_v34_ejecutiva','finanzas_familiares_v33_flujo',
  'finanzas_familiares_v32_final','finanzas_familiares_v31_premium',
  'finanzas_familiares_v3_elegante','finanzas_familiares_v2_bonita',
  'finanzas_familiares_v2','finanzas_familiares_v1'
];
const LOGIN = { users: ['Alexander', 'Nuri'], pass: 'hogar2026' };
const OWNERS = ['Alexander', 'Nuri', 'Hogar'];

// Base categories — never deletable
const BASE_INCOME_CATS   = ['Salario','Prima','Bono','Honorarios','Comisiones','Aporte al hogar','Reembolso','Otros ingresos'];
const BASE_EXPENSE_CATS  = ['Mercado','Servicios','Transporte','Salud','Educación','Arriendo','Entretenimiento','Regalos','Mascotas','Otros'];
const BASE_DEBT_CATS     = ['Tarjeta de crédito','Préstamo','Cuota hogar','Crédito','Deuda personal','Otros'];

// Chart soft-color palette
const CHART_COLORS = [
  '#6ea8f7','#6dd4b0','#f7a96e','#b39ef7',
  '#f7d96e','#f78ea0','#7ecfea','#a8d97a',
  '#f7b3d4','#9ecfe0','#d4b3f7','#f7c96e',
];

const PAGE_META = {
  dashboard:    { kicker:'Resumen',       title:'Flujo del hogar' },
  ingresos:     { kicker:'Ingresos',      title:'Registrar ingresos' },
  gastos:       { kicker:'Gastos',        title:'Registrar gastos' },
  planificacion:{ kicker:'Planificación', title:'Metas y objetivos' },
  movimientos:  { kicker:'Historial',     title:'Todos los movimientos' },
  reportes:     { kicker:'Reportes',      title:'Estado financiero' },
  categorias:   { kicker:'Ajustes',       title:'Gestión de categorías' },
};

const $ = id => document.getElementById(id);
let editingId = null, editingMode = 'income';

// Month navigation — 0 = current month, -1 = previous, etc.
let chartMonthOffset = 0;

function getNavYM(offset = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().slice(0, 7); // 'YYYY-MM'
}
function getNavLabel(ym) {
  const [y, m] = ym.split('-');
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${months[parseInt(m,10)-1]} ${y}`;
}
function rowsForYM(ym) {
  return state.transactions.filter(t => (t.date||'').slice(0,7) === ym);
}

const state = loadData();

// ── DATA ──────────────────────────────────────────────
function defaultState() {
  return {
    goals: { monthly: 0, total: 0 },
    goalItems: [],
    budgets: [],
    transactions: [],
    customIncomeCats: [],
    customExpenseCats: [],
    customDebtCats: [],
    savedAt: null,
  };
}
function normalize(data) {
  const base = defaultState();
  return {
    goals: { ...base.goals, ...(data.goals || {}) },
    goalItems: Array.isArray(data.goalItems) ? data.goalItems : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    customIncomeCats: Array.isArray(data.customIncomeCats) ? data.customIncomeCats : [],
    customExpenseCats: Array.isArray(data.customExpenseCats) ? data.customExpenseCats : [],
    customDebtCats: Array.isArray(data.customDebtCats) ? data.customDebtCats : [],
    savedAt: data.savedAt || null,
  };
}
function loadData() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        const parsed = normalize(JSON.parse(legacy));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        return parsed;
      }
    }
  } catch (e) { console.error(e); }
  return defaultState();
}
function saveData(next = state) {
  next.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  Object.assign(state, next);
  render();
}

// ── CATEGORY HELPERS ──────────────────────────────────
function allIncomeCats()  { return [...BASE_INCOME_CATS,  ...state.customIncomeCats]; }
function allExpenseCats() { return [...BASE_EXPENSE_CATS, ...state.customExpenseCats]; }
function allDebtCats()    { return [...BASE_DEBT_CATS,    ...state.customDebtCats]; }

// ── UTILS ─────────────────────────────────────────────
const uid  = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const sum  = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const fmt  = n => new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(Number(n)||0);
const labelType = t => t==='ingreso'?'Ingreso':t==='gasto'?'Gasto':'Deuda';
function esc(v=''){return String(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

// ── LOGIN ─────────────────────────────────────────────
function setLogin() {
  const logged = sessionStorage.getItem(SESSION_KEY) === 'ok';
  $('loginScreen').classList.toggle('hidden', logged);
  $('appScreen').classList.toggle('hidden', !logged);
  $('btnLogin').addEventListener('click', doLogin);
  $('loginPass').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });
  $('btnLogout').addEventListener('click', () => { sessionStorage.removeItem(SESSION_KEY); location.reload(); });
}
function doLogin() {
  const user = ($('loginUser').value||'').trim();
  const pass = ($('loginPass').value||'').trim();
  if (LOGIN.users.includes(user) && pass === LOGIN.pass) {
    sessionStorage.setItem(SESSION_KEY, 'ok');
    $('loginScreen').classList.add('hidden');
    $('appScreen').classList.remove('hidden');
  } else { $('loginMsg').textContent = 'Usuario o clave incorrectos.'; }
}

// ── NAVIGATION ────────────────────────────────────────
function setTabs() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-page').forEach(s => s.classList.remove('active'));
      $('tab-' + tab).classList.add('active');
      const m = PAGE_META[tab] || {};
      $('pageKicker').textContent = m.kicker || '';
      $('pageTitle').textContent  = m.title || '';
    });
  });
}

// ── SELECTS ───────────────────────────────────────────
function populateSelects() {
  const today = new Date().toISOString().slice(0,10);
  $('incomeDate').value  = today;
  $('expenseDate').value = today;
  refreshCategorySelects();
}

function refreshCategorySelects() {
  $('incomeCategory').innerHTML  = allIncomeCats().map(c=>`<option>${esc(c)}</option>`).join('');
  $('expenseCategory').innerHTML = (
    $('expenseType').value === 'deuda' ? allDebtCats() : allExpenseCats()
  ).map(c=>`<option>${esc(c)}</option>`).join('');
  const allBudgetCats = [...allExpenseCats(), ...allDebtCats()];
  const unique = [...new Set(allBudgetCats)];
  $('budgetCategory').innerHTML = unique.map(c=>`<option>${esc(c)}</option>`).join('');
}

function updateExpenseCategories() { refreshCategorySelects(); }

// ── COMPUTATIONS ──────────────────────────────────────
function totals() {
  const inc  = sum(state.transactions.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const exp  = sum(state.transactions.filter(t=>t.type==='gasto').map(t=>t.amount));
  const debt = sum(state.transactions.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return { income:inc, expense:exp, debt, balance:inc-exp-debt };
}
function byOwner(owner) {
  const rows = state.transactions.filter(t=>t.owner===owner);
  const inc  = sum(rows.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const exp  = sum(rows.filter(t=>t.type==='gasto').map(t=>t.amount));
  const debt = sum(rows.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return { income:inc, expense:exp, debt, balance:inc-exp-debt };
}
function byOwnerMonth(owner) {
  const ym = new Date().toISOString().slice(0,7);
  const rows = state.transactions.filter(t=>t.owner===owner&&(t.date||'').slice(0,7)===ym);
  const inc  = sum(rows.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const exp  = sum(rows.filter(t=>t.type==='gasto').map(t=>t.amount));
  const debt = sum(rows.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  return { income:inc, expense:exp, debt, balance:inc-exp-debt };
}
function currentMonthRows() {
  const ym = new Date().toISOString().slice(0,7);
  return state.transactions.filter(t=>(t.date||'').slice(0,7)===ym);
}
function expenseByCategory(rows=state.transactions) {
  const map = {};
  rows.filter(t=>t.type==='gasto'||t.type==='deuda').forEach(t=>{
    map[t.category]=(map[t.category]||0)+Number(t.amount||0);
  });
  return Object.entries(map).map(([category,amount])=>({category,amount})).sort((a,b)=>b.amount-a.amount);
}
function computeBudgetStatus() {
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  if (!state.budgets.length) return {percent:0,text:'Sin presupuesto configurado.'};
  const limit = sum(state.budgets.map(b=>b.amount));
  const spent = sum(state.budgets.map(b=>monthMap[b.category]||0));
  const pct   = limit ? Math.round((spent/limit)*100) : 0;
  let text = `${fmt(spent)} de ${fmt(limit)}.`;
  if (pct>100) text+=' Superaron el límite.';
  else if (pct>=80) text+=' Cerca del tope.';
  else text+=' Dentro del rango.';
  return {percent:pct, text};
}
function getBudgetAlerts() {
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  return state.budgets.map(b=>{
    const spent = monthMap[b.category]||0;
    const pct   = b.amount ? Math.round((spent/b.amount)*100) : 0;
    return {category:b.category, spent, limit:b.amount, percent:pct};
  }).filter(x=>x.percent>=80).sort((a,b)=>b.percent-a.percent);
}

// ── RENDER: DASHBOARD ─────────────────────────────────
function renderDashboard() {
  const all = totals();
  $('metricBalance').textContent = fmt(all.balance);
  const mr = currentMonthRows();
  const mi = sum(mr.filter(t=>t.type==='ingreso').map(t=>t.amount));
  const me = sum(mr.filter(t=>t.type==='gasto').map(t=>t.amount));
  const md = sum(mr.filter(t=>t.type==='deuda'&&t.debtStatus!=='pagada').map(t=>t.amount));
  const mb = mi - me - md;
  $('monthIncome').textContent  = fmt(mi);
  $('monthExpense').textContent = fmt(me+md);
  $('monthBalance').textContent = fmt(mb);

  // Per-person dashboard
  const owners = [
    { key:'alex',  name:'Alexander' },
    { key:'nuri',  name:'Nuri' },
    { key:'hogar', name:'Hogar' },
  ];
  for (const {key, name} of owners) {
    const d = byOwnerMonth(name);
    $(key+'Income').textContent  = fmt(d.income);
    $(key+'Income').className    = 'pstat-val pos';
    $(key+'Expense').textContent = fmt(d.expense);
    $(key+'Expense').className   = 'pstat-val neg';
    $(key+'Debt').textContent    = fmt(d.debt);
    $(key+'Debt').className      = 'pstat-val neg';
    const balEl = $(key+'Balance');
    balEl.textContent = fmt(d.balance);
    balEl.className   = 'pstat-val ' + (d.balance >= 0 ? 'pos' : 'neg');
  }

  // Goals / budget
  const mg   = Number(state.goals.monthly||0);
  const save = Math.max(0, mb);
  const mpct = mg > 0 ? Math.min(100, Math.round((save/mg)*100)) : 0;
  $('goalMonthPct').textContent = mpct+'%';
  $('goalMonthBar').style.width = mpct+'%';
  $('goalMonthText').textContent = mg ? `${fmt(save)} de ${fmt(mg)}` : 'Sin meta definida';

  const bud = computeBudgetStatus();
  $('budgetStatusLabel').textContent = bud.percent+'%';
  $('budgetStatusBar').style.width   = Math.min(100,bud.percent)+'%';
  $('budgetStatusBar').className = 'prog-fill '+(bud.percent>100?'red':bud.percent>=80?'amber':'blue');
  $('budgetStatusText').textContent  = bud.text;

  $('monthSummary').textContent = !mr.length
    ? 'Sin movimientos registrados este mes.'
    : mb >= 0
      ? `Mes positivo — saldo de ${fmt(mb)}.`
      : `Mes con faltante de ${fmt(Math.abs(mb))}. Revisar gastos.`;
}

// ── RENDER: RECENT ────────────────────────────────────
function renderRecent() {
  const list = $('recentList');
  const rows = [...state.transactions].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,6);
  if (!rows.length) { list.innerHTML='<div class="empty">Sin movimientos registrados.</div>'; return; }
  list.innerHTML = rows.map(t=>`
    <div class="tx-item">
      <div class="tx-dot ${esc(t.type)}"></div>
      <div class="tx-info">
        <div class="tx-name">${esc(t.description)}</div>
        <div class="tx-meta">${esc(t.date)} · ${esc(t.owner)} · ${esc(labelType(t.type))}</div>
      </div>
      <div class="tx-amount ${esc(t.type)}">${fmt(t.amount)}</div>
      <button class="btn btn-ghost btn-sm" data-edit="${t.id}" style="margin-left:8px;flex-shrink:0">✎</button>
    </div>`).join('');
  list.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
}

// ── RENDER: INCOME SUMMARY ────────────────────────────
const OWNER_EMOJI = {Alexander:'👨',Nuri:'👩',Hogar:'🏠'};
function ownerCard(owner, d) {
  return `
    <div class="owner-card">
      <div class="owner-avatar" style="background:var(--surface-2)">${OWNER_EMOJI[owner]||'👤'}</div>
      <div><div style="font-size:15px;font-weight:800">${esc(owner)}</div><div style="font-size:12px;color:#aaa">${owner==='Hogar'?'Cuenta compartida':'Cuenta personal'}</div></div>
      <div class="owner-stats">
        <div><div class="owner-stat-val pos">${fmt(d.income)}</div><div class="owner-stat-label">Ingresos</div></div>
        <div><div class="owner-stat-val neg">${fmt(d.expense)}</div><div class="owner-stat-label">Gastos</div></div>
        <div><div class="owner-stat-val neg">${fmt(d.debt)}</div><div class="owner-stat-label">Deudas</div></div>
        <div><div class="owner-stat-val ${d.balance>=0?'pos':'neg'}">${fmt(d.balance)}</div><div class="owner-stat-label">Balance</div></div>
      </div>
    </div>`;
}
function renderIncomeSummary() {
  $('incomeSummary').innerHTML = OWNERS.map(o=>ownerCard(o,byOwner(o))).join('');
}

// ── RENDER: BUDGET LIST ───────────────────────────────
function renderBudgetList() {
  const list = $('budgetList');
  if (!state.budgets.length) { list.innerHTML='<div class="empty">Sin presupuestos definidos.</div>'; return; }
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x=>[x.category,x.amount]));
  list.innerHTML = state.budgets.map(b=>{
    const spent = monthMap[b.category]||0;
    const pct   = b.amount ? Math.round((spent/b.amount)*100) : 0;
    const color = pct>100?'red':pct>=80?'amber':'green';
    const badge = pct>100?'gasto':pct>=80?'deuda':'ingreso';
    return `
      <div class="tx-item">
        <div class="tx-info">
          <div class="tx-name">${esc(b.category)}</div>
          <div style="margin-top:6px"><div class="prog-track" style="max-width:300px"><div class="prog-fill ${color}" style="width:${Math.min(100,pct)}%"></div></div></div>
          <div class="tx-meta" style="margin-top:4px">${fmt(spent)} de ${fmt(b.amount)}</div>
        </div>
        <span class="badge ${badge}">${pct}%</span>
      </div>`;
  }).join('');
}

// ── RENDER: GOALS ─────────────────────────────────────
function renderGoals() {
  if (state.goalItems.length) state.goals.total = sum(state.goalItems.map(g=>g.amount));
  $('goalMonthly').value = state.goals.monthly||'';
  const list = $('goalList');
  if (!state.goalItems.length) { list.innerHTML='<div class="empty">Sin objetivos de ahorro.</div>'; return; }
  list.innerHTML = state.goalItems.map(g=>{
    const pct   = g.amount ? Math.min(100,Math.round((g.saved/g.amount)*100)) : 0;
    const color = pct>=100?'green':pct>=70?'amber':'blue';
    return `
      <div class="goal-item">
        <div class="goal-head"><div class="goal-name">${esc(g.name)}</div><div class="goal-pct">${pct}%</div></div>
        <div class="prog-track"><div class="prog-fill ${color}" style="width:${pct}%"></div></div>
        <div class="goal-meta">${esc(g.owner)} · ${fmt(g.saved)} de ${fmt(g.amount)}</div>
      </div>`;
  }).join('');
}

// ── RENDER: CHART (with soft colors) ─────────────────
function renderChartInto(containerId, ym) {
  const area = $(containerId);
  if (!area) return;
  const rows = expenseByCategory(rowsForYM(ym));
  if (!rows.length) {
    area.innerHTML = '<div class="empty">Sin gastos registrados para este mes.</div>';
    return;
  }
  const max = rows[0].amount || 1;
  area.innerHTML = rows.slice(0, 10).map((r, i) => {
    const color = CHART_COLORS[i % CHART_COLORS.length];
    const w = Math.max(4, Math.round((r.amount / max) * 100));
    return `
      <div class="bar-row">
        <div class="bar-label">
          <div class="bar-dot" style="background:${color}"></div>
          <div class="bar-name">${esc(r.category)}</div>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${w}%;background:${color}"></div></div>
        <div class="bar-val">${fmt(r.amount)}</div>
      </div>`;
  }).join('');
}
function renderChart() {
  // planificación tab still shows current month
  renderChartInto('chartArea', getNavYM(0));
  // dashboard chart uses chartMonthOffset
  const ym = getNavYM(chartMonthOffset);
  renderChartInto('dashChartArea', ym);
  // update nav label
  const label = $('monthNavLabel');
  const badge = $('monthCurrentBadge');
  if (label) label.textContent = getNavLabel(ym);
  if (badge) badge.style.display = chartMonthOffset === 0 ? 'inline-flex' : 'none';
  // disable next button if already at current month
  const nextBtn = $('btnMonthNext');
  if (nextBtn) nextBtn.style.opacity = chartMonthOffset >= 0 ? '0.3' : '1';
}

// ── RENDER: RECURRING ─────────────────────────────────
function renderRecurring() {
  const list = $('recurringList');
  const items = state.transactions.filter(t=>t.recurring==='si');
  if (!items.length) { list.innerHTML='<div class="empty">Sin pagos recurrentes.</div>'; return; }
  list.innerHTML = items.map(t=>`
    <div class="rec-item">
      <div><div style="font-size:14px;font-weight:600">${esc(t.description)}</div><div style="font-size:12px;color:#aaa">${esc(t.owner)} · ${esc(labelType(t.type))}</div></div>
      <div class="rec-amount">${fmt(t.amount)}</div>
    </div>`).join('');
}

// ── RENDER: TRANSACTIONS ──────────────────────────────
function filteredTransactions() {
  const owner = $('filterOwner').value, type = $('filterType').value;
  return [...state.transactions]
    .filter(t=>owner==='Todos'||t.owner===owner)
    .filter(t=>type==='Todos'||t.type===type)
    .sort((a,b)=>(b.date||'').localeCompare(a.date||''));
}
function editTransaction(id) {
  const tx = state.transactions.find(t=>t.id===id); if(!tx) return;
  editingId = id;
  if (tx.type==='ingreso') {
    editingMode = 'income';
    $('incomeOwner').value = tx.owner; $('incomeDate').value = tx.date;
    $('incomeCategory').value = tx.category; $('incomeAmount').value = tx.amount;
    $('incomeMethod').value = tx.method||'Efectivo'; $('incomeDescription').value = tx.description||'';
    $('incomeNote').value = tx.note||'';
    $('incomeFormTitle').textContent = 'Editar ingreso';
    $('incomeEditBadge').textContent = 'Editando'; $('incomeEditBadge').className = 'badge edit';
    document.querySelector('[data-tab="ingresos"]').click();
  } else {
    editingMode = 'expense';
    $('expenseType').value = tx.type; updateExpenseCategories();
    $('expenseOwner').value = tx.owner; $('expenseDate').value = tx.date;
    $('expenseCategory').value = tx.category; $('expenseAmount').value = tx.amount;
    $('expenseMethod').value = tx.method||'Efectivo'; $('expenseDescription').value = tx.description||'';
    $('expenseNote').value = tx.note||''; $('expenseSplit').value = tx.split||'no';
    $('expenseDebtStatus').value = tx.debtStatus||'pendiente'; $('expenseRecurring').value = tx.recurring||'no';
    $('expenseFormTitle').textContent = 'Editar gasto';
    $('expenseEditBadge').textContent = 'Editando'; $('expenseEditBadge').className = 'badge edit';
    document.querySelector('[data-tab="gastos"]').click();
  }
}
function renderTransactions() {
  const tbody = $('txTable');
  const rows  = filteredTransactions();
  if (!rows.length) { tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#bbb;padding:24px">Sin movimientos.</td></tr>'; return; }
  tbody.innerHTML = rows.map(t=>`
    <tr>
      <td style="color:#888;font-size:12px;font-family:var(--mono)">${esc(t.date||'')}</td>
      <td><span class="badge ${esc(t.type)}">${esc(labelType(t.type))}</span></td>
      <td>${esc(t.owner)}</td>
      <td style="color:#888">${esc(t.category)}</td>
      <td>${esc(t.description)}</td>
      <td class="right ${t.type==='ingreso'?'money-pos':'money-neg'}">${fmt(t.amount)}</td>
      <td><div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-sm" data-edit="${t.id}">✎ Editar</button>
        <button class="btn btn-danger btn-sm" data-delete="${t.id}">×</button>
      </div></td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.edit)));
  tbody.querySelectorAll('[data-delete]').forEach(btn=>btn.addEventListener('click',()=>{
    if (!confirm('¿Eliminar este movimiento?')) return;
    state.transactions = state.transactions.filter(t=>t.id!==btn.dataset.delete);
    saveData(state);
  }));
}

// ── RENDER: REPORTS ───────────────────────────────────
function renderReports() {
  $('reportAccounts').innerHTML = OWNERS.map(o=>ownerCard(o,byOwner(o))).join('');
  const alerts = getBudgetAlerts(), container = $('budgetAlerts');
  if (!alerts.length) { container.innerHTML='<div class="empty">Todo dentro del presupuesto.</div>'; return; }
  container.innerHTML = alerts.map(a=>`
    <div class="budget-alert ${a.percent>100?'danger':'warn'}">
      <div><strong>${esc(a.category)}</strong><div style="font-size:12px;margin-top:2px;opacity:.7">${fmt(a.spent)} de ${fmt(a.limit)}</div></div>
      <span style="font-family:var(--mono);font-weight:800;font-size:14px">${a.percent}%</span>
    </div>`).join('');
}

// ── RENDER: CATEGORY MANAGER ─────────────────────────
function renderCategoryManager() {
  renderCatGroup('incomeCatTags',  BASE_INCOME_CATS,  state.customIncomeCats,  'income');
  renderCatGroup('expenseCatTags', BASE_EXPENSE_CATS, state.customExpenseCats, 'expense');
  renderCatGroup('debtCatTags',    BASE_DEBT_CATS,    state.customDebtCats,    'debt');
}
function renderCatGroup(containerId, baseCats, customCats, type) {
  const container = $(containerId);
  const baseTags = baseCats.map(c=>`
    <span class="cat-tag">${esc(c)}</span>`).join('');
  const customTags = customCats.map(c=>`
    <span class="cat-tag custom">${esc(c)}
      <button class="cat-tag-x" data-type="${type}" data-cat="${esc(c)}" title="Eliminar">×</button>
    </span>`).join('');
  container.innerHTML = baseTags + customTags;
  container.querySelectorAll('[data-cat]').forEach(btn=>{
    btn.addEventListener('click', ()=>removeCustomCat(btn.dataset.type, btn.dataset.cat));
  });
}
function addCustomCat(type) {
  const inputId = type==='income'?'newIncomeCat':type==='expense'?'newExpenseCat':'newDebtCat';
  const raw = ($(inputId).value||'').trim();
  if (!raw) return;
  const arr = type==='income'?state.customIncomeCats:type==='expense'?state.customExpenseCats:state.customDebtCats;
  const base = type==='income'?BASE_INCOME_CATS:type==='expense'?BASE_EXPENSE_CATS:BASE_DEBT_CATS;
  if ([...base,...arr].some(c=>c.toLowerCase()===raw.toLowerCase())) { alert('Esa categoría ya existe.'); return; }
  arr.push(raw);
  $(inputId).value = '';
  saveData(state);
}
function removeCustomCat(type, cat) {
  if (!confirm(`¿Eliminar la categoría "${cat}"?`)) return;
  if (type==='income')  state.customIncomeCats  = state.customIncomeCats.filter(c=>c!==cat);
  if (type==='expense') state.customExpenseCats = state.customExpenseCats.filter(c=>c!==cat);
  if (type==='debt')    state.customDebtCats    = state.customDebtCats.filter(c=>c!==cat);
  saveData(state);
}

// ── LAST SAVED ────────────────────────────────────────
function updateLastSaved() {
  const str = state.savedAt
    ? '✓ Guardado ' + new Date(state.savedAt).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})
    : '⊙ Sin guardar';
  $('lastSaved').textContent = str;
  $('savedChipSidebar').textContent = state.savedAt
    ? 'Guardado ' + new Date(state.savedAt).toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'})
    : 'Sin cambios';
}

// ── SAVE INCOME ───────────────────────────────────────
function saveIncome() {
  const tx = {
    id: editingMode==='income'&&editingId ? editingId : uid(),
    type: 'ingreso',
    owner: $('incomeOwner').value,
    date: $('incomeDate').value||new Date().toISOString().slice(0,10),
    category: $('incomeCategory').value,
    amount: Number($('incomeAmount').value||0),
    method: $('incomeMethod').value,
    description: ($('incomeDescription').value||'').trim(),
    note: ($('incomeNote').value||'').trim(),
    split:'no', debtStatus:'pagada', recurring:'no',
  };
  if (!tx.amount||!tx.description) return alert('Completa valor y descripción.');
  if (editingMode==='income'&&editingId) {
    const idx = state.transactions.findIndex(t=>t.id===editingId);
    if (idx>=0) state.transactions[idx]=tx;
    editingId=null; clearIncomeForm(); return saveData(state);
  }
  state.transactions.push(tx);
  clearIncomeForm(); saveData(state);
}

// ── SAVE EXPENSE ──────────────────────────────────────
function saveExpense() {
  const tx = {
    id: editingMode==='expense'&&editingId ? editingId : uid(),
    type: $('expenseType').value,
    owner: $('expenseOwner').value,
    date: $('expenseDate').value||new Date().toISOString().slice(0,10),
    category: $('expenseCategory').value,
    amount: Number($('expenseAmount').value||0),
    method: $('expenseMethod').value,
    description: ($('expenseDescription').value||'').trim(),
    note: ($('expenseNote').value||'').trim(),
    split: $('expenseSplit').value,
    debtStatus: $('expenseDebtStatus').value,
    recurring: $('expenseRecurring').value,
  };
  if (!tx.amount||!tx.description) return alert('Completa valor y descripción.');
  if (editingMode==='expense'&&editingId) {
    const idx = state.transactions.findIndex(t=>t.id===editingId);
    if (idx>=0) state.transactions[idx]=tx;
    editingId=null; clearExpenseForm(); return saveData(state);
  }
  if (tx.type==='gasto'&&tx.split==='si') {
    const half=Math.round(tx.amount/2), other=tx.amount-half;
    state.transactions.push(
      {...tx,id:uid(),owner:'Alexander',amount:half,description:tx.description+' (50/50)'},
      {...tx,id:uid(),owner:'Nuri',amount:other,description:tx.description+' (50/50)'}
    );
  } else { state.transactions.push(tx); }
  clearExpenseForm(); saveData(state);
}

// ── CLEAR FORMS ───────────────────────────────────────
function clearIncomeForm(reset) {
  $('incomeOwner').value='Alexander';
  $('incomeDate').value=new Date().toISOString().slice(0,10);
  refreshCategorySelects();
  $('incomeAmount').value=''; $('incomeMethod').value='Efectivo';
  $('incomeDescription').value=''; $('incomeNote').value='';
  editingMode='income'; editingId=null;
  $('incomeFormTitle').textContent='Nuevo ingreso';
  $('incomeEditBadge').textContent='Ingreso'; $('incomeEditBadge').className='badge personal';
}
function clearExpenseForm(reset) {
  $('expenseType').value='gasto'; refreshCategorySelects();
  $('expenseOwner').value='Hogar';
  $('expenseDate').value=new Date().toISOString().slice(0,10);
  $('expenseAmount').value=''; $('expenseMethod').value='Efectivo';
  $('expenseDescription').value=''; $('expenseNote').value='';
  $('expenseSplit').value='no'; $('expenseDebtStatus').value='pendiente'; $('expenseRecurring').value='no';
  editingMode='expense'; editingId=null;
  $('expenseFormTitle').textContent='Nuevo gasto';
  $('expenseEditBadge').textContent='Gasto'; $('expenseEditBadge').className='badge gasto';
}

// ── SAVE BUDGET / GOAL ────────────────────────────────
function saveBudget() {
  const category=$('budgetCategory').value, amount=Number($('budgetAmount').value||0);
  if(!category||amount<=0) return alert('Categoría y monto válido.');
  const found=state.budgets.find(b=>b.category===category);
  if(found) found.amount=amount; else state.budgets.push({id:uid(),category,amount});
  $('budgetAmount').value=''; saveData(state);
}
function saveGoalItem() {
  const name=($('goalName').value||'').trim(), amount=Number($('goalAmount').value||0);
  const saved=Number($('goalSaved').value||0), owner=$('goalOwner').value;
  const monthly=Number($('goalMonthly').value||0);
  if(monthly>0) state.goals.monthly=monthly;
  if(!name||amount<=0){saveData(state);return;}
  state.goalItems.push({id:uid(),name,amount,saved,owner});
  $('goalName').value=''; $('goalAmount').value=''; $('goalSaved').value=''; $('goalOwner').value='Hogar';
  saveData(state);
}

// ── EXPORT / IMPORT ───────────────────────────────────
function exportBackup() {
  download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),'backup-hogar-finanzas.json');
}
function importBackup(ev) {
  const file=ev.target.files?.[0]; if(!file) return;
  const r=new FileReader();
  r.onload=()=>{try{saveData(normalize(JSON.parse(r.result)));alert('Backup importado.');ev.target.value='';}catch{alert('Archivo inválido.');}};
  r.readAsText(file);
}
function exportCSV() {
  const header=['fecha','tipo','responsable','categoria','descripcion','valor','metodo','nota','split','estado_deuda','recurrente'];
  const rows=state.transactions.map(t=>[t.date,t.type,t.owner,t.category,t.description||'',t.amount,t.method,t.note||'',t.split,t.debtStatus,t.recurring]);
  const csv=[header.join(','),...rows.map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  download(new Blob([csv],{type:'text/csv;charset=utf-8;'}),'movimientos-hogar.csv');
}
function download(blob,name) {
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}

// ── EDIT MODAL ────────────────────────────────────────
let modalEditId = null;

function openEditModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  modalEditId = id;

  const isIncome = tx.type === 'ingreso';
  $('modalTitle').textContent = isIncome ? 'Editar ingreso' : 'Editar gasto / deuda';

  // Show/hide expense-only fields
  $('modalTypeRow').style.display     = isIncome ? 'none' : 'block';
  $('modalSplitRow').style.display    = isIncome ? 'none' : 'block';
  $('modalDebtRow').style.display     = isIncome ? 'none' : 'block';
  $('modalRecurringRow').style.display= isIncome ? 'none' : 'block';

  // Populate category select
  if (isIncome) {
    $('modalCategory').innerHTML = allIncomeCats().map(c=>`<option>${esc(c)}</option>`).join('');
  } else {
    $('modalType').value = tx.type;
    const cats = tx.type === 'deuda' ? allDebtCats() : allExpenseCats();
    $('modalCategory').innerHTML = cats.map(c=>`<option>${esc(c)}</option>`).join('');
    $('modalSplit').value       = tx.split || 'no';
    $('modalDebtStatus').value  = tx.debtStatus || 'pendiente';
    $('modalRecurring').value   = tx.recurring || 'no';
  }

  // Fill shared fields
  $('modalOwner').value       = tx.owner;
  $('modalDate').value        = tx.date || '';
  $('modalCategory').value    = tx.category;
  $('modalAmount').value      = tx.amount;
  $('modalMethod').value      = tx.method || 'Efectivo';
  $('modalDescription').value = tx.description || '';
  $('modalNote').value        = tx.note || '';

  $('editModal').classList.remove('hidden');
  setTimeout(() => $('modalAmount').focus(), 100);
}

function closeEditModal() {
  $('editModal').classList.add('hidden');
  modalEditId = null;
}

function saveEditModal() {
  const tx = state.transactions.find(t => t.id === modalEditId);
  if (!tx) return;

  const amount = Number($('modalAmount').value || 0);
  const description = ($('modalDescription').value || '').trim();
  if (!amount || !description) { alert('Completa valor y descripción.'); return; }

  tx.owner       = $('modalOwner').value;
  tx.date        = $('modalDate').value;
  tx.category    = $('modalCategory').value;
  tx.amount      = amount;
  tx.method      = $('modalMethod').value;
  tx.description = description;
  tx.note        = ($('modalNote').value || '').trim();

  if (tx.type !== 'ingreso') {
    tx.type       = $('modalType').value;
    tx.split      = $('modalSplit').value;
    tx.debtStatus = $('modalDebtStatus').value;
    tx.recurring  = $('modalRecurring').value;
  }

  closeEditModal();
  saveData(state);
}

function setupModalTypeChange() {
  $('modalType').addEventListener('change', () => {
    const cats = $('modalType').value === 'deuda' ? allDebtCats() : allExpenseCats();
    $('modalCategory').innerHTML = cats.map(c=>`<option>${esc(c)}</option>`).join('');
  });
}

// ── SETUP EVENTS ─────────────────────────────────────
function setupEvents() {
  $('btnSaveIncome').addEventListener('click',saveIncome);
  $('btnClearIncome').addEventListener('click',()=>clearIncomeForm(true));
  $('btnSaveExpense').addEventListener('click',saveExpense);
  $('btnClearExpense').addEventListener('click',()=>clearExpenseForm(true));
  $('expenseType').addEventListener('change',updateExpenseCategories);
  $('btnSaveBudget').addEventListener('click',saveBudget);
  $('btnSaveGoalItem').addEventListener('click',saveGoalItem);
  $('filterOwner').addEventListener('change',renderTransactions);
  $('filterType').addEventListener('change',renderTransactions);
  $('btnBackup').addEventListener('click',exportBackup);
  $('btnImport').addEventListener('click',()=>$('fileImport').click());
  $('fileImport').addEventListener('change',importBackup);
  $('btnExcel').addEventListener('click',exportCSV);
  $('btnReset').addEventListener('click',()=>{
    if(confirm('¿Reiniciar todos los datos?')){
      localStorage.removeItem(STORAGE_KEY);
      Object.assign(state,defaultState());
      saveData(state); clearIncomeForm(); clearExpenseForm();
    }
  });

  // Category manager events
  $('btnAddIncomeCat').addEventListener('click',()=>addCustomCat('income'));
  $('btnAddExpenseCat').addEventListener('click',()=>addCustomCat('expense'));
  $('btnAddDebtCat').addEventListener('click',()=>addCustomCat('debt'));
  $('newIncomeCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('income');});
  $('newExpenseCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('expense');});
  $('newDebtCat').addEventListener('keydown',e=>{if(e.key==='Enter')addCustomCat('debt');});

  // Modal edit events
  $('modalClose').addEventListener('click', closeEditModal);
  $('modalCancel').addEventListener('click', closeEditModal);
  $('modalSave').addEventListener('click', saveEditModal);
  $('editModal').addEventListener('click', e => { if (e.target === $('editModal')) closeEditModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeEditModal(); });
  setupModalTypeChange();
  $('btnMonthPrev').addEventListener('click', () => {
    chartMonthOffset--;
    renderChart();
  });
  $('btnMonthNext').addEventListener('click', () => {
    if (chartMonthOffset >= 0) return;
    chartMonthOffset++;
    renderChart();
  });
}

// ── RENDER ALL ────────────────────────────────────────
function render() {
  renderDashboard();
  renderRecent();
  renderIncomeSummary();
  renderBudgetList();
  renderGoals();
  renderChart();
  renderRecurring();
  renderTransactions();
  renderReports();
  renderCategoryManager();
  refreshCategorySelects();
  updateLastSaved();
}

// ── INIT ─────────────────────────────────────────────
populateSelects();
updateExpenseCategories();
setTabs();
setLogin();
setupEvents();
clearIncomeForm();
clearExpenseForm();
render();
