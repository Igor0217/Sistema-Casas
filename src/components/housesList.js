// src/components/housesList.js
// Renderizado de la tabla de casas, usando dataQueries para cálculos
import { getHousesByType, getConjuntoExpenses, getConjuntoIncomes, getIndependientesExpenses, getIndependientesIncomes } from '../services/dataQueries.js';
import { formatter } from '../utils/formatter.js';

/**
 * Renderiza la lista de casas en la tabla.
 * @param {Array} houses
 * @param {Array} expenses
 * @param {Array} incomes
 * @param {'all'|'conjunto'|'independiente'} filterType
 * @param {HTMLElement} tbody
 * @param {{onHouseClick:function, onDeleteHouse:function}} handlers
 */
export function renderHousesList(
  houses, expenses, incomes, filterTipo, tbody,
  { onHouseClick, onDeleteHouse }
) {
  tbody.innerHTML = '';

  let list = houses;
  if (filterTipo !== 'all') {
    list = houses.filter(h => h.type === filterTipo);
  }

  // 1) Totales del conjunto (una sola vez)
  const totalConjuntoIncomes = getConjuntoIncomes(incomes)
    .reduce((sum, inc) => sum + inc.amount, 0);
  const totalConjuntoExpenses = getConjuntoExpenses(expenses, houses)
    .reduce((sum, exp) => sum + exp.amount, 0);
  const conjuntoBalance = totalConjuntoIncomes - totalConjuntoExpenses;

  // 2) Para cada casa...
  list.forEach(house => {
    // Siempre sus propios gastos
    const totalHouseExpenses = expenses
      .filter(e => e.house === house.name)
      .reduce((sum, e) => sum + e.amount, 0);

    let totalHouseIncomes, houseBalance;

    if (house.type === 'conjunto') {
      // Conjunto: ingreso global y saldo global
      totalHouseIncomes = totalConjuntoIncomes;
      houseBalance       = conjuntoBalance;
    } else {
      // Independiente: ingresos propios y saldo propios
      totalHouseIncomes = incomes
        .filter(i => i.house === house.name)
        .reduce((sum, i) => sum + i.amount, 0);
      houseBalance = totalHouseIncomes - totalHouseExpenses;
    }

    const tipoClass = house.type === 'conjunto'
      ? 'tipo-conjunto'
      : 'tipo-independiente';

    const row = document.createElement('tr');
    row.innerHTML = `
      <td class="p-3" data-house="${house.name}">
        <div class="font-medium">${house.name}</div>
      </td>
      <td class="p-3">
        <span class="px-2 py-1 rounded-full text-xs text-white ${tipoClass}">
          ${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'}
        </span>
      </td>
      <td class="p-3">${formatter.format(totalHouseExpenses)}</td>
      <td class="p-3">${formatter.format(totalHouseIncomes)}</td>
      <td class="p-3">
        <span class="${
          houseBalance > 0
            ? 'text-green-600'
            : houseBalance < 0
              ? 'text-red-600'
              : 'text-yellow-600'
        } font-medium">
          ${formatter.format(houseBalance)}
        </span>
      </td>
      <td class="p-3">
        <button class="delete-house bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                data-house="${house.name}">
          <span class="hidden sm:inline">Eliminar</span>
          <span class="sm:hidden">🗑️</span>
        </button>
      </td>
    `;
    row.className = 'border-b hover:bg-gray-50 cursor-pointer transition-colors duration-200';

    // listener click para fila entera
    row.querySelector('td[data-house]').addEventListener('click', () => {
      onHouseClick(house.name);
    });
    
    // listener delete con confirmación única
    row.querySelector('.delete-house').addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`¿Está seguro de eliminar la casa "${house.name}"? Esto eliminará todos sus gastos e ingresos asociados.`)) {
        onDeleteHouse(house.name);
      }
    });

    tbody.appendChild(row);
  });
}