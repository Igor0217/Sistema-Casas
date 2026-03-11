// CONSTANTS
const STORAGE_KEY = 'finanzas_familiares_v35_mejorada';
const SESSION_KEY = 'finanzas_familiares_v35_session';
const LOGIN = { users: ['Alexander', 'Nuri'], pass: 'hogar2026' };
const OWNERS = ['Alexander', 'Nuri', 'Hogar'];
const INCOME_CATEGORIES = ['Salario', 'Prima', 'Bono', 'Honorarios', 'Comisiones', 'Aporte al hogar', 'Reembolso', 'Otros ingresos'];
const EXPENSE_CATEGORIES = ['Mercado', 'Servicios', 'Transporte', 'Salud', 'Educación', 'Arriendo', 'Entretenimiento', 'Regalos', 'Mascotas', 'Otros'];
const DEBT_CATEGORIES = ['Tarjeta de crédito', 'Préstamo', 'Cuota hogar', 'Crédito', 'Deuda personal', 'Otros'];

// DOM HELPERS
const $ = id => document.getElementById(id);
const esc = v => String(v).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
const fmt = n => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);
const sum = arr => arr.reduce((a, b) => a + (Number(b) || 0), 0);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

// STATE
let state = loadData();
let editingId = null;
let editingMode = 'income';

// DATA MANAGEMENT
function defaultState() {
  return {
    goals: { monthly: 0, total: 0 },
    goalItems: [],
    budgets: [],
    transactions: [],
    savedAt: null
  };
}

function normalize(data) {
  const base = defaultState();
  return {
    goals: { ...base.goals, ...(data.goals || {}) },
    goalItems: Array.isArray(data.goalItems) ? data.goalItems : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    savedAt: data.savedAt || null
  };
}

function loadData() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));
  } catch (e) {
    console.error(e);
  }
  return defaultState();
}

function saveData(next = state) {
  next.savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  state.goals = next.goals;
  state.goalItems = next.goalItems;
  state.budgets = next.budgets;
  state.transactions = next.transactions;
  state.savedAt = next.savedAt;
  render();
}

// INITIALIZATION
function init() {
  setLogin();
  populateSelects();
  setTabs();
  setupEvents();
  render();
}

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

  $('btnLogout').addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    location.reload();
  });
}

function populateSelects() {
  $('incomeCategory').innerHTML = INCOME_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('expenseCategory').innerHTML = EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  $('budgetCategory').innerHTML = EXPENSE_CATEGORIES.map(c => `<option>${c}</option>`).join('');
  
  const today = new Date().toISOString().slice(0, 10);
  $('incomeDate').value = today;
  $('expenseDate').value = today;
}

function setTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(sec => sec.classList.add('hidden'));
      $('tab-' + tab).classList.remove('hidden');
    });
  });
}

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
}

// FORMS
function updateExpenseCategories() {
  const list = $('expenseType').value === 'deuda' ? DEBT_CATEGORIES : EXPENSE_CATEGORIES;
  $('expenseCategory').innerHTML = list.map(c => `<option>${c}</option>`).join('');
}

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
    split: 'no',
    debtStatus: 'pagada',
    recurring: 'no'
  };

  if (!tx.amount || !tx.description) return alert('Completa valor y descripción.');

  if (editingMode === 'income' && editingId) {
    const idx = state.transactions.findIndex(t => t.id === editingId);
    if (idx >= 0) state.transactions[idx] = tx;
    editingId = null;
    clearIncomeForm();
    return saveData(state);
  }

  state.transactions.push(tx);
  clearIncomeForm();
  saveData(state);
}

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
    split: $('expenseSplit').value,
    debtStatus: $('expenseDebtStatus').value,
    recurring: 'no'
  };

  if (!tx.amount || !tx.description) return alert('Completa valor y descripción.');

  if (editingMode === 'expense' && editingId) {
    const idx = state.transactions.findIndex(t => t.id === editingId);
    if (idx >= 0) state.transactions[idx] = tx;
    editingId = null;
    clearExpenseForm();
    return saveData(state);
  }

  if (tx.type === 'gasto' && tx.split === 'si') {
    const half = Math.round(tx.amount / 2);
    const other = tx.amount - half;
    state.transactions.push(
      { ...tx, id: uid(), owner: 'Alexander', amount: half, description: tx.description + ' (50/50)' },
      { ...tx, id: uid(), owner: 'Nuri', amount: other, description: tx.description + ' (50/50)' }
    );
  } else {
    state.transactions.push(tx);
  }

  clearExpenseForm();
  saveData(state);
}

function clearIncomeForm(reset) {
  $('incomeOwner').value = 'Alexander';
  $('incomeDate').value = new Date().toISOString().slice(0, 10);
  $('incomeCategory').value = 'Salario';
  $('incomeAmount').value = '';
  $('incomeMethod').value = 'Efectivo';
  $('incomeDescription').value = '';
  editingMode = 'income';
  editingId = null;
}

function clearExpenseForm(reset) {
  $('expenseType').value = 'gasto';
  updateExpenseCategories();
  $('expenseOwner').value = 'Hogar';
  $('expenseDate').value = new Date().toISOString().slice(0, 10);
  $('expenseCategory').value = EXPENSE_CATEGORIES[0];
  $('expenseAmount').value = '';
  $('expenseMethod').value = 'Efectivo';
  $('expenseDescription').value = '';
  $('expenseSplit').value = 'no';
  $('expenseDebtStatus').value = 'pendiente';
  editingMode = 'expense';
  editingId = null;
}

function saveBudget() {
  const category = $('budgetCategory').value;
  const amount = Number($('budgetAmount').value || 0);
  if (!category || amount <= 0) return alert('Ingresa categoría y monto válido.');

  const found = state.budgets.find(b => b.category === category);
  if (found) {
    found.amount = amount;
  } else {
    state.budgets.push({ id: uid(), category, amount });
  }

  $('budgetAmount').value = '';
  saveData(state);
}

function saveGoalItem() {
  const name = ($('goalName').value || '').trim();
  const amount = Number($('goalAmount').value || 0);
  const saved = Number($('goalSaved').value || 0);
  const owner = $('goalOwner').value;
  const monthly = Number($('goalMonthly').value || 0);

  if (monthly > 0) state.goals.monthly = monthly;
  if (!name || amount <= 0) {
    saveData(state);
    return;
  }

  state.goalItems.push({ id: uid(), name, amount, saved, owner });
  $('goalName').value = '';
  $('goalAmount').value = '';
  $('goalSaved').value = '';
  $('goalOwner').value = 'Hogar';
  saveData(state);
}

// CALCULATIONS
function currentMonthRows() {
  const ym = new Date().toISOString().slice(0, 7);
  return state.transactions.filter(t => (t.date || '').slice(0, 7) === ym);
}

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

function expenseByCategory(rows = state.transactions) {
  const map = {};
  rows.filter(t => t.type === 'gasto' || t.type === 'deuda').forEach(t => {
    map[t.category] = (map[t.category] || 0) + Number(t.amount || 0);
  });
  return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

function computeBudgetStatus() {
  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x => [x.category, x.amount]));
  if (!state.budgets.length) return { percent: 0, text: 'Todavía no hay presupuesto configurado.' };

  const totalLimit = sum(state.budgets.map(b => b.amount));
  const totalSpent = sum(state.budgets.map(b => monthMap[b.category] || 0));
  const percent = totalLimit ? Math.round((totalSpent / totalLimit) * 100) : 0;

  let text = `Gastado ${fmt(totalSpent)} de ${fmt(totalLimit)}.`;
  if (percent > 100) text += ' Ya pasaron el límite.';
  else if (percent >= 80) text += ' Cerca del tope.';
  else text += ' Dentro del rango.';

  return { percent, text };
}

// RENDERING
function render() {
  renderDashboard();
  renderRecent();
  renderIncomeSummary();
  renderBudgetList();
  renderGoals();
  renderTransactions();
}

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

  if (!currentMonthRows().length) {
    $('monthSummary').textContent = 'Sin movimientos este mes';
  } else if (monthBalance >= 0) {
    $('monthSummary').textContent = `Saldo positivo`;
  } else {
    $('monthSummary').textContent = `Faltante`;
  }

  const budget = computeBudgetStatus();
  $('budgetStatusLabel').textContent = budget.percent + '%';
  $('budgetStatusBar').style.width = Math.min(100, budget.percent) + '%';
  $('budgetStatusText').textContent = budget.text;

  const wrap = $('budgetStatusWrap');
  wrap.className = 'progress';
  if (budget.percent > 100) wrap.classList.add('danger');
  else if (budget.percent >= 80) wrap.classList.add('warn');
  else wrap.classList.add('good');
}

function renderRecent() {
  const list = $('recentList');
  const rows = [...state.transactions].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 5);

  if (!rows.length) {
    list.innerHTML = '<div class="empty">Sin movimientos registrados.</div>';
    return;
  }

  list.innerHTML = rows.map(t => `
    <div class="list-item">
      <div class="list-item-content">
        <div class="list-item-title">${esc(t.description)}</div>
        <div class="list-item-sub">${esc(t.date)} · ${esc(t.owner)}</div>
      </div>
      <div class="list-item-value ${t.type === 'ingreso' ? 'positive' : 'negative'}">
        ${fmt(t.amount)}
      </div>
    </div>
  `).join('');
}

function renderIncomeSummary() {
  const list = $('incomeSummary');
  list.innerHTML = OWNERS.map(owner => {
    const d = byOwner(owner);
    return `
      <div class="list-item">
        <div class="list-item-content">
          <div class="list-item-title">${owner}</div>
          <div class="list-item-sub">Ingr: ${fmt(d.income)} · Gast: ${fmt(d.expense)} · Deuda: ${fmt(d.debt)}</div>
        </div>
        <div class="list-item-value">${fmt(d.balance)}</div>
      </div>
    `;
  }).join('');
}

function renderBudgetList() {
  const list = $('budgetList');
  if (!state.budgets.length) {
    list.innerHTML = '<div class="empty">Sin presupuestos definidos.</div>';
    return;
  }

  const monthMap = Object.fromEntries(expenseByCategory(currentMonthRows()).map(x => [x.category, x.amount]));
  list.innerHTML = state.budgets.map(b => {
    const spent = monthMap[b.category] || 0;
    const pct = b.amount ? Math.round((spent / b.amount) * 100) : 0;
    const progress = pct > 100 ? 'danger' : pct >= 80 ? 'warn' : 'good';

    return `
      <div class="list-item">
        <div class="list-item-content" style="flex: 1;">
          <div class="list-item-title">${esc(b.category)}</div>
          <div class="progress ${progress}" style="margin-top: 6px;">
            <div style="width: ${Math.min(100, pct)}%"></div>
          </div>
        </div>
        <div class="list-item-value" style="font-size: 14px; text-align: right;">
          ${fmt(spent)} / ${fmt(b.amount)}
        </div>
      </div>
    `;
  }).join('');
}

function renderGoals() {
  if (state.goalItems.length) {
    state.goals.total = sum(state.goalItems.map(g => g.amount));
  }
  $('goalMonthly').value = state.goals.monthly || '';

  const list = $('goalList');
  if (!state.goalItems.length) {
    list.innerHTML = '<div class="empty">Sin objetivos definidos.</div>';
    return;
  }

  list.innerHTML = state.goalItems.map(g => {
    const pct = g.amount ? Math.round((g.saved / g.amount) * 100) : 0;
    return `
      <div class="list-item">
        <div class="list-item-content" style="flex: 1;">
          <div class="list-item-title">${esc(g.name)}</div>
          <div class="progress good" style="margin-top: 6px;">
            <div style="width: ${pct}%"></div>
          </div>
        </div>
        <div class="list-item-value" style="font-size: 14px; text-align: right;">
          ${fmt(g.saved)} / ${fmt(g.amount)}
        </div>
      </div>
    `;
  }).join('');
}

function renderTransactions() {
  const owner = $('filterOwner').value;
  const type = $('filterType').value;
  let rows = state.transactions;

  if (owner !== 'Todos') rows = rows.filter(t => t.owner === owner);
  if (type !== 'Todos') rows = rows.filter(t => t.type === type);

  rows = rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const tbody = $('txTable');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--muted);">Sin movimientos.</td></tr>';
    return;
  }

  tbody.innerHTML = rows.map(t => `
    <tr>
      <td>${esc(t.date)}</td>
      <td>${t.type === 'ingreso' ? 'Ingreso' : t.type === 'gasto' ? 'Gasto' : 'Deuda'}</td>
      <td>${esc(t.owner)}</td>
      <td>${esc(t.description)}</td>
      <td class="right ${t.type === 'ingreso' ? 'positive' : 'negative'}">${fmt(t.amount)}</td>
    </tr>
  `).join('');
}

// EXPORT/IMPORT
function exportBackup() {
  const data = JSON.stringify(state, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importBackup(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = event => {
    try {
      const imported = JSON.parse(event.target.result);
      const normalized = normalize(imported);
      saveData(normalized);
      alert('Datos importados correctamente.');
    } catch (err) {
      alert('Error al importar: ' + err.message);
    }
  };
  reader.readAsText(file);
}

// START
init();
