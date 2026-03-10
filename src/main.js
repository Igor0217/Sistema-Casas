const STORAGE_KEY = 'finanzas_familiares_v34_ejecutiva';
const SESSION_KEY = 'finanzas_familiares_v34_session';
const LEGACY_KEYS = [
  'finanzas_familiares_v33_flujo','finanzas_familiares_v32_final',
  'finanzas_familiares_v31_premium','finanzas_familiares_v3_elegante',
  'finanzas_familiares_v2_bonita','finanzas_familiares_v2','finanzas_familiares_v1'
];
const LOGIN = { users: ['Alexander', 'Nuri'], pass: 'hogar2026' };
const OWNERS = ['Alexander', 'Nuri', 'Hogar'];
const INCOME_CATEGORIES = ['Salario','Prima','Bono','Honorarios','Comisiones','Aporte al hogar','Reembolso','Otros ingresos'];
const EXPENSE_CATEGORIES = ['Mercado','Servicios','Transporte','Salud','Educación','Arriendo','Entretenimiento','Regalos','Mascotas','Otros'];
const DEBT_CATEGORIES = ['Tarjeta de crédito','Préstamo','Cuota hogar','Crédito','Deuda personal','Otros'];

const $ = id => document.getElementById(id);
let editingId = null, editingMode = 'income';
const state = loadData();

// ── PAGE META ──
const PAGE_META = {
  dashboard:    { kicker: 'Resumen',      title: 'Flujo del hogar' },
  ingresos:     { kicker: 'Ingresos',     title: 'Registrar ingresos' },
  gastos:       { kicker: 'Gastos',       title: 'Registrar gastos' },
  planificacion:{ kicker: 'Planificación',title: 'Metas y objetivos' },
  movimientos:  { kicker: 'Historial',    title: 'Todos los movimientos' },
  reportes:     { kicker: 'Reportes',     title: 'Estado financiero' },
};

// ── DATA ──
function defaultState() {
  return { goals: { monthly: 0, total: 0 }, goalItems: [], budgets: [], transactions: [], savedAt: null };
}
function normalize(data) {
  const base = defaultState();
  return {
    goals: { ...base.goals, ...(data.goals || {}) },
    goalItems: Array.isArray(data.goalItems) ? data.goalItems : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
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
  state.goals = next.goals; state.goalItems = next.goalItems;
  state.budgets = next.budgets; state.transactions = next.transactions;
  state.savedAt = next.savedAt;
  render();
}

// ── UTILS ──
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const labelType = t => t === 'ingreso' ? 'Ingreso' : t === 'gasto' ? 'Gasto' : 'Deuda';
function esc(v = '') {
  return String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// ── LOGIN ──
function setLogin() {
  const logged = sessionStorage.getItem(SESSION_KEY) === 'ok';
  $('loginScreen').classList.toggle('hidden', logged);
  $('appScreen').classList.toggle('hidden', !logged);

  $('btnLogin').addEventListener('click', () => {
    const user = ($('loginUser').value || '').trim();
    const pass = ($('loginPass').value || '').trim();
    if (LOGIN.users.includes(user) && pass === LOGIN.pass) {
      sessionStorage.setItem(SESSION_KEY, 'ok');
      $('loginScreen').classList.add('hidden');
      $('appScreen').classList.remove('hidden');
    } else {
      $('loginMsg').textContent = 'Usuario o clave incorrectos.';
    }
  });
  $('loginPass').addEventListener('keydown', e => { if (e.key === 'Enter') $('btnLogin').click(); });

  $('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

// ── NAVIGATION ──
function setTabs() {
  document.querySelectorAll('.nav-item[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-page').forEach(sec => sec.classList.remove('active'));
      $('tab-' + tab).classList.add('active');
      const meta = PAGE_META[tab] || {};
      $('pageKicker').textContent = meta.kicker || '';
      $('pageTitle').textContent = meta.title || '';
    });
  });
}

// ── SELECTS ──
function populateSelects() {
  $('incomeCategory').innerHTML = INCOME_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('expenseCategory').innerHTML = EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('budgetCategory').innerHTML = EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  const today = new Date().toISOString().slice(0, 10);
  $('incomeDate').value = today;
  $('expenseDate').value = today;
}
function updateExpenseCategories() {
  const list = $('expenseType').value === 'deuda' ? DEBT_CATEGORIES : EXPENSE_CATEGORIES;
  $('expenseCategory').innerHTML = list.map(c => `<option>${c}</option>`).join('');
}

// ── COMPUTATIONS ──
function totals() {
  const income = sum(state.transactions.filter(t => t.type === 'ingreso').map(t => t.amount));
  const expense = sum(state.transactions.filter(t => t.type === 'gasto').map(t => t.amount));
  const debt = sum(state.transactions.filter(t => t.type === 'deuda' && t.debtStatus !== 'pagada').map(t => t.amount));
  return { income, expense, debt, balance: income - expense - debt };
}
function byOwner(owner) {
  const rows = state.transactions.filter(t => t.owner === owner);
  const income = sum(rows.filter(t => t.type === 'ingreso').map(t => t.amount));
  const expense = sum(rows.filter(t => t.type === 'gasto').map(t => t.amount));
  const debt = sum(rows.filter(t => t.type === 'deuda' && t.debtStatus !== 'pagada').map(t => t.amount));
  return { income, expense, debt, balance: income - expense - debt };
}
function currentMonthRows() {
  const ym = new Date().toISOString().slice(0, 7);
  return state.transactions.filter(t => (t.date || '').slice(0, 7) === ym);
}
function expenseByCategory(rows = state.transactions) {
  const map = {};
  rows.filter(t => t.type === 'gasto' || t.type === 'deuda').forEach(t => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}
function recurringItems() {
  return state.transactions.filter(t => t.recurring === 'si');
}
function computeBudgetStatus() {
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x => [x.category, x.amount]));
  if (!state.budgets.length) return { percent: 0, text: 'Sin presupuesto configurado.' };
  const totalLimit = sum(state.budgets.map(b => b.amount));
  const totalSpent = sum(state.budgets.map(b => monthMap[b.category] || 0));
  const percent = totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0;
  let text = `${fmt(totalSpent)} de ${fmt(totalLimit)}.`;
  if (percent > 100) text += ' Superaron el límite.';
  else if (percent >= 80) text += ' Cerca del tope.';
  else text += ' Dentro del rango.';
  return { percent, text };
}
function getBudgetAlerts() {
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x => [x.category, x.amount]));
  return state.budgets.map(b => {
    const spent = monthMap[b.category] || 0;
    const percent = b.amount ? Math.round((spent / b.amount) * 100) : 0;
    return { category: b.category, spent, limit: b.amount, percent };
  }).filter(x => x.percent >= 80).sort((a, b) => b.percent - a.percent);
}

// ── RENDER DASHBOARD ──
function renderDashboard() {
  const all = totals();
  $('metricBalance').textContent = fmt(all.balance);
  const monthRows = currentMonthRows();
  const monthIncome = sum(monthRows.filter(t => t.type === 'ingreso').map(t => t.amount));
  const monthExpense = sum(monthRows.filter(t => t.type === 'gasto').map(t => t.amount));
  const monthDebt = sum(monthRows.filter(t => t.type === 'deuda' && t.debtStatus !== 'pagada').map(t => t.amount));
  const monthBalance = monthIncome - monthExpense - monthDebt;
  $('monthIncome').textContent = fmt(monthIncome);
  $('monthExpense').textContent = fmt(monthExpense + monthDebt);
  $('monthBalance').textContent = fmt(monthBalance);

  const monthGoal = Number(state.goals.monthly || 0);
  const monthSave = Math.max(0, monthBalance);
  const monthPct = monthGoal > 0 ? Math.min(100, Math.round((monthSave / monthGoal) * 100)) : 0;
  $('goalMonthPct').textContent = monthPct + '%';
  $('goalMonthBar').style.width = monthPct + '%';
  $('goalMonthText').textContent = monthGoal ? `${fmt(monthSave)} de ${fmt(monthGoal)}` : 'Sin meta definida';

  const budget = computeBudgetStatus();
  $('budgetStatusLabel').textContent = budget.percent + '%';
  $('budgetStatusBar').style.width = Math.min(100, budget.percent) + '%';
  const budgetBar = $('budgetStatusBar');
  budgetBar.className = 'prog-fill ' + (budget.percent > 100 ? 'red' : budget.percent >= 80 ? 'amber' : 'blue');
  $('budgetStatusText').textContent = budget.text;

  const b = monthBalance;
  $('monthSummary').textContent = !currentMonthRows().length
    ? 'Sin movimientos registrados este mes.'
    : b >= 0
      ? `Mes positivo con saldo de ${fmt(b)}.`
      : `Mes con faltante de ${fmt(Math.abs(b))}. Revisar gastos.`;
}

// ── RENDER RECENT ──
function renderRecent() {
  const list = $('recentList');
  const rows = [...state.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6);
  if (!rows.length) {
    list.innerHTML = '<div class="empty">Todavía no hay movimientos registrados.</div>';
    return;
  }
  list.innerHTML = rows.map(t => `
    <div class="tx-item">
      <div class="tx-dot ${esc(t.type)}"></div>
      <div class="tx-info">
        <div class="tx-name">${esc(t.description)}</div>
        <div class="tx-meta">${esc(t.date)} · ${esc(t.owner)} · ${esc(labelType(t.type))}</div>
      </div>
      <div class="tx-amount ${esc(t.type)}">${fmt(t.amount)}</div>
    </div>`).join('');
}

// ── RENDER INCOME SUMMARY ──
const OWNER_EMOJI = { Alexander: '👨', Nuri: '👩', Hogar: '🏠' };
function ownerCard(owner, d) {
  const bal = d.balance;
  return `
    <div class="owner-card">
      <div class="owner-avatar">${OWNER_EMOJI[owner] || '👤'}</div>
      <div><div class="owner-name">${esc(owner)}</div><div class="owner-role">${owner === 'Hogar' ? 'Cuenta compartida' : 'Cuenta personal'}</div></div>
      <div class="owner-stats">
        <div><div class="owner-stat-val pos">${fmt(d.income)}</div><div class="owner-stat-label">Ingresos</div></div>
        <div><div class="owner-stat-val neg">${fmt(d.expense)}</div><div class="owner-stat-label">Gastos</div></div>
        <div><div class="owner-stat-val neg">${fmt(d.debt)}</div><div class="owner-stat-label">Deudas</div></div>
        <div><div class="owner-stat-val ${bal >= 0 ? 'pos' : 'neg'}">${fmt(bal)}</div><div class="owner-stat-label">Balance</div></div>
      </div>
    </div>`;
}
function renderIncomeSummary() {
  $('incomeSummary').innerHTML = OWNERS.map(owner => ownerCard(owner, byOwner(owner))).join('');
}

// ── RENDER BUDGET LIST ──
function renderBudgetList() {
  const list = $('budgetList');
  if (!state.budgets.length) {
    list.innerHTML = '<div class="empty">Aún no han definido presupuestos.</div>';
    return;
  }
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x => [x.category, x.amount]));
  list.innerHTML = state.budgets.map(b => {
    const spent = monthMap[b.category] || 0;
    const pct = b.amount ? Math.round((spent / b.amount) * 100) : 0;
    const color = pct > 100 ? 'red' : pct >= 80 ? 'amber' : 'green';
    const badge = pct > 100 ? 'gasto' : pct >= 80 ? 'deuda' : 'ingreso';
    return `
      <div class="tx-item">
        <div class="tx-info">
          <div class="tx-name">${esc(b.category)}</div>
          <div style="margin-top:6px">
            <div class="prog-track" style="max-width:300px">
              <div class="prog-fill ${color}" style="width:${Math.min(100, pct)}%"></div>
            </div>
          </div>
          <div class="tx-meta" style="margin-top:4px">${fmt(spent)} de ${fmt(b.amount)}</div>
        </div>
        <span class="badge ${badge}">${pct}%</span>
      </div>`;
  }).join('');
}

// ── RENDER GOALS ──
function renderGoals() {
  if (state.goalItems.length) {
    state.goals.total = sum(state.goalItems.map(g => g.amount));
  }
  $('goalMonthly').value = state.goals.monthly || '';
  const list = $('goalList');
  if (!state.goalItems.length) {
    list.innerHTML = '<div class="empty">Todavía no han creado objetivos de ahorro.</div>';
    return;
  }
  list.innerHTML = state.goalItems.map(g => {
    const pct = g.amount ? Math.min(100, Math.round((g.saved / g.amount) * 100)) : 0;
    const color = pct >= 100 ? 'green' : pct >= 70 ? 'amber' : 'blue';
    return `
      <div class="goal-item">
        <div class="goal-head">
          <div class="goal-name">${esc(g.name)}</div>
          <div class="goal-pct">${pct}%</div>
        </div>
        <div class="prog-track"><div class="prog-fill ${color}" style="width:${pct}%"></div></div>
        <div class="goal-meta">${esc(g.owner)} · ${fmt(g.saved)} de ${fmt(g.amount)}</div>
      </div>`;
  }).join('');
}

// ── RENDER CHART ──
function renderChart() {
  const area = $('chartArea');
  const rows = expenseByCategory(currentMonthRows());
  if (!rows.length) {
    area.innerHTML = '<div class="empty">Registra gastos para ver la distribución.</div>';
    return;
  }
  const max = rows[0].amount || 1;
  area.innerHTML = rows.slice(0, 7).map(r => `
    <div class="bar-row">
      <div class="bar-name">${esc(r.category)}</div>
      <div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, Math.round((r.amount / max) * 100))}%"></div></div>
      <div class="bar-val">${fmt(r.amount)}</div>
    </div>`).join('');
}

// ── RENDER RECURRING ──
function renderRecurring() {
  const list = $('recurringList');
  const items = recurringItems();
  if (!items.length) {
    list.innerHTML = '<div class="empty">Sin pagos recurrentes registrados.</div>';
    return;
  }
  list.innerHTML = items.map(t => `
    <div class="rec-item">
      <div>
        <div class="rec-name">${esc(t.description)}</div>
        <div class="rec-meta">${esc(t.owner)} · ${esc(labelType(t.type))}</div>
      </div>
      <div class="rec-amount">${fmt(t.amount)}</div>
    </div>`).join('');
}

// ── RENDER TRANSACTIONS ──
function filteredTransactions() {
  const owner = $('filterOwner').value, type = $('filterType').value;
  return [...state.transactions]
    .filter(t => owner === 'Todos' || t.owner === owner)
    .filter(t => type === 'Todos' || t.type === type)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}
function editTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  editingId = id;
  if (tx.type === 'ingreso') {
    editingMode = 'income';
    $('incomeOwner').value = tx.owner; $('incomeDate').value = tx.date;
    $('incomeCategory').value = tx.category; $('incomeAmount').value = tx.amount;
    $('incomeMethod').value = tx.method || 'Efectivo'; $('incomeDescription').value = tx.description || '';
    $('incomeNote').value = tx.note || '';
    $('incomeFormTitle').textContent = 'Editar ingreso';
    $('incomeEditBadge').textContent = 'Editando'; $('incomeEditBadge').className = 'badge edit';
    document.querySelector('[data-tab="ingresos"]').click();
  } else {
    editingMode = 'expense';
    $('expenseType').value = tx.type; updateExpenseCategories();
    $('expenseOwner').value = tx.owner; $('expenseDate').value = tx.date;
    $('expenseCategory').value = tx.category; $('expenseAmount').value = tx.amount;
    $('expenseMethod').value = tx.method || 'Efectivo'; $('expenseDescription').value = tx.description || '';
    $('expenseNote').value = tx.note || ''; $('expenseSplit').value = tx.split || 'no';
    $('expenseDebtStatus').value = tx.debtStatus || 'pendiente'; $('expenseRecurring').value = tx.recurring || 'no';
    $('expenseFormTitle').textContent = 'Editar gasto';
    $('expenseEditBadge').textContent = 'Editando'; $('expenseEditBadge').className = 'badge edit';
    document.querySelector('[data-tab="gastos"]').click();
  }
}
function renderTransactions() {
  const tbody = $('txTable');
  const rows = filteredTransactions();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#bbb;padding:24px">Sin movimientos.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(t => `
    <tr>
      <td style="color:#888;font-size:12px;font-family:var(--mono)">${esc(t.date || '')}</td>
      <td><span class="badge ${esc(t.type)}">${esc(labelType(t.type))}</span></td>
      <td>${esc(t.owner)}</td>
      <td style="color:#888">${esc(t.category)}</td>
      <td>${esc(t.description)}</td>
      <td class="right ${t.type === 'ingreso' ? 'money-pos' : 'money-neg'}">${fmt(t.amount)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" data-edit="${t.id}">Editar</button>
          <button class="btn btn-danger btn-sm" data-delete="${t.id}">×</button>
        </div>
      </td>
    </tr>`).join('');
  tbody.querySelectorAll('[data-edit]').forEach(btn => btn.addEventListener('click', () => editTransaction(btn.dataset.edit)));
  tbody.querySelectorAll('[data-delete]').forEach(btn => btn.addEventListener('click', () => {
    state.transactions = state.transactions.filter(t => t.id !== btn.dataset.delete);
    saveData(state);
  }));
}

// ── RENDER REPORTS ──
function renderReports() {
  $('reportAccounts').innerHTML = OWNERS.map(owner => ownerCard(owner, byOwner(owner))).join('');
  const alerts = getBudgetAlerts(), container = $('budgetAlerts');
  if (!alerts.length) {
    container.innerHTML = '<div class="empty">Todo dentro del presupuesto. Sin alertas.</div>';
    return;
  }
  container.innerHTML = alerts.map(a => `
    <div class="budget-alert ${a.percent > 100 ? 'danger' : 'warn'}">
      <div>
        <strong>${esc(a.category)}</strong>
        <div style="font-size:12px;margin-top:2px;opacity:.7">${fmt(a.spent)} de ${fmt(a.limit)}</div>
      </div>
      <span style="font-family:var(--mono);font-weight:800;font-size:14px">${a.percent}%</span>
    </div>`).join('');
}

// ── LAST SAVED ──
function updateLastSaved() {
  const el = $('lastSaved');
  const el2 = $('savedChipSidebar');
  if (state.savedAt) {
    const d = new Date(state.savedAt);
    const str = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    el.textContent = '✓ Guardado ' + str;
    el2.textContent = 'Guardado ' + str;
  } else {
    el.textContent = '⊙ Sin guardar';
    el2.textContent = 'Sin cambios';
  }
}

// ── SAVE INCOME ──
function saveIncome() {
  const tx = {
    id: editingMode === 'income' && editingId ? editingId : uid(),
    type: 'ingreso',
    owner: $('incomeOwner').value,
    date: $('incomeDate').value || new Date().toISOString().slice(0, 10),
    category: $('incomeCategory').value,
    amount: Number($('incomeAmount').value || 0),
    method: $('incomeMethod').value,
    description: ($('incomeDescription').value || '').trim(),
    note: ($('incomeNote').value || '').trim(),
    split: 'no', debtStatus: 'pagada', recurring: 'no',
  };
  if (!tx.amount || !tx.description) return alert('Completa valor y descripción.');
  if (editingMode === 'income' && editingId) {
    const idx = state.transactions.findIndex(t => t.id === editingId);
    if (idx >= 0) state.transactions[idx] = tx;
    editingId = null; clearIncomeForm(); return saveData(state);
  }
  state.transactions.push(tx);
  clearIncomeForm(); saveData(state);
}

// ── SAVE EXPENSE ──
function saveExpense() {
  const tx = {
    id: editingMode === 'expense' && editingId ? editingId : uid(),
    type: $('expenseType').value,
    owner: $('expenseOwner').value,
    date: $('expenseDate').value || new Date().toISOString().slice(0, 10),
    category: $('expenseCategory').value,
    amount: Number($('expenseAmount').value || 0),
    method: $('expenseMethod').value,
    description: ($('expenseDescription').value || '').trim(),
    note: ($('expenseNote').value || '').trim(),
    split: $('expenseSplit').value,
    debtStatus: $('expenseDebtStatus').value,
    recurring: $('expenseRecurring').value,
  };
  if (!tx.amount || !tx.description) return alert('Completa valor y descripción.');
  if (editingMode === 'expense' && editingId) {
    const idx = state.transactions.findIndex(t => t.id === editingId);
    if (idx >= 0) state.transactions[idx] = tx;
    editingId = null; clearExpenseForm(); return saveData(state);
  }
  if (tx.type === 'gasto' && tx.split === 'si') {
    const half = Math.round(tx.amount / 2), other = tx.amount - half;
    state.transactions.push(
      { ...tx, id: uid(), owner: 'Alexander', amount: half, description: tx.description + ' (50/50)' },
      { ...tx, id: uid(), owner: 'Nuri', amount: other, description: tx.description + ' (50/50)' }
    );
  } else {
    state.transactions.push(tx);
  }
  clearExpenseForm(); saveData(state);
}

// ── CLEAR FORMS ──
function clearIncomeForm(resetBadge) {
  $('incomeOwner').value = 'Alexander';
  $('incomeDate').value = new Date().toISOString().slice(0, 10);
  $('incomeCategory').value = 'Salario';
  $('incomeAmount').value = '';
  $('incomeMethod').value = 'Efectivo';
  $('incomeDescription').value = '';
  $('incomeNote').value = '';
  editingMode = 'income'; editingId = null;
  $('incomeFormTitle').textContent = 'Nuevo ingreso';
  $('incomeEditBadge').textContent = 'Ingreso'; $('incomeEditBadge').className = 'badge personal';
}
function clearExpenseForm(resetBadge) {
  $('expenseType').value = 'gasto'; updateExpenseCategories();
  $('expenseOwner').value = 'Hogar';
  $('expenseDate').value = new Date().toISOString().slice(0, 10);
  $('expenseCategory').value = EXPENSE_CATEGORIES[0];
  $('expenseAmount').value = '';
  $('expenseMethod').value = 'Efectivo';
  $('expenseDescription').value = '';
  $('expenseNote').value = '';
  $('expenseSplit').value = 'no'; $('expenseDebtStatus').value = 'pendiente'; $('expenseRecurring').value = 'no';
  editingMode = 'expense'; editingId = null;
  $('expenseFormTitle').textContent = 'Nuevo gasto';
  $('expenseEditBadge').textContent = 'Gasto'; $('expenseEditBadge').className = 'badge gasto';
}

// ── SAVE BUDGET / GOAL ──
function saveBudget() {
  const category = $('budgetCategory').value, amount = Number($('budgetAmount').value || 0);
  if (!category || amount <= 0) return alert('Categoría y monto válido.');
  const found = state.budgets.find(b => b.category === category);
  if (found) found.amount = amount; else state.budgets.push({ id: uid(), category, amount });
  $('budgetAmount').value = ''; saveData(state);
}
function saveGoalItem() {
  const name = ($('goalName').value || '').trim(), amount = Number($('goalAmount').value || 0);
  const saved = Number($('goalSaved').value || 0), owner = $('goalOwner').value;
  const monthly = Number($('goalMonthly').value || 0);
  if (monthly > 0) state.goals.monthly = monthly;
  if (!name || amount <= 0) { saveData(state); return; }
  state.goalItems.push({ id: uid(), name, amount, saved, owner });
  $('goalName').value = ''; $('goalAmount').value = ''; $('goalSaved').value = ''; $('goalOwner').value = 'Hogar';
  saveData(state);
}

// ── EXPORT / IMPORT ──
function exportBackup() {
  download(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }), 'backup-hogar-finanzas.json');
}
function importBackup(ev) {
  const file = ev.target.files?.[0]; if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try { saveData(normalize(JSON.parse(r.result))); alert('Backup importado.'); ev.target.value = ''; }
    catch { alert('Archivo inválido.'); }
  };
  r.readAsText(file);
}
function exportCSV() {
  const header = ['fecha','tipo','responsable','categoria','descripcion','valor','metodo','nota','split','estado_deuda','recurrente'];
  const rows = state.transactions.map(t => [t.date, t.type, t.owner, t.category, t.description || '', t.amount, t.method, t.note || '', t.split, t.debtStatus, t.recurring]);
  const csv = [header.join(','), ...rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'movimientos-hogar.csv');
}
function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
}

// ── SETUP EVENTS ──
function setupEvents() {
  $('btnSaveIncome').addEventListener('click', saveIncome);
  $('btnClearIncome').addEventListener('click', () => clearIncomeForm(true));
  $('btnSaveExpense').addEventListener('click', saveExpense);
  $('btnClearExpense').addEventListener('click', () => clearExpenseForm(true));
  $('expenseType').addEventListener('change', updateExpenseCategories);
  $('btnSaveBudget').addEventListener('click', saveBudget);
  $('btnSaveGoalItem').addEventListener('click', saveGoalItem);
  $('filterOwner').addEventListener('change', renderTransactions);
  $('filterType').addEventListener('change', renderTransactions);
  $('btnBackup').addEventListener('click', exportBackup);
  $('btnImport').addEventListener('click', () => $('fileImport').click());
  $('fileImport').addEventListener('change', importBackup);
  $('btnExcel').addEventListener('click', exportCSV);
  $('btnReset').addEventListener('click', () => {
    if (confirm('¿Reiniciar todos los datos locales?')) {
      localStorage.removeItem(STORAGE_KEY);
      saveData(defaultState());
      clearIncomeForm(); clearExpenseForm();
    }
  });
}

// ── RENDER ALL ──
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
  updateLastSaved();
}

// ── INIT ──
populateSelects();
updateExpenseCategories();
setTabs();
setLogin();
setupEvents();
clearIncomeForm();
clearExpenseForm();
render();
