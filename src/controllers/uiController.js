// src/controllers/uiController.js
// Inicializa los event listeners de navegación, modales y formularios

/**
 * Registra la navegación entre secciones del <main> mediante buttons con data-section.
 */
export function initSectionNavigation() {
  document.querySelectorAll('[data-section]').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.dataset.section;
      document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
      document.getElementById(section).classList.remove('hidden');

      document.querySelectorAll('[data-section]').forEach(b => {
        b.className = b.className.replace('bg-blue-600', 'bg-blue-500');
      });
      button.className = button.className.replace('bg-blue-500', 'bg-blue-600');
      document.getElementById(section).classList.add('fade-in');
    });
  });
}

/**
 * Configura el modal para crear una nueva casa.
 * @param {(name:string, type:string) => void} onSave
 */
export function initNewHouseModal(onSave) {
  const btnNew = document.getElementById('newHouseBtn');
  const modal  = document.getElementById('newHouseModal');
  const inputName = document.getElementById('newHouseName');
  const inputType = document.getElementById('newHouseType');
  const btnCancel = document.getElementById('cancelNewHouse');
  const btnSave = document.getElementById('saveNewHouse');

  btnNew.addEventListener('click', () => {
    modal.classList.remove('hidden'); inputName.focus();
  });
  btnCancel.addEventListener('click', () => {
    modal.classList.add('hidden'); inputName.value=''; inputType.value='conjunto';
  });
  btnSave.addEventListener('click', () => {
    const name = inputName.value.trim();
    const type = inputType.value;
    onSave(name, type);
    modal.classList.add('hidden'); inputName.value=''; inputType.value='conjunto';
  });
}

/**
 * Registra el listener de eliminar casas desde la tabla.
 * @param {(houseName:string) => void} onDeleteHouse
 */
export function initDeleteHouseListener(onDeleteHouse) {
  const table = document.getElementById('housesList');
  table.addEventListener('click', e => {
    if (e.target.classList.contains('delete-house')) {
      const name = e.target.dataset.house;
      if (confirm(`¿Eliminar casa ${name}? Esto borrará gastos e ingresos.`)) {
        onDeleteHouse(name);
      }
    }
  });
}

/**
 * Configura el checkbox de gastos compartidos.
 * @param {() => void} onToggle
 */
export function initSharedExpenseToggle(onToggle) {
  document.getElementById('sharedExpense')
    .addEventListener('change', onToggle);
}

/**
 * Registra el formulario de registro de gasto.
 * @param {(data:{description:string, amount:number, date:string, shared:boolean}) => void} onRegister
 */
export function initRegisterExpense(onRegister) {
  document.getElementById('registerExpense')
    .addEventListener('click', () => {
      const desc   = document.getElementById('expenseDescription').value.trim();
      const date   = document.getElementById('expenseDate').value;
      const shared = document.getElementById('sharedExpense').checked;
      // Tomamos el valor “crudo” del monto que guardaste en data-value
      const amount = parseInt(document.getElementById('expenseAmount').dataset.value, 10) || 0;
      onRegister({ description: desc, date, amount, shared });
    });
}

/**
 * Registra el formulario de registro de ingreso.
 * @param {(data:{description:string, amount:number, date:string, house:string|null}) => void} onRegister
 */
export function initRegisterIncome(onRegister) {
  document.getElementById('registerIncome')
    .addEventListener('click', () => {
      const desc  = document.getElementById('incomeDescription').value.trim();
      const date  = document.getElementById('incomeDate').value;
      const house = document.getElementById('incomeHouse').value || null;
      const amount = parseInt(document.getElementById('incomeAmount').dataset.value, 10) || 0;
      onRegister({ description: desc, date, amount, house });
    });
}

/**
 * Registra listeners para editar y eliminar en tablas de gastos e ingresos.
 * @param {(idx:number) => void} onEditExpense
 * @param {(idx:number) => void} onDeleteExpense
 * @param {(idx:number) => void} onEditIncome
 * @param {(idx:number) => void} onDeleteIncome
 */
export function initTransactionListeners(onEditExpense, onDeleteExpense, onEditIncome, onDeleteIncome) {
  const expTable = document.getElementById('expensesList');
  const incTable = document.getElementById('incomesList');

  if (expTable) {
    expTable.addEventListener('click', e => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (e.target.classList.contains('edit-expense')) {
        onEditExpense(idx);
      }
      if (e.target.classList.contains('delete-expense') && confirm('¿Eliminar gasto?')) {
        onDeleteExpense(idx);
      }
    });
  }

  if (incTable) {
    incTable.addEventListener('click', e => {
      const idx = parseInt(e.target.dataset.index, 10);
      if (e.target.classList.contains('edit-income')) {
        onEditIncome(idx);
      }
      if (e.target.classList.contains('delete-income') && confirm('¿Eliminar ingreso?')) {
        onDeleteIncome(idx);
      }
    });
  }
}

/**
 * Registra el listener para el filtro de tipo de casa en gastos.
 * @param {() => void} onFilter
 */
export function initFilterHouseListener(onFilter) {
  const filterSelect = document.getElementById('filterTipoCasa');
  if (!filterSelect) return;
  filterSelect.addEventListener('change', onFilter);
}

/**
 * Registra el listener para navegación de filas de casas (mostrar detalles).
 * @param {(houseName:string) => void} onHouseClick
 */
export function initHouseDetailsListener(onHouseClick) {
  const tbody = document.getElementById('housesList');
  if (!tbody) return;
  tbody.addEventListener('click', e => {
    const cell = e.target.closest('td[data-house]');
    if (cell) {
      const name = cell.dataset.house;
      onHouseClick(name);
    }
  });

  
}
/**
 * Registra el listener para generar reporte por casa.
 * @param {(houseName: string) => void} onGenerate
 */
export function initHouseReportListener(onGenerate) {
  const btn = document.getElementById('generateHouseReport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const houseName = document.getElementById('reportHouse').value;
    onGenerate(houseName);
  });
}

/**
 * Registra el listener para generar reporte de ingresos.
 * @param {(startDate: string, endDate: string, reportType: string) => void} onGenerate
 */
export function initIncomeReportListener(onGenerate) {
  const btn = document.getElementById('generateIncomeReport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const start = document.getElementById('incomeStartDate').value;
    const end   = document.getElementById('incomeEndDate').value;
    const reportType = document.getElementById('incomeReportType').value || 'all';
    onGenerate(start, end, reportType);
  });
}

/**
 * Registra el listener para generar reporte comparativo.
 * @param {(startDate: string, endDate: string) => void} onGenerate
 */
export function initComparativeReportListener(onGenerate) {
  const btn = document.getElementById('generateComparativeReport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const start = document.getElementById('comparativeStartDate').value;
    const end   = document.getElementById('comparativeEndDate').value;
    onGenerate(start, end);
  });
}

/**
 * Registra el listener para generar reporte avanzado.
 * @param {(reportType: string, startDate: string, endDate: string) => void} onGenerate
 */
export function initAdvancedReportListener(onGenerate) {
  const btn = document.getElementById('generateAdvancedReport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const reportType = document.getElementById('consolidatedType').value;
    const start      = document.getElementById('consolidatedAdvancedStartDate').value;
    const end        = document.getElementById('consolidatedAdvancedEndDate').value;
    onGenerate(reportType, start, end);
  });
}
