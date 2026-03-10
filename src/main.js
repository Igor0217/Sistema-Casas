const ACCOUNTS = ['Alexander', 'Nuri', 'Hogar'];
const EXPENSE_CATEGORIES = ['Mercado', 'Transporte', 'Servicios', 'Salud', 'Educación', 'Deudas', 'Entretenimiento', 'Ahorro', 'Hogar', 'Mascotas', 'Regalos', 'Otros'];
const INCOME_CATEGORIES = ['Salario', 'Honorarios', 'Ventas', 'Reembolso', 'Ahorro', 'Regalo', 'Otros'];
const STORAGE_KEY = 'finanzas-familiares-v3';
const LEGACY_KEYS = ['finanzas-familiares-v2', 'finanzas-familiares-v1', 'expenses', 'incomes'];

let state = loadState();
let expenseChart = null;
const els = {};

document.addEventListener('DOMContentLoaded', () => {
  cacheEls();
  setupDateFields();
  setupSelectors();
  setupNavigation();
  setupForms();
  setupFilters();
  setupActions();
  updateLastAccess();
  renderAll();
});

function cacheEls() {
  [
    'expenseForm','incomeForm','transactionsTable','recentTransactions','filterAccount','filterType','filterMonth',
    'reportMonth','reportAccount','categorySummary','accountSummary','notification','importBackup','editModal','editForm',
    'backupBtn','importBtn','exportExcelBtn','resetDataBtn','closeEditModal','cancelEdit','goalForm','budgetForm','debtForm',
    'budgetList','debtList','clearFiltersBtn','refreshReportsBtn'
  ].forEach(id => els[id] = document.getElementById(id));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try { return normalizeState(JSON.parse(saved)); } catch {}
  }
  for (const key of LEGACY_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const migrated = normalizeState(JSON.parse(raw));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {}
  }
  const migrated = migrateLegacyData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function normalizeState(raw = {}) {
  const settings = raw.settings || {};
  const budgets = typeof settings.budgets === 'object' && settings.budgets ? settings.budgets : {};
  return {
    transactions: Array.isArray(raw.transactions)
      ? raw.transactions.filter(Boolean).map(tx => ({
          id: tx.id || crypto.randomUUID(),
          type: tx.type === 'income' ? 'income' : 'expense',
          account: ACCOUNTS.includes(tx.account) ? tx.account : 'Hogar',
          description: String(tx.description || '').trim(),
          amount: Number(tx.amount) || 0,
          date: tx.date || today(),
          category: String(tx.category || '').trim(),
          method: String(tx.method || '').trim(),
          note: String(tx.note || '').trim(),
          sharedGroup: tx.sharedGroup || null,
          isSharedSplit: Boolean(tx.isSharedSplit)
        })).filter(tx => tx.description && tx.amount > 0)
      : [],
    settings: {
      monthlyGoal: Number(settings.monthlyGoal) || 0,
      savingsGoal: Number(settings.savingsGoal) || 0,
      budgets: Object.fromEntries(Object.entries(budgets).map(([k,v]) => [String(k), Number(v) || 0]).filter(([,v]) => v > 0))
    },
    debts: Array.isArray(raw.debts)
      ? raw.debts.filter(Boolean).map(debt => ({
          id: debt.id || crypto.randomUUID(),
          name: String(debt.name || '').trim(),
          total: Number(debt.total) || 0,
          paid: Math.max(0, Number(debt.paid) || 0),
          dueDate: debt.dueDate || '',
          account: ACCOUNTS.includes(debt.account) ? debt.account : 'Hogar',
          note: String(debt.note || '').trim()
        })).filter(debt => debt.name && debt.total > 0)
      : []
  };
}

function migrateLegacyData() {
  const expenses = JSON.parse(localStorage.getItem('expenses') || '[]');
  const incomes = JSON.parse(localStorage.getItem('incomes') || '[]');
  const normalizeAccount = (value) => {
    if (!value) return 'Hogar';
    const text = String(value).toLowerCase();
    if (text.includes('alex')) return 'Alexander';
    if (text.includes('nuri')) return 'Nuri';
    return 'Hogar';
  };
  const transactions = [
    ...expenses.map(item => ({
      id: crypto.randomUUID(), type: 'expense', account: normalizeAccount(item.house), description: item.description || 'Gasto migrado',
      amount: Number(item.amount) || 0, date: item.date || today(), category: 'Migrado', method: '', note: 'Registro migrado', sharedGroup: null, isSharedSplit: false
    })),
    ...incomes.map(item => ({
      id: crypto.randomUUID(), type: 'income', account: normalizeAccount(item.house), description: item.description || 'Ingreso migrado',
      amount: Number(item.amount) || 0, date: item.date || today(), category: 'Migrado', method: '', note: 'Registro migrado', sharedGroup: null, isSharedSplit: false
    }))
  ].filter(item => item.amount > 0);
  return { transactions, settings: { monthlyGoal: 0, savingsGoal: 0, budgets: {} }, debts: [] };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setupDateFields() {
  document.getElementById('expenseDate').value = today();
  document.getElementById('incomeDate').value = today();
  document.getElementById('filterMonth').value = currentMonth();
  document.getElementById('reportMonth').value = currentMonth();
  document.getElementById('debtDueDate').value = today();
}

function populateSelect(selectId, options, includeAll = false, allLabel = 'Todas') {
  const select = document.getElementById(selectId);
  if (!select) return;
  select.innerHTML = '';
  if (includeAll) {
    const opt = document.createElement('option');
    opt.value = 'all';
    opt.textContent = allLabel;
    select.appendChild(opt);
  }
  options.forEach(optionText => {
    const opt = document.createElement('option');
    opt.value = optionText;
    opt.textContent = optionText;
    select.appendChild(opt);
  });
}

function setupSelectors() {
  ['expenseAccount','incomeAccount','editAccount','debtAccount'].forEach(id => populateSelect(id, ACCOUNTS));
  populateSelect('filterAccount', ACCOUNTS, true, 'Todas las cuentas');
  populateSelect('reportAccount', ACCOUNTS, true, 'Todas las cuentas');
  populateSelect('expenseCategory', EXPENSE_CATEGORIES);
  populateSelect('incomeCategory', INCOME_CATEGORIES);
  populateSelect('budgetCategory', EXPENSE_CATEGORIES);
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => showSection(btn.dataset.section)));
}

function showSection(sectionId) {
  document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));
}

function setupForms() {
  els.expenseForm.addEventListener('submit', handleExpenseSubmit);
  els.incomeForm.addEventListener('submit', handleIncomeSubmit);
  els.editForm.addEventListener('submit', handleEditSubmit);
  els.goalForm.addEventListener('submit', handleGoalSubmit);
  els.budgetForm.addEventListener('submit', handleBudgetSubmit);
  els.debtForm.addEventListener('submit', handleDebtSubmit);
}

function handleExpenseSubmit(e) {
  e.preventDefault();
  const baseTx = {
    type: 'expense',
    account: document.getElementById('expenseAccount').value,
    description: document.getElementById('expenseDescription').value.trim(),
    amount: Number(document.getElementById('expenseAmount').value),
    date: document.getElementById('expenseDate').value,
    category: document.getElementById('expenseCategory').value,
    method: document.getElementById('expenseMethod').value,
    note: document.getElementById('expenseNote').value.trim(),
  };
  if (!validateTransaction(baseTx)) return;

  const split50 = document.getElementById('expenseSplit50').checked;
  if (split50) {
    const half = roundMoney(baseTx.amount / 2);
    const remainder = roundMoney(baseTx.amount - half);
    const sharedGroup = crypto.randomUUID();
    const txA = { ...baseTx, id: crypto.randomUUID(), account: 'Alexander', amount: half, sharedGroup, isSharedSplit: true, note: mergeNote(baseTx.note, 'Gasto compartido 50/50') };
    const txN = { ...baseTx, id: crypto.randomUUID(), account: 'Nuri', amount: remainder, sharedGroup, isSharedSplit: true, note: mergeNote(baseTx.note, 'Gasto compartido 50/50') };
    state.transactions.unshift(txN, txA);
    showToast('Gasto 50/50 guardado para Alexander y Nuri.', 'success');
  } else {
    state.transactions.unshift({ ...baseTx, id: crypto.randomUUID(), sharedGroup: null, isSharedSplit: false });
    showToast('Gasto guardado correctamente.', 'success');
  }

  saveState();
  els.expenseForm.reset();
  document.getElementById('expenseDate').value = today();
  showSection('movimientos');
  renderAll();
}

function handleIncomeSubmit(e) {
  e.preventDefault();
  const tx = {
    id: crypto.randomUUID(),
    type: 'income',
    account: document.getElementById('incomeAccount').value,
    description: document.getElementById('incomeDescription').value.trim(),
    amount: Number(document.getElementById('incomeAmount').value),
    date: document.getElementById('incomeDate').value,
    category: document.getElementById('incomeCategory').value,
    method: document.getElementById('incomeMethod').value,
    note: document.getElementById('incomeNote').value.trim(),
    sharedGroup: null,
    isSharedSplit: false
  };
  if (!validateTransaction(tx)) return;
  state.transactions.unshift(tx);
  saveState();
  els.incomeForm.reset();
  document.getElementById('incomeDate').value = today();
  showToast('Ingreso guardado correctamente.', 'success');
  renderAll();
  showSection('movimientos');
}

function handleEditSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('editId').value;
  const idx = state.transactions.findIndex(t => t.id === id);
  if (idx === -1) return;
  const current = state.transactions[idx];
  const updated = {
    ...current,
    id,
    type: document.getElementById('editType').value,
    account: document.getElementById('editAccount').value,
    description: document.getElementById('editDescription').value.trim(),
    amount: Number(document.getElementById('editAmount').value),
    date: document.getElementById('editDate').value,
    category: document.getElementById('editCategory').value.trim(),
    method: document.getElementById('editMethod').value.trim(),
    note: document.getElementById('editNote').value.trim(),
  };
  if (!validateTransaction(updated)) return;
  state.transactions[idx] = updated;
  saveState();
  closeEditModal();
  showToast('Movimiento actualizado.', 'success');
  renderAll();
}

function handleGoalSubmit(e) {
  e.preventDefault();
  state.settings.monthlyGoal = Number(document.getElementById('monthlyGoalInput').value) || 0;
  state.settings.savingsGoal = Number(document.getElementById('savingsGoalInput').value) || 0;
  saveState();
  renderGoals();
  showToast('Metas guardadas correctamente.', 'success');
}

function handleBudgetSubmit(e) {
  e.preventDefault();
  const category = document.getElementById('budgetCategory').value;
  const amount = Number(document.getElementById('budgetAmount').value) || 0;
  if (!category) return showError('Selecciona una categoría.');
  if (amount <= 0) return showError('El presupuesto debe ser mayor que cero.');
  state.settings.budgets[category] = amount;
  saveState();
  els.budgetForm.reset();
  renderAll();
  showToast('Presupuesto guardado.', 'success');
}

function handleDebtSubmit(e) {
  e.preventDefault();
  const debt = {
    id: crypto.randomUUID(),
    name: document.getElementById('debtName').value.trim(),
    total: Number(document.getElementById('debtTotal').value),
    paid: Number(document.getElementById('debtPaid').value) || 0,
    dueDate: document.getElementById('debtDueDate').value,
    account: document.getElementById('debtAccount').value,
    note: document.getElementById('debtNote').value.trim()
  };
  if (!debt.name) return showError('Escribe el nombre de la deuda o cuota.');
  if (!debt.total || debt.total <= 0) return showError('El valor total debe ser mayor que cero.');
  if (debt.paid < 0 || debt.paid > debt.total) return showError('El abonado debe estar entre cero y el total.');
  state.debts.unshift(debt);
  saveState();
  els.debtForm.reset();
  document.getElementById('debtDueDate').value = today();
  renderAll();
  showToast('Deuda o cuota guardada.', 'success');
}

function setupFilters() {
  ['filterAccount','filterType','filterMonth','reportMonth','reportAccount'].forEach(id => document.getElementById(id).addEventListener('change', renderAll));
}

function setupActions() {
  els.backupBtn.addEventListener('click', backupJSON);
  els.importBtn.addEventListener('click', () => els.importBackup.click());
  els.importBackup.addEventListener('change', importJSON);
  els.exportExcelBtn.addEventListener('click', exportExcel);
  els.resetDataBtn.addEventListener('click', resetAllData);
  els.closeEditModal.addEventListener('click', closeEditModal);
  els.cancelEdit.addEventListener('click', closeEditModal);
  els.editModal.addEventListener('click', (e) => { if (e.target === els.editModal) closeEditModal(); });
  els.clearFiltersBtn.addEventListener('click', clearFilters);
  els.refreshReportsBtn.addEventListener('click', renderReports);
}

function validateTransaction(tx) {
  if (!tx.description) return showError('Escribe una descripción.');
  if (!tx.account) return showError('Selecciona una cuenta.');
  if (!tx.date) return showError('Selecciona una fecha.');
  if (!tx.amount || tx.amount <= 0) return showError('El valor debe ser mayor que cero.');
  return true;
}

function showError(message) {
  showToast(message, 'error');
  return false;
}

function renderAll() {
  renderDashboard();
  renderTransactionsTable();
  renderRecentTransactions();
  renderReports();
  renderGoals();
  renderBudgets();
  renderDebts();
}

function renderDashboard() {
  const totals = summarizeTransactions(state.transactions);
  setText('totalIncomes', money(totals.income));
  setText('totalExpenses', money(totals.expense));
  setText('totalBalance', money(totals.balance));
  paintBalance(document.getElementById('totalBalance'), totals.balance);

  const monthTx = getTransactionsByMonth(currentMonth());
  const monthTotals = summarizeTransactions(monthTx);
  setText('monthIncome', money(monthTotals.income));
  setText('monthExpense', money(monthTotals.expense));
  setText('monthBalance', money(monthTotals.balance));
  paintBalance(document.getElementById('monthBalance'), monthTotals.balance);

  const debtPending = state.debts.reduce((sum, debt) => sum + Math.max(0, debt.total - debt.paid), 0);
  setText('pendingDebts', money(debtPending));

  const accountMap = {
    Alexander: { incEl: 'alexIncome', expEl: 'alexExpense', balEl: 'alexBalance' },
    Nuri: { incEl: 'nuriIncome', expEl: 'nuriExpense', balEl: 'nuriBalance' },
    Hogar: { incEl: 'homeIncome', expEl: 'homeExpense', balEl: 'homeBalance' }
  };

  ACCOUNTS.forEach(account => {
    const summary = summarizeTransactions(state.transactions.filter(t => t.account === account));
    const config = accountMap[account];
    setText(config.incEl, money(summary.income));
    setText(config.expEl, money(summary.expense));
    setText(config.balEl, money(summary.balance));
    paintBalance(document.getElementById(config.balEl), summary.balance);
  });

  renderInsights(monthTx, totals);
  renderMonthClosing(monthTx, monthTotals, debtPending);
  renderBudgetAlertCard();
  document.getElementById('monthlyGoalInput').value = state.settings.monthlyGoal || '';
  document.getElementById('savingsGoalInput').value = state.settings.savingsGoal || '';
}

function summarizeTransactions(list) {
  const income = list.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = list.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  return { income, expense, balance: income - expense };
}

function renderInsights(monthTx, totals) {
  const accountActivity = ACCOUNTS.map(account => ({
    account,
    total: monthTx.filter(t => t.account === account).reduce((sum, t) => sum + t.amount, 0)
  })).sort((a,b) => b.total - a.total);

  setText('topAccount', accountActivity[0]?.total ? `${accountActivity[0].account} · ${money(accountActivity[0].total)}` : 'Sin datos');

  const categoryTotals = getExpenseCategoryTotals(monthTx);
  const topCategory = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1])[0];
  setText('topCategory', topCategory ? `${topCategory[0]} · ${money(topCategory[1])}` : 'Sin datos');

  const insight = buildInsight(monthTx, totals, topCategory);
  setText('financialInsight', insight);
}

function buildInsight(monthTx, totals, topCategory) {
  if (!state.transactions.length) return 'Empiecen registrando algunos movimientos para ver recomendaciones útiles.';
  const month = summarizeTransactions(monthTx);
  if (month.balance < 0) return 'Este mes van gastando más de lo que ingresa. Conviene revisar gastos no urgentes y el presupuesto de las categorías más fuertes.';
  if (topCategory && month.expense && topCategory[1] > month.expense * 0.4) return `Ojo con ${topCategory[0]}: está absorbiendo buena parte de los gastos del mes.`;
  if (totals.balance > 0 && month.balance > 0) return 'Van por buen camino: el balance general y el del mes están en positivo.';
  return 'Las finanzas están relativamente estables, pero todavía hay margen para organizar mejor el ahorro.';
}

function renderMonthClosing(monthTx, monthTotals, debtPending) {
  if (!monthTx.length) {
    setText('monthClosingSummary', 'Todavía no hay suficientes movimientos para el cierre mensual.');
    return;
  }
  const savingsRate = monthTotals.income > 0 ? Math.round((Math.max(0, monthTotals.balance) / monthTotals.income) * 100) : 0;
  const overBudget = getOverBudgetCategories(currentMonth());
  const debtText = debtPending > 0 ? `Tienen ${money(debtPending)} pendientes en deudas o cuotas.` : 'No tienen deudas pendientes registradas.';
  const budgetText = overBudget.length ? `Hay ${overBudget.length} categoría(s) por encima del presupuesto.` : 'Ninguna categoría superó el presupuesto.';
  const summary = `En ${monthName(currentMonth())} registraron ${monthTx.length} movimientos. El balance del mes va en ${money(monthTotals.balance)} y la tasa de ahorro aproximada es ${savingsRate}%. ${budgetText} ${debtText}`;
  setText('monthClosingSummary', summary);
}

function renderGoals() {
  const month = summarizeTransactions(getTransactionsByMonth(currentMonth()));
  renderGoalBar('goalBalance', Math.max(0, month.balance), state.settings.monthlyGoal);
  renderGoalBar('goalSavings', Math.max(0, summarizeTransactions(state.transactions).balance), state.settings.savingsGoal);
}

function renderGoalBar(prefix, actual, goal) {
  const percent = goal > 0 ? Math.min(100, Math.round((actual / goal) * 100)) : 0;
  const bar = document.getElementById(`${prefix}Bar`);
  if (bar) bar.style.width = `${percent}%`;
  setText(`${prefix}Percent`, `${percent}%`);
  setText(`${prefix}Label`, goal > 0 ? `${money(actual)} de ${money(goal)}` : 'Sin meta definida');
}

function renderTransactionsTable() {
  const rows = getFilteredTransactions().sort((a,b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)).map(tx => `
    <tr class="border-t border-slate-200 hover:bg-slate-50 transition">
      <td class="px-4 py-3 whitespace-nowrap">${formatDate(tx.date)}</td>
      <td class="px-4 py-3">${tx.type === 'income' ? '<span class="chip chip-income">Ingreso</span>' : '<span class="chip chip-expense">Gasto</span>'}</td>
      <td class="px-4 py-3">${tx.account}</td>
      <td class="px-4 py-3">${tx.category || '-'}</td>
      <td class="px-4 py-3">${escapeHtml(tx.description)}${tx.isSharedSplit ? ' <span class="text-xs text-violet-600 font-semibold">· 50/50</span>' : ''}</td>
      <td class="px-4 py-3 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">${money(tx.amount)}</td>
      <td class="px-4 py-3 text-center whitespace-nowrap">
        <button class="edit-btn bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm" data-id="${tx.id}">Editar</button>
        <button class="delete-btn bg-rose-500 hover:bg-rose-600 text-white px-3 py-2 rounded-xl text-sm ml-2" data-id="${tx.id}">Eliminar</button>
      </td>
    </tr>
  `).join('');

  els.transactionsTable.innerHTML = rows || '<tr><td colspan="7" class="px-4 py-8 text-center text-slate-500">No hay movimientos para ese filtro.</td></tr>';
  document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => openEditModal(btn.dataset.id)));
  document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', () => deleteTransaction(btn.dataset.id)));
}

function renderRecentTransactions() {
  const items = [...state.transactions].sort((a,b) => `${b.date}${b.id}`.localeCompare(`${a.date}${a.id}`)).slice(0, 6).map(tx => `
    <div class="soft rounded-2xl p-4 flex items-center justify-between gap-3">
      <div>
        <p class="font-semibold">${escapeHtml(tx.description)}</p>
        <p class="text-sm text-slate-500 mt-1">${tx.account} · ${tx.category || 'Sin categoría'} · ${formatDate(tx.date)}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">${tx.type === 'income' ? '+' : '-'} ${money(tx.amount)}</p>
        <p class="text-xs text-slate-400">${tx.type === 'income' ? 'Ingreso' : tx.isSharedSplit ? 'Gasto 50/50' : 'Gasto'}</p>
      </div>
    </div>
  `).join('');
  els.recentTransactions.innerHTML = items || '<p class="text-slate-500">Todavía no hay movimientos registrados.</p>';
}

function renderReports() {
  const month = document.getElementById('reportMonth').value;
  const account = document.getElementById('reportAccount').value;
  const filtered = state.transactions.filter(tx => {
    const byMonth = !month || tx.date.startsWith(month);
    const byAccount = account === 'all' || tx.account === account;
    return byMonth && byAccount;
  });
  const summary = summarizeTransactions(filtered);
  setText('reportIncome', money(summary.income));
  setText('reportExpense', money(summary.expense));
  setText('reportBalance', money(summary.balance));
  setText('reportCount', filtered.length);
  paintBalance(document.getElementById('reportBalance'), summary.balance);

  const categoryTotals = getExpenseCategoryTotals(filtered);
  const totalExpense = summary.expense;
  const categories = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).map(([category, amount]) => {
    const pct = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
    return `
      <div class="soft rounded-2xl p-4">
        <div class="flex justify-between items-center mb-2"><span class="font-medium">${escapeHtml(category)}</span><strong>${money(amount)}</strong></div>
        <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
        <p class="text-xs text-slate-500 mt-2">${pct}% del gasto del filtro</p>
      </div>
    `;
  }).join('');
  els.categorySummary.innerHTML = categories || '<p class="text-slate-500">No hay gastos para ese filtro.</p>';

  const accountBlocks = ACCOUNTS.map(accountName => {
    const info = summarizeTransactions(filtered.filter(t => t.account === accountName));
    return `
      <div class="soft rounded-2xl p-4">
        <div class="flex justify-between items-center">
          <span class="font-semibold">${accountName}</span>
          <span class="text-sm ${info.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'} font-semibold">${money(info.balance)}</span>
        </div>
        <div class="mt-3 text-sm space-y-1 text-slate-600">
          <div class="flex justify-between"><span>Ingresos</span><span>${money(info.income)}</span></div>
          <div class="flex justify-between"><span>Gastos</span><span>${money(info.expense)}</span></div>
        </div>
      </div>
    `;
  }).join('');
  els.accountSummary.innerHTML = accountBlocks;
  renderExpenseChart(categoryTotals);
}

function renderExpenseChart(categoryTotals) {
  const canvas = document.getElementById('expenseChart');
  if (!canvas) return;
  const entries = Object.entries(categoryTotals).sort((a,b) => b[1] - a[1]).slice(0, 6);
  const labels = entries.map(([label]) => label);
  const values = entries.map(([,value]) => value);

  if (expenseChart) expenseChart.destroy();
  expenseChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Sin datos'],
      datasets: [{
        data: values.length ? values : [1],
        backgroundColor: values.length ? ['#7c3aed','#ec4899','#8b5cf6','#f97316','#06b6d4','#22c55e'] : ['#cbd5e1'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' }
      },
      cutout: '62%'
    }
  });
}

function renderBudgets() {
  const currentExpenses = getExpenseCategoryTotals(getTransactionsByMonth(currentMonth()));
  const entries = Object.entries(state.settings.budgets).sort((a,b) => a[0].localeCompare(b[0]));
  if (!entries.length) {
    els.budgetList.innerHTML = '<p class="text-slate-500">Todavía no han definido presupuestos por categoría.</p>';
    return;
  }
  els.budgetList.innerHTML = entries.map(([category, limit]) => {
    const spent = currentExpenses[category] || 0;
    const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    const over = spent > limit;
    return `
      <div class="soft rounded-2xl p-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="font-semibold">${escapeHtml(category)}</p>
            <p class="text-xs text-slate-500 mt-1">Gastado ${money(spent)} de ${money(limit)}</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm font-semibold ${over ? 'text-rose-600' : 'text-emerald-600'}">${pct}%</span>
            <button class="delete-budget text-slate-400 hover:text-rose-500 text-lg" data-category="${escapeHtml(category)}">×</button>
          </div>
        </div>
        <div class="progress-track mt-3"><div class="progress-fill" style="width:${Math.min(pct,100)}%"></div></div>
        <p class="text-xs mt-2 ${over ? 'text-rose-600' : 'text-slate-500'}">${over ? 'Se pasó del presupuesto' : 'Dentro del presupuesto'}</p>
      </div>
    `;
  }).join('');
  document.querySelectorAll('.delete-budget').forEach(btn => btn.addEventListener('click', () => deleteBudget(btn.dataset.category)));
}

function renderDebts() {
  if (!state.debts.length) {
    els.debtList.innerHTML = '<p class="text-slate-500">No hay deudas o cuotas registradas.</p>';
    return;
  }
  els.debtList.innerHTML = state.debts.map(debt => {
    const pending = Math.max(0, debt.total - debt.paid);
    const pct = Math.round((debt.paid / debt.total) * 100);
    return `
      <div class="soft rounded-2xl p-4">
        <div class="flex items-start justify-between gap-3">
          <div>
            <p class="font-semibold">${escapeHtml(debt.name)}</p>
            <p class="text-xs text-slate-500 mt-1">${debt.account}${debt.dueDate ? ' · vence ' + formatDate(debt.dueDate) : ''}</p>
          </div>
          <button class="delete-debt text-slate-400 hover:text-rose-500 text-lg" data-id="${debt.id}">×</button>
        </div>
        <div class="grid grid-cols-3 gap-3 mt-4 text-sm">
          <div><p class="text-slate-500">Total</p><p class="font-semibold">${money(debt.total)}</p></div>
          <div><p class="text-slate-500">Abonado</p><p class="font-semibold text-emerald-600">${money(debt.paid)}</p></div>
          <div><p class="text-slate-500">Pendiente</p><p class="font-semibold text-amber-600">${money(pending)}</p></div>
        </div>
        <div class="progress-track mt-3"><div class="progress-fill" style="width:${Math.min(pct,100)}%"></div></div>
        <div class="mt-3 flex gap-2">
          <button class="pay-debt flex-1 bg-amber-100 hover:bg-amber-200 text-amber-700 px-3 py-2 rounded-xl text-sm font-semibold" data-id="${debt.id}">Abonar</button>
        </div>
        ${debt.note ? `<p class="text-xs text-slate-500 mt-2">${escapeHtml(debt.note)}</p>` : ''}
      </div>
    `;
  }).join('');
  document.querySelectorAll('.delete-debt').forEach(btn => btn.addEventListener('click', () => deleteDebt(btn.dataset.id)));
  document.querySelectorAll('.pay-debt').forEach(btn => btn.addEventListener('click', () => payDebt(btn.dataset.id)));
}

function renderBudgetAlertCard() {
  const overBudget = getOverBudgetCategories(currentMonth());
  const text = overBudget.length
    ? `Atención con ${overBudget[0].category}: va en ${overBudget[0].percent}% del presupuesto mensual.`
    : 'Todavía no hay alertas de presupuesto.';
  setText('budgetAlertCard', text);
}

function getTransactionsByMonth(month) {
  return state.transactions.filter(t => t.date.startsWith(month));
}

function getExpenseCategoryTotals(list) {
  const totals = {};
  list.filter(t => t.type === 'expense').forEach(tx => {
    const key = tx.category || 'Sin categoría';
    totals[key] = (totals[key] || 0) + tx.amount;
  });
  return totals;
}

function getOverBudgetCategories(month) {
  const monthTotals = getExpenseCategoryTotals(getTransactionsByMonth(month));
  return Object.entries(state.settings.budgets).map(([category, limit]) => {
    const spent = monthTotals[category] || 0;
    const percent = limit > 0 ? Math.round((spent / limit) * 100) : 0;
    return { category, spent, limit, percent };
  }).filter(item => item.spent > item.limit).sort((a,b) => b.percent - a.percent);
}

function getFilteredTransactions() {
  const account = document.getElementById('filterAccount').value;
  const type = document.getElementById('filterType').value;
  const month = document.getElementById('filterMonth').value;
  return state.transactions.filter(tx => {
    const byAccount = account === 'all' || tx.account === account;
    const byType = type === 'all' || tx.type === type;
    const byMonth = !month || tx.date.startsWith(month);
    return byAccount && byType && byMonth;
  });
}

function clearFilters() {
  document.getElementById('filterAccount').value = 'all';
  document.getElementById('filterType').value = 'all';
  document.getElementById('filterMonth').value = currentMonth();
  renderTransactionsTable();
}

function openEditModal(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('editId').value = tx.id;
  document.getElementById('editType').value = tx.type;
  document.getElementById('editAccount').value = tx.account;
  document.getElementById('editDescription').value = tx.description;
  document.getElementById('editAmount').value = tx.amount;
  document.getElementById('editDate').value = tx.date;
  document.getElementById('editCategory').value = tx.category || '';
  document.getElementById('editMethod').value = tx.method || '';
  document.getElementById('editNote').value = tx.note || '';
  els.editModal.classList.remove('hidden');
}

function closeEditModal() {
  els.editModal.classList.add('hidden');
}

function deleteTransaction(id) {
  const tx = state.transactions.find(t => t.id === id);
  if (!tx) return;
  if (!confirm(`¿Eliminar este ${tx.type === 'income' ? 'ingreso' : 'gasto'} de ${tx.account}?`)) return;
  state.transactions = state.transactions.filter(t => t.id !== id);
  saveState();
  showToast('Movimiento eliminado.', 'success');
  renderAll();
}

function deleteBudget(category) {
  if (!confirm(`¿Eliminar el presupuesto de ${category}?`)) return;
  delete state.settings.budgets[category];
  saveState();
  renderAll();
  showToast('Presupuesto eliminado.', 'success');
}

function deleteDebt(id) {
  if (!confirm('¿Eliminar esta deuda o cuota?')) return;
  state.debts = state.debts.filter(debt => debt.id !== id);
  saveState();
  renderAll();
  showToast('Deuda eliminada.', 'success');
}

function payDebt(id) {
  const debt = state.debts.find(item => item.id === id);
  if (!debt) return;
  const pending = Math.max(0, debt.total - debt.paid);
  const value = prompt(`¿Cuánto desean abonar a "${debt.name}"? Pendiente: ${money(pending)}`);
  if (value === null) return;
  const amount = Number(value);
  if (!amount || amount <= 0) return showError('Ingresa un abono válido.');
  if (amount > pending) return showError('El abono no puede ser mayor al pendiente.');
  debt.paid = roundMoney(debt.paid + amount);
  saveState();
  renderAll();
  showToast('Abono registrado.', 'success');
}

function backupJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas-familiares-v3-${currentMonth()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup descargado.', 'success');
}

function importJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      state = normalizeState(JSON.parse(reader.result));
      saveState();
      renderAll();
      showToast('Datos importados correctamente.', 'success');
    } catch {
      showToast('El archivo no tiene el formato esperado.', 'error');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function exportExcel() {
  if (!state.transactions.length && !state.debts.length) return showError('No hay datos para exportar.');
  const rows = state.transactions.map(tx => ({
    Fecha: tx.date,
    Tipo: tx.type === 'income' ? 'Ingreso' : 'Gasto',
    Cuenta: tx.account,
    Categoría: tx.category || '',
    Descripción: tx.description,
    Valor: tx.amount,
    Método: tx.method || '',
    Observación: tx.note || '',
    Compartido5050: tx.isSharedSplit ? 'Sí' : 'No'
  }));
  const summaryRows = ACCOUNTS.map(account => {
    const info = summarizeTransactions(state.transactions.filter(t => t.account === account));
    return { Cuenta: account, Ingresos: info.income, Gastos: info.expense, Balance: info.balance };
  });
  const budgetRows = Object.entries(state.settings.budgets).map(([category, limit]) => ({ Categoría: category, PresupuestoMensual: limit }));
  const debtRows = state.debts.map(debt => ({ Nombre: debt.name, Responsable: debt.account, Total: debt.total, Abonado: debt.paid, Pendiente: debt.total - debt.paid, FechaObjetivo: debt.dueDate, Nota: debt.note }));

  const wb = XLSX.utils.book_new();
  if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Movimientos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');
  if (budgetRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(budgetRows), 'Presupuestos');
  if (debtRows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(debtRows), 'Deudas');
  XLSX.utils.writeFile(wb, `finanzas-familiares-v3-${currentMonth()}.xlsx`);
  showToast('Archivo Excel generado.', 'success');
}

function resetAllData() {
  if (!confirm('Se eliminarán todos los movimientos, metas, presupuestos y deudas guardados en este navegador. ¿Deseas continuar?')) return;
  state = { transactions: [], settings: { monthlyGoal: 0, savingsGoal: 0, budgets: {} }, debts: [] };
  saveState();
  renderAll();
  showToast('Datos reiniciados.', 'success');
}

function showToast(message, type = 'success') {
  const colors = { success: 'bg-emerald-600', error: 'bg-rose-600', info: 'bg-indigo-600' };
  els.notification.innerHTML = `<div class="${colors[type] || colors.info} text-white px-4 py-3 rounded-2xl shadow-2xl">${escapeHtml(message)}</div>`;
  els.notification.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.notification.classList.add('hidden'), 2800);
}

function updateLastAccess() {
  const now = new Date();
  document.getElementById('lastAccess').textContent = `Último acceso: ${now.toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' })}`;
}

function today() { return new Date().toISOString().slice(0, 10); }
function currentMonth() { return new Date().toISOString().slice(0, 7); }
function monthName(ym) {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}
function money(value) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value || 0);
}
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}
function paintBalance(el, value) {
  if (!el) return;
  el.classList.remove('text-emerald-600','text-rose-600','text-amber-600');
  if (value > 0) el.classList.add('text-emerald-600');
  else if (value < 0) el.classList.add('text-rose-600');
  else el.classList.add('text-amber-600');
}
function mergeNote(existing, extra) {
  return [existing, extra].filter(Boolean).join(' · ');
}
function roundMoney(value) { return Math.round((Number(value) || 0) * 100) / 100; }
function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
