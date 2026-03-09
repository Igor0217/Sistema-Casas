// src/utils/formatter.js
// Definición central del formateador de moneda para toda la app

/**
 * Intl.NumberFormat para pesos colombianos.
 * Uso: formatter.format(numero)
 */
export const formatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
