// src/components/dashboard.js
// Módulo para actualizar la interfaz del dashboard: selects, indicadores y listas

import { formatter } from '../utils/formatter.js';
import { formatInput } from '../utils/uiUtils.js';
import {
  getHousesByType,
  getConjuntoIncomes,
  getConjuntoExpenses,
  getIndependientesIncomes,
  getIndependientesExpenses
} from '../services/dataQueries.js';
import { renderHousesList } from '../components/housesList.js';

/**
 * Actualiza todos los componentes de la vista principal.
 * @param {{houses:Array, expenses:Array, incomes:Array}} state
 */
export function updateAllViews({ houses, expenses, incomes }) {
  updateHouseSelects(houses);
  updateDashboard(houses, expenses, incomes);
  updateConjuntoSummary(expenses, incomes, houses);
  updateIndependientesSummary(houses, expenses, incomes);
}

/**
 * Actualiza los selectores de casas en varios <select>.
 * @param {Array<{name:string,type:string}>} houses
 */
export function updateHouseSelects(houses) {
  const selectors = [
    'expenseHouse',
    'editHouse',
    'reportHouse',
    'filterHouses',
    'incomeHouse'
  ];

  selectors.forEach(selectorId => {
    const select = document.getElementById(selectorId);
    if (!select) return;

    const prevValue = select.value;
    if (selectorId === 'filterHouses') {
      select.innerHTML = '<option value="all">Todas las casas</option>';
    } else if (selectorId === 'incomeHouse') {
      select.innerHTML = '<option value="">Conjunto Residencial</option>';
    } else {
      select.innerHTML = '<option value="">Seleccione una casa</option>';
    }

    houses.forEach(house => {
      const { name, type } = house;
      if (selectorId === 'incomeHouse' && type !== 'independiente') return;
      const option = document.createElement('option');
      option.value = name;
      option.textContent = `${name} (${type === 'conjunto' ? 'Conjunto' : 'Independiente'})`;
      select.appendChild(option);
    });

    select.value = prevValue;
  });

  // Actualizar asignaciones compartidas tras poblar selects
  updateSharedHouseAssignments(houses);
}

/**
 * Actualiza los indicadores del dashboard (totales, balance).
 */
export function updateDashboard(houses, expenses, incomes) {
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalIncomes  = incomes.reduce((sum, i) => sum + i.amount, 0);
  const balance       = totalIncomes - totalExpenses;

  const elHouses   = document.getElementById('totalHouses');
  const elIncomes  = document.getElementById('totalIncomes');
  const elExpenses = document.getElementById('totalExpenses');
  const elBalance  = document.getElementById('totalBalance');

  if (elHouses)   elHouses.textContent   = houses.length;
  if (elIncomes)  elIncomes.textContent  = formatter.format(totalIncomes);
  if (elExpenses) elExpenses.textContent = formatter.format(totalExpenses);
  if (elBalance) {
    elBalance.textContent = formatter.format(balance);
    elBalance.className = `text-xl lg:text-2xl font-bold ${
      balance > 0 ? 'balance-positive' : balance < 0 ? 'balance-negative' : 'balance-zero'
    }`;
  }
}

/**
 * Actualiza la lista de gastos genérica e inyecta los botones de editar/eliminar.
 *
 * @param {Array<{date:string,description:string,house:string,amount:number}>} expenses
 * @param {HTMLElement} tbody
 * @param {{onEdit: (idx:number)=>void, onDelete: (idx:number)=>void}} handlers
 */
export function updateExpensesList(expenses, tbody, handlers = {}) {
  const { onEdit, onDelete } = handlers;
  if (!tbody) return;

  // Limpiamos cualquier fila anterior
  tbody.innerHTML = '';

  // Reconstruimos cada fila
  expenses.forEach((exp, idx) => {
    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';

    row.innerHTML = `
      <td class="p-3">${exp.date}</td>
      <td class="p-3">${exp.description}</td>
      <td class="p-3">${exp.house || '-'}</td>
      <td class="p-3">${formatter.format(exp.amount)}</td>
      <td class="p-3">
        <div class="flex space-x-2">
          <button
            class="edit-expense bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors duration-200"
            data-index="${idx}"
          >
            <span class="hidden sm:inline">Editar</span>
            <span class="sm:hidden">✏️</span>
          </button>
          <button
            class="delete-expense bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200"
            data-index="${idx}"
          >
            <span class="hidden sm:inline">Eliminar</span>
            <span class="sm:hidden">🗑️</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });

  // Ahora que están en el DOM, enganchamos los handlers
  if (typeof onEdit === 'function') {
    tbody.querySelectorAll('.edit-expense').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        onEdit(idx);
      });
    });
  }
  if (typeof onDelete === 'function') {
    tbody.querySelectorAll('.delete-expense').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        onDelete(idx);
      });
    });
  }
}

/**
 * Actualiza la lista de ingresos genérica.
 */
export function updateIncomesList(incomes, tbody, { onEdit, onDelete } = {}) {
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  incomes.forEach((inc, idx) => {
    const row = document.createElement('tr');
    row.className = 'border-b hover:bg-gray-50';
    
    row.innerHTML = `
      <td class="p-3">${inc.date}</td>
      <td class="p-3">${inc.description}</td>
      <td class="p-3">${inc.house || 'Conjunto'}</td>
      <td class="p-3">${formatter.format(inc.amount)}</td>
      <td class="p-3">
        <div class="flex space-x-2">
          <button
            class="edit-income bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors duration-200"
            data-index="${idx}"
          >
            <span class="hidden sm:inline">Editar</span>
            <span class="sm:hidden">✏️</span>
          </button>
          <button
            class="delete-income bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200"
            data-index="${idx}"
          >
            <span class="hidden sm:inline">Eliminar</span>
            <span class="sm:hidden">🗑️</span>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Enganchar handlers
  if (typeof onEdit === 'function') {
    tbody.querySelectorAll('.edit-income').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        onEdit(idx);
      });
    });
  }
  if (typeof onDelete === 'function') {
    tbody.querySelectorAll('.delete-income').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.dataset.index, 10);
        onDelete(idx);
      });
    });
  }
}

/**
 * Actualiza el resumen del conjunto: totales de ingresos, gastos y balance.
 */
export function updateConjuntoSummary(expenses, incomes, houses) {
  const totalIncomes = getConjuntoIncomes(incomes)
    .reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = getConjuntoExpenses(expenses, houses)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalIncomes - totalExpenses;

  const elInc = document.getElementById('conjuntoIncomes');
  const elExp = document.getElementById('conjuntoExpenses');
  const elBal = document.getElementById('conjuntoBalance');
  if (elInc) elInc.textContent = formatter.format(totalIncomes);
  if (elExp) elExp.textContent = formatter.format(totalExpenses);
  if (elBal) elBal.textContent = formatter.format(balance);
}

/**
 * Actualiza el resumen de casas independientes: cantidad, totales y balance.
 */
export function updateIndependientesSummary(houses, expenses, incomes) {
  const indepHouses = houses.filter(h => h.type === 'independiente');
  const totalIncomes = getIndependientesIncomes(incomes, houses)
    .reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = getIndependientesExpenses(expenses, houses)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const balance = totalIncomes - totalExpenses;

  const elCount = document.getElementById('independientesCount');
  const elInc   = document.getElementById('independientesIncomes');
  const elExp   = document.getElementById('independientesExpenses');
  const elBal   = document.getElementById('independientesBalance');
  if (elCount) elCount.textContent = indepHouses.length;
  if (elInc)   elInc.textContent   = formatter.format(totalIncomes);
  if (elExp)   elExp.textContent   = formatter.format(totalExpenses);
  if (elBal)   elBal.textContent   = formatter.format(balance);
}

/**
 * Muestra u oculta y llena el contenedor de gastos compartidos por casa.
 */
export function updateSharedHouseAssignments(houses) {
  const sharedExpense = document.getElementById('sharedExpense');
  const sharedHouseAssignments = document.getElementById('sharedHouseAssignments');
  const sharedHousesList = document.getElementById('sharedHousesList');

  if (!sharedExpense || !sharedHouseAssignments || !sharedHousesList) return;

  if (sharedExpense.checked) {
    sharedHouseAssignments.classList.remove('hidden');
    sharedHousesList.innerHTML = '';
    const conjunto = getHousesByType(houses, 'conjunto');
    conjunto.forEach(house => {
      const div = document.createElement('div');
      div.className = 'flex items-center space-x-2 p-3 bg-white rounded-lg border';
      div.innerHTML = `
        <span class="flex-1 font-medium">${house.name}</span>
        <input type="text" class="w-24 p-2 border rounded" data-house="${house.name}" data-value="0" oninput="formatInput(this)" placeholder="Valor">
      `;
      sharedHousesList.appendChild(div);
    });
  } else {
    sharedHouseAssignments.classList.add('hidden');
  }
}