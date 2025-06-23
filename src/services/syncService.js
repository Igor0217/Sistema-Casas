// src/services/syncService.js
import { db } from '../config/firebase.js';

/**
 * Inicia el listener en Firestore y llama a `onChange(data)` 
 * cada vez que haya un snapshot nuevo.
 * 
 * @param {(data: {houses, expenses, incomes}) => void} onChange 
 */
export function setupRealtimeSync(onChange) {
  console.log('Configurando sincronización en tiempo real…');

  db.collection('userData')
    .doc('appData')
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          console.log('Cambio detectado en Firestore');
          onChange(doc.data());
        }
      },
      (error) => {
        console.error('Error en sincronización en tiempo real:', error);
      }
    );
}
