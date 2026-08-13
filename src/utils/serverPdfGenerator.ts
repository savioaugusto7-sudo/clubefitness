import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export async function generateContractPDFBase64(contractHtmlOrText: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Clean HTML tags into structured text
  const cleanText = contractHtmlOrText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const lines = cleanText.split('\n');
  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  const margin = 45;
  const maxWidth = pageWidth - margin * 2;
  const fontSize = 9;
  const lineHeight = 13;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Header Title
  page.drawText('CLUBE FITNESS FISIO - CONTRATO DE PRESTAÇÃO DE SERVIÇOS', {
    x: margin,
    y: y,
    size: 11,
    font: helveticaBold,
    color: rgb(0.06, 0.72, 0.5)
  });
  y -= 22;

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      y -= 6;
      continue;
    }

    const isHeading =
      /^[0-9]+\./.test(trimmed) ||
      trimmed.startsWith('CLÁUSULA') ||
      trimmed.startsWith('CONTRATO') ||
      trimmed.startsWith('CONTRATANTE:') ||
      trimmed.startsWith('CONTRATADA:');

    const currentFont = isHeading ? helveticaBold : helvetica;
    const currentFontSize = isHeading ? 9.5 : fontSize;

    // Word wrap
    const words = trimmed.split(' ');
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = currentFont.widthOfTextAtSize(testLine, currentFontSize);

      if (testWidth > maxWidth && currentLine) {
        if (y < margin + 25) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        page.drawText(currentLine, {
          x: margin,
          y: y,
          size: currentFontSize,
          font: currentFont,
          color: rgb(0.12, 0.12, 0.12)
        });
        y -= lineHeight;
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      if (y < margin + 25) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(currentLine, {
        x: margin,
        y: y,
        size: currentFontSize,
        font: currentFont,
        color: rgb(0.12, 0.12, 0.12)
      });
      y -= (isHeading ? lineHeight + 4 : lineHeight);
    }
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');
  return `data:application/pdf;base64,${base64}`;
}
