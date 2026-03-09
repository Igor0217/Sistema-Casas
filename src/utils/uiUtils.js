// src/utils/uiUtils.js
// Utilidades de interfaz de usuario: formateadores y notificaciones

import { formatter } from './formatter.js';

/**
 * Formatea el valor de un <input> tipo moneda a medida que el usuario escribe.
 * @param {HTMLInputElement} input
 */
export function formatInput(input) {
  let value = input.value.replace(/[^0-9]/g, '');
  input.dataset.value = value;
  input.value = value ? formatter.format(parseInt(value, 10)) : '';
}

/**
 * Muestra una notificación emergente en la esquina superior derecha.
 * @param {string} message  Mensaje a mostrar
 * @param {'success'|'error'|'warning'|'info'} [type='info']
 */
export function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `fixed top-4 right-4 p-4 rounded-lg text-white z-50 transform transition-transform duration-300 translate-x-full ${{
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  }[type]}`;
  notification.textContent = message;

  document.body.appendChild(notification);
  // Animar entrada
  setTimeout(() => notification.classList.remove('translate-x-full'), 100);
  // Animar salida y remover
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => document.body.removeChild(notification), 300);
  }, 3000);

}
/**
 * @param {(houseName:string) => void} onGenerate
 */
export function initHouseReportListener(onGenerate) {
  const btn = document.getElementById('generateHouseReport');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const houseName = document.getElementById('reportHouse').value;
    onGenerate(houseName);
  });
}


