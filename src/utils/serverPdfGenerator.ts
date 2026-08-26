import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

function sanitizeTextForPdf(text: string): string {
  if (!text) return '';
  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, '-')
    .replace(/•/g, '-')
    // keep printable ASCII and Latin-1 supplement (covers all Portuguese accented letters)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
}

interface TextSpan {
  text: string;
  isBold: boolean;
}

interface Block {
  type: 'title' | 'clause' | 'paragraph' | 'bullet' | 'empty';
  spans: TextSpan[];
}

export async function generateContractPDFBase64(contractHtmlOrText: string): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const blocks: Block[] = [];
  const raw = contractHtmlOrText || '';

  // Check if it's HTML
  if (/<[a-z][\s\S]*>/i.test(raw)) {
    const cleanedHtml = raw
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

    const parseSpans = (innerHtml: string): TextSpan[] => {
      const spans: TextSpan[] = [];
      const normalized = innerHtml.replace(/<br\s*\/?>/gi, ' ');
      const spanRegex = /<(strong|b)[^>]*>([\s\S]*?)<\/\1>|([^<]+)/gi;
      let sMatch: RegExpExecArray | null;
      while ((sMatch = spanRegex.exec(normalized)) !== null) {
        if (sMatch[1] && sMatch[2]) {
          const boldText = sanitizeTextForPdf(sMatch[2].replace(/<[^>]+>/g, '').trim());
          if (boldText) spans.push({ text: boldText, isBold: true });
        } else if (sMatch[3]) {
          const regularText = sanitizeTextForPdf(sMatch[3].replace(/<[^>]+>/g, '').trim());
          if (regularText) spans.push({ text: regularText, isBold: false });
        }
      }
      return spans;
    };

    const tagRegex = /<(h[1-6]|p|li|div)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(cleanedHtml)) !== null) {
      const tagName = match[1].toLowerCase();
      const content = match[2];

      if (tagName === 'h1' || tagName === 'h2') {
        const text = sanitizeTextForPdf(content.replace(/<[^>]+>/g, '').trim());
        if (text) {
          blocks.push({
            type: 'title',
            spans: [{ text, isBold: true }]
          });
        }
      } else if (tagName === 'h3' || tagName === 'h4' || tagName === 'h5' || tagName === 'h6') {
        const text = sanitizeTextForPdf(content.replace(/<[^>]+>/g, '').trim());
        if (text) {
          blocks.push({
            type: 'clause',
            spans: [{ text, isBold: true }]
          });
        }
      } else if (tagName === 'li') {
        const spans = parseSpans(content);
        if (spans.length > 0) {
          blocks.push({
            type: 'bullet',
            spans
          });
        }
      } else {
        const spans = parseSpans(content);
        if (spans.length > 0) {
          const fullText = spans.map((s) => s.text).join(' ').trim();
          if (/^TERMO DE ADESÃO/i.test(fullText)) {
            blocks.push({
              type: 'title',
              spans: [{ text: fullText, isBold: true }]
            });
          } else if (/^CLÁUSULA\s+[A-Z0-9]+/i.test(fullText) && fullText.length < 90) {
            blocks.push({
              type: 'clause',
              spans: [{ text: fullText, isBold: true }]
            });
          } else {
            blocks.push({
              type: 'paragraph',
              spans
            });
          }
        }
      }
    }
  }

  // Fallback for plain text
  if (blocks.length === 0) {
    const lines = raw.split('\n');
    for (const rawLine of lines) {
      const clean = sanitizeTextForPdf(rawLine.trim());
      if (!clean) {
        blocks.push({ type: 'empty', spans: [] });
        continue;
      }
      if (/^TERMO DE ADESÃO/i.test(clean) || (clean.toUpperCase() === clean && clean.includes('CONTRATO') && clean.length < 80)) {
        blocks.push({ type: 'title', spans: [{ text: clean, isBold: true }] });
      } else if (/^CLÁUSULA\s+[A-Z0-9]+/i.test(clean) || /^[0-9]+\.\s+[A-Z\s]{4,}/.test(clean)) {
        blocks.push({ type: 'clause', spans: [{ text: clean, isBold: true }] });
      } else if (clean.startsWith('•') || clean.startsWith('-')) {
        blocks.push({ type: 'bullet', spans: [{ text: clean.replace(/^[\s•-]+/, '').trim(), isBold: false }] });
      } else {
        const prefixMatch = clean.match(/^(CONTRATAD[AO]:|CONTRATANTE:|BENEFICIÁRIO\(A\)[^:]*:|Parágrafo Único:|Parágrafo Primeiro:|Parágrafo Segundo:|[0-9]+\.[0-9]+\.?)\s*(.*)$/i);
        if (prefixMatch) {
          blocks.push({
            type: 'paragraph',
            spans: [
              { text: prefixMatch[1], isBold: true },
              { text: prefixMatch[2], isBold: false }
            ]
          });
        } else {
          blocks.push({ type: 'paragraph', spans: [{ text: clean, isBold: false }] });
        }
      }
    }
  }

  // Layout Engine
  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  const margin = 45;
  const topMarginFirstPage = 50;
  const topMarginOtherPages = 55;
  const bottomMargin = 50;
  const maxWidth = pageWidth - margin * 2;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - topMarginFirstPage;

  const checkPageBreak = (neededHeight: number) => {
    if (y - neededHeight < bottomMargin) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - topMarginOtherPages;
      return true;
    }
    return false;
  };

  for (const block of blocks) {
    if (block.type === 'empty') {
      y -= 6;
      continue;
    }

    if (block.type === 'title') {
      const titleText = block.spans.map((s) => s.text).join(' ').toUpperCase();
      const fontSize = 12;
      const lineHeight = 16;
      y -= 4;
      checkPageBreak(lineHeight + 16);

      const words = titleText.split(' ');
      let currentLine = '';
      const lines: string[] = [];

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = helveticaBold.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      for (const l of lines) {
        checkPageBreak(lineHeight);
        const lineWidth = helveticaBold.widthOfTextAtSize(l, fontSize);
        const xCentered = margin + (maxWidth - lineWidth) / 2;
        page.drawText(l, {
          x: xCentered,
          y,
          size: fontSize,
          font: helveticaBold,
          color: rgb(0.08, 0.08, 0.08)
        });
        y -= lineHeight;
      }
      y -= 10;
      continue;
    }

    if (block.type === 'clause') {
      const clauseText = block.spans.map((s) => s.text).join(' ').trim();
      const fontSize = 9.5;
      const lineHeight = 13.5;

      y -= 8;
      checkPageBreak(lineHeight + 20);

      const words = clauseText.split(' ');
      let currentLine = '';
      const lines: string[] = [];

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = helveticaBold.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);

      for (const l of lines) {
        checkPageBreak(lineHeight);
        page.drawText(l, {
          x: margin,
          y,
          size: fontSize,
          font: helveticaBold,
          color: rgb(0.08, 0.08, 0.08)
        });
        y -= lineHeight;
      }

      y += 2;
      page.drawLine({
        start: { x: margin, y },
        end: { x: pageWidth - margin, y },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8)
      });
      y -= 6;
      continue;
    }

    // Paragraph or Bullet
    const isBullet = block.type === 'bullet';
    const indent = isBullet ? 14 : 0;
    const effMaxWidth = maxWidth - indent;
    const fontSize = 9;
    const lineHeight = 13;

    interface WordToken {
      word: string;
      isBold: boolean;
    }
    const tokens: WordToken[] = [];

    if (isBullet) {
      tokens.push({ word: '•', isBold: true });
    }

    for (const span of block.spans) {
      const words = span.text.split(/\s+/).filter(Boolean);
      for (const w of words) {
        tokens.push({ word: w, isBold: span.isBold });
      }
    }

    if (tokens.length === 0) continue;

    interface LineData {
      tokens: WordToken[];
      width: number;
    }
    const wrappedLines: LineData[] = [];
    let curTokens: WordToken[] = [];
    let curWidth = 0;

    for (const tok of tokens) {
      const font = tok.isBold ? helveticaBold : helvetica;
      const spaceWidth = font.widthOfTextAtSize(' ', fontSize);
      const wordWidth = font.widthOfTextAtSize(tok.word, fontSize);
      const addedWidth = curTokens.length === 0 ? wordWidth : spaceWidth + wordWidth;

      if (curWidth + addedWidth > effMaxWidth && curTokens.length > 0) {
        wrappedLines.push({ tokens: curTokens, width: curWidth });
        curTokens = [tok];
        curWidth = wordWidth;
      } else {
        curTokens.push(tok);
        curWidth += addedWidth;
      }
    }
    if (curTokens.length > 0) {
      wrappedLines.push({ tokens: curTokens, width: curWidth });
    }

    for (const wLine of wrappedLines) {
      checkPageBreak(lineHeight);
      let curX = margin + indent;

      for (let i = 0; i < wLine.tokens.length; i++) {
        const tok = wLine.tokens[i];
        const font = tok.isBold ? helveticaBold : helvetica;
        page.drawText(tok.word, {
          x: curX,
          y,
          size: fontSize,
          font,
          color: rgb(0.12, 0.12, 0.12)
        });
        const w = font.widthOfTextAtSize(tok.word, fontSize);
        const spaceW = font.widthOfTextAtSize(' ', fontSize);
        curX += w + spaceW;
      }
      y -= lineHeight;
    }

    y -= 5;
  }

  // Footers and Running Headers
  const totalPages = pdfDoc.getPageCount();
  for (let i = 0; i < totalPages; i++) {
    const p = pdfDoc.getPage(i);

    if (i > 0) {
      const headerText = 'CLUBE FITNESS FISIO — TERMO DE ADESÃO';
      p.drawText(headerText, {
        x: margin,
        y: pageHeight - 32,
        size: 7.5,
        font: helveticaBold,
        color: rgb(0.55, 0.55, 0.55)
      });
      p.drawLine({
        start: { x: margin, y: pageHeight - 37 },
        end: { x: pageWidth - margin, y: pageHeight - 37 },
        thickness: 0.5,
        color: rgb(0.88, 0.88, 0.88)
      });
    }

    p.drawLine({
      start: { x: margin, y: 34 },
      end: { x: pageWidth - margin, y: 34 },
      thickness: 0.5,
      color: rgb(0.85, 0.85, 0.85)
    });

    const footerText = `Página ${i + 1} de ${totalPages}`;
    const footerWidth = helvetica.widthOfTextAtSize(footerText, 8);
    p.drawText(footerText, {
      x: margin + (maxWidth - footerWidth) / 2,
      y: 22,
      size: 8,
      font: helvetica,
      color: rgb(0.45, 0.45, 0.45)
    });
  }

  const pdfBytes = await pdfDoc.save();
  const base64 = Buffer.from(pdfBytes).toString('base64');
  return `data:application/pdf;base64,${base64}`;
}
