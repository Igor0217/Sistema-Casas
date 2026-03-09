// src/services/dataService.js
import { db } from '../config/firebase.js';

/**
 * Guarda los arrays en Firestore.
 * @param {Array} houses
 * @param {Array} expenses
 * @param {Array} incomes
 * @param {Function} saveLocal backup a localStorage
 * @param {Function} notify   notificaciones UI
 */
export async function saveDataToFirestore(houses, expenses, incomes, saveLocal, notify) {
  console.log('Guardando datos en Firestore…');
  const data = { houses, expenses, incomes };

  try {
    await db.collection('userData').doc('appData').set(data);
    console.log('Datos guardados en Firestore');
    notify('Datos sincronizados con Firestore.', 'success');
  } catch (err) {
    console.error('Error al guardar en Firestore:', err);
    notify('Falló sincronización. Guardando localmente.', 'error');
    saveLocal();
  }
}

/**
 * Carga datos de Firestore.  
 * Retorna { houses, expenses, incomes } o null si no hay doc.
 */
export async function loadDataFromFirestore() {
  console.log('Cargando datos desde Firestore…');
  try {
    const doc = await db.collection('userData').doc('appData').get();
    if (doc.exists) {
      console.log('Datos cargados desde Firestore');
      return doc.data();
    } else {
      console.log('No hay datos en Firestore');
      return null;
    }
  } catch (err) {
    console.error('Error al cargar desde Firestore:', err);
    return null;
  }
}
