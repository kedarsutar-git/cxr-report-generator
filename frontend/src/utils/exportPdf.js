import jsPDF from 'jspdf';

export function exportReportPdf(result, imageDataUrl = null) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = margin;

  // Header
  doc.setFillColor(6, 182, 212);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CXR Report Generator', margin, 40);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('AI-Generated Radiology Report · Research Prototype', margin, 56);
  y = 100;

  // Metadata box
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, pageW - 2 * margin, 50, 4, 4, 'FD');
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin + 10, y + 16);
  doc.text(`Model: ${result.model_version || 'v1.0'}`, margin + 10, y + 30);
  doc.text(`Latency: ${result.latency_ms} ms`, margin + 10, y + 44);
  y += 70;

  // X-ray image (optional)
  if (imageDataUrl) {
    try {
      const imgW = 180;
      const imgH = 180;
      doc.addImage(imageDataUrl, 'JPEG', margin, y, imgW, imgH);
      y += imgH + 20;
    } catch (e) {
      console.warn('Could not embed image:', e);
    }
  }

  // Findings
  doc.setFontSize(11);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text('FINDINGS', margin, y);
  y += 16;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  const findings = doc.splitTextToSize(result.findings || '—', pageW - 2 * margin);
  doc.text(findings, margin, y);
  y += findings.length * 14 + 20;

  // Impression
  doc.setFontSize(11);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text('IMPRESSION', margin, y);
  y += 16;

  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  const impression = doc.splitTextToSize(result.impression || '—', pageW - 2 * margin);
  doc.text(impression, margin, y);
  y += impression.length * 14 + 20;

  // Pathologies
  doc.setFontSize(11);
  doc.setTextColor(6, 182, 212);
  doc.setFont('helvetica', 'bold');
  doc.text('PATHOLOGY CONFIDENCE', margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  doc.setFont('helvetica', 'normal');
  result.findings_tags.forEach((t) => {
    const pct = (t.probability * 100).toFixed(1);
    doc.text(`${t.label.replace(/_/g, ' ')}`, margin, y);

    // Bar
    const barW = 200;
    const barX = pageW - margin - barW - 50;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(barX, y - 8, barW, 6, 3, 3, 'F');

    const color = t.probability > 0.65 ? [244, 63, 94] :
                  t.probability > 0.35 ? [245, 158, 11] :
                                         [6, 182, 212];
    doc.setFillColor(...color);
    doc.roundedRect(barX, y - 8, barW * t.probability, 6, 3, 3, 'F');

    doc.text(`${pct}%`, pageW - margin, y);
    y += 18;
  });

  // Footer disclaimer
  y = doc.internal.pageSize.getHeight() - 60;
  doc.setFontSize(8);
  doc.setTextColor(180, 83, 9);
  doc.text('⚠ Research prototype. Not a medical device. All outputs must be reviewed by a qualified radiologist.', margin, y);
  doc.text('before clinical use.', margin, y + 12);

  doc.save(`radiology-report-${Date.now()}.pdf`);
}