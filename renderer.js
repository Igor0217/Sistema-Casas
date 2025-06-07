// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCH1771AFZyfSD_PvNxR9AQoZ30dg_DcOg",
  authDomain: "fortalezasas-25e42.firebaseapp.com",
  projectId: "fortalezasas-25e42",
  storageBucket: "fortalezasas-25e42.firebasestorage.app",
  messagingSenderId: "383032445971",
  appId: "1:383032445971:web:490f92170d2f36be70c3e6"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
  loadDataFromFirestore();
  const { jsPDF } = window.jspdf;
  const { utils, write, WorkBook } = XLSX;

  // Formateador para pesos colombianos
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  // Datos iniciales mejorados
  let houses = []; // Ahora incluye { name: string, type: 'conjunto'|'independiente' }
  let expenses = []; // Incluye { house: string, amount: number, description: string, date: string }
  let incomes = []; // Incluye { house: string, amount: number, description: string, date: string } (house puede ser null para conjunto)

  // Variables para edición
  let editingIndex = -1;
  let editingType = '';

  // ==================== FUNCIONES DE DATOS ====================

  // Guardar datos en Firestore
  async function saveDataToFirestore() {
    console.log('Guardando datos en Firestore...');
    const data = { houses, expenses, incomes };
    try {
      await db.collection('userData').doc('appData').set(data);
      console.log('Datos guardados en Firestore');
      showNotification('Datos sincronizados con Firestore.', 'success');
    } catch (error) {
      console.error('Error guardando en Firestore:', error);
      showNotification('Error al sincronizar datos con Firestore. Guardando localmente.', 'error');
      saveData();
    }
  }

  // Cargar datos desde Firestore
  async function loadDataFromFirestore() {
    console.log('Cargando datos desde Firestore...');
    try {
      const doc = await db.collection('userData').doc('appData').get();
      if (doc.exists) {
        const data = doc.data();
        houses = data.houses || [];
        expenses = data.expenses || [];
        incomes = data.incomes || [];
        
        // Migrar datos antiguos si es necesario
        migrateOldData();
        
        console.log('Datos cargados desde Firestore');
      } else {
        console.log('No se encontraron datos en Firestore. Usando almacenamiento local.');
        loadFromLocalStorage();
      }
    } catch (error) {
      console.error('Error cargando desde Firestore:', error);
      loadFromLocalStorage();
    }
    
    updateAllViews();
  }
  
  // Listener en tiempo real para cambios en la base de datos*****************************
function setupRealtimeSync() {
  console.log('Configurando sincronización en tiempo real...');
  
  db.collection('userData').doc('appData').onSnapshot((doc) => {
    console.log('Cambio detectado en Firestore');
    
    if (doc.exists) {
      const data = doc.data();
      const newHouses = data.houses || [];
      const newExpenses = data.expenses || [];
      const newIncomes = data.incomes || [];
      
      // Verificar si hay cambios reales
      const hasChanges = 
        JSON.stringify(houses) !== JSON.stringify(newHouses) ||
        JSON.stringify(expenses) !== JSON.stringify(newExpenses) ||
        JSON.stringify(incomes) !== JSON.stringify(newIncomes);
      
      if (hasChanges) {
        console.log('Actualizando datos desde Firestore...');
        
        houses = newHouses;
        expenses = newExpenses;
        incomes = newIncomes;
        
        // Migrar datos si es necesario
        migrateOldData();
        
        // Actualizar localStorage como backup
        localStorage.setItem('houses', JSON.stringify(houses));
        localStorage.setItem('expenses', JSON.stringify(expenses));
        localStorage.setItem('incomes', JSON.stringify(incomes));
        
        // Actualizar todas las vistas
        updateAllViews();
        
        // Mostrar notificación
        showNotification('📱 Datos actualizados automáticamente', 'info');
      }
    }
  }, (error) => {
    console.error('Error en sincronización en tiempo real:', error);
  });
}
//**********************************************************

  // Cargar desde localStorage
  function loadFromLocalStorage() {
    houses = JSON.parse(localStorage.getItem('houses')) || [];
    expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    incomes = JSON.parse(localStorage.getItem('incomes')) || [];
    migrateOldData();
  }

  // Migrar datos antiguos al nuevo formato
  function migrateOldData() {
    // Convertir casas de string a objeto si es necesario
    houses = houses.map(house => {
      if (typeof house === 'string') {
        return { name: house, type: 'conjunto' };
      }
      return house;
    });

    // Asegurar que ingresos tengan el campo house
    incomes = incomes.map(income => {
      if (!income.hasOwnProperty('house')) {
        income.house = null; // null significa conjunto
      }
      return income;
    });
  }

  // Guardar datos localmente
  function saveData() {
    console.log('Guardando datos localmente y en Firestore...');
    localStorage.setItem('houses', JSON.stringify(houses));
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('incomes', JSON.stringify(incomes));
    saveDataToFirestore();
  }

  // ==================== FUNCIONES AUXILIARES ====================

  // Formatear entrada monetaria
  window.formatInput = function(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    input.dataset.value = value;
    input.value = value ? formatter.format(parseInt(value)) : '';
  };

  // Mostrar notificaciones
  function showNotification(message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transform transition-transform duration-300 translate-x-full`;
    
    // Colores según tipo
    const colors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      warning: 'bg-yellow-500',
      info: 'bg-blue-500'
    };
    
    notification.classList.add(colors[type] || colors.info);
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.classList.remove('translate-x-full');
    }, 100);
    
    // Animar salida y remover
    setTimeout(() => {
      notification.classList.add('translate-x-full');
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  // Obtener casas por tipo
  function getHousesByType(type) {
    return houses.filter(house => house.type === type);
  }

  // Obtener ingresos del conjunto
  function getConjuntoIncomes() {
    return incomes.filter(income => income.house === null || income.house === '');
  }

  // Obtener gastos del conjunto
  function getConjuntoExpenses() {
    const conjuntoHouses = getHousesByType('conjunto').map(h => h.name);
    return expenses.filter(expense => conjuntoHouses.includes(expense.house));
  }

  // Obtener ingresos de casas independientes
  function getIndependientesIncomes() {
    const independientesHouses = getHousesByType('independiente').map(h => h.name);
    return incomes.filter(income => independientesHouses.includes(income.house));
  }

  // Obtener gastos de casas independientes
  function getIndependientesExpenses() {
    const independientesHouses = getHousesByType('independiente').map(h => h.name);
    return expenses.filter(expense => independientesHouses.includes(expense.house));
  }

  // Obtener saldo de una casa independiente
  function getIndependienteBalance(houseName) {
    const houseIncomes = incomes.filter(income => income.house === houseName);
    const houseExpenses = expenses.filter(expense => expense.house === houseName);
    const totalIncomes = houseIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = houseExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return totalIncomes - totalExpenses;
  }

  // ==================== ACTUALIZACIÓN DE VISTAS ====================

  // Actualizar todas las vistas
  function updateAllViews() {
    updateHouseSelects();
    updateDashboard();
    updateExpensesList();
    updateIncomesList();
  }

  // Actualizar selectores de casas
  function updateHouseSelects() {
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
      
      const currentValue = select.value;
      
      // Limpiar opciones
      if (selectorId === 'filterHouses') {
        select.innerHTML = '<option value="all">Todas las casas</option>';
      } else if (selectorId === 'incomeHouse') {
        select.innerHTML = '<option value="">Conjunto Residencial</option>';
      } else {
        select.innerHTML = '<option value="">Seleccione una casa</option>';
      }
      
      // Agregar casas
      houses.forEach(house => {
        const option = document.createElement('option');
        option.value = house.name;
        option.textContent = `${house.name} (${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'})`;
        
        // Para ingresos, solo mostrar casas independientes
        if (selectorId === 'incomeHouse' && house.type !== 'independiente') {
          return;
        }
        
        select.appendChild(option);
      });
      
      select.value = currentValue;
    });
    
    updateSharedHouseAssignments();
  }

  // Actualizar dashboard
  function updateDashboard() {
    // Totales generales
    const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomesAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalBalance = totalIncomesAmount - totalExpensesAmount;

    document.getElementById('totalHouses').textContent = houses.length;
    document.getElementById('totalIncomes').textContent = formatter.format(totalIncomesAmount);
    document.getElementById('totalExpenses').textContent = formatter.format(totalExpensesAmount);
    
    const balanceElement = document.getElementById('totalBalance');
    balanceElement.textContent = formatter.format(totalBalance);
    balanceElement.className = `text-xl lg:text-2xl font-bold ${totalBalance > 0 ? 'balance-positive' : totalBalance < 0 ? 'balance-negative' : 'balance-zero'}`;

    // Datos del conjunto
    const conjuntoIncomes = getConjuntoIncomes();
    const conjuntoExpenses = getConjuntoExpenses();
    const conjuntoIncomesAmount = conjuntoIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const conjuntoExpensesAmount = conjuntoExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const conjuntoBalance = conjuntoIncomesAmount - conjuntoExpensesAmount;

    document.getElementById('conjuntoIncomes').textContent = formatter.format(conjuntoIncomesAmount);
    document.getElementById('conjuntoExpenses').textContent = formatter.format(conjuntoExpensesAmount);
    document.getElementById('conjuntoBalance').textContent = formatter.format(conjuntoBalance);

    // Datos de independientes
    const independientesHouses = getHousesByType('independiente');
    const independientesIncomes = getIndependientesIncomes();
    const independientesExpenses = getIndependientesExpenses();
    const independientesIncomesAmount = independientesIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const independientesExpensesAmount = independientesExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const independientesBalance = independientesIncomesAmount - independientesExpensesAmount;

    document.getElementById('independientesCount').textContent = independientesHouses.length;
    document.getElementById('independientesIncomes').textContent = formatter.format(independientesIncomesAmount);
    document.getElementById('independientesExpenses').textContent = formatter.format(independientesExpensesAmount);
    document.getElementById('independientesBalance').textContent = formatter.format(independientesBalance);

    // Actualizar lista de casas
    updateHousesList();
  }

  // Actualizar lista de casas
  function updateHousesList() {
    const housesList = document.getElementById('housesList');
    const filterTipo = document.getElementById('filterTipoCasa').value;
    
    housesList.innerHTML = '';
    
    let filteredHouses = houses;
    if (filterTipo !== 'all') {
      filteredHouses = houses.filter(house => house.type === filterTipo);
    }
    
    filteredHouses.forEach(house => {
      const houseExpenses = expenses.filter(exp => exp.house === house.name);
      const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      let houseIncomes = [];
      let totalHouseIncomes = 0;
      let houseBalance = 0;
      
      if (house.type === 'independiente') {
        houseIncomes = incomes.filter(inc => inc.house === house.name);
        totalHouseIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
        houseBalance = totalHouseIncomes - totalHouseExpenses;
      } else {
        // Para casas del conjunto, el balance es el saldo conjunto
        const conjuntoIncomes = getConjuntoIncomes();
        const conjuntoExpenses = getConjuntoExpenses();
        const conjuntoIncomesAmount = conjuntoIncomes.reduce((sum, inc) => sum + inc.amount, 0);
        const conjuntoExpensesAmount = conjuntoExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        houseBalance = conjuntoIncomesAmount - conjuntoExpensesAmount;
        totalHouseIncomes = 'Fondo común';
      }
      
      const row = document.createElement('tr');
      row.className = 'border-b hover:bg-gray-50 cursor-pointer transition-colors duration-200';
      
      const tipoClass = house.type === 'conjunto' ? 'tipo-conjunto' : 'tipo-independiente';
      const tipoText = house.type === 'conjunto' ? 'Conjunto' : 'Independiente';
      
      row.innerHTML = `
        <td class="p-3 cursor-pointer" data-house="${house.name}">
          <div class="font-medium">${house.name}</div>
        </td>
        <td class="p-3">
          <span class="px-2 py-1 rounded-full text-xs text-white ${tipoClass}">
            ${tipoText}
          </span>
        </td>
        <td class="p-3">${formatter.format(totalHouseExpenses)}</td>
        <td class="p-3 hidden sm:table-cell">
          ${house.type === 'independiente' ? formatter.format(totalHouseIncomes) : 'Fondo común'}
        </td>
        <td class="p-3 hidden sm:table-cell">
          <span class="${houseBalance > 0 ? 'text-green-600' : houseBalance < 0 ? 'text-red-600' : 'text-yellow-600'} font-medium">
            ${house.type === 'independiente' ? formatter.format(houseBalance) : 'Ver conjunto'}
          </span>
        </td>
        <td class="p-3">
          <div class="flex space-x-2">
            <button class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200 delete-house" data-house="${house.name}">
              <span class="hidden sm:inline">Eliminar</span>
              <span class="sm:hidden">🗑️</span>
            </button>
          </div>
        </td>
      `;
      
      housesList.appendChild(row);
    });

    // Agregar event listeners para ver detalles
    housesList.querySelectorAll('td[data-house]').forEach(td => {
      td.addEventListener('click', () => {
        const houseName = td.dataset.house;
        showHouseDetails(houseName);
      });
    });
  }

  // Mostrar detalles de una casa
  function showHouseDetails(houseName) {
    const house = houses.find(h => h.name === houseName);
    if (!house) return;

    const houseExpenses = expenses.filter(exp => exp.house === houseName);
    const houseExpensesDetail = document.getElementById('houseExpensesDetail');
    const houseExpensesTitle = document.getElementById('houseExpensesTitle');
    
    houseExpensesTitle.textContent = `Detallado de Transacciones - ${house.name} (${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'})`;
    
    // Mostrar gastos por defecto
    showHouseExpenses(houseName);
    
    // Configurar ingresos si es casa independiente
    if (house.type === 'independiente') {
      document.getElementById('tabIngresos').classList.remove('hidden');
      setupHouseTabs(houseName);
    } else {
      document.getElementById('tabIngresos').classList.add('hidden');
    }
    
    houseExpensesDetail.classList.remove('hidden');
    houseExpensesDetail.scrollIntoView({ behavior: 'smooth' });
  }

  // Configurar pestañas para casa independiente
  function setupHouseTabs(houseName) {
    const tabGastos = document.getElementById('tabGastos');
    const tabIngresos = document.getElementById('tabIngresos');
    const contentGastos = document.getElementById('contentGastos');
    const contentIngresos = document.getElementById('contentIngresos');
    
    // Event listeners para pestañas
    tabGastos.onclick = () => {
      tabGastos.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg text-sm lg:text-base';
      tabIngresos.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm lg:text-base';
      contentGastos.classList.remove('hidden');
      contentIngresos.classList.add('hidden');
      showHouseExpenses(houseName);
    };
    
    tabIngresos.onclick = () => {
      tabIngresos.className = 'px-4 py-2 bg-blue-500 text-white rounded-lg text-sm lg:text-base';
      tabGastos.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm lg:text-base';
      contentIngresos.classList.remove('hidden');
      contentGastos.classList.add('hidden');
      showHouseIncomes(houseName);
    };
  }

  // Mostrar gastos de una casa
  function showHouseExpenses(houseName) {
    const houseExpenses = expenses.filter(exp => exp.house === houseName);
    const houseExpensesList = document.getElementById('houseExpensesList');
    const houseExpensesTotal = document.getElementById('houseExpensesTotal');
    
    houseExpensesList.innerHTML = houseExpenses.map(exp => `
      <tr class="border-b">
        <td class="p-3">${exp.date}</td>
        <td class="p-3">${exp.description}</td>
        <td class="p-3">${formatter.format(exp.amount)}</td>
      </tr>
    `).join('');
    
    const totalExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    houseExpensesTotal.textContent = `Total Gastos: ${formatter.format(totalExpenses)}`;
  }

  // Mostrar ingresos de una casa
  function showHouseIncomes(houseName) {
    const houseIncomes = incomes.filter(inc => inc.house === houseName);
    const houseIncomesList = document.getElementById('houseIncomesList');
    const houseIncomesTotal = document.getElementById('houseIncomesTotal');
    
    houseIncomesList.innerHTML = houseIncomes.map(inc => `
      <tr class="border-b">
        <td class="p-3">${inc.date}</td>
        <td class="p-3">${inc.description}</td>
        <td class="p-3">${formatter.format(inc.amount)}</td>
      </tr>
    `).join('');
    
    const totalIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    houseIncomesTotal.textContent = `Total Ingresos: ${formatter.format(totalIncomes)}`;
  }

  // ==================== MANEJO DE GASTOS COMPARTIDOS ====================

  function updateSharedHouseAssignments() {
    const sharedExpense = document.getElementById('sharedExpense');
    const sharedHouseAssignments = document.getElementById('sharedHouseAssignments');
    const sharedHousesList = document.getElementById('sharedHousesList');

    if (sharedExpense.checked) {
      sharedHouseAssignments.classList.remove('hidden');
      sharedHousesList.innerHTML = '';
      
      // Solo mostrar casas del conjunto para gastos compartidos
      const conjuntoHouses = getHousesByType('conjunto');
      
      conjuntoHouses.forEach(house => {
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

  // ==================== EVENT LISTENERS ====================

  // Navegación entre secciones
  document.querySelectorAll('[data-section]').forEach(button => {
    button.addEventListener('click', () => {
      const section = button.dataset.section;
      
      // Ocultar todas las secciones
      document.querySelectorAll('main > section').forEach(s => s.classList.add('hidden'));
      
      // Mostrar sección seleccionada
      document.getElementById(section).classList.remove('hidden');
      
      // Actualizar estado de botones
      document.querySelectorAll('[data-section]').forEach(b => {
        b.className = b.className.replace('bg-blue-600', 'bg-blue-500');
      });
      button.className = button.className.replace('bg-blue-500', 'bg-blue-600');
      
      // Agregar animación
      document.getElementById(section).classList.add('fade-in');
    });
  });

  // Modal de nueva casa
  document.getElementById('newHouseBtn').addEventListener('click', () => {
    document.getElementById('newHouseModal').classList.remove('hidden');
    document.getElementById('newHouseName').focus();
  });

  document.getElementById('cancelNewHouse').addEventListener('click', () => {
    document.getElementById('newHouseModal').classList.add('hidden');
    document.getElementById('newHouseName').value = '';
    document.getElementById('newHouseType').value = 'conjunto';
  });

  document.getElementById('saveNewHouse').addEventListener('click', () => {
    const houseName = document.getElementById('newHouseName').value.trim();
    const houseType = document.getElementById('newHouseType').value;
    
    if (!houseName) {
      showNotification('Por favor, ingrese un nombre válido.', 'error');
      return;
    }
    
    if (houses.some(house => house.name === houseName)) {
      showNotification('Esta casa ya existe.', 'error');
      return;
    }
    
    houses.push({ name: houseName, type: houseType });
    saveData();
    updateAllViews();
    
    document.getElementById('newHouseModal').classList.add('hidden');
    document.getElementById('newHouseName').value = '';
    document.getElementById('newHouseType').value = 'conjunto';
    
    showNotification(`Casa "${houseName}" creada como ${houseType === 'conjunto' ? 'Conjunto' : 'Independiente'}.`, 'success');
  });

  // Eliminar casa
  document.getElementById('housesList').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-house')) {
      const houseName = e.target.dataset.house;
      
      if (confirm(`¿Está seguro de eliminar la casa ${houseName}? Esto eliminará todos sus gastos e ingresos.`)) {
        houses = houses.filter(h => h.name !== houseName);
        expenses = expenses.filter(exp => exp.house !== houseName);
        incomes = incomes.filter(inc => inc.house !== houseName);
        saveData();
        updateAllViews();
        
        // Ocultar detalles si se está mostrando esta casa
        const detailTitle = document.getElementById('houseExpensesTitle').textContent;
        if (detailTitle.includes(houseName)) {
          document.getElementById('houseExpensesDetail').classList.add('hidden');
        }
        
        showNotification(`Casa "${houseName}" eliminada.`, 'success');
      }
    }
  });

  // Filtro de tipo de casa
  document.getElementById('filterTipoCasa').addEventListener('change', updateHousesList);

  // Gasto compartido checkbox
  document.getElementById('sharedExpense').addEventListener('change', updateSharedHouseAssignments);

  // Registrar gasto
  document.getElementById('registerExpense').addEventListener('click', () => {
    const description = document.getElementById('expenseDescription').value.trim();
    const date = document.getElementById('expenseDate').value;
    const shared = document.getElementById('sharedExpense').checked;

    if (!description) {
      showNotification('Por favor, ingrese una descripción.', 'error');
      return;
    }
    if (!date) {
      showNotification('Por favor, seleccione una fecha.', 'error');
      return;
    }

    // Verificar saldo para casas del conjunto
    const conjuntoIncomes = getConjuntoIncomes();
    const conjuntoExpenses = getConjuntoExpenses();
    const conjuntoIncomesAmount = conjuntoIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const conjuntoExpensesAmount = conjuntoExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const conjuntoBalance = conjuntoIncomesAmount - conjuntoExpensesAmount;

    if (shared) {
      const sharedHousesList = document.getElementById('sharedHousesList');
      const houseInputs = sharedHousesList.getElementsByTagName('input');
      let totalAmount = 0;
      
      for (let input of houseInputs) {
        const amount = parseInt(input.dataset.value) || 0;
        totalAmount += amount;
        if (amount > 0) {
          expenses.push({ description, amount, date, house: input.dataset.house });
        }
      }
      
      if (totalAmount === 0) {
        showNotification('Por favor, ingrese al menos un valor para alguna casa.', 'error');
        return;
      }
      
      if (conjuntoBalance < totalAmount) {
        showNotification('Advertencia: El saldo del conjunto es insuficiente. El gasto se registrará, pero revise la situación financiera.', 'warning');
      }
    } else {
      const house = document.getElementById('expenseHouse').value;
      const amount = parseInt(document.getElementById('expenseAmount').dataset.value) || 0;
      
      if (amount <= 0) {
        showNotification('Por favor, ingrese un valor válido mayor a 0.', 'error');
        return;
      }
      if (!house) {
        showNotification('Por favor, seleccione una casa.', 'error');
        return;
      }

      const selectedHouse = houses.find(h => h.name === house);
      
      // Verificar saldo según tipo de casa
      if (selectedHouse.type === 'conjunto') {
        if (conjuntoBalance < amount) {
          showNotification('Advertencia: El saldo del conjunto es insuficiente. El gasto se registrará, pero revise la situación financiera.', 'warning');
        }
      } else {
        const houseBalance = getIndependienteBalance(house);
        if (houseBalance < amount) {
          showNotification('Advertencia: El saldo de esta casa independiente es insuficiente. El gasto se registrará, pero revise la situación financiera.', 'warning');
        }
      }
      
      expenses.push({ description, amount, date, house });
    }

    saveData();
    updateAllViews();
    
    // Limpiar formulario
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseAmount').dataset.value = '0';
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('sharedExpense').checked = false;
    updateSharedHouseAssignments();
    
    showNotification('Gasto registrado correctamente.', 'success');
  });

  // Registrar ingreso
  document.getElementById('registerIncome').addEventListener('click', () => {
    const description = document.getElementById('incomeDescription').value.trim();
    const amount = parseInt(document.getElementById('incomeAmount').dataset.value) || 0;
    const date = document.getElementById('incomeDate').value;
    const house = document.getElementById('incomeHouse').value || null; // null para conjunto

    if (!description) {
      showNotification('Por favor, ingrese una descripción.', 'error');
      return;
    }
    if (amount <= 0) {
      showNotification('Por favor, ingrese un valor válido mayor a 0.', 'error');
      return;
    }
    if (!date) {
      showNotification('Por favor, seleccione una fecha.', 'error');
      return;
    }

    incomes.push({ description, amount, date, house });
    saveData();
    updateAllViews();
    
    // Limpiar formulario
    document.getElementById('incomeDescription').value = '';
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeAmount').dataset.value = '0';
    document.getElementById('incomeDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('incomeHouse').value = '';
    
    const target = house ? `casa independiente "${house}"` : 'fondo conjunto';
    showNotification(`Ingreso registrado correctamente para ${target}.`, 'success');
  });

  // Actualizar lista de gastos
  function updateExpensesList() {
    const expensesList = document.getElementById('expensesList');
    const filterHouse = document.getElementById('filterHouses').value;
    
    expensesList.innerHTML = '';
    
    let filteredExpenses = expenses;
    if (filterHouse !== 'all') {
      filteredExpenses = expenses.filter(exp => exp.house === filterHouse);
    }
    
    filteredExpenses.forEach((exp, index) => {
      const house = houses.find(h => h.name === exp.house);
      const houseType = house ? (house.type === 'conjunto' ? 'Conjunto' : 'Independiente') : 'N/A';
      
      const row = document.createElement('tr');
      row.className = 'border-b hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3">${exp.date}</td>
        <td class="p-3">${exp.description}</td>
        <td class="p-3">
          <div>
            <div class="font-medium">${exp.house || 'Compartido'}</div>
            <div class="text-xs text-gray-500">${houseType}</div>
          </div>
        </td>
        <td class="p-3">${formatter.format(exp.amount)}</td>
        <td class="p-3">
          <div class="flex space-x-2">
            <button class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors duration-200 edit-expense" data-index="${index}">
              <span class="hidden sm:inline">Editar</span>
              <span class="sm:hidden">✏️</span>
            </button>
            <button class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200 delete-expense" data-index="${index}">
              <span class="hidden sm:inline">Eliminar</span>
              <span class="sm:hidden">🗑️</span>
            </button>
          </div>
        </td>
      `;
      expensesList.appendChild(row);
    });
  }

  // Actualizar lista de ingresos
  function updateIncomesList() {
    const incomesList = document.getElementById('incomesList');
    incomesList.innerHTML = '';
    
    incomes.forEach((inc, index) => {
      const source = inc.house || 'Conjunto Residencial';
      const house = inc.house ? houses.find(h => h.name === inc.house) : null;
      const sourceType = inc.house ? (house && house.type === 'independiente' ? 'Independiente' : 'Conjunto') : 'Conjunto';
      
      const row = document.createElement('tr');
      row.className = 'border-b hover:bg-gray-50';
      row.innerHTML = `
        <td class="p-3">${inc.date}</td>
        <td class="p-3">${inc.description}</td>
        <td class="p-3">
          <div>
            <div class="font-medium">${source}</div>
            <div class="text-xs text-gray-500">${sourceType}</div>
          </div>
        </td>
        <td class="p-3">${formatter.format(inc.amount)}</td>
        <td class="p-3">
          <div class="flex space-x-2">
            <button class="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 transition-colors duration-200 edit-income" data-index="${index}">
              <span class="hidden sm:inline">Editar</span>
              <span class="sm:hidden">✏️</span>
            </button>
            <button class="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 transition-colors duration-200 delete-income" data-index="${index}">
              <span class="hidden sm:inline">Eliminar</span>
              <span class="sm:hidden">🗑️</span>
            </button>
          </div>
        </td>
      `;
      incomesList.appendChild(row);
    });
  }

  // Event listeners para editar y eliminar gastos
  document.getElementById('expensesList').addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);
    
    if (e.target.classList.contains('edit-expense')) {
      editTransaction(index, 'expense');
    } else if (e.target.classList.contains('delete-expense')) {
      if (confirm('¿Está seguro de eliminar este gasto?')) {
        expenses.splice(index, 1);
        saveData();
        updateAllViews();
        showNotification('Gasto eliminado.', 'success');
      }
    }
  });

  // Event listeners para editar y eliminar ingresos
  document.getElementById('incomesList').addEventListener('click', (e) => {
    const index = parseInt(e.target.dataset.index);
    
    if (e.target.classList.contains('edit-income')) {
      editTransaction(index, 'income');
    } else if (e.target.classList.contains('delete-income')) {
      if (confirm('¿Está seguro de eliminar este ingreso?')) {
        incomes.splice(index, 1);
        saveData();
        updateAllViews();
        showNotification('Ingreso eliminado.', 'success');
      }
    }
  });

  // Función para editar transacciones
  function editTransaction(index, type) {
    const data = type === 'expense' ? expenses[index] : incomes[index];
    
    editingIndex = index;
    editingType = type;
    
    document.getElementById('editModalTitle').textContent = `Editar ${type === 'expense' ? 'Gasto' : 'Ingreso'}`;
    document.getElementById('editDescription').value = data.description;
    document.getElementById('editAmount').value = formatter.format(data.amount);
    document.getElementById('editAmount').dataset.value = data.amount.toString();
    document.getElementById('editDate').value = data.date;
    document.getElementById('editHouse').value = data.house || '';
    
    document.getElementById('editModal').classList.remove('hidden');
  }

  // Cancelar edición
  document.getElementById('cancelEdit').addEventListener('click', () => {
    document.getElementById('editModal').classList.add('hidden');
    editingIndex = -1;
    editingType = '';
  });

  // Guardar edición
  document.getElementById('saveEdit').addEventListener('click', () => {
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseInt(document.getElementById('editAmount').dataset.value) || 0;
    const date = document.getElementById('editDate').value;
    const house = document.getElementById('editHouse').value || null;

    if (!description || amount <= 0 || !date) {
      showNotification('Por favor, complete todos los campos correctamente.', 'error');
      return;
    }

    const data = { description, amount, date, house };
    
    if (editingType === 'expense') {
      expenses[editingIndex] = data;
    } else {
      incomes[editingIndex] = data;
    }
    
    saveData();
    updateAllViews();
    
    document.getElementById('editModal').classList.add('hidden');
    editingIndex = -1;
    editingType = '';
    
    showNotification(`${editingType === 'expense' ? 'Gasto' : 'Ingreso'} actualizado correctamente.`, 'success');
  });

  // Filtrar gastos por casa
  document.getElementById('filterHouses').addEventListener('change', updateExpensesList);

  // ==================== REPORTES ====================

  // Generar reporte por casa
  document.getElementById('generateHouseReport').addEventListener('click', () => {
    const houseName = document.getElementById('reportHouse').value;
    if (!houseName) {
      showNotification('Por favor, seleccione una casa.', 'error');
      return;
    }

    const house = houses.find(h => h.name === houseName);
    const houseExpenses = expenses.filter(exp => exp.house === houseName);
    const houseIncomes = incomes.filter(inc => inc.house === houseName);
    
    const totalExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const balance = totalIncomes - totalExpenses;

    let reportHTML = `
      <div class="fade-in">
        <h3 class="text-xl font-bold mb-4">Reporte Detallado - ${houseName}</h3>
        <div class="bg-${house.type === 'conjunto' ? 'blue' : 'pink'}-50 p-4 rounded-lg mb-6">
          <p class="text-sm font-medium">Tipo: <span class="font-bold">${house.type === 'conjunto' ? 'Conjunto Residencial' : 'Casa Independiente'}</span></p>
          ${house.type === 'conjunto' ? '<p class="text-xs text-blue-600 mt-2">Los gastos de esta casa se debitan del fondo común del conjunto.</p>' : '<p class="text-xs text-pink-600 mt-2">Esta casa maneja sus ingresos y gastos de forma independiente.</p>'}
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-green-100 p-4 rounded-lg">
            <h4 class="font-semibold text-green-800">Total Ingresos</h4>
            <p class="text-2xl font-bold text-green-600">${formatter.format(totalIncomes)}</p>
          </div>
          <div class="bg-red-100 p-4 rounded-lg">
            <h4 class="font-semibold text-red-800">Total Gastos</h4>
            <p class="text-2xl font-bold text-red-600">${formatter.format(totalExpenses)}</p>
          </div>
          <div class="bg-yellow-100 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-800">Saldo</h4>
            <p class="text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(balance)}</p>
          </div>
        </div>
    `;

    if (house.type === 'independiente' && houseIncomes.length > 0) {
      reportHTML += `
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3">Ingresos</h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Fecha</th>
                  <th class="border p-2 text-left">Descripción</th>
                  <th class="border p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${houseIncomes.map(inc => `
                  <tr>
                    <td class="border p-2">${inc.date}</td>
                    <td class="border p-2">${inc.description}</td>
                    <td class="border p-2 text-right">${formatter.format(inc.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    if (houseExpenses.length > 0) {
      reportHTML += `
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3">Gastos</h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Fecha</th>
                  <th class="border p-2 text-left">Descripción</th>
                  <th class="border p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${houseExpenses.map(exp => `
                  <tr>
                    <td class="border p-2">${exp.date}</td>
                    <td class="border p-2">${exp.description}</td>
                    <td class="border p-2 text-right">${formatter.format(exp.amount)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    reportHTML += '</div>';
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
  });

  // Generar reporte consolidado
  document.getElementById('generateConsolidatedReport').addEventListener('click', () => {
    const startDate = new Date(document.getElementById('consolidatedStartDate').value);
    const endDate = new Date(document.getElementById('consolidatedEndDate').value);
    
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
    
    const filteredIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate >= startDate && incDate <= endDate;
    });

    const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const balance = totalIncomes - totalExpenses;

    // Separar por conjunto e independientes
    const conjuntoHouses = getHousesByType('conjunto').map(h => h.name);
    const independientesHouses = getHousesByType('independiente').map(h => h.name);

    const conjuntoExpenses = filteredExpenses.filter(exp => conjuntoHouses.includes(exp.house));
    const independientesExpenses = filteredExpenses.filter(exp => independientesHouses.includes(exp.house));
    
    const conjuntoIncomes = filteredIncomes.filter(inc => !inc.house || inc.house === '');
    const independientesIncomes = filteredIncomes.filter(inc => inc.house && independientesHouses.includes(inc.house));

    const conjuntoTotalExpenses = conjuntoExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const conjuntoTotalIncomes = conjuntoIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const conjuntoBalance = conjuntoTotalIncomes - conjuntoTotalExpenses;

    const independientesTotalExpenses = independientesExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const independientesTotalIncomes = independientesIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const independientesBalance = independientesTotalIncomes - independientesTotalExpenses;

    let reportHTML = `
      <div class="fade-in">
        <h3 class="text-xl font-bold mb-4">Reporte Consolidado</h3>
        <p class="text-sm text-gray-600 mb-6">Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div class="bg-green-100 p-4 rounded-lg">
            <h4 class="font-semibold text-green-800">Total Ingresos</h4>
            <p class="text-2xl font-bold text-green-600">${formatter.format(totalIncomes)}</p>
          </div>
          <div class="bg-red-100 p-4 rounded-lg">
            <h4 class="font-semibold text-red-800">Total Gastos</h4>
            <p class="text-2xl font-bold text-red-600">${formatter.format(totalExpenses)}</p>
          </div>
          <div class="bg-yellow-100 p-4 rounded-lg">
            <h4 class="font-semibold text-yellow-800">Saldo General</h4>
            <p class="text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(balance)}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div class="bg-blue-50 p-4 rounded-lg">
            <h4 class="text-lg font-semibold text-blue-800 mb-3">Conjunto Residencial</h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Ingresos:</span>
                <span class="font-semibold">${formatter.format(conjuntoTotalIncomes)}</span>
              </div>
              <div class="flex justify-between">
                <span>Gastos:</span>
                <span class="font-semibold">${formatter.format(conjuntoTotalExpenses)}</span>
              </div>
              <div class="flex justify-between border-t pt-2">
                <span class="font-bold">Saldo:</span>
                <span class="font-bold ${conjuntoBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(conjuntoBalance)}</span>
              </div>
            </div>
          </div>

          <div class="bg-pink-50 p-4 rounded-lg">
            <h4 class="text-lg font-semibold text-pink-800 mb-3">Casas Independientes</h4>
            <div class="space-y-2">
              <div class="flex justify-between">
                <span>Ingresos:</span>
                <span class="font-semibold">${formatter.format(independientesTotalIncomes)}</span>
              </div>
              <div class="flex justify-between">
                <span>Gastos:</span>
                <span class="font-semibold">${formatter.format(independientesTotalExpenses)}</span>
              </div>
              <div class="flex justify-between border-t pt-2">
                <span class="font-bold">Saldo:</span>
                <span class="font-bold ${independientesBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(independientesBalance)}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3">Gastos por Casa</h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Casa</th>
                  <th class="border p-2 text-left">Tipo</th>
                  <th class="border p-2 text-right">Total Gastos</th>
                </tr>
              </thead>
              <tbody>
    `;

    houses.forEach(house => {
      const houseExpenses = filteredExpenses.filter(exp => exp.house === house.name);
      const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      
      if (totalHouseExpenses > 0) {
        reportHTML += `
          <tr>
            <td class="border p-2">${house.name}</td>
            <td class="border p-2">
              <span class="px-2 py-1 rounded text-xs text-white ${house.type === 'conjunto' ? 'bg-blue-500' : 'bg-pink-500'}">
                ${house.type === 'conjunto' ? 'Conjunto' : 'Independiente'}
              </span>
            </td>
            <td class="border p-2 text-right">${formatter.format(totalHouseExpenses)}</td>
          </tr>
        `;
      }
    });

    reportHTML += `
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
  });

  // Generar reporte de ingresos
  document.getElementById('generateIncomeReport').addEventListener('click', () => {
    const startDate = new Date(document.getElementById('incomeStartDate').value);
    const endDate = new Date(document.getElementById('incomeEndDate').value);
    
    const filteredIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate >= startDate && incDate <= endDate;
    });

    const totalIncomes = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    let reportHTML = `
      <div class="fade-in">
        <h3 class="text-xl font-bold mb-4">Reporte Detallado de Ingresos</h3>
        <p class="text-sm text-gray-600 mb-4">Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        <p class="text-lg font-semibold mb-6">Total Ingresos: ${formatter.format(totalIncomes)}</p>
        
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border">
            <thead>
              <tr class="bg-gray-100">
                <th class="border p-2 text-left">Fecha</th>
                <th class="border p-2 text-left">Descripción</th>
                <th class="border p-2 text-left">Origen</th>
                <th class="border p-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              ${filteredIncomes.map(inc => `
                <tr>
                  <td class="border p-2">${inc.date}</td>
                  <td class="border p-2">${inc.description}</td>
                  <td class="border p-2">${inc.house || 'Conjunto Residencial'}</td>
                  <td class="border p-2 text-right">${formatter.format(inc.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
  });

  // Generar reporte comparativo
  document.getElementById('generateComparativeReport').addEventListener('click', () => {
    const startDate = new Date(document.getElementById('comparativeStartDate').value);
    const endDate = new Date(document.getElementById('comparativeEndDate').value);
    
    // Filtrar datos por período
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
    
    const filteredIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate >= startDate && incDate <= endDate;
    });

    // Datos del conjunto
    const conjuntoHouses = getHousesByType('conjunto');
    const conjuntoIncomes = filteredIncomes.filter(inc => !inc.house || inc.house === '');
    const conjuntoExpenses = filteredExpenses.filter(exp => 
      conjuntoHouses.some(h => h.name === exp.house)
    );

    // Datos de independientes
    const independientesHouses = getHousesByType('independiente');
    const independientesIncomes = filteredIncomes.filter(inc => 
      inc.house && independientesHouses.some(h => h.name === inc.house)
    );
    const independientesExpenses = filteredExpenses.filter(exp => 
      independientesHouses.some(h => h.name === exp.house)
    );

    // Cálculos
    const conjuntoTotalIncomes = conjuntoIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const conjuntoTotalExpenses = conjuntoExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const conjuntoBalance = conjuntoTotalIncomes - conjuntoTotalExpenses;

    const independientesTotalIncomes = independientesIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const independientesTotalExpenses = independientesExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const independientesBalance = independientesTotalIncomes - independientesTotalExpenses;

    let reportHTML = `
      <div class="fade-in">
        <h3 class="text-xl font-bold mb-4">Reporte Comparativo: Conjunto vs Independientes</h3>
        <p class="text-sm text-gray-600 mb-6">Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <!-- Conjunto Residencial -->
          <div class="bg-blue-50 p-6 rounded-xl">
            <h4 class="text-lg font-bold text-blue-800 mb-4 flex items-center">
              <span class="mr-2">🏘️</span>
              Conjunto Residencial
            </h4>
            <div class="space-y-3">
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Casas:</span>
                  <span class="font-semibold">${conjuntoHouses.length}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Ingresos:</span>
                  <span class="font-semibold text-green-600">${formatter.format(conjuntoTotalIncomes)}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Gastos:</span>
                  <span class="font-semibold text-red-600">${formatter.format(conjuntoTotalExpenses)}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-blue-200">
                <div class="flex justify-between items-center">
                  <span class="font-bold">Saldo:</span>
                  <span class="font-bold text-lg ${conjuntoBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(conjuntoBalance)}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Casas Independientes -->
          <div class="bg-pink-50 p-6 rounded-xl">
            <h4 class="text-lg font-bold text-pink-800 mb-4 flex items-center">
              <span class="mr-2">🏠</span>
              Casas Independientes
            </h4>
            <div class="space-y-3">
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Casas:</span>
                  <span class="font-semibold">${independientesHouses.length}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Ingresos:</span>
                  <span class="font-semibold text-green-600">${formatter.format(independientesTotalIncomes)}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg">
                <div class="flex justify-between items-center">
                  <span class="text-sm">Gastos:</span>
                  <span class="font-semibold text-red-600">${formatter.format(independientesTotalExpenses)}</span>
                </div>
              </div>
              <div class="bg-white p-3 rounded-lg border-2 border-pink-200">
                <div class="flex justify-between items-center">
                  <span class="font-bold">Saldo:</span>
                  <span class="font-bold text-lg ${independientesBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(independientesBalance)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detalle por Casa Independiente -->
        ${independientesHouses.length > 0 ? `
        <div class="mb-6">
          <h4 class="text-lg font-semibold mb-3">Detalle de Casas Independientes</h4>
          <div class="overflow-x-auto">
            <table class="w-full border-collapse border">
              <thead>
                <tr class="bg-gray-100">
                  <th class="border p-2 text-left">Casa</th>
                  <th class="border p-2 text-right">Ingresos</th>
                  <th class="border p-2 text-right">Gastos</th>
                  <th class="border p-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${independientesHouses.map(house => {
                  const houseIncomes = independientesIncomes.filter(inc => inc.house === house.name);
                  const houseExpenses = independientesExpenses.filter(exp => exp.house === house.name);
                  const houseIncomesTotal = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
                  const houseExpensesTotal = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                  const houseBalance = houseIncomesTotal - houseExpensesTotal;
                  
                  return `
                    <tr>
                      <td class="border p-2 font-medium">${house.name}</td>
                      <td class="border p-2 text-right text-green-600">${formatter.format(houseIncomesTotal)}</td>
                      <td class="border p-2 text-right text-red-600">${formatter.format(houseExpensesTotal)}</td>
                      <td class="border p-2 text-right font-semibold ${houseBalance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(houseBalance)}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        ` : ''}

        <!-- Análisis -->
        <div class="bg-gray-50 p-4 rounded-lg">
          <h4 class="text-lg font-semibold mb-3">Análisis Comparativo</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h5 class="font-medium text-blue-800">Conjunto Residencial</h5>
              <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>Manejo centralizado de fondos</li>
                <li>Gastos distribuidos entre ${conjuntoHouses.length} casas</li>
                <li>${conjuntoBalance >= 0 ? 'Saldo positivo' : 'Déficit'} de ${formatter.format(Math.abs(conjuntoBalance))}</li>
              </ul>
            </div>
            <div>
              <h5 class="font-medium text-pink-800">Casas Independientes</h5>
              <ul class="list-disc list-inside space-y-1 text-gray-600">
                <li>Gestión individual de recursos</li>
                <li>${independientesHouses.length} casas con autonomía financiera</li>
                <li>${independientesBalance >= 0 ? 'Saldo total positivo' : 'Déficit total'} de ${formatter.format(Math.abs(independientesBalance))}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
    
    document.getElementById('reportContent').innerHTML = reportHTML;
    document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
  });

  // ==================== FUNCIONES DE EXPORTACIÓN ====================

  // Backup
  document.getElementById('backupBtn').addEventListener('click', () => {
    const data = { houses, expenses, incomes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup-casas-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup descargado correctamente.', 'success');
  });

  // Importar Backup
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('importBackup').click();
  });

  document.getElementById('importBackup').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        houses = data.houses || [];
        expenses = data.expenses || [];
        incomes = data.incomes || [];
        
        // Migrar datos si es necesario
        migrateOldData();
        
        saveData();
        updateAllViews();
        showNotification('Backup importado correctamente.', 'success');
      } catch (err) {
        showNotification('Error al importar el backup. Asegúrese de que el archivo sea válido.', 'error');
      }
    };
    reader.readAsText(file);
  });

  // Sincronizar con Firestore
  document.getElementById('syncGoogleDrive').addEventListener('click', () => {
    console.log('Botón de sincronización presionado');
    saveDataToFirestore();
  });

  // Exportar a PDF (función básica - se puede expandir)
  document.getElementById('exportPdf').addEventListener('click', () => {
  const reportContent = document.getElementById('reportContent');
  if (reportContent.innerHTML.trim() === '') {
    showNotification('Por favor, genere un reporte antes de exportar a PDF.', 'error');
    return;
  }
  const doc = new jsPDF();
  const title = reportContent.querySelector('h3');
  const titleText = title ? title.textContent : 'Reporte';
  
  // Header profesional
  doc.setFillColor(59, 130, 246); // Azul
  doc.rect(0, 0, 220, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('SISTEMA DE GESTIÓN DE CASAS', 20, 15);
  
  doc.setFontSize(14);
  doc.text(titleText, 20, 25);
  
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`, 20, 35);
  
  // Resetear color de texto
  doc.setTextColor(0, 0, 0);
  let yPos = 50;
  
  // Obtener datos del reporte visible
  const tables = reportContent.querySelectorAll('table');
  const summaryCards = reportContent.querySelectorAll('.bg-green-100, .bg-red-100, .bg-yellow-100, .bg-blue-50, .bg-pink-50');
  
  // Agregar resumen si existe
  if (summaryCards.length > 0) {
    doc.setFontSize(12);
    doc.text('RESUMEN FINANCIERO', 20, yPos);
    yPos += 10;
    
    summaryCards.forEach(card => {
      const texts = card.textContent.trim().split('\n').filter(t => t.trim());
      texts.forEach(text => {
        if (text.trim() && yPos < 280) {
          doc.setFontSize(10);
          doc.text(text.trim(), 20, yPos);
          yPos += 6;
        }
      });
    });
    yPos += 10;
  }
  
  // Agregar tablas
  tables.forEach((table, index) => {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr')).map(tr => 
      Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim())
    );
    
    if (headers.length > 0 && rows.length > 0) {
      doc.autoTable({
        startY: yPos,
        head: [headers],
        body: rows,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' }
      });
      
      yPos = doc.lastAutoTable.finalY + 15;
    }
  });
  
  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Página ${i} de ${pageCount} - Sistema de Gestión de Casas`, 20, 290);
  }
  
  doc.save(`${titleText.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  showNotification('📄 PDF profesional exportado correctamente.', 'success');
});

  // ==================== INICIALIZACIÓN ====================

  // Establecer fecha actual por defecto
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('expenseDate').value = today;
  document.getElementById('incomeDate').value = today;
  document.getElementById('editDate').value = today;

  // Cargar datos iniciales
  console.log('Sistema iniciado correctamente');
 //Event listeners para botones de exportación del dashboard
document.getElementById('exportDetailPdf').addEventListener('click', () => {
  const houseExpensesDetail = document.getElementById('houseExpensesDetail');
  if (houseExpensesDetail.classList.contains('hidden')) {
    showNotification('Por favor, seleccione una casa para ver el detallado antes de exportar.', 'error');
    return;
  }
  const titleElement = document.getElementById('houseExpensesTitle');
  const titleText = titleElement.textContent;
  const houseName = titleText.split(' - ')[1] || 'Casa';
  
  // Obtener datos de la casa
  const houseNameClean = houseName.replace('Detallado de Transacciones - ', '').split(' (')[0];
  const houseExpenses = expenses.filter(exp => exp.house === houseNameClean);
  const houseIncomes = incomes.filter(inc => inc.house === houseNameClean);
  
  if (houseExpenses.length === 0 && houseIncomes.length === 0) {
    showNotification('No hay datos para exportar.', 'warning');
    return;
  }
  // Crear PDF
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(16);
  doc.text('Sistema de Gestión de Casas', 20, 20);
  
  doc.setFontSize(14);
  doc.text(titleText, 20, 35);
  
  doc.setFontSize(10);
  doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`, 20, 45);
  
  let yPos = 60;
  
  // Gastos
  if (houseExpenses.length > 0) {
    doc.setFontSize(12);
    doc.text('GASTOS:', 20, yPos);
    yPos += 10;
    
    const expensesData = houseExpenses.map(exp => [
      exp.date,
      exp.description,
      formatter.format(exp.amount)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Fecha', 'Descripción', 'Valor']],
      body: expensesData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    const totalExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.setFontSize(10);
    doc.text(`Total Gastos: ${formatter.format(totalExpenses)}`, 20, yPos);
    yPos += 15;
  }
  
  // Ingresos (solo para casas independientes)
  const house = houses.find(h => h.name === houseNameClean);
  if (house && house.type === 'independiente' && houseIncomes.length > 0) {
    doc.setFontSize(12);
    doc.text('INGRESOS:', 20, yPos);
    yPos += 10;
    
    const incomesData = houseIncomes.map(inc => [
      inc.date,
      inc.description,
      formatter.format(inc.amount)
    ]);
    
    doc.autoTable({
      startY: yPos,
      head: [['Fecha', 'Descripción', 'Valor']],
      body: incomesData,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });
    
    yPos = doc.lastAutoTable.finalY + 10;
    
    const totalIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    doc.setFontSize(10);
    doc.text(`Total Ingresos: ${formatter.format(totalIncomes)}`, 20, yPos);
    yPos += 10;
    
    const balance = totalIncomes - houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    doc.text(`Saldo: ${formatter.format(balance)}`, 20, yPos);
  }
  
  // Guardar PDF
  doc.save(`detalle-${houseNameClean.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  showNotification('PDF exportado correctamente.', 'success');
});
document.getElementById('exportDetailExcel').addEventListener('click', () => {
  const houseExpensesDetail = document.getElementById('houseExpensesDetail');
  if (houseExpensesDetail.classList.contains('hidden')) {
    showNotification('Por favor, seleccione una casa para ver el detallado antes de exportar.', 'error');
    return;
  }
  const titleElement = document.getElementById('houseExpensesTitle');
  const titleText = titleElement.textContent;
  const houseName = titleText.split(' - ')[1] || 'Casa';
  
  // Obtener datos de la casa
  const houseNameClean = houseName.replace('Detallado de Transacciones - ', '').split(' (')[0];
  const houseExpenses = expenses.filter(exp => exp.house === houseNameClean);
  const houseIncomes = incomes.filter(inc => inc.house === houseNameClean);
  
  if (houseExpenses.length === 0 && houseIncomes.length === 0) {
    showNotification('No hay datos para exportar.', 'warning');
    return;
  }
  const wb = XLSX.utils.book_new();
  
  // Hoja de gastos
  if (houseExpenses.length > 0) {
    const expensesData = [
      ['Fecha', 'Descripción', 'Valor'],
      ...houseExpenses.map(exp => [exp.date, exp.description, exp.amount])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(expensesData);
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos');
  }
  
  // Hoja de ingresos (solo para casas independientes)
  const house = houses.find(h => h.name === houseNameClean);
  if (house && house.type === 'independiente' && houseIncomes.length > 0) {
    const incomesData = [
      ['Fecha', 'Descripción', 'Valor'],
      ...houseIncomes.map(inc => [inc.date, inc.description, inc.amount])
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(incomesData);
    XLSX.utils.book_append_sheet(wb, ws, 'Ingresos');
  }
  
  // Guardar Excel
  XLSX.writeFile(wb, `detalle-${houseNameClean.toLowerCase().replace(/\s+/g, '-')}.xlsx`);
  showNotification('Excel exportado correctamente.', 'success');
});
// Exportar Excel profesional con todas las casas
function exportAllHousesToExcel() {
  const wb = XLSX.utils.book_new();
  
  // Hoja de resumen
  const summaryData = [
    ['SISTEMA DE GESTIÓN DE CASAS'],
    [`Reporte generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`],
    [''],
    ['RESUMEN GENERAL'],
    ['Total Casas:', houses.length],
    ['Total Ingresos:', incomes.reduce((sum, inc) => sum + inc.amount, 0)],
    ['Total Gastos:', expenses.reduce((sum, exp) => sum + exp.amount, 0)],
    [''],
    ['DETALLE POR CASA'],
    ['Casa', 'Tipo', 'Ingresos', 'Gastos', 'Saldo']
  ];
  
  houses.forEach(house => {
    const houseExpenses = expenses.filter(exp => exp.house === house.name);
    const houseIncomes = incomes.filter(inc => inc.house === house.name);
    const totalExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const balance = totalIncomes - totalExpenses;
    
    summaryData.push([
      house.name,
      house.type === 'conjunto' ? 'Conjunto' : 'Independiente',
      totalIncomes,
      totalExpenses,
      balance
    ]);
  });
  
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
  
  // Hoja para cada casa
  houses.forEach(house => {
    const houseExpenses = expenses.filter(exp => exp.house === house.name);
    const houseIncomes = incomes.filter(inc => inc.house === house.name);
    
    const houseData = [
      [`DETALLE - ${house.name.toUpperCase()}`],
      [`Tipo: ${house.type === 'conjunto' ? 'Conjunto Residencial' : 'Casa Independiente'}`],
      [`Fecha: ${new Date().toLocaleDateString('es-CO')}`],
      [''],
      ['RESUMEN FINANCIERO'],
      ['Concepto', 'Valor'],
      ['Total Ingresos', houseIncomes.reduce((sum, inc) => sum + inc.amount, 0)],
      ['Total Gastos', houseExpenses.reduce((sum, exp) => sum + exp.amount, 0)],
      ['Saldo', houseIncomes.reduce((sum, inc) => sum + inc.amount, 0) - houseExpenses.reduce((sum, exp) => sum + exp.amount, 0)],
      ['']
    ];
    
    // Gastos
    if (houseExpenses.length > 0) {
      houseData.push(['GASTOS DETALLADOS']);
      houseData.push(['Fecha', 'Descripción', 'Valor']);
      houseExpenses.forEach(exp => {
        houseData.push([exp.date, exp.description, exp.amount]);
      });
      houseData.push(['']);
    }
    
    // Ingresos (solo para casas independientes)
    if (house.type === 'independiente' && houseIncomes.length > 0) {
      houseData.push(['INGRESOS DETALLADOS']);
      houseData.push(['Fecha', 'Descripción', 'Valor']);
      houseIncomes.forEach(inc => {
        houseData.push([inc.date, inc.description, inc.amount]);
      });
    }
    
    const houseWs = XLSX.utils.aoa_to_sheet(houseData);
    
    // Formatear hoja
    if (houseWs['!ref']) {
      houseWs['!cols'] = [
        { wch: 15 }, // Fecha
        { wch: 40 }, // Descripción  
        { wch: 15 }  // Valor
      ];
    }
    
    // Nombre de hoja válido (máximo 31 caracteres)
    const sheetName = house.name.substring(0, 31).replace(/[\\/:*?[\]]/g, '');
    XLSX.utils.book_append_sheet(wb, houseWs, sheetName);
  });
  
  XLSX.writeFile(wb, `reporte-completo-casas-${new Date().toISOString().split('T')[0]}.xlsx`);
  showNotification('📊 Excel profesional exportado correctamente.', 'success');
}
// Event listener para Excel completo
document.getElementById('exportAllHousesExcel').addEventListener('click', exportAllHousesToExcel);
// Reporte consolidado avanzado
document.getElementById('generateAdvancedReport').addEventListener('click', () => {
  const startDate = new Date(document.getElementById('consolidatedAdvancedStartDate').value);
  const endDate = new Date(document.getElementById('consolidatedAdvancedEndDate').value);
  const reportType = document.getElementById('consolidatedType').value;
  
  let reportHTML = '';
  
  if (reportType === 'conjunto') {
    reportHTML = generateConjuntoReport(startDate, endDate);
  } else if (reportType === 'independientes') {
    reportHTML = generateIndependientesReport(startDate, endDate);
  } else if (reportType === 'por_casa') {
    reportHTML = generateDetailedByHouseReport(startDate, endDate);
  } else {
    reportHTML = generateGeneralAdvancedReport(startDate, endDate);
  }
  
  document.getElementById('reportContent').innerHTML = reportHTML;
  document.getElementById('reportContent').scrollIntoView({ behavior: 'smooth' });
});
function generateConjuntoReport(startDate, endDate) {
  const conjuntoHouses = getHousesByType('conjunto');
  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= startDate && expDate <= endDate && conjuntoHouses.some(h => h.name === exp.house);
  });
  const filteredIncomes = incomes.filter(inc => {
    const incDate = new Date(inc.date);
    return incDate >= startDate && incDate <= endDate && (!inc.house || inc.house === '');
  });
  
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalIncomes = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
  const balance = totalIncomes - totalExpenses;
  
  return `
    <div class="fade-in">
      <h3 class="text-xl font-bold mb-4">Reporte Conjunto Residencial</h3>
      <p class="text-sm text-gray-600 mb-6">Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
      
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div class="bg-green-100 p-4 rounded-lg">
          <h4 class="font-semibold text-green-800">Ingresos del Fondo</h4>
          <p class="text-2xl font-bold text-green-600">${formatter.format(totalIncomes)}</p>
        </div>
        <div class="bg-red-100 p-4 rounded-lg">
          <h4 class="font-semibold text-red-800">Gastos del Conjunto</h4>
          <p class="text-2xl font-bold text-red-600">${formatter.format(totalExpenses)}</p>
        </div>
        <div class="bg-yellow-100 p-4 rounded-lg">
          <h4 class="font-semibold text-yellow-800">Saldo del Fondo</h4>
          <p class="text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(balance)}</p>
        </div>
      </div>
      
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-3">Casas del Conjunto (${conjuntoHouses.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border">
            <thead>
              <tr class="bg-gray-100">
                <th class="border p-2 text-left">Casa</th>
                <th class="border p-2 text-right">Gastos en el Período</th>
              </tr>
            </thead>
            <tbody>
              ${conjuntoHouses.map(house => {
                const houseExpenses = filteredExpenses.filter(exp => exp.house === house.name);
                const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                return `
                  <tr>
                    <td class="border p-2 font-medium">${house.name}</td>
                    <td class="border p-2 text-right">${formatter.format(totalHouseExpenses)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
function generateIndependientesReport(startDate, endDate) {
  const independientesHouses = getHousesByType('independiente');
  
  return `
    <div class="fade-in">
      <h3 class="text-xl font-bold mb-4">Reporte Casas Independientes</h3>
      <p class="text-sm text-gray-600 mb-6">Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
      
      <div class="mb-6">
        <h4 class="text-lg font-semibold mb-3">Casas Independientes (${independientesHouses.length})</h4>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse border">
            <thead>
              <tr class="bg-gray-100">
                <th class="border p-2 text-left">Casa</th>
                <th class="border p-2 text-right">Ingresos</th>
                <th class="border p-2 text-right">Gastos</th>
                <th class="border p-2 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              ${independientesHouses.map(house => {
                const houseExpenses = expenses.filter(exp => {
                  const expDate = new Date(exp.date);
                  return expDate >= startDate && expDate <= endDate && exp.house === house.name;
                });
                const houseIncomes = incomes.filter(inc => {
                  const incDate = new Date(inc.date);
                  return incDate >= startDate && incDate <= endDate && inc.house === house.name;
                });
                const totalExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                const totalIncomes = houseIncomes.reduce((sum, inc) => sum + inc.amount, 0);
                const balance = totalIncomes - totalExpenses;
                
                return `
                  <tr>
                    <td class="border p-2 font-medium">${house.name}</td>
                    <td class="border p-2 text-right text-green-600">${formatter.format(totalIncomes)}</td>
                    <td class="border p-2 text-right text-red-600">${formatter.format(totalExpenses)}</td>
                    <td class="border p-2 text-right font-semibold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}">${formatter.format(balance)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}
// Llamar estas funciones al final del DOMContentLoaded
function initializeProfessionalFeatures() {
  setupRealtimeSync();
  setupAdvancedReportListeners();
  console.log('Funcionalidades profesionales inicializadas');
}

});