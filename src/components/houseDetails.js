// src/components/houseDetails.js
// Módulo para mostrar detalles de una casa y sus pestañas

import { formatter } from '../utils/formatter.js';

/**
 * Muestra la sección detallada de transacciones de una casa
 * @param {string} houseName
 * @param {Array<{name:string,type:string}>} houses
 * @param {Array<{house:string,amount:number,description:string,date:string}>} expenses
 * @param {Array<{house:string,amount:number,description:string,date:string}>} incomes
 */
export function showHouseDetails(houseName, houses, expenses, incomes) {
  const house = houses.find(h => h.name === houseName);
  if (!house) return;

  // Actualizar título
  const titleEl = document.getElementById('houseExpensesTitle');
  titleEl.textContent = 
    `Detallado de Transacciones - ${house.name} ` +
    `(${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'})`;

  // Mostrar contenedor y hacer scroll
  const detailEl = document.getElementById('houseExpensesDetail');
  detailEl.classList.remove('hidden');
  detailEl.scrollIntoView({ behavior: 'smooth' });

  // Mostrar gastos por defecto
  showHouseExpenses(houseName, expenses);

  // Mostrar pestaña de ingresos solo si es independiente
  const tabIngresos = document.getElementById('tabIngresos');
  if (house.type === 'independiente') {
    tabIngresos.classList.remove('hidden');
    setupHouseTabs(houseName, expenses, incomes);
  } else {
    tabIngresos.classList.add('hidden');
  }
}

/**
 * Configura los listeners de las pestañas Gastos/Ingresos
 * @param {string} houseName
 * @param {Array} expenses
 * @param {Array} incomes
 */
export function setupHouseTabs(houseName, expenses, incomes) {
  const tabGastos    = document.getElementById('tabGastos');
  const tabIngresos  = document.getElementById('tabIngresos');
  const contentGastos   = document.getElementById('contentGastos');
  const contentIngresos = document.getElementById('contentIngresos');

  tabGastos.onclick = () => {
    tabGastos.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg text-sm lg:text-base';
    tabIngresos.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm lg:text-base';
    contentGastos.classList.remove('hidden');
    contentIngresos.classList.add('hidden');
    showHouseExpenses(houseName, expenses);
  };

  tabIngresos.onclick = () => {
    tabIngresos.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg text-sm lg:text-base';
    tabGastos.className   = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm lg:text-base';
    contentIngresos.classList.remove('hidden');
    contentGastos.classList.add('hidden');
    showHouseIncomes(houseName, incomes);
  };
}

/**
 * Rellena la tabla de gastos de la casa
 * @param {string} houseName
 * @param {Array} expenses
 */
export function showHouseExpenses(houseName, expenses) {
  const listEl  = document.getElementById('houseExpensesList');
  const totalEl = document.getElementById('houseExpensesTotal');
  const houseExpenses = expenses.filter(exp => exp.house === houseName);

  listEl.innerHTML = houseExpenses.map(exp => `
    <tr class="border-b">
      <td class="p-3">${exp.date}</td>
      <td class="p-3">${exp.description}</td>
      <td class="p-3">${formatter.format(exp.amount)}</td>
    </tr>
  `).join('');

  const total = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  if (totalEl) totalEl.textContent = `Total Gastos: ${formatter.format(total)}`;
}

/**
 * Rellena la tabla de ingresos de la casa
 * @param {string} houseName
 * @param {Array} incomes
 */
export function showHouseIncomes(houseName, incomes) {
  const listEl  = document.getElementById('houseIncomesList');
  const totalEl = document.getElementById('houseIncomesTotal');
  const houseIncs = incomes.filter(inc => inc.house === houseName);

  listEl.innerHTML = houseIncs.map(inc => `
    <tr class="border-b">
      <td class="p-3">${inc.date}</td>
      <td class="p-3">${inc.description}</td>
      <td class="p-3">${formatter.format(inc.amount)}</td>
    </tr>
  `).join('');

  const total = houseIncs.reduce((sum, inc) => sum + inc.amount, 0);
  if (totalEl) totalEl.textContent = `Total Ingresos: ${formatter.format(total)}`;
}

