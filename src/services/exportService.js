// src/services/exportService.js
// Módulo para exportaciones a PDF y Excel
import { formatter } from '../utils/formatter.js';
import { generateHouseReportHTML } from './reportService.js';

/**
 * Exporta el contenido de un contenedor HTML a PDF profesional.
 * VERSION SIMPLIFICADA - Solo procesa tablas para evitar duplicados
 */
export function exportReportToPDF(containerId, defaultTitle = 'reporte') {
  const reportEl = document.getElementById(containerId);
  if (!reportEl || !reportEl.innerHTML.trim()) {
    throw new Error('Contenedor vacío o no encontrado.');
  }
  
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  
  const titleEl = reportEl.querySelector('h3');
  const titleText = titleEl?.textContent || defaultTitle;

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 220, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('SISTEMA DE GESTIÓN DE CASAS', 20, 15);
  doc.setFontSize(14);
  doc.text(titleText, 20, 25);
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 20, 35);
  doc.setTextColor(0, 0, 0);

  let y = 50;

  // SOLO procesar las tablas dentro de sections
  const sections = reportEl.querySelectorAll('section');
  
  sections.forEach((section) => {
    const sectionTitle = section.querySelector('h4');
    const table = section.querySelector('table');
    
    // Solo procesar si hay una tabla
    if (table && table.querySelector('tbody tr')) {
      // Nueva página si es necesario
      if (y > 240) { 
        doc.addPage(); 
        y = 20; 
      }

      // Título de la sección
      if (sectionTitle) {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        
        // Color según el tipo de sección
        if (sectionTitle.textContent.includes('Ingresos')) {
          doc.setTextColor(0, 128, 0); // Verde
        } else if (sectionTitle.textContent.includes('Gastos')) {
          doc.setTextColor(220, 38, 38); // Rojo
        }
        
        doc.text(sectionTitle.textContent, 20, y);
        doc.setTextColor(0, 0, 0); // Volver a negro
        doc.setFont(undefined, 'normal');
        y += 3;
      }

      // Datos de la tabla
      const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
      const body = Array.from(table.querySelectorAll('tbody tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent)
      );
      
      // Footer (totales)
      const footerRows = [];
      const tfoot = table.querySelector('tfoot');
      if (tfoot) {
        Array.from(tfoot.querySelectorAll('tr')).forEach(tr => {
          footerRows.push(Array.from(tr.querySelectorAll('td')).map(td => td.textContent));
        });
      }

      // Crear tabla en PDF
      if (body.length > 0) {
        const tableColor = sectionTitle?.textContent.includes('Ingresos') 
          ? [34, 197, 94]  // Verde para ingresos
          : [239, 68, 68]; // Rojo para gastos

        doc.autoTable({
          startY: y,
          head: [headers],
          body: body,
          foot: footerRows.length > 0 ? footerRows : undefined,
          theme: 'striped',
          styles: { 
            fontSize: 9, 
            cellPadding: 2,
            textColor: [0, 0, 0]
          },
          headStyles: { 
            fillColor: tableColor,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
          },
          footStyles: { 
            fillColor: [245, 245, 245], 
            fontStyle: 'bold',
            textColor: [0, 0, 0], // NEGRO para que se vea bien
            fontSize: 10
          },
          columnStyles: {
            2: { halign: 'right' } // Alinear valores a la derecha
          }
        });
        
        y = doc.lastAutoTable.finalY + 20;
      }
    }
  });

  // Si no hay tablas, buscar contenido alternativo
  if (sections.length === 0 || y === 50) {
    // Buscar contenido general del reporte
    const content = reportEl.textContent.trim();
    if (content) {
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(content, 170);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 20, y);
        y += 6;
      });
    }
  }

  // Footer en todas las páginas
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(`Página ${i} de ${pages}`, 20, 290);
  }

  doc.save(`${titleText.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

/**
 * Exporta el reporte consolidado avanzado a Excel.
 * Versión limpia sin caracteres especiales
 */
export function exportConsolidatedReportToExcel(state, reportType, startDate, endDate) {
  const { houses, expenses, incomes } = state;
  const wb = XLSX.utils.book_new();

  // Filtrar por fechas
  const filteredExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
  const filteredIncomes = incomes.filter(i => {
    const d = new Date(i.date);
    return d >= startDate && d <= endDate;
  });

  // Total de ingresos del conjunto
  const totalConjuntoIncomes = filteredIncomes.filter(i => !i.house).reduce((s, i) => s + i.amount, 0);

  // Separar casas por tipo
  const conjuntoHouses = houses.filter(h => h.type === 'conjunto');
  const independienteHouses = houses.filter(h => h.type === 'independiente');

  // Calcular gastos totales del conjunto
  const totalConjuntoExpenses = conjuntoHouses.reduce((sum, house) => {
    const houseExp = filteredExpenses.filter(e => e.house === house.name).reduce((s, e) => s + e.amount, 0);
    return sum + houseExp;
  }, 0);

  const saldoConjunto = totalConjuntoIncomes - totalConjuntoExpenses;

  // 1. HOJA DE RESUMEN GENERAL
  const summaryData = [
    ['REPORTE CONSOLIDADO AVANZADO'],
    [''],
    [`Tipo: ${reportType === 'general' ? 'General' : reportType === 'conjunto' ? 'Conjunto Residencial' : reportType === 'independientes' ? 'Casas Independientes' : 'Detallado por Casa'}`],
    [`Período: ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`],
    [`Generado: ${new Date().toLocaleString('es-CO')}`],
    [''],
    ['RESUMEN POR CASA'],
    [''],
    ['Casa', 'Tipo', 'Ingresos', 'Gastos', 'Saldo']
  ];

  // Datos de cada casa
  houses.forEach(house => {
    const houseExp = filteredExpenses.filter(e => e.house === house.name).reduce((s,e) => s+e.amount, 0);
    let houseInc = 0;
    let saldo = 0;

    if (house.type === 'independiente') {
      houseInc = filteredIncomes.filter(i => i.house === house.name).reduce((s,i) => s+i.amount, 0);
      saldo = houseInc - houseExp;
    } else {
      houseInc = totalConjuntoIncomes;
      saldo = saldoConjunto;
    }

    summaryData.push([
      house.name,
      house.type === 'conjunto' ? 'Conjunto' : 'Independiente',
      formatter.format(houseInc),
      formatter.format(houseExp),
      formatter.format(saldo)
    ]);
  });

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // 2. HOJA CONSOLIDADA - CASAS CONJUNTO
  if (conjuntoHouses.length > 0) {
    const conjuntoData = [
      ['CONSOLIDADO - CASAS CONJUNTO'],
      [''],
      [`Período: ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`],
      [''],
      ['Total Ingresos Conjunto:', formatter.format(totalConjuntoIncomes)],
      ['Saldo General:', formatter.format(saldoConjunto)],
      [''],
      ['DETALLE POR CASA'],
      [''],
      ['Casa', 'Gastos']
    ];

    conjuntoHouses.forEach(house => {
      const houseExp = filteredExpenses.filter(e => e.house === house.name).reduce((s,e) => s+e.amount, 0);
      conjuntoData.push([house.name, formatter.format(houseExp)]);
    });

    conjuntoData.push(['']);
    conjuntoData.push(['TOTAL GASTOS', formatter.format(totalConjuntoExpenses)]);

    const conjuntoWs = XLSX.utils.aoa_to_sheet(conjuntoData);
    conjuntoWs['!cols'] = [{ wch: 30 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, conjuntoWs, 'Consolidado Conjunto');
  }

  // 3. HOJA CONSOLIDADA - CASAS INDEPENDIENTES
  if (independienteHouses.length > 0) {
    const indepData = [
      ['CONSOLIDADO - CASAS INDEPENDIENTES'],
      [''],
      [`Período: ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`],
      [''],
      ['Casa', 'Ingresos', 'Gastos', 'Saldo']
    ];

    let totalIndepIncomes = 0;
    let totalIndepExpenses = 0;

    independienteHouses.forEach(house => {
      const houseInc = filteredIncomes.filter(i => i.house === house.name).reduce((s,i) => s+i.amount, 0);
      const houseExp = filteredExpenses.filter(e => e.house === house.name).reduce((s,e) => s+e.amount, 0);
      totalIndepIncomes += houseInc;
      totalIndepExpenses += houseExp;
      indepData.push([
        house.name, 
        formatter.format(houseInc), 
        formatter.format(houseExp), 
        formatter.format(houseInc - houseExp)
      ]);
    });

    indepData.push(['']);
    indepData.push([
      'TOTALES', 
      formatter.format(totalIndepIncomes), 
      formatter.format(totalIndepExpenses), 
      formatter.format(totalIndepIncomes - totalIndepExpenses)
    ]);

    const indepWs = XLSX.utils.aoa_to_sheet(indepData);
    indepWs['!cols'] = [
      { wch: 25 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, indepWs, 'Consolidado Independientes');
  }

  // 4. HOJAS INDIVIDUALES POR CASA
  if (reportType === 'por_casa' || reportType === 'general') {
    houses.forEach(house => {
      const houseExpenses = filteredExpenses.filter(e => e.house === house.name);
      const houseIncomes = filteredIncomes.filter(i => i.house === house.name);
      const data = [];

      // Encabezado
      data.push([`DETALLE - ${house.name}`]);
      data.push(['']);
      data.push([`Tipo: ${house.type === 'conjunto' ? 'Conjunto Residencial' : 'Casa Independiente'}`]);
      data.push([`Período: ${startDate.toLocaleDateString('es-CO')} - ${endDate.toLocaleDateString('es-CO')}`]);
      
      if (house.type === 'conjunto') {
        data.push(['']);
        data.push(['Total Ingresos Conjunto:', formatter.format(totalConjuntoIncomes)]);
        data.push(['Saldo:', formatter.format(saldoConjunto)]);
      }

      data.push(['']);

      // Ingresos para independientes
      if (house.type === 'independiente' && houseIncomes.length > 0) {
        data.push(['INGRESOS DETALLADOS']);
        data.push(['Fecha', 'Descripción', 'Valor']);
        
        houseIncomes.forEach(inc => {
          data.push([inc.date, inc.description, formatter.format(inc.amount)]);
        });
        
        const totalInc = houseIncomes.reduce((s,i) => s+i.amount, 0);
        data.push(['']);
        data.push(['', 'TOTAL INGRESOS', formatter.format(totalInc)]);
        data.push(['']);
      }

      // Gastos
      if (houseExpenses.length > 0) {
        data.push(['GASTOS DETALLADOS']);
        data.push(['Fecha', 'Descripción', 'Valor']);
        
        houseExpenses.forEach(exp => {
          data.push([exp.date, exp.description, formatter.format(exp.amount)]);
        });
        
        const totalExp = houseExpenses.reduce((s,e) => s+e.amount, 0);
        data.push(['']);
        data.push(['', 'TOTAL GASTOS', formatter.format(totalExp)]);
      }

      // Saldo final para independientes
      if (house.type === 'independiente') {
        data.push(['']);
        const totalInc = houseIncomes.reduce((s,i) => s+i.amount, 0);
        const totalExp = houseExpenses.reduce((s,e) => s+e.amount, 0);
        data.push(['']);
        data.push(['', 'SALDO FINAL', formatter.format(totalInc - totalExp)]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 15 },
        { wch: 42 },
        { wch: 20 }
      ];

      const sheetName = house.name.substring(0, 31).replace(/[\\\/\?\*\[\]]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });
  }

  XLSX.writeFile(
    wb,
    `reporte-consolidado-${reportType}-${startDate.toISOString().slice(0,10)}-${endDate.toISOString().slice(0,10)}.xlsx`
  );
}

/**
 * Exporta a PDF el bloque de detalle de una casa.
 */
export function exportHouseDetailToPDF(state, houseName) {
  const { houses, expenses, incomes } = state;
  const house = houses.find(h => h.name === houseName);
  if (!house) return;

  const houseExpenses = expenses.filter(e => e.house === houseName);
  const houseIncomes = incomes.filter(i => i.house === houseName);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`Detalle de ${houseName}`, 14, 18);
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`Tipo: ${house.type === 'conjunto' ? 'Conjunto Residencial' : 'Casa Independiente'}`, 14, 26);

  let y = 40;

  const totalExp = houseExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalInc = houseIncomes.reduce((sum, i) => sum + i.amount, 0);
  const balance = totalInc - totalExp;

  doc.setFontSize(11);
  if (house.type === 'independiente') {
    doc.text(`Total Ingresos: ${formatter.format(totalInc)}`, 14, y);
    doc.text(`Total Gastos:    ${formatter.format(totalExp)}`, 14, y + 6);
    doc.text(`Saldo:           ${formatter.format(balance)}`, 14, y + 12);
    y += 20;
  } else {
    doc.text(`Total Gastos:    ${formatter.format(totalExp)}`, 14, y);
    y += 12;
  }

  // Tabla de gastos
  if (houseExpenses.length) {
    doc.autoTable({
      startY: y,
      head: [['Fecha','Descripción','Valor']],
      body: houseExpenses.map(e => [e.date, e.description, formatter.format(e.amount)]),
      theme: 'striped',
      headStyles: { fillColor:[59,130,246], textColor:[255,255,255], fontStyle:'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: 'right' } }
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Tabla de ingresos (solo para independientes)
  if (house.type === 'independiente' && houseIncomes.length) {
    doc.autoTable({
      startY: y,
      head: [['Fecha','Descripción','Valor']],
      body: houseIncomes.map(i => [i.date, i.description, formatter.format(i.amount)]),
      theme: 'grid',
      headStyles: { fillColor:[34,197,94], textColor:[255,255,255], fontStyle:'bold' },
      styles: { fontSize: 9, cellPadding: 2 },
      columnStyles: { 2: { halign: 'right' } }
    });
  }

  doc.save(`detalle-${houseName.replace(/\s+/g,'-').toLowerCase()}.pdf`);
}

/**
 * Exporta a Excel el detalle de una casa
 */
export function exportHouseDetailToExcel(state, houseName) {
  const { houses, expenses, incomes } = state;
  const house = houses.find(h => h.name === houseName);
  if (!house) return;

  const houseExpenses = expenses.filter(e => e.house === houseName);
  const houseIncomes = incomes.filter(i => i.house === houseName);

  const wb = XLSX.utils.book_new();
  const data = [];

  // Encabezado
  data.push([`DETALLE - ${houseName}`]);
  data.push(['']);
  data.push([`Tipo: ${house.type === 'conjunto' ? 'Conjunto Residencial' : 'Casa Independiente'}`]);
  data.push([`Fecha de generación: ${new Date().toLocaleDateString('es-CO')}`]);
  data.push(['']);

  // Resumen financiero
  data.push(['RESUMEN FINANCIERO']);
  data.push(['']);
  
  if (house.type === 'independiente') {
    const totalInc = houseIncomes.reduce((s,i) => s+i.amount, 0);
    const totalExp = houseExpenses.reduce((s,e) => s+e.amount, 0);
    const balance = totalInc - totalExp;
    
    data.push(['Total Ingresos:', formatter.format(totalInc)]);
    data.push(['Total Gastos:', formatter.format(totalExp)]);
    data.push(['']);
    data.push(['SALDO:', formatter.format(balance)]);
  } else {
    const totalExp = houseExpenses.reduce((s,e) => s+e.amount, 0);
    data.push(['Total Gastos:', formatter.format(totalExp)]);
  }
  
  data.push(['']);

  // Gastos detallados
  if (houseExpenses.length) {
    data.push(['GASTOS DETALLADOS']);
    data.push(['Fecha', 'Descripción', 'Valor']);
    
    houseExpenses.forEach(e => {
      data.push([e.date, e.description, formatter.format(e.amount)]);
    });
    
    const totalExp = houseExpenses.reduce((s,e) => s+e.amount, 0);
    data.push(['']);
    data.push(['', 'TOTAL GASTOS', formatter.format(totalExp)]);
    data.push(['']);
  }

  // Ingresos detallados (solo independientes)
  if (house.type === 'independiente' && houseIncomes.length) {
    data.push(['INGRESOS DETALLADOS']);
    data.push(['Fecha', 'Descripción', 'Valor']);
    
    houseIncomes.forEach(i => {
      data.push([i.date, i.description, formatter.format(i.amount)]);
    });
    
    const totalInc = houseIncomes.reduce((s,i) => s+i.amount, 0);
    data.push(['']);
    data.push(['', 'TOTAL INGRESOS', formatter.format(totalInc)]);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 42 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Detalle');
  XLSX.writeFile(wb, `detalle-${houseName.replace(/\s+/g,'-').toLowerCase()}.xlsx`);
}

/**
 * Exporta a Excel un reporte completo con todas las casas
 */
export function exportAllHousesToExcel(state) {
  const { houses, expenses, incomes } = state;
  const wb = XLSX.utils.book_new();

  const summary = [
    ['SISTEMA DE GESTIÓN DE CASAS'],
    [''],
    [`Generado: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`],
    [''],
    ['REPORTE COMPLETO'],
    [''],
    ['Casa', 'Tipo', 'Ingresos', 'Gastos', 'Saldo/Total Gastos']
  ];

  houses.forEach(house => {
    const exp = expenses.filter(e => e.house === house.name).reduce((s,e)=>s+e.amount,0);
    const inc = incomes.filter(i => i.house === house.name).reduce((s,i)=>s+i.amount,0);
    if (house.type === 'conjunto') {
      summary.push([
        house.name, 
        'Conjunto Residencial', 
        '-', 
        formatter.format(exp), 
        formatter.format(exp)
      ]);
    } else {
      summary.push([
        house.name, 
        'Independiente', 
        formatter.format(inc), 
        formatter.format(exp), 
        formatter.format(inc-exp)
      ]);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(summary);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Reporte Completo');
  XLSX.writeFile(wb, `reporte-completo-${new Date().toISOString().slice(0,10)}.xlsx`);
}