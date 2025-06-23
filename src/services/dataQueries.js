// src/services/dataQueries.js
// Funciones para consultar y filtrar datos de casas, gastos e ingresos

/**
 * Devuelve un array de casas de un tipo específico.
 * @param {Array<{name:string,type:string}>} houses
 * @param {'conjunto'|'independiente'|'all'} type
 * @returns {Array}
 */
export function getHousesByType(houses, type) {
  if (type === 'all') return houses;
  return houses.filter(h => h.type === type);
}

/**
 * Devuelve los ingresos del conjunto (sin asignar a casa).
 * @param {Array<{house:string|null,amount:number}>} incomes
 * @returns {Array}
 */
export function getConjuntoIncomes(incomes) {
  return incomes.filter(i => !i.house);
}

/**
 * Devuelve los gastos del conjunto (para casas de tipo 'conjunto').
 * @param {Array<{house:string,amount:number}>} expenses
 * @param {Array<{name:string,type:string}>} houses
 * @returns {Array}
 */
export function getConjuntoExpenses(expenses, houses) {
  const conjuntoNames = houses
    .filter(h => h.type === 'conjunto')
    .map(h => h.name);
  return expenses.filter(e => conjuntoNames.includes(e.house));
}

/**
 * Devuelve los ingresos de casas independientes.
 * @param {Array<{house:string,amount:number}>} incomes
 * @param {Array<{name:string,type:string}>} houses
 * @returns {Array}
 */
export function getIndependientesIncomes(incomes, houses) {
  const indepNames = houses
    .filter(h => h.type === 'independiente')
    .map(h => h.name);
  return incomes.filter(i => indepNames.includes(i.house));
}

/**
 * Devuelve los gastos de casas independientes.
 * @param {Array<{house:string,amount:number}>} expenses
 * @param {Array<{name:string,type:string}>} houses
 * @returns {Array}
 */
export function getIndependientesExpenses(expenses, houses) {
  const indepNames = houses
    .filter(h => h.type === 'independiente')
    .map(h => h.name);
  return expenses.filter(e => indepNames.includes(e.house));
}

/**
 * Calcula el balance de una casa independiente.
 * @param {string} houseName
 * @param {Array<{house:string,amount:number}>} incomes
 * @param {Array<{house:string,amount:number}>} expenses
 * @returns {number}
 */
export function getIndependienteBalance(houseName, incomes, expenses) {
  const totalIn = incomes
    .filter(i => i.house === houseName)
    .reduce((sum, i) => sum + i.amount, 0);
  const totalExp = expenses
    .filter(e => e.house === houseName)
    .reduce((sum, e) => sum + e.amount, 0);
  return totalIn - totalExp;
}

