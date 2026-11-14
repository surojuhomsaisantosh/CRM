import jsPDF from 'jspdf';

export async function generateMonitoringGuidePdf(optionsOrTitle?: { download?: boolean } | string) {
  const title = typeof optionsOrTitle === 'string' ? optionsOrTitle : 'System Monitoring Guide';
  const shouldDownload = typeof optionsOrTitle === 'object' ? optionsOrTitle.download !== false : true;

  const doc = new jsPDF();
  doc.setFontSize(18);
  doc.text(title, 14, 20);
  doc.setFontSize(12);
  doc.text('This document outlines the failure monitoring protocols, webhooks, and alerts.', 14, 30);

  if (shouldDownload) {
    doc.save('System_Monitoring_Guide.pdf');
  }
  return doc;
}
