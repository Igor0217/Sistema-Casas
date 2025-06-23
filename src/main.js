// src/main.js
// Punto de entrada y orquestación de la app

// ── Imports al tope ─────────────────────────────────────
import { db } from './config/firebase.js';
import { setupRealtimeSync } from './services/syncService.js';
import {
  loadDataFromFirestore as loadFromDB,
  saveDataToFirestore   as saveToDB
} from './services/dataService.js';
import { loadFromLocalStorage, migrateOldData } from './services/localDataService.js';
import { renderHousesList } from './components/housesList.js';
import { showNotification } from './utils/uiUtils.js';
import { formatInput } from './utils/uiUtils.js';
window.formatInput = formatInput;
import {
  getHousesByType,
  getConjuntoIncomes,
  getConjuntoExpenses,
  getIndependientesIncomes,
  getIndependientesExpenses,
  getIndependienteBalance
} from './services/dataQueries.js';
import { updateAllViews } from './components/dashboard.js';
import {
  initSectionNavigation,
  initNewHouseModal,
  initDeleteHouseListener,
  initSharedExpenseToggle,
  initRegisterExpense,
  initRegisterIncome,
  initTransactionListeners,
  initFilterHouseListener,
  initHouseDetailsListener
} from './controllers/uiController.js';
import {
  showHouseDetails,
  setupHouseTabs,
  showHouseExpenses,
  showHouseIncomes
} from './components/houseDetails.js';
import { updateSharedHouseAssignments } from './components/dashboard.js';
import {
  generateHouseReportHTML,
  generateIncomeReportHTML,
  generateComparativeReportHTML,
  generateAdvancedReportHTML
} from './services/reportService.js';

import {
  initHouseReportListener,
  initIncomeReportListener,
  initComparativeReportListener,
  initAdvancedReportListener
} from './controllers/uiController.js';

import {
  exportReportToPDF,
  exportHouseDetailToPDF,
  exportAllHousesToExcel,
  exportHouseDetailToExcel,
  exportConsolidatedReportToExcel
} from './services/exportService.js';

import { updateExpensesList, updateIncomesList } from './components/dashboard.js';


// ── Estado global ──────────────────────────────────────
let houses   = [];
let expenses = [];
let incomes  = [];

// Variables para edición
let editingIndex = -1;
let editingType = '';

// ── Helpers ────────────────────────────────────────────
const saveLocal = () => {
  localStorage.setItem('houses',   JSON.stringify(houses));
  localStorage.setItem('expenses', JSON.stringify(expenses));
  localStorage.setItem('incomes',  JSON.stringify(incomes));
};

const notify = (msg, type) => showNotification(msg, type);

// ── Punto de entrada ───────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  console.log('📦 DOMContentLoaded disparado');

  // UI elements
  const tbody      = document.getElementById('housesList');
  const filterTipo = document.getElementById('filterTipoCasa');
  const expensesTbody = document.getElementById('expensesList');
  const incomesTbody  = document.getElementById('incomesList');

  // Función para refrescar las listas de gastos e ingresos
  function refreshLists() {
    if (expensesTbody) {
      updateExpensesList(expenses, expensesTbody, {
        onEdit:   handleEditExpense,
        onDelete: handleDeleteExpense
      });
    }
    if (incomesTbody) {
      updateIncomesList(incomes, incomesTbody, {
        onEdit:   handleEditIncome,
        onDelete: handleDeleteIncome
      });
    }
  }

  // Función que refresca la tabla según estado y filtro
  function refreshTable() {
    renderHousesList(
      houses,
      expenses,
      incomes,
      filterTipo.value,
      tbody,
      {
        onHouseClick: showHouseDetails,
        onDeleteHouse: deleteHouseByName
      }
    );
  }

  // Función para eliminar casa por nombre
  function deleteHouseByName(houseName) {
    // NO confirmamos aquí porque ya se confirmó en housesList.js
    
    // 1) Eliminar la casa
    houses = houses.filter(h => h.name !== houseName);
    
    // 2) Eliminar todos los gastos de esa casa
    const deletedExpenses = expenses.filter(e => e.house === houseName).length;
    expenses = expenses.filter(e => e.house !== houseName);
    
    // 3) Eliminar todos los ingresos de esa casa
    const deletedIncomes = incomes.filter(i => i.house === houseName).length;
    incomes = incomes.filter(i => i.house !== houseName);

    // 4) Guardar cambios
    saveLocal();
    saveToDB(houses, expenses, incomes, saveLocal, notify);

    // 5) Resetear el filtro de gastos a "todas las casas"
    const filterHouses = document.getElementById('filterHouses');
    if (filterHouses) {
      filterHouses.value = 'all';
    }

    // 6) Actualizar TODAS las vistas
    // Primero actualizamos el dashboard y los selectores
    updateAllViews({ houses, expenses, incomes });
    
    // Luego actualizamos las listas de transacciones
    refreshLists();
    
    // Finalmente actualizamos la tabla de casas
    refreshTable();

    // 7) Notificar al usuario con detalles
    const details = [];
    if (deletedExpenses > 0) details.push(`${deletedExpenses} gastos`);
    if (deletedIncomes > 0) details.push(`${deletedIncomes} ingresos`);
    
    const message = details.length > 0 
      ? `Casa "${houseName}" eliminada junto con ${details.join(' y ')}.`
      : `Casa "${houseName}" eliminada.`;
      
    showNotification(message, 'success');
  }

  // 1) Registro de filtro
  filterTipo.addEventListener('change', refreshTable);

  // 2) Botón de sincronizar manual
  const syncBtn = document.getElementById('syncGoogleDrive');
  if (syncBtn) {
    syncBtn.addEventListener('click', () => {
      console.log('🖱️ Click en syncGoogleDrive detectado');
      saveToDB(houses, expenses, incomes, saveLocal, notify);
    });
  }

  // 3) Carga inicial
  console.log('➡️ Antes de loadFromDB');
  const data = await loadFromDB();
  console.log('⬅️ loadFromDB returned:', data);

  if (data) {
    const mutated = migrateOldData(data);
    houses   = mutated.houses;
    expenses = mutated.expenses;
    incomes  = mutated.incomes;
  } else {
    console.log('📦 No hay datos en Firestore, cargo de local');
    const localData = loadFromLocalStorage();
    houses   = localData.houses;
    expenses = localData.expenses;
    incomes  = localData.incomes;
  }

  function handleNewHouse(name, type) {
    if (!name) {
      showNotification('Por favor, ingrese un nombre válido.', 'error');
      return;
    }
    if (houses.some(h => h.name === name)) {
      showNotification('Esta casa ya existe.', 'error');
      return;
    }

    houses.push({ name, type });
    saveLocal();
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    refreshTable();
    updateAllViews({ houses, expenses, incomes });

    showNotification(`Casa "${name}" creada como ${type === 'conjunto' ? 'Conjunto' : 'Independiente'}.`, 'success');
  }

  // 4) Realtime sync con callback
  setupRealtimeSync((data) => {
    const mutated = migrateOldData(data);
    const newHouses   = mutated.houses;
    const newExpenses = mutated.expenses;
    const newIncomes  = mutated.incomes;

    const hasChanges =
      JSON.stringify(houses)   !== JSON.stringify(newHouses)   ||
      JSON.stringify(expenses) !== JSON.stringify(newExpenses) ||
      JSON.stringify(incomes)  !== JSON.stringify(newIncomes);

    if (!hasChanges) return;

    console.log('🔄 Actualizando datos desde Firestore…');
    houses   = newHouses;
    expenses = newExpenses;
    incomes  = newIncomes;

    saveLocal();
    refreshTable();
    refreshLists();
    notify('📱 Datos actualizados automáticamente', 'info');
  });

  // 5) Render inicial
  refreshTable();

  // ACTUALIZAR DASHBOARD y listas iniciales
  updateAllViews({ houses, expenses, incomes });
  refreshLists();

  function handleRegisterExpense({ description, date, shared, amount}) {
    if (!description) {
      showNotification('Por favor, ingrese una descripción.', 'error');
      return;
    }
    if (!date) {
      showNotification('Por favor, seleccione una fecha.', 'error');
      return;
    }
    if (shared) {
      const inputs = document.querySelectorAll('#sharedHousesList input');
      let total = 0;
      inputs.forEach(input => {
        const amount = parseInt(input.dataset.value) || 0;
        total += amount;
        if (amount > 0) {
          expenses.push({ description, amount, date, house: input.dataset.house });
        }
      });
      if (total === 0) {
        showNotification('Por favor, ingrese al menos un valor para alguna casa.', 'error');
        return;
      }
    } else {
      const amount = parseInt(document.getElementById('expenseAmount').dataset.value) || 0;
      const house  = document.getElementById('expenseHouse').value;
      if (amount <= 0) {
        showNotification('Por favor, ingrese un valor válido mayor a 0.', 'error');
        return;
      }
      if (!house) {
        showNotification('Por favor, seleccione una casa.', 'error');
        return;
      }
      expenses.push({ description, amount, date, house });
    }
    
    saveLocal();
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    refreshTable();
    refreshLists();
    updateAllViews({ houses, expenses, incomes });
    showNotification('Gasto registrado correctamente.', 'success');

    // Limpiar formulario
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseAmount').dataset.value = '0';
    document.getElementById('expenseDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('expenseHouse').value = '';
    document.getElementById('sharedExpense').checked = false;
    updateSharedHouseAssignments(houses);
  }

  // Manejo de registro de ingresos
  function handleRegisterIncome({ description, date, house }) {
    if (!description) {
      showNotification('Por favor, ingrese una descripción.', 'error');
      return;
    }
    if (!date) {
      showNotification('Por favor, seleccione una fecha.', 'error');
      return;
    }

    const parsedAmount = parseInt(document.getElementById('incomeAmount').dataset.value, 10) || 0;
    if (parsedAmount <= 0) {
      showNotification('Por favor, ingrese un valor válido mayor a 0.', 'error');
      return;
    }

    incomes.push({ description, amount: parsedAmount, date, house });

    saveLocal();
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    refreshLists();
    updateAllViews({ houses, expenses, incomes });
    showNotification('Ingreso registrado correctamente.', 'success');

    // Limpiar formulario
    document.getElementById('incomeDescription').value = '';
    const incAmtEl = document.getElementById('incomeAmount');
    incAmtEl.value = '';
    incAmtEl.dataset.value = '0';
    document.getElementById('incomeDate').value = new Date().toISOString().slice(0,10);
    document.getElementById('incomeHouse').value = '';
  }

  // Handlers para editar y eliminar (definidos antes de refreshLists)
  function handleEditExpense(idx)  { 
    if (typeof editTransaction === 'function') {
      editTransaction(idx, 'expense'); 
    }
  }
  
  function handleDeleteExpense(idx) {
    if (!confirm('¿Eliminar este gasto?')) return;
    expenses.splice(idx, 1);
    saveLocal(); 
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    updateAllViews({ houses, expenses, incomes });
    refreshLists();
    refreshTable();
    showNotification('Gasto eliminado.', 'success');
  }

  function handleEditIncome(idx) { 
    if (typeof editTransaction === 'function') {
      editTransaction(idx, 'income'); 
    }
  }
  
  function handleDeleteIncome(idx) {
    if (!confirm('¿Eliminar este ingreso?')) return;
    incomes.splice(idx, 1);
    saveLocal(); 
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    updateAllViews({ houses, expenses, incomes });
    refreshLists();
    refreshTable();
    showNotification('Ingreso eliminado.', 'success');
  }

  // Función para editar transacciones
  function editTransaction(index, type) {
    const data = type === 'expense' ? expenses[index] : incomes[index];
    editingIndex = index;
    editingType = type;
    
    // Llenar el modal con los datos actuales
    document.getElementById('editDescription').value = data.description;
    document.getElementById('editAmount').value = formatter.format(data.amount);
    document.getElementById('editAmount').dataset.value = data.amount.toString();
    document.getElementById('editDate').value = data.date;
    
    // Actualizar el selector de casas
    const editHouseSelect = document.getElementById('editHouse');
    editHouseSelect.innerHTML = '<option value="">Seleccione una casa</option>';
    houses.forEach(house => {
      const option = document.createElement('option');
      option.value = house.name;
      option.textContent = `${house.name} (${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'})`;
      editHouseSelect.appendChild(option);
    });
    editHouseSelect.value = data.house || '';
    
    // Mostrar/ocultar selector de casa según el tipo
    const editHouseSection = document.getElementById('editHouseSection');
    editHouseSection.style.display = type === 'expense' ? 'block' : 'none';
    
    // Actualizar título del modal
    document.getElementById('editModalTitle').textContent = 
      type === 'expense' ? 'Editar Gasto' : 'Editar Ingreso';
    
    // Mostrar el modal
    document.getElementById('editModal').classList.remove('hidden');
  }

  // Handlers para el modal de edición
  const cancelEditBtn = document.getElementById('cancelEdit');
  const saveEditBtn = document.getElementById('saveEdit');
  
  cancelEditBtn.addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
    editingIndex = -1;
    editingType = '';
  });
  
  saveEditBtn.addEventListener('click', () => {
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseInt(document.getElementById('editAmount').dataset.value) || 0;
    const date = document.getElementById('editDate').value;
    const house = document.getElementById('editHouse').value;
    
    if (!description || amount <= 0 || !date) {
      showNotification('Por favor, complete todos los campos correctamente.', 'error');
      return;
    }
    
    if (editingType === 'expense') {
      if (!house) {
        showNotification('Por favor, seleccione una casa.', 'error');
        return;
      }
      expenses[editingIndex] = { description, amount, date, house };
    } else {
      incomes[editingIndex] = { description, amount, date, house: house || null };
    }
    
    saveLocal();
    saveToDB(houses, expenses, incomes, saveLocal, notify);
    refreshLists();
    refreshTable();
    updateAllViews({ houses, expenses, incomes });
    
    document.getElementById('editModal').classList.add('hidden');
    editingIndex = -1;
    editingType = '';
    
    showNotification(
      editingType === 'expense' ? 'Gasto actualizado.' : 'Ingreso actualizado.',
      'success'
    );
  });

  // Inicializa listeners
  initTransactionListeners(
    handleEditExpense,
    handleDeleteExpense,
    handleEditIncome,
    handleDeleteIncome
  );

  // Inicialización de otros componentes
  initSectionNavigation();
  initNewHouseModal(handleNewHouse);
  initDeleteHouseListener(deleteHouseByName);
  initSharedExpenseToggle(updateSharedHouseAssignments);
  initRegisterExpense(handleRegisterExpense);
  initRegisterIncome(handleRegisterIncome);
  
  initFilterHouseListener(() => {
    const sel = document.getElementById('filterHouses').value;
    const filtered = sel === 'all'
      ? expenses
      : expenses.filter(e => e.house === sel);
    updateExpensesList(filtered, document.getElementById('expensesList'), {
      onEdit:   handleEditExpense,
      onDelete: handleDeleteExpense
    });
  });
  
  initHouseDetailsListener(name => showHouseDetails(name, houses, expenses, incomes));
  initSharedExpenseToggle(() => updateSharedHouseAssignments(houses));

  // Variables para reportes
  let currentReportType = '';
  let currentReportDates = { start: null, end: null };

  // Listeners de reportes
  initHouseReportListener(houseName => {
    if (!houseName) {
      showNotification('Por favor, seleccione una casa.', 'error');
      return;
    }
    currentReportType = 'house';
    document.getElementById('reportContent').innerHTML =
      generateHouseReportHTML({ houses, expenses, incomes }, houseName);
    showExportButtons(false); // Solo PDF para reporte por casa
  });
  
  initIncomeReportListener((start, end, reportType) => {
    currentReportType = 'income';
    currentReportDates = { start, end };
    document.getElementById('reportContent').innerHTML =
      generateIncomeReportHTML({ incomes, houses }, new Date(start), new Date(end), reportType);
    showExportButtons(false); // Solo PDF para reporte de ingresos
  });
  
  initAdvancedReportListener((type, start, end) => {
    currentReportType = 'advanced';
    currentReportDates = { start, end, type };
    document.getElementById('reportContent').innerHTML =
      generateAdvancedReportHTML(type, new Date(start), new Date(end), { houses, expenses, incomes });
    showExportButtons(true); // PDF y Excel para reporte avanzado
  });

  // Función para mostrar/ocultar botones de exportación
  function showExportButtons(showExcel) {
    const exportDiv = document.getElementById('exportButtons');
    const excelBtn = document.getElementById('exportConsolidatedExcel');
    
    if (document.getElementById('reportContent').innerHTML.trim()) {
      exportDiv.classList.remove('hidden');
      if (showExcel) {
        excelBtn.classList.remove('hidden');
      } else {
        excelBtn.classList.add('hidden');
      }
    } else {
      exportDiv.classList.add('hidden');
    }
  }

  // BACKUP / IMPORT
  const btnBackup  = document.getElementById('backupBtn');
  const btnImport  = document.getElementById('importBtn');
  const fileInput  = document.getElementById('importBackup');
  const btnExportExcel = document.getElementById('exportExcelBtn');

  if (btnBackup) {
    btnBackup.addEventListener('click', () => {
      const data = { houses, expenses, incomes };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `backup-casas-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  if (btnImport && fileInput) {
    btnImport.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const imported = JSON.parse(evt.target.result);
          if (!imported.houses || !imported.expenses || !imported.incomes) {
            throw new Error('Formato inválido');
          }
          houses   = imported.houses;
          expenses = imported.expenses;
          incomes  = imported.incomes;
          
          saveLocal();
          saveToDB(houses, expenses, incomes, saveLocal, notify);
          refreshTable();
          refreshLists();
          updateAllViews({ houses, expenses, incomes });
          showNotification('✅ Datos importados correctamente', 'success');
        } catch {
          showNotification('❌ Error al importar: formato inválido', 'error');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
  }

  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', () => {
      exportAllHousesToExcel({ houses, expenses, incomes });
    });
  }

  // Exportación de detalles
  const exportDetailPdfBtn = document.getElementById('exportDetailPdf');
  if (exportDetailPdfBtn) {
    exportDetailPdfBtn.addEventListener('click', () => {
      const detailEl = document.getElementById('houseExpensesDetail');
      if (!detailEl || detailEl.classList.contains('hidden')) {
        showNotification('Por favor, selecciona primero una casa para ver el detalle.', 'error');
        return;
      }
      const titleText = document.getElementById('houseExpensesTitle').textContent;
      const houseName = titleText.match(/Detallado de Transacciones - (.+?) \(/)?.[1];
      if (!houseName) {
        showNotification('No pude determinar la casa seleccionada.', 'error');
        return;
      }
      exportHouseDetailToPDF({ houses, expenses, incomes }, houseName);
    });
  }

  const exportDetailExcelBtn = document.getElementById('exportDetailExcel');
  if (exportDetailExcelBtn) {
    exportDetailExcelBtn.addEventListener('click', () => {
      const titleText = document.getElementById('houseExpensesTitle').textContent;
      const houseName = titleText.match(/- (.+?) \(/)?.[1];
      if (!houseName) {
        showNotification('Primero selecciona una casa.', 'error');
        return;
      }
      exportHouseDetailToExcel({ houses, expenses, incomes }, houseName);
    });
  }

  const exportAllExcelBtn = document.getElementById('exportAllHousesExcel');
  if (exportAllExcelBtn) {
    exportAllExcelBtn.addEventListener('click', () => {
      exportAllHousesToExcel({ houses, expenses, incomes });
    });
  }

  const exportPdfBtn = document.getElementById('exportPdf');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', () => {
      const reportContent = document.getElementById('reportContent');
      if (!reportContent || !reportContent.innerHTML.trim()) {
        showNotification('No hay reporte para exportar.', 'error');
        return;
      }
      exportReportToPDF('reportContent');
    });
  }
  
  const exportConsolidatedExcelBtn = document.getElementById('exportConsolidatedExcel');
  if (exportConsolidatedExcelBtn) {
    exportConsolidatedExcelBtn.addEventListener('click', () => {
      if (currentReportType === 'advanced' && currentReportDates.type) {
        exportConsolidatedReportToExcel(
          { houses, expenses, incomes },
          currentReportDates.type,
          new Date(currentReportDates.start),
          new Date(currentReportDates.end)
        );
      } else {
        showNotification('Error al exportar el reporte.', 'error');
      }
    });
  }
});

// Integración de jsPDF y XLSX
const { jsPDF } = window.jspdf;
const { utils, write, WorkBook } = XLSX;

// Exportar formateador
export const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});

// Formatear entrada monetaria
window.formatInput = function(input) {
  let value = input.value.replace(/[^0-9]/g, '');
  input.dataset.value = value;
  input.value = value ? formatter.format(parseInt(value)) : '';
};