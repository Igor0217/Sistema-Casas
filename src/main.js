const ACCOUNTS = ['Alexander', 'Nuri', 'Hogar'];
const STORAGE_KEY = 'finanzas-familiares-v2';
const LEGACY_KEYS = ['finanzas-familiares-v1', 'expenses', 'incomes'];

let state = loadState();
let currentSection = 'dashboard';
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
    'backupBtn','importBtn','exportExcelBtn','resetDataBtn','closeEditModal','cancelEdit','goalForm'
  ].forEach(id => els[id] = document.getElementById(id));
}

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return normalizeState(parsed);
    } catch {}
  }

  const v1 = localStorage.getItem('finanzas-familiares-v1');
  if (v1) {
    try {
      const parsed = JSON.parse(v1);
      const migrated = normalizeState(parsed);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    } catch {}
  }

  const migrated = migrateLegacyData();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
  return migrated;
}

function normalizeState(raw = {}) {
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
          note: String(tx.note || '').trim()
        })).filter(tx => tx.description && tx.amount > 0)
      : [],
    settings: {
      monthlyGoal: Number(raw.settings?.monthlyGoal) || 0,
      savingsGoal: Number(raw.settings?.savingsGoal) || 0
    }
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
      id: crypto.randomUUID(),
      type: 'expense',
      account: normalizeAccount(item.house),
      description: item.description || 'Gasto migrado',
      amount: Number(item.amount) || 0,
      date: item.date || today(),
      category: 'Migrado',
      method: '',
      note: 'Registro migrado desde versión anterior'
    })),
    ...incomes.map(item => ({
      id: crypto.randomUUID(),
      type: 'income',
      account: normalizeAccount(item.house),
      description: item.description || 'Ingreso migrado',
      amount: Number(item.amount) || 0,
      date: item.date || today(),
      category: 'Migrado',
      method: '',
      note: 'Registro migrado desde versión anterior'
    }))
  ].filter(item => item.amount > 0);

  return { transactions, settings: { monthlyGoal: 0, savingsGoal: 0 } };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function setupDateFields() {
  document.getElementById('expenseDate').value = today();
  document.getElementById('incomeDate').value = today();
  document.getElementById('filterMonth').value = currentMonth();
  document.getElementById('reportMonth').value = currentMonth();
}

function setupSelectors() {
  const accountSelectors = ['expenseAccount','incomeAccount','filterAccount','reportAccount','editAccount'];
  accountSelectors.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;
    select.innerHTML = '';
    if (id === 'filterAccount' || id === 'reportAccount') {
      const allOpt = document.createElement('option');
      allOpt.value = 'all';
      allOpt.textContent = 'Todas las cuentas';
      select.appendChild(allOpt);
    }
    ACCOUNTS.forEach(account => {
      const option = document.createElement('option');
      option.value = account;
      option.textContent = account;
      select.appendChild(option);
    });
  });
}

function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => showSection(btn.dataset.section));
  });
}

function showSection(sectionId) {
  currentSection = sectionId;
  document.querySelectorAll('main section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.section === sectionId));
}

function setupForms() {
  els.expenseForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const tx = {
      id: crypto.randomUUID(),
      type: 'expense',
      account: document.getElementById('expenseAccount').value,
      description: document.getElementById('expenseDescription').value.trim(),
      amount: Number(document.getElementById('expenseAmount').value),
      date: document.getElementById('expenseDate').value,
      category: document.getElementById('expenseCategory').value,
      method: document.getElementById('expenseMethod').value,
      note: document.getElementById('expenseNote').value.trim()
    };
    if (!validateTransaction(tx)) return;
    state.transactions.unshift(tx);
    saveState();
    els.expenseForm.reset();
    document.getElementById('expenseDate').value = today();
    showToast('Gasto guardado correctamente.', 'success');
    renderAll();
    showSection('movimientos');
  });

  els.incomeForm.addEventListener('submit', (e) => {
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
      note: document.getElementById('incomeNote').value.trim()
    };
    if (!validateTransaction(tx)) return;
    state.transactions.unshift(tx);
    saveState();
    els.incomeForm.reset();
    document.getElementById('incomeDate').value = today();
    showToast('Ingreso guardado correctamente.', 'success');
    renderAll();
    showSection('movimientos');
  });

  els.editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx === -1) return;

    const updated = {
      id,
      type: document.getElementById('editType').value,
      account: document.getElementById('editAccount').value,
      description: document.getElementById('editDescription').value.trim(),
      amount: Number(document.getElementById('editAmount').value),
      date: document.getElementById('editDate').value,
      category: document.getElementById('editCategory').value.trim(),
      method: document.getElementById('editMethod').value.trim(),
      note: document.getElementById('editNote').value.trim()
    };

    if (!validateTransaction(updated)) return;
    state.transactions[idx] = updated;
    saveState();
    closeEditModal();
    showToast('Movimiento actualizado.', 'success');
    renderAll();
  });

  els.goalForm.addEventListener('submit', (e) => {
    e.preventDefault();
    state.settings.monthlyGoal = Number(document.getElementById('monthlyGoalInput').value) || 0;
    state.settings.savingsGoal = Number(document.getElementById('savingsGoalInput').value) || 0;
    saveState();
    renderGoals();
    showToast('Metas guardadas correctamente.', 'success');
  });
}

function setupFilters() {
  ['filterAccount','filterType','filterMonth','reportMonth','reportAccount'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderAll);
  });
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
}

function renderDashboard() {
  const totals = summarizeTransactions(state.transactions);
  setText('totalIncomes', money(totals.income));
  setText('totalExpenses', money(totals.expense));
  setText('totalBalance', money(totals.balance));
  setText('totalTransactions', state.transactions.length);
  paintBalance(document.getElementById('totalBalance'), totals.balance);

  const monthTx = state.transactions.filter(t => t.date.startsWith(currentMonth()));
  const monthTotals = summarizeTransactions(monthTx);
  setText('monthIncome', money(monthTotals.income));
  setText('monthExpense', money(monthTotals.expense));
  setText('monthBalance', money(monthTotals.balance));
  paintBalance(document.getElementById('monthBalance'), monthTotals.balance);

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

  renderShares();
  renderInsights(monthTx, totals);
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

  const categories = {};
  monthTx.filter(t => t.type === 'expense').forEach(tx => {
    const key = tx.category || 'Sin categoría';
    categories[key] = (categories[key] || 0) + tx.amount;
  });
  const topCategory = Object.entries(categories).sort((a,b) => b[1] - a[1])[0];
  setText('topCategory', topCategory ? `${topCategory[0]} · ${money(topCategory[1])}` : 'Sin datos');

  const insight = buildInsight(monthTx, totals, topCategory);
  setText('financialInsight', insight);
}

function buildInsight(monthTx, totals, topCategory) {
  if (!state.transactions.length) return 'Empiecen registrando algunos movimientos para ver recomendaciones útiles.';
  const month = summarizeTransactions(monthTx);
  if (month.balance < 0) return 'Este mes van gastando más de lo que ingresa. Conviene revisar compras no urgentes y la categoría dominante.';
  if (topCategory && topCategory[1] > month.expense * 0.4) return `Ojo con ${topCategory[0]}: está absorbiendo gran parte de los gastos del mes.`;
  if (totals.balance > 0 && month.balance > 0) return 'Van por buen camino: el balance general y el del mes están en positivo.';
  return 'Las finanzas están relativamente estables, pero todavía hay margen para organizar mejor el ahorro.';
}

function renderGoals() {
  const month = summarizeTransactions(state.transactions.filter(t => t.date.startsWith(currentMonth())));
  renderGoalRing('goalBalance', month.balance, state.settings.monthlyGoal, '#2563eb', 'Meta mensual');
  renderGoalRing('goalSavings', Math.max(0, summarizeTransactions(state.transactions).balance), state.settings.savingsGoal, '#ec4899', 'Meta ahorro');
}

function renderGoalRing(prefix, actual, goal) {
  const percent = goal > 0 ? Math.min(100, Math.round((Math.max(0, actual) / goal) * 100)) : 0;
  const ring = document.getElementById(`${prefix}Ring`);
  if (ring) ring.style.setProperty('--progress', `${Math.round((percent / 100) * 360)}deg`);
  setText(`${prefix}Percent`, `${percent}%`);
  setText(`${prefix}Label`, goal > 0 ? `${money(Math.max(0, actual))} de ${money(goal)}` : 'Sin meta definida');
}

function renderShares() {
  const totals = ACCOUNTS.map(account => state.transactions
    .filter(t => t.account === account)
    .reduce((sum, t) => sum + t.amount, 0));
  const grand = totals.reduce((a,b) => a+b, 0);
  const perc = totals.map(val => grand ? Math.round((val / grand) * 100) : 0);
  [['alex', perc[0]], ['nuri', perc[1]], ['home', perc[2]]].forEach(([prefix, value]) => {
    setText(`${prefix}Share`, `${value}%`);
    document.getElementById(`${prefix}Bar`).style.width = `${value}%`;
  });
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

function renderTransactionsTable() {
  const rows = getFilteredTransactions()
    .sort((a,b) => b.date.localeCompare(a.date))
    .map(tx => `
      <tr class="border-t border-slate-200 hover:bg-slate-50 transition">
        <td class="px-4 py-3 whitespace-nowrap">${formatDate(tx.date)}</td>
        <td class="px-4 py-3">${tx.type === 'income'
          ? '<span class="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">Ingreso</span>'
          : '<span class="px-3 py-1 rounded-full bg-rose-100 text-rose-700 text-xs font-semibold">Gasto</span>'}</td>
        <td class="px-4 py-3">${tx.account}</td>
        <td class="px-4 py-3">${tx.category || '-'}</td>
        <td class="px-4 py-3">${escapeHtml(tx.description)}</td>
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
  const items = [...state.transactions]
    .sort((a,b) => b.date.localeCompare(a.date))
    .slice(0, 6)
    .map(tx => `
      <div class="soft rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p class="font-semibold">${escapeHtml(tx.description)}</p>
          <p class="text-sm text-slate-500 mt-1">${tx.account} · ${tx.category || 'Sin categoría'} · ${formatDate(tx.date)}</p>
        </div>
        <div class="text-right shrink-0">
          <p class="font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}">${tx.type === 'income' ? '+' : '-'} ${money(tx.amount)}</p>
          <p class="text-xs text-slate-400">${tx.type === 'income' ? 'Ingreso' : 'Gasto'}</p>
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

  const categoryTotals = {};
  filtered.filter(t => t.type === 'expense').forEach(tx => {
    const key = tx.category || 'Sin categoría';
    categoryTotals[key] = (categoryTotals[key] || 0) + tx.amount;
  });
  const totalExpense = summary.expense;
  const categories = Object.entries(categoryTotals)
    .sort((a,b) => b[1] - a[1])
    .map(([category, amount]) => {
      const pct = totalExpense ? Math.round((amount / totalExpense) * 100) : 0;
      return `
        <div class="soft rounded-2xl p-4">
          <div class="flex justify-between items-center mb-2"><span class="font-medium">${escapeHtml(category)}</span><strong>${money(amount)}</strong></div>
          <div class="w-full bg-slate-200 rounded-full h-2"><div class="bg-rose-500 h-2 rounded-full" style="width:${pct}%"></div></div>
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

function backupJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `finanzas-familiares-v2-${currentMonth()}.json`;
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
      const imported = JSON.parse(reader.result);
      state = normalizeState(imported);
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
  if (!state.transactions.length) return showError('No hay datos para exportar.');
  const rows = state.transactions.map(tx => ({
    Fecha: tx.date,
    Tipo: tx.type === 'income' ? 'Ingreso' : 'Gasto',
    Cuenta: tx.account,
    Categoría: tx.category || '',
    Descripción: tx.description,
    Valor: tx.amount,
    Método: tx.method || '',
    Observación: tx.note || ''
  }));
  const summaryRows = ACCOUNTS.map(account => {
    const info = summarizeTransactions(state.transactions.filter(t => t.account === account));
    return { Cuenta: account, Ingresos: info.income, Gastos: info.expense, Balance: info.balance };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Movimientos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), 'Resumen');
  XLSX.utils.writeFile(wb, `finanzas-familiares-v2-${currentMonth()}.xlsx`);
  showToast('Archivo Excel generado.', 'success');
}

function resetAllData() {
  if (!confirm('Se eliminarán todos los movimientos y metas guardados en este navegador. ¿Deseas continuar?')) return;
  state = { transactions: [], settings: { monthlyGoal: 0, savingsGoal: 0 } };
  saveState();
  renderAll();
  showToast('Datos reiniciados.', 'success');
}

function showToast(message, type = 'success') {
  const colors = {
    success: 'bg-emerald-600',
    error: 'bg-rose-600',
    info: 'bg-indigo-600'
  };
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

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
