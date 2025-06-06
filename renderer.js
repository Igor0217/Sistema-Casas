const firebaseConfig = {
  apiKey: "AIzaSyCH1771AFZyfSD_PvNxR9AQoZ30dg_DcOg",
  authDomain: "fortalezasas-25e42.firebaseapp.com",
  projectId: "fortalezasas-25e42",
  storageBucket: "fortalezasas-25e42.firebasestorage.app",
  messagingSenderId: "383032445971",
  appId: "1:383032445971:web:490f92170d2f36be70c3e6"
};

// Inicializa Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
document.addEventListener('DOMContentLoaded', () => {
  loadDataFromFirestore();
  const { jsPDF } = window.jspdf;
  const { utils, write, WorkBook } = XLSX;

  // Google Drive API configuration
  //const CLIENT_ID = '429861903088-l0tprfs66bhbei0k2ng2svoik5suo109.apps.googleusercontent.com';
  //const API_KEY = 'AIzaSyD7zLcyUcIgBa0r4S02BQotJktzNwE6zrM'; // Replace with your Google Cloud API Key
  //const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
  //const SCOPES = 'https://www.googleapis.com/auth/drive.file';
  //let gapiLoaded = false;
  //let isSignedIn = false;

  // Formatter for Colombian pesos without decimals
  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  // Initial data
  let houses = [];
  let expenses = [];
  let incomes = [];

  // Initialize Google API client
 /* function initGapiClient(attempt = 5, maxAttempts = 3) {
  console.log('Initializing GAPI client... Attempt', attempt);
  gapi.client.init({
    //apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES
  }).then(() => {
    console.log('GAPI client initialized successfully');
    gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
    updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
  }, (error) => {
    console.error('Error initializing GAPI client:', error);
    if (attempt < maxAttempts && error.status === 502) {
      console.log('Retrying GAPI client initialization in 5 seconds...');
      setTimeout(() => initGapiClient(attempt + 1, maxAttempts), 5000);
    } else {
      alert('Error initializing Google Drive. Falling back to local storage.');
    }
  });
}*/

  // Handle sign-in status
  /*function updateSigninStatus(signedIn) {
    isSignedIn = signedIn;
	console.log('Sign-in status updated:', isSignedIn);//--*************ojo quiar luego
    if (isSignedIn) {
      loadDataFromDrive();
    } else {
      // Load from localStorage as fallback
      houses = JSON.parse(localStorage.getItem('houses')) || [];
      expenses = JSON.parse(localStorage.getItem('expenses')) || [];
      incomes = JSON.parse(localStorage.getItem('incomes')) || [];
      updateHouseSelects();
      updateDashboard();
      updateExpensesList();
      updateIncomesList();
    }
  }*/

  // Load Google API client
  //function loadGapi() {
  //if (!gapiLoaded) {
   // gapi.load('client:auth2', () => {
  //    gapiLoaded = true;
  //    initGapiClient();
  //  });
 // }
//}

  // Sign in to Google
 /* function signIn() {
  console.log('Initiating Google sign-in...');
  const authInstance = gapi.auth2.getAuthInstance();
  if (!authInstance) {
    console.error('GAPI auth instance not available. Please try again.');
    alert('Authentication failed. Please try again after refreshing the page.');
    return;
  }
  authInstance.signIn().then(() => {
    console.log('Sign-in successful');
    updateSigninStatus(authInstance.isSignedIn.get());
  }, (error) => {
    console.error('Sign-in failed:', error);
    alert('Sign-in failed: ' + (error.error || 'Unknown error'));
  });
}

  // Save data to Google Drive
  /*function saveDataToDrive() {
    if (!isSignedIn) {
      alert('Please sign in to Google Drive to sync data.');
      return;
    }
    console.log('Attempting to save data to Google Drive...'); // Añade este log**************
    const data = { houses, expenses, incomes };
    const fileContent = JSON.stringify(data, null, 2);
    const metadata = {
      name: 'house-management-data.json',
      mimeType: 'application/json',
      parents: ['appDataFolder']
    };

    // Check if file exists
    gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: "name='house-management-data.json'"
    }).then(response => {
      console.log('Files list response:', response); // Añade este log**********
      const files = response.result.files;
      if (files && files.length > 0) {
        // Update existing file
        const fileId = files[0].id;
        gapi.client.request({
          path: `/upload/drive/v3/files/${fileId}`,
          method: 'PATCH',
          params: { uploadType: 'media' },
          body: fileContent
        }).then(() => {
          console.log('Data updated in Google Drive');
        }, error => {
          console.error('Error updating file:', error);
          alert('Error saving to Google Drive.');
        });
      } else {
        // Create new file
        gapi.client.drive.files.create({
          resource: metadata,
          media: {
            mimeType: 'application/json',
            body: fileContent
          },
          fields: 'id'
        }).then(() => {
          console.log('Data saved to Google Drive');
        }, error => {
          console.error('Error creating file:', error);
          alert('Error saving to Google Drive.');
        });
      }
    }, error => {
      console.error('Error listing files:', error);
      alert('Error accessing Google Drive.');
    });
  }

   Load data from Google Drive
  function loadDataFromDrive() {
    if (!isSignedIn) {
      return;
    }
    gapi.client.drive.files.list({
      spaces: 'appDataFolder',
      q: "name='house-management-data.json'"
    }).then(response => {
      const files = response.result.files;
      if (files && files.length > 0) {
        const fileId = files[0].id;
        gapi.client.drive.files.get({
          fileId: fileId,
          alt: 'media'
        }).then(response => {
          const data = JSON.parse(response.body);
          houses = data.houses || [];
          expenses = data.expenses || [];
          incomes = data.incomes || [];
          // Save to localStorage as backup
          localStorage.setItem('houses', JSON.stringify(houses));
          localStorage.setItem('expenses', JSON.stringify(expenses));
          localStorage.setItem('incomes', JSON.stringify(incomes));
          updateHouseSelects();
          updateDashboard();
          updateExpensesList();
          updateIncomesList();
        }, error => {
          console.error('Error loading file:', error);
          alert('Error loading from Google Drive. Using local data.');
          // Fallback to localStorage
          houses = JSON.parse(localStorage.getItem('houses')) || [];
          expenses = JSON.parse(localStorage.getItem('expenses')) || [];
          incomes = JSON.parse(localStorage.getItem('incomes')) || [];
          updateHouseSelects();
          updateDashboard();
          updateExpensesList();
          updateIncomesList();
        });
      } else {
        // No file found, use localStorage
        houses = JSON.parse(localStorage.getItem('houses')) || [];
        expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        incomes = JSON.parse(localStorage.getItem('incomes')) || [];
        updateHouseSelects();
        updateDashboard();
        updateExpensesList();
        updateIncomesList();
      }
    }, error => {
      console.error('Error listing files:', error);
      alert('Error accessing Google Drive. Using local data.');
      // Fallback to localStorage
      houses = JSON.parse(localStorage.getItem('houses')) || [];
      expenses = JSON.parse(localStorage.getItem('expenses')) || [];
      incomes = JSON.parse(localStorage.getItem('incomes')) || [];
      updateHouseSelects();
      updateDashboard();
      updateExpensesList();
      updateIncomesList();
    });
  }*/
//*************************************************************************************** */

async function saveDataToFirestore() {
  console.log('Saving data to Firestore...');
  const data = { houses, expenses, incomes };
  try {
    await db.collection('userData').doc('appData').set(data);
    console.log('Data saved to Firestore');
    alert('Datos sincronizados con Firestore.');
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    alert('Error al sincronizar datos con Firestore. Guardando localmente.');
    saveData();
  }
}

async function loadDataFromFirestore() {
  console.log('Loading data from Firestore...');
  try {
    const doc = await db.collection('userData').doc('appData').get();
    if (doc.exists) {
      const data = doc.data();
      houses = data.houses || [];
      expenses = data.expenses || [];
      incomes = data.incomes || [];
      console.log('Data loaded from Firestore');
    } else {
      console.log('No data found in Firestore. Using local storage.');
      houses = JSON.parse(localStorage.getItem('houses')) || [];
      expenses = JSON.parse(localStorage.getItem('expenses')) || [];
      incomes = JSON.parse(localStorage.getItem('incomes')) || [];
    }
  } catch (error) {
    console.error('Error loading from Firestore:', error);
    houses = JSON.parse(localStorage.getItem('houses')) || [];
    expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    incomes = JSON.parse(localStorage.getItem('incomes')) || [];
  }
  updateHouseSelects();
  updateDashboard();
  updateExpensesList();
  updateIncomesList();
}
  // Save data (to both localStorage and Google Drive)
  function saveData() {
  console.log('Saving data locally and to Firestore...');
  localStorage.setItem('houses', JSON.stringify(houses));
  localStorage.setItem('expenses', JSON.stringify(expenses));
  localStorage.setItem('incomes', JSON.stringify(incomes));
  saveDataToFirestore();
}

  // Format input for currency
  window.formatInput = function(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    input.dataset.value = value;
    input.value = value ? formatter.format(parseInt(value)) : '';
  };

  // Update house selects
  function updateHouseSelects() {
    const expenseHouseSelect = document.getElementById('expenseHouse');
    const editHouseSelect = document.getElementById('editHouse');
    const reportHouseSelect = document.getElementById('reportHouse');
    const filterHousesSelect = document.getElementById('filterHouses');
    [expenseHouseSelect, editHouseSelect, reportHouseSelect, filterHousesSelect].forEach(select => {
      if (select) {
        const currentValue = select.value;
        select.innerHTML = select.id === 'filterHouses' ? '<option value="all">Todas las casas</option>' : '<option value="">Seleccione una casa</option>';
        houses.forEach(house => {
          const option = document.createElement('option');
          option.value = house;
          option.textContent = house;
          select.appendChild(option);
        });
        select.value = currentValue;
      }
    });
    updateSharedHouseAssignments();
  }

  // Update dashboard
  function updateDashboard() {
    document.getElementById('totalHouses').textContent = houses.length;
    const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomesAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const totalBalance = totalIncomesAmount - totalExpensesAmount;

    document.getElementById('totalIncomes').textContent = formatter.format(totalIncomesAmount);
    document.getElementById('totalExpenses').textContent = formatter.format(totalExpensesAmount);
    document.getElementById('totalBalance').textContent = formatter.format(totalBalance);

    const balanceValue = document.getElementById('totalBalance');
    if (totalBalance > 0) {
      balanceValue.style.color = '#27ae60';
    } else if (totalBalance < 0) {
      balanceValue.style.color = '#e74c3c';
    } else {
      balanceValue.style.color = '#f39c12';
    }

    const housesList = document.getElementById('housesList');
    housesList.innerHTML = '';
    houses.forEach(house => {
      const houseExpenses = expenses.filter(exp => exp.house === house);
      const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="p-2 cursor-pointer hover:bg-gray-100" data-house="${house}">${house}</td>
        <td class="p-2">${formatter.format(totalHouseExpenses)}</td>
        <td class="p-2"><button class="bg-red-500 text-white p-1 rounded hover:bg-red-600 delete-house" data-house="${house}">Eliminar</button></td>
      `;
      housesList.appendChild(row);
    });

    housesList.querySelectorAll('tr td:first-child').forEach(td => {
      td.addEventListener('click', () => {
        const house = td.dataset.house;
        const houseExpenses = expenses.filter(exp => exp.house === house);
        const houseExpensesList = document.getElementById('houseExpensesList');
        const houseExpensesDetail = document.getElementById('houseExpensesDetail');
        const houseExpensesTitle = document.getElementById('houseExpensesTitle');
        const houseExpensesTotal = document.getElementById('houseExpensesTotal');

        houseExpensesTitle.textContent = `Detallado de Gastos - Casa: ${house}`;
        houseExpensesList.innerHTML = houseExpenses.map(exp => `
          <tr>
            <td class="p-2 border">${exp.date}</td>
            <td class="p-2 border">${exp.description}</td>
            <td class="p-2 border">${formatter.format(exp.amount)}</td>
          </tr>
        `).join('');
        houseExpensesTotal.textContent = `Total Gastos: ${formatter.format(houseExpenses.reduce((sum, exp) => sum + exp.amount, 0))}`;
        houseExpensesDetail.classList.remove('hidden');
      });
    });
  }

  // Register new house
  document.getElementById('newHouseBtn').addEventListener('click', () => {
    const houseName = prompt('Ingrese el nombre de la nueva casa:');
    if (houseName && !houses.includes(houseName)) {
      houses.push(houseName);
      saveData();
      updateHouseSelects();
      updateDashboard();
    } else if (houses.includes(houseName)) {
      alert('Esta casa ya existe.');
    } else {
      alert('Por favor, ingrese un nombre válido.');
    }
  });

  // Delete house
  document.getElementById('housesList').addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-house')) {
      const house = e.target.dataset.house;
      if (confirm(`¿Está seguro de eliminar la casa ${house}?`)) {
        houses = houses.filter(h => h !== house);
        expenses = expenses.filter(exp => exp.house !== house);
        saveData();
        updateHouseSelects();
        updateDashboard();
        updateExpensesList();
      }
    }
  });

  // Handle shared expenses
  function updateSharedHouseAssignments() {
    const sharedExpense = document.getElementById('sharedExpense');
    const houseAssignment = document.getElementById('houseAssignment');
    const sharedHouseAssignments = document.getElementById('sharedHouseAssignments');
    const sharedHousesList = document.getElementById('sharedHousesList');

    if (sharedExpense.checked) {
      houseAssignment.classList.add('hidden');
      sharedHouseAssignments.classList.remove('hidden');
      sharedHousesList.innerHTML = '';
      houses.forEach(house => {
        const div = document.createElement('div');
        div.className = 'flex items-center mb-2';
        div.innerHTML = `
          <span class="mr-2">${house}</span>
          <input type="text" class="p-1 border rounded w-24" data-house="${house}" data-value="0" oninput="formatInput(this)" placeholder="Valor">
        `;
        sharedHousesList.appendChild(div);
      });
    } else {
      houseAssignment.classList.remove('hidden');
      sharedHouseAssignments.classList.add('hidden');
    }
  }

  document.getElementById('sharedExpense').addEventListener('change', updateSharedHouseAssignments);

  // Register expense
  document.getElementById('registerExpense').addEventListener('click', () => {
    const description = document.getElementById('expenseDescription').value.trim();
    const date = document.getElementById('expenseDate').value;
    const shared = document.getElementById('sharedExpense').checked;

    if (!description || description === '') {
      alert('Por favor, ingrese una descripción.');
      return;
    }
    if (!date) {
      alert('Por favor, seleccione una fecha.');
      return;
    }

    const totalExpensesAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomesAmount = incomes.reduce((sum, inc) => sum + inc.amount, 0);
    const currentBalance = totalIncomesAmount - totalExpensesAmount;

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
        alert('Por favor, ingrese al menos un valor para alguna casa.');
        return;
      }
      if (currentBalance <= 0) {
        alert('Advertencia: El saldo actual es insuficiente o cero. El gasto se registrará, pero revise su situación financiera.');
      }
    } else {
      const house = document.getElementById('expenseHouse').value;
      const amount = parseInt(document.getElementById('expenseAmount').dataset.value) || 0;
      if (amount <= 0) {
        alert('Por favor, ingrese un valor válido mayor a 0.');
        return;
      }
      if (!house) {
        alert('Por favor, seleccione una casa.');
        return;
      }
      if (currentBalance <= 0) {
        alert('Advertencia: El saldo actual es insuficiente o cero. El gasto se registrará, pero revise su situación financiera.');
      }
      expenses.push({ description, amount, date, house });
    }

    saveData();
    updateDashboard();
    updateExpensesList();
    document.getElementById('expenseDescription').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseAmount').dataset.value = '0';
    document.getElementById('expenseDate').value = '2025-06-02';
    document.getElementById('sharedExpense').checked = false;
    updateSharedHouseAssignments();
  });

  // Update expenses list
  function updateExpensesList() {
    const expensesList = document.getElementById('expensesList');
    const filterHouse = document.getElementById('filterHouses').value;
    expensesList.innerHTML = '';
    let filteredExpenses = expenses;
    if (filterHouse !== 'all') {
      filteredExpenses = expenses.filter(exp => exp.house === filterHouse);
    }
    filteredExpenses.forEach((exp, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="p-2">${exp.date}</td>
        <td class="p-2">${exp.description}</td>
        <td class="p-2">${exp.house || 'Compartido'}</td>
        <td class="p-2">${formatter.format(exp.amount)}</td>
        <td class="p-2">
          <button class="bg-blue-500 text-white p-1 rounded hover:bg-blue-600 edit-expense" data-index="${index}">Editar</button>
          <button class="bg-red-500 text-white p-1 rounded hover:bg-red-600 delete-expense" data-index="${index}">Eliminar</button>
        </td>
      `;
      expensesList.appendChild(row);
    });

    expensesList.querySelectorAll('.edit-expense').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.dataset.index);
        const expense = expenses[index];
        const editModal = document.getElementById('editModal');
        const editDescription = document.getElementById('editDescription');
        const editAmount = document.getElementById('editAmount');
        const editDate = document.getElementById('editDate');
        const editHouseSection = document.getElementById('editHouseSection');
        const editHouse = document.getElementById('editHouse');

        document.getElementById('editModalTitle').textContent = 'Editar Gasto';
        editDescription.value = expense.description;
        editAmount.value = expense.amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        editAmount.dataset.value = expense.amount;
        editDate.value = expense.date;
        editHouseSection.classList.remove('hidden');
        updateHouseSelects();
        editHouse.value = expense.house || '';
        window.editIndex = index;
        window.editType = 'expense';
        editModal.classList.remove('hidden');
      });
    });

    expensesList.querySelectorAll('.delete-expense').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.dataset.index);
        if (confirm('¿Está seguro de eliminar este gasto?')) {
          expenses.splice(index, 1);
          saveData();
          updateDashboard();
          updateExpensesList();
        }
      });
    });
  }

  // Filter expenses
  document.getElementById('filterHouses').addEventListener('change', updateExpensesList);

  // Register income
  document.getElementById('registerIncome').addEventListener('click', () => {
    const description = document.getElementById('incomeDescription').value.trim();
    const amount = parseInt(document.getElementById('incomeAmount').dataset.value) || 0;
    const date = document.getElementById('incomeDate').value;

    if (!description || description === '') {
      alert('Por favor, ingrese una descripción.');
      return;
    }
    if (amount <= 0) {
      alert('Por favor, ingrese un valor válido mayor a 0.');
      return;
    }
    if (!date) {
      alert('Por favor, seleccione una fecha.');
      return;
    }

    incomes.push({ description, amount, date });
    saveData();
    updateDashboard();
    updateIncomesList();
    document.getElementById('incomeDescription').value = '';
    document.getElementById('incomeAmount').value = '';
    document.getElementById('incomeAmount').dataset.value = '0';
    document.getElementById('incomeDate').value = '2025-06-02';
  });

  // Update incomes list
  function updateIncomesList() {
    const incomesList = document.getElementById('incomesList');
    incomesList.innerHTML = '';
    incomes.forEach((inc, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td class="p-2">${inc.date}</td>
        <td class="p-2">${inc.description}</td>
        <td class="p-2">${formatter.format(inc.amount)}</td>
        <td class="p-2">
          <button class="bg-blue-500 text-white p-1 rounded hover:bg-blue-600 edit-income" data-index="${index}">Editar</button>
          <button class="bg-red-500 text-white p-1 rounded hover:bg-red-600 delete-income" data-index="${index}">Eliminar</button>
        </td>
      `;
      incomesList.appendChild(row);
    });

    incomesList.querySelectorAll('.edit-income').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.dataset.index);
        const income = incomes[index];
        const editModal = document.getElementById('editModal');
        const editDescription = document.getElementById('editDescription');
        const editAmount = document.getElementById('editAmount');
        const editDate = document.getElementById('editDate');
        const editHouseSection = document.getElementById('editHouseSection');

        document.getElementById('editModalTitle').textContent = 'Editar Ingreso';
        editDescription.value = income.description;
        editAmount.value = income.amount.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
        editAmount.dataset.value = income.amount;
        editDate.value = income.date;
        editHouseSection.classList.add('hidden');
        window.editIndex = index;
        window.editType = 'income';
        editModal.classList.remove('hidden');
      });
    });

    incomesList.querySelectorAll('.delete-income').forEach(button => {
      button.addEventListener('click', () => {
        const index = parseInt(button.dataset.index);
        if (confirm('¿Está seguro de eliminar este ingreso?')) {
          incomes.splice(index, 1);
          saveData();
          updateDashboard();
          updateIncomesList();
        }
      });
    });
  }

  // Generate house report
  document.getElementById('generateHouseReport').addEventListener('click', () => {
    const house = document.getElementById('reportHouse').value;
    if (!house) {
      alert('Por favor, seleccione una casa.');
      return;
    }
    const houseExpenses = expenses.filter(exp => exp.house === house);
    const totalExpensesAmount = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    document.getElementById('reportContent').innerHTML = `
      <div id="houseReportContent">
        <h3 class="text-2xl font-semibold mb-4">Reporte por Casa</h3>
        <p class="text-lg mb-2"><strong>Casa:</strong> ${house}</p>
        <p class="text-lg mb-4"><strong>Total Gastos:</strong> ${formatter.format(totalExpensesAmount)}</p>
        <h4 class="text-xl font-medium mb-2">Detalles de Gastos</h4>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-200">
              <th class="p-3 border">Fecha</th>
              <th class="p-3 border">Descripción</th>
              <th class="p-3 border">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${houseExpenses.map(exp => `
              <tr>
                <td class="p-3 border">${exp.date}</td>
                <td class="p-3 border">${exp.description}</td>
                <td class="p-3 border">${formatter.format(exp.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  // Generate consolidated report
  document.getElementById('generateConsolidatedReport').addEventListener('click', () => {
    const startDate = new Date(document.getElementById('consolidatedStartDate').value);
    const endDate = new Date(document.getElementById('consolidatedEndDate').value);
    if (!startDate || !endDate) {
      alert('Por favor, seleccione un período válido.');
      return;
    }
    const filteredExpenses = expenses.filter(exp => {
      const expDate = new Date(exp.date);
      return expDate >= startDate && expDate <= endDate;
    });
    const filteredIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate >= startDate && incDate <= endDate;
    });
    const totalExpensesAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalIncomesAmount = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
    const balance = totalIncomesAmount - totalExpensesAmount;

    document.getElementById('reportContent').innerHTML = `
      <div id="consolidatedReportContent">
        <h3 class="text-2xl font-semibold mb-4">Reporte Consolidado</h3>
        <p class="text-lg mb-4"><strong>Período:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        <div class="grid grid-cols-3 gap-6 mb-6">
          <div class="bg-red-100 p-4 rounded-lg">
            <p class="text-xl font-medium">Total Gastos</p>
            <p class="text-2xl font-bold">${formatter.format(totalExpensesAmount)}</p>
          </div>
          <div class="bg-green-100 p-4 rounded-lg">
            <p class="text-xl font-medium">Total Ingresos</p>
            <p class="text-2xl font-bold">${formatter.format(totalIncomesAmount)}</p>
          </div>
          <div class="bg-blue-100 p-4 rounded-lg">
            <p class="text-xl font-medium">Saldo</p>
            <p class="text-2xl font-bold">${formatter.format(balance)}</p>
          </div>
        </div>
        <h4 class="text-xl font-medium mb-2">Gastos por Casa</h4>
        <div class="space-y-2">
          ${houses.map(house => {
            const houseExpenses = filteredExpenses.filter(exp => exp.house === house);
            const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
            return totalHouseExpenses > 0 ? `<p class="text-lg"><strong>${house}:</strong> ${formatter.format(totalHouseExpenses)}</p>` : '';
          }).join('')}
        </div>
      </div>
    `;
  });

  // Generate income report
  document.getElementById('generateIncomeReport').addEventListener('click', () => {
    const startDate = new Date(document.getElementById('incomeStartDate').value);
    const endDate = new Date(document.getElementById('incomeEndDate').value);
    if (!startDate || !endDate) {
      alert('Por favor, seleccione un período válido.');
      return;
    }
    const filteredIncomes = incomes.filter(inc => {
      const incDate = new Date(inc.date);
      return incDate >= startDate && incDate <= endDate;
    });
    const totalIncomesAmount = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);

    document.getElementById('reportContent').innerHTML = `
      <div id="incomeReportContent">
        <h3 class="text-2xl font-semibold mb-4">Reporte Detallado de Ingresos</h3>
        <p class="text-lg mb-2"><strong>Período:</strong> ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}</p>
        <p class="text-lg mb-4"><strong>Total Ingresos:</strong> ${formatter.format(totalIncomesAmount)}</p>
        <h4 class="text-xl font-medium mb-2">Detalles de Ingresos</h4>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-200">
              <th class="p-3 border">Fecha</th>
              <th class="p-3 border">Descripción</th>
              <th class="p-3 border">Valor</th>
            </tr>
          </thead>
          <tbody>
            ${filteredIncomes.map(inc => `
              <tr>
                <td class="p-3 border">${inc.date}</td>
                <td class="p-3 border">${inc.description}</td>
                <td class="p-3 border">${formatter.format(inc.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  // Export to PDF
  document.getElementById('exportPdf').addEventListener('click', () => {
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Sistema de Gestión de Casas', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Fecha de Generación: ${currentDate}`, 20, yPos);
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    const houseReport = document.getElementById('houseReportContent');
    const consolidatedReport = document.getElementById('consolidatedReportContent');
    const incomeReport = document.getElementById('incomeReportContent');

    if (houseReport && !houseReport.classList.contains('hidden')) {
      const house = document.getElementById('reportHouse').value;
      const houseExpenses = expenses.filter(exp => exp.house === house);
      const totalExpensesAmount = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);

      doc.setFontSize(14);
      doc.text('Reporte por Casa', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`Casa: ${house}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Gastos: ${formatter.format(totalExpensesAmount)}`, 20, yPos);
      yPos += 15;
      doc.setFontSize(12);
      doc.text('Detalles de Gastos:', 20, yPos);
      yPos += 10;

      doc.autoTable({
        startY: yPos,
        head: [['Fecha', 'Descripción', 'Valor']],
        body: houseExpenses.map(exp => [exp.date, exp.description, formatter.format(exp.amount)]),
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      yPos = doc.lastAutoTable.finalY + 10;

      doc.save('reporte-por-casa.pdf');
    } else if (consolidatedReport && !consolidatedReport.classList.contains('hidden')) {
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
      const totalExpensesAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const totalIncomesAmount = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);
      const balance = totalIncomesAmount - totalExpensesAmount;

      doc.setFontSize(14);
      doc.text('Reporte Consolidado', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, yPos);
      yPos += 15;
      doc.text(`Total Gastos: ${formatter.format(totalExpensesAmount)}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Ingresos: ${formatter.format(totalIncomesAmount)}`, 20, yPos);
      yPos += 10;
      doc.text(`Saldo: ${formatter.format(balance)}`, 20, yPos);
      yPos += 15;
      doc.text('Gastos por Casa:', 20, yPos);
      yPos += 10;

      const houseExpensesData = houses.map(house => {
        const houseExpenses = filteredExpenses.filter(exp => exp.house === house);
        const totalHouseExpenses = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        return totalHouseExpenses > 0 ? [house, formatter.format(totalHouseExpenses)] : null;
      }).filter(item => item !== null);

      doc.autoTable({
        startY: yPos,
        head: [['Casa', 'Total Gastos']],
        body: houseExpensesData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      yPos = doc.lastAutoTable.finalY + 10;

      doc.save('reporte-consolidado.pdf');
    } else if (incomeReport && !incomeReport.classList.contains('hidden')) {
      const startDate = new Date(document.getElementById('incomeStartDate').value);
      const endDate = new Date(document.getElementById('incomeEndDate').value);
      const filteredIncomes = incomes.filter(inc => {
        const incDate = new Date(inc.date);
        return incDate >= startDate && incDate <= endDate;
      });
      const totalIncomesAmount = filteredIncomes.reduce((sum, inc) => sum + inc.amount, 0);

      doc.setFontSize(14);
      doc.text('Reporte Detallado de Ingresos', 20, yPos);
      yPos += 10;
      doc.setFontSize(12);
      doc.text(`Período: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 20, yPos);
      yPos += 10;
      doc.text(`Total Ingresos: ${formatter.format(totalIncomesAmount)}`, 20, yPos);
      yPos += 15;
      doc.text('Detalles de Ingresos:', 20, yPos);
      yPos += 10;

      doc.autoTable({
        startY: yPos,
        head: [['Fecha', 'Descripción', 'Valor']],
        body: filteredIncomes.map(inc => [inc.date, inc.description, formatter.format(inc.amount)]),
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 2 },
        headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
      });
      yPos = doc.lastAutoTable.finalY + 10;

      doc.save('reporte-ingresos.pdf');
    } else {
      alert('Por favor, genere un reporte antes de exportar a PDF.');
    }
  });

  // Backup
  document.getElementById('backupBtn').addEventListener('click', () => {
    const data = { houses, expenses, incomes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-casas.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import Backup
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
        saveData();
        updateHouseSelects();
        updateDashboard();
        updateExpensesList();
        updateIncomesList();
        alert('Backup importado correctamente.');
      } catch (err) {
        alert('Error al importar el backup. Asegúrese de que el archivo sea válido.');
      }
    };
    reader.readAsText(file);
  });

  // Sync with Google Drive
  document.getElementById('syncGoogleDrive').addEventListener('click', () => {
  console.log('Sync button clicked');
  saveDataToFirestore();
});
  

  // Apply Excel styles
  function applyExcelStyles(ws, houseExpenses, house) {
    const currentDate = new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });

    ws['A1'] = { v: 'Sistema de Gestión de Casas', t: 's' };
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    ws['A1'].s = { font: { name: 'Arial', sz: 14, bold: true }, alignment: { horizontal: 'center' } };

    ws['A2'] = { v: `Fecha de Generación: ${currentDate}`, t: 's' };
    ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } });
    ws['A2'].s = { font: { name: 'Arial', sz: 10 }, alignment: { horizontal: 'center' } };

    ws['A3'] = { v: '', t: 's' };
    ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });

    ws['A4'] = { v: `Detallado de Gastos - Casa: ${house}`, t: 's' };
    ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });
    ws['A4'].s = { font: { name: 'Arial', sz: 12, bold: true }, alignment: { horizontal: 'center' }, fill: { fgColor: { rgb: 'E6F0FA' } } };

    ws['A5'] = { v: '', t: 's' };
    ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });

    ws['A6'] = { v: 'Fecha', t: 's', s: { font: { name: 'Arial', bold: true }, fill: { fgColor: { rgb: 'B3CDE0' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
    ws['B6'] = { v: 'Descripción', t: 's', s: { font: { name: 'Arial', bold: true }, fill: { fgColor: { rgb: 'B3CDE0' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
    ws['C6'] = { v: 'Valor', t: 's', s: { font: { name: 'Arial', bold: true }, fill: { fgColor: { rgb: 'B3CDE0' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };

    for (let i = 0; i < houseExpenses.length; i++) {
      const row = i + 7;
      ws[`A${row}`] = { v: houseExpenses[i].date, t: 's', s: { font: { name: 'Arial' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
      ws[`B${row}`] = { v: houseExpenses[i].description, t: 's', s: { font: { name: 'Arial' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
      ws[`C${row}`] = { v: houseExpenses[i].amount, t: 'n', s: { font: { name: 'Arial' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: '$#,##0' } };
    }

    const totalRow = houseExpenses.length + 7;
    const totalAmount = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    ws[`A${totalRow}`] = { v: 'Total', t: 's', s: { font: { name: 'Arial', bold: true }, fill: { fgColor: { rgb: 'D3D3D3' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
    ws[`B${totalRow}`] = { v: '', t: 's', s: { border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } } };
    ws[`C${totalRow}`] = { v: totalAmount, t: 'n', s: { font: { name: 'Arial', bold: true }, fill: { fgColor: { rgb: 'D3D3D3' } }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }, numFmt: '$#,##0' } };
    ws['!merges'].push({ s: { r: totalRow - 1, c: 0 }, e: { r: totalRow - 1, c: 1 } });

    ws[`A${totalRow + 1}`] = { v: '', t: 's' };
    ws['!merges'].push({ s: { r: totalRow, c: 0 }, e: { r: totalRow, c: 2 } });

    ws[`A${totalRow + 2}`] = { v: 'Reporte generado por el Sistema de Gestión de Casas', t: 's' };
    ws['!merges'].push({ s: { r: totalRow + 1, c: 0 }, e: { r: totalRow + 1, c: 2 } });
    ws[`A${totalRow + 2}`].s = { font: { name: 'Arial', sz: 10, italic: true }, alignment: { horizontal: 'center' } };

    ws['!cols'] = [
      { wch: 10 },
      { wch: 30 },
      { wch: 15 }
    ];

    ws['!freeze'] = { xSplit: 0, ySplit: 6 };
  }

  // Export detailed expenses to PDF
  document.getElementById('exportDetailPdf').addEventListener('click', () => {
    const houseExpensesDetail = document.getElementById('houseExpensesDetail');
    if (houseExpensesDetail.classList.contains('hidden')) {
      alert('Por favor, seleccione una casa para ver el detallado antes de exportar.');
      return;
    }

    const house = document.getElementById('houseExpensesTitle').textContent.split(' - Casa: ')[1];
    const houseExpenses = expenses.filter(exp => exp.house === house);
    const totalExpensesAmount = houseExpenses.reduce((sum, exp) => sum + exp.amount, 0);

    const doc = new jsPDF();
    const currentDate = new Date().toLocaleString('es-CO', { dateStyle: 'full', timeStyle: 'short' });
    let yPos = 20;

    doc.setFontSize(18);
    doc.text('Sistema de Gestión de Casas', 20, yPos);
    yPos += 10;
    doc.setFontSize(10);
    doc.text(`Fecha de Generación: ${currentDate}`, 20, yPos);
    yPos += 10;
    doc.line(20, yPos, 190, yPos);
    yPos += 10;

    doc.setFontSize(14);
    doc.text(`Detallado de Gastos - Casa: ${house}`, 20, yPos);
    yPos += 10;
    doc.setFontSize(12);
    doc.text(`Total Gastos: ${formatter.format(totalExpensesAmount)}`, 20, yPos);
    yPos += 15;
    doc.text('Detalles:', 20, yPos);
    yPos += 10;

    doc.autoTable({
      startY: yPos,
      head: [['Fecha', 'Descripción', 'Valor']],
      body: houseExpenses.map(exp => [exp.date, exp.description, formatter.format(exp.amount)]),
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    doc.save(`detallado-gastos-${house}.pdf`);
  });

  // Export detailed expenses to Excel
  document.getElementById('exportDetailExcel').addEventListener('click', () => {
    const houseExpensesDetail = document.getElementById('houseExpensesDetail');
    if (houseExpensesDetail.classList.contains('hidden')) {
      alert('Por favor, seleccione una casa para ver el detallado antes de exportar.');
      return;
    }

    const house = document.getElementById('houseExpensesTitle').textContent.split(' - Casa: ')[1];
    const houseExpenses = expenses.filter(exp => exp.house === house);

    const wb = XLSX.utils.book_new();
    
    const wsData = [
      [''],
      [''],
      [''],
      [''],
      [''],
      ['Fecha', 'Descripción', 'Valor'],
      ...houseExpenses.map(exp => [exp.date, exp.description, exp.amount]),
      ['', '', ''],
      [''],
      ['']
    ];
    
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    applyExcelStyles(ws, houseExpenses, house);
    XLSX.utils.book_append_sheet(wb, ws, house);

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detallado-gastos-${house}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Export all expenses to Excel
  document.getElementById('exportExcelBtn').addEventListener('click', () => {
    const wb = XLSX.utils.book_new();
    houses.forEach(house => {
      const houseExpenses = expenses.filter(exp => exp.house === house);
      if (houseExpenses.length > 0) {
        const wsData = [
          [''],
          [''],
          [''],
          [''],
          [''],
          ['Fecha', 'Descripción', 'Valor'],
          ...houseExpenses.map(exp => [exp.date, exp.description, exp.amount]),
          ['', '', ''],
          [''],
          ['']
        ];
        
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        applyExcelStyles(ws, houseExpenses, house);
        XLSX.utils.book_append_sheet(wb, ws, house);
      }
    });

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'gastos-por-casa.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Edit transaction
  const editModal = document.getElementById('editModal');
  const cancelEditBtn = document.getElementById('cancelEdit');
  const saveEditBtn = document.getElementById('saveEdit');

  cancelEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
    document.getElementById('editDescription').value = '';
    document.getElementById('editAmount').value = '';
    document.getElementById('editAmount').dataset.value = '0';
    document.getElementById('editDate').value = '2025-06-02';
    document.getElementById('editHouse').value = '';
  });

  saveEditBtn.addEventListener('click', () => {
    const description = document.getElementById('editDescription').value.trim();
    const amount = parseInt(document.getElementById('editAmount').dataset.value) || 0;
    const date = document.getElementById('editDate').value;
    const house = document.getElementById('editHouse').value;

    if (!description || description === '') {
      alert('Por favor, ingrese una descripción.');
      return;
    }
    if (amount <= 0) {
      alert('Por favor, ingrese un valor válido mayor a 0.');
      return;
    }
    if (!date) {
      alert('Por favor, seleccione una fecha.');
      return;
    }

    if (window.editType === 'expense') {
      expenses[window.editIndex] = { description, amount, date, house };
    } else {
      incomes[window.editIndex] = { description, amount, date };
    }
    saveData();
    updateDashboard();
    updateExpensesList();
    updateIncomesList();
    editModal.classList.add('hidden');
  });

  // Navigation between sections
  document.querySelectorAll('button[data-section]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('#dashboard, #gastos, #ingresos, #reportes').forEach(section => {
        section.classList.add('hidden');
      });
      document.getElementById(button.dataset.section).classList.remove('hidden');
      updateHouseSelects();
      updateDashboard();
      updateExpensesList();
      updateIncomesList();
    });
  });

  // Initialize
  loadGapi();
});