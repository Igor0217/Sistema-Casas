// src/services/localDataService.js
// Servicio para gestión de datos en almacenamiento local

/**
 * Carga del Storage local.
 * @returns {{houses:Array, expenses:Array, incomes:Array}}
 */
export function loadFromLocalStorage() {
  const houses   = JSON.parse(localStorage.getItem('houses'))   || [];
  const expenses = JSON.parse(localStorage.getItem('expenses')) || [];
  const incomes  = JSON.parse(localStorage.getItem('incomes'))  || [];
  return { houses, expenses, incomes };
}

/**
 * Migra datos antiguos: convierte strings a objetos de casa y asegura campo `house` en ingresos.
 * @param {{houses:Array, expenses:Array, incomes:Array}} data
 * @returns {{houses:Array, expenses:Array, incomes:Array}}
 */
export function migrateOldData(data) {
  // Transformar casas de string a objeto con tipo 'conjunto'
  const newHouses = data.houses.map(h =>
    typeof h === 'string' ? { name: h, type: 'conjunto' } : h
  );

  // Asegurar que cada ingreso tenga la propiedad `house` (null = conjunto)
  const newIncomes = data.incomes.map(i =>
    i.hasOwnProperty('house') ? i : { ...i, house: null }
  );

  return {
    houses:   newHouses,
    expenses: data.expenses,
    incomes:  newIncomes
  };
}
