// src/services/reportService.js
// Lógica para generación de distintos reportes en HTML

import { formatter } from '../utils/formatter.js';
import { getHousesByType } from './dataQueries.js';

/**
 * Genera y retorna el HTML de reporte detallado para una casa.
 * @param {Object} state
 * @param {string} houseName
 * @returns {string} HTML del reporte
 */
export function generateHouseReportHTML(state, houseName) {
  const { houses, expenses, incomes } = state;
  const house = houses.find(h => h.name === houseName);
  if (!house) return '<p class="text-red-600">Casa no encontrada.</p>';

  const houseExpenses = expenses.filter(exp => exp.house === houseName);
  const houseIncomes  = incomes.filter(inc => inc.house === houseName);

  const totalExpenses = houseExpenses.reduce((s,e) => s+e.amount, 0);
  const totalIncomes  = houseIncomes.reduce((s,i) => s+i.amount, 0);
  const balance       = totalIncomes - totalExpenses;

  let html = `
    <div class="fade-in">
      <h3 class="text-xl font-bold mb-4">Reporte Detallado - ${houseName}</h3>
      <div class="bg-${house.type==='conjunto'? 'blue':'pink'}-50 p-4 rounded-lg mb-6">
        <p>Tipo: <strong>${house.type==='conjunto'? 'Conjunto Residencial':'Casa Independiente'}</strong></p>
      </div>
  `;

  // Solo mostrar resumen financiero completo para casas independientes
  if (house.type === 'independiente') {
    html += `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700">Total Ingresos</h4>
          <p class="text-xl font-bold text-green-600">${formatter.format(totalIncomes)}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700">Total Gastos</h4>
          <p class="text-xl font-bold text-red-600">${formatter.format(totalExpenses)}</p>
        </div>
        <div class="bg-${balance >= 0 ? 'blue' : 'orange'}-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-gray-700">Saldo</h4>
          <p class="text-xl font-bold text-${balance >= 0 ? 'blue' : 'orange'}-600">${formatter.format(balance)}</p>
        </div>
      </div>
    `;
  } else {
    // Para conjunto, solo mostrar total de gastos
    html += `
      <div class="bg-red-50 p-4 rounded-lg mb-6">
        <h4 class="text-sm font-medium text-gray-700">Total Gastos</h4>
        <p class="text-xl font-bold text-red-600">${formatter.format(totalExpenses)}</p>
      </div>
    `;
  }

  // Mostrar ingresos solo para casas independientes
  if (house.type === 'independiente' && houseIncomes.length > 0) {
    html += `
      <section class="mb-6">
        <h4 class="text-lg font-semibold mb-15 text-green-700">Ingresos Detallados==pepe***</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-green-100">
                <th class="p-3 border">Fecha</th>
                <th class="p-3 border">Descripción</th>
                <th class="p-3 border text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${houseIncomes.map(i=>`
                <tr class="hover:bg-gray-50">
                  <td class="p-3 border">${i.date}</td>
                  <td class="p-3 border">${i.description}</td>
                  <td class="p-3 border text-right">${formatter.format(i.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-green-50 font-bold">
                <td colspan="2" class="p-3 border text-right">Total Ingresos:</td>
                <td class="p-3 border text-right font-bold" style="color: black !important;">${formatter.format(totalIncomes)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;
  }

  // Gastos para todos los tipos de casa
  if (houseExpenses.length > 0) {
    html += `
      <section>
        <h4 class="text-lg font-semibold mb-15 text-red-700">Gastos Detallados</h4>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-red-100">
                <th class="p-3 border">Fecha</th>
                <th class="p-3 border">Descripción</th>
                <th class="p-3 border text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${houseExpenses.map(e=>`
                <tr class="hover:bg-gray-50">
                  <td class="p-3 border">${e.date}</td>
                  <td class="p-3 border">${e.description}</td>
                  <td class="p-3 border text-right">${formatter.format(e.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-red-50 font-bold">
                <td colspan="2" class="p-3 border text-right">Total Gastos:</td>
                <td class="p-3 border text-right text-black">${formatter.format(totalExpenses)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    `;
  }

  html += '</div>';
  return html;
}

/**
 * Genera reporte de ingresos en rango de fechas con filtro por tipo.
 * @param {Object} state
 * @param {Date} startDate
 * @param {Date} endDate
 * @param {string} reportType - 'all', 'conjunto', 'independientes'
 */
export function generateIncomeReportHTML(state, startDate, endDate, reportType = 'all') {
  const { incomes, houses } = state;
  
  // Filtrar por fechas
  let filtered = incomes.filter(i => {
    const d = new Date(i.date);
    return d >= startDate && d <= endDate;
  });

  // Filtrar por tipo
  if (reportType === 'conjunto') {
    // Ingresos sin casa asignada (van al conjunto)
    filtered = filtered.filter(i => !i.house);
  } else if (reportType === 'independientes') {
    // Obtener nombres de casas independientes
    const indepHouses = houses
      .filter(h => h.type === 'independiente')
      .map(h => h.name);
    filtered = filtered.filter(i => i.house && indepHouses.includes(i.house));
  }

  const total = filtered.reduce((s,i) => s+i.amount, 0);
  
  const typeLabel = {
    'all': 'Todos los Ingresos',
    'conjunto': 'Ingresos del Conjunto Residencial',
    'independientes': 'Ingresos de Casas Independientes'
  }[reportType];

  return `
    <div class="fade-in">
      <h3 class="text-xl font-bold mb-4">Reporte de Ingresos - ${typeLabel}</h3>
      <div class="bg-blue-50 p-4 rounded-lg mb-4">
        <p><strong>Período:</strong> ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}</p>
        <p><strong>Total de ingresos:</strong> ${formatter.format(total)}</p>
      </div>
      
      ${filtered.length === 0 ? 
        '<p class="text-gray-600">No se encontraron ingresos en el período seleccionado.</p>' :
        `
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-green-100">
                <th class="p-3 border">Fecha</th>
                <th class="p-3 border">Descripción</th>
                <th class="p-3 border">Origen</th>
                <th class="p-3 border text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(i=>`
                <tr class="hover:bg-gray-50">
                  <td class="p-3 border">${i.date}</td>
                  <td class="p-3 border">${i.description}</td>
                  <td class="p-3 border">${i.house || 'Conjunto Residencial'}</td>
                  <td class="p-3 border text-right">${formatter.format(i.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr class="bg-green-50 font-bold">
                <td colspan="3" class="p-3 border text-right">Total:</td>
                <td class="p-3 border text-right">${formatter.format(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        `
      }
    </div>
  `;
}

/**
 * Genera reporte avanzado (mantenemos la funcionalidad básica)
 */
export function generateAdvancedReportHTML(reportType, startDate, endDate, state) {
  const { houses, expenses, incomes } = state;
  
  let html = `
    <div class="fade-in">
      <h3 class="text-xl font-bold mb-4">Reporte Consolidado - ${
        reportType === 'general' ? 'General' :
        reportType === 'conjunto' ? 'Conjunto Residencial' :
        reportType === 'independientes' ? 'Casas Independientes' :
        'Detallado por Casa'
      }</h3>
      <div class="bg-gray-50 p-4 rounded-lg mb-4">
        <p><strong>Período:</strong> ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}</p>
      </div>
  `;

  // Filtrar por período
  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
  
  const filteredIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d >= startDate && d <= endDate;
  });

  if (reportType === 'por_casa') {
    // Reporte detallado por cada casa
    html += '<div class="space-y-6">';
    
    houses.forEach(house => {
      const houseExp = filteredExpenses.filter(e => e.house === house.name);
      const houseInc = filteredIncomes.filter(i => i.house === house.name);
      const totalExp = houseExp.reduce((s,e) => s+e.amount, 0);
      const totalInc = houseInc.reduce((s,i) => s+i.amount, 0);
      
      html += `
        <div class="border rounded-lg p-4">
          <h4 class="font-semibold mb-2">${house.name} (${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'})</h4>
          <div class="grid grid-cols-2 gap-4">
            ${house.type === 'independiente' ? `
              <div>
                <span class="text-green-600">Ingresos: ${formatter.format(totalInc)}</span>
              </div>
            ` : ''}
            <div>
              <span class="text-red-600">Gastos: ${formatter.format(totalExp)}</span>
            </div>
            ${house.type === 'independiente' ? `
              <div>
                <span class="font-bold">Saldo: ${formatter.format(totalInc - totalExp)}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  } else {
    // Otros tipos de reporte consolidado
    const conjuntoHouses = houses.filter(h => h.type === 'conjunto').map(h => h.name);
    const indepHouses = houses.filter(h => h.type === 'independiente').map(h => h.name);
    
    let totalInc = 0, totalExp = 0;
    
    if (reportType === 'general' || reportType === 'conjunto') {
      const conjInc = filteredIncomes.filter(i => !i.house).reduce((s,i) => s+i.amount, 0);
      const conjExp = filteredExpenses.filter(e => conjuntoHouses.includes(e.house)).reduce((s,e) => s+e.amount, 0);
      totalInc += conjInc;
      totalExp += conjExp;
    }
    
    if (reportType === 'general' || reportType === 'independientes') {
      const indInc = filteredIncomes.filter(i => i.house && indepHouses.includes(i.house)).reduce((s,i) => s+i.amount, 0);
      const indExp = filteredExpenses.filter(e => indepHouses.includes(e.house)).reduce((s,e) => s+e.amount, 0);
      totalInc += indInc;
      totalExp += indExp;
    }
    
    html += `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-green-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-green-800">Total Ingresos</h4>
          <p class="text-xl font-bold text-green-600">${formatter.format(totalInc)}</p>
        </div>
        <div class="bg-red-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-red-800">Total Gastos</h4>
          <p class="text-xl font-bold text-red-600">${formatter.format(totalExp)}</p>
        </div>
        <div class="bg-blue-50 p-4 rounded-lg">
          <h4 class="text-sm font-medium text-blue-800">Balance</h4>
          <p class="text-xl font-bold text-blue-600">${formatter.format(totalInc - totalExp)}</p>
        </div>
      </div>
    `;
  }

  html += '</div>';
  return html;
}

// Exportamos esta función aunque ya no se use, para no romper imports existentes
export function generateComparativeReportHTML(state, startDate, endDate) {
  return generateAdvancedReportHTML('general', startDate, endDate, state);
}