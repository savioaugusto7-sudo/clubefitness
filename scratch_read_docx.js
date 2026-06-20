const fs = require('fs');
const zlib = require('zlib');

// .docx is a ZIP file. We'll extract word/document.xml manually.
// ZIP local file header: PK\x03\x04
// We search for the 'word/document.xml' entry

const filePath = 'C:/Users/user/Downloads/contrato anual.docx';
const buf = fs.readFileSync(filePath);

// Find all PK local file header signatures
function findEntry(buf, filename) {
  const sig = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
  const filenameBytes = Buffer.from(filename, 'utf8');
  let pos = 0;
  while (pos < buf.length - 4) {
    pos = buf.indexOf(sig, pos);
    if (pos === -1) break;
    
    const compressionMethod = buf.readUInt16LE(pos + 8);
    const compressedSize = buf.readUInt32LE(pos + 18);
    const filenameLen = buf.readUInt16LE(pos + 26);
    const extraLen = buf.readUInt16LE(pos + 28);
    const entryFilename = buf.slice(pos + 30, pos + 30 + filenameLen).toString('utf8');
    
    if (entryFilename === filename) {
      const dataStart = pos + 30 + filenameLen + extraLen;
      const data = buf.slice(dataStart, dataStart + compressedSize);
      
      if (compressionMethod === 0) {
        return data; // stored uncompressed
      } else if (compressionMethod === 8) {
        return zlib.inflateRawSync(data); // deflated
      }
    }
    pos++;
  }
  return null;
}

const xmlBuf = findEntry(buf, 'word/document.xml');
if (!xmlBuf) {
  console.log('Could not find word/document.xml');
  process.exit(1);
}

const xml = xmlBuf.toString('utf8');

// Extract text between <w:t> tags, preserving spaces
const result = [];
const regex = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g;
let match;
let prev_end = 0;

// Also look at paragraph breaks  
const pBreaks = [];
let pMatch;
const pRegex = /<w:p[ >]/g;
while ((pMatch = pRegex.exec(xml)) !== null) {
  pBreaks.push(pMatch.index);
}

// Extract all runs with their positions
const runs = [];
while ((match = regex.exec(xml)) !== null) {
  runs.push({ pos: match.index, text: match[1] });
}

// Now reconstruct text with paragraph breaks
let pIdx = 0;
let rIdx = 0;
let output = '';
while (rIdx < runs.length) {
  // Check if there's a paragraph break between previous run and this one
  const run = runs[rIdx];
  const prevPos = rIdx > 0 ? runs[rIdx-1].pos : 0;
  
  // Check if any paragraph break occurs between prevPos and run.pos
  let hasPBreak = false;
  while (pIdx < pBreaks.length && pBreaks[pIdx] < run.pos) {
    if (pBreaks[pIdx] > prevPos) hasPBreak = true;
    pIdx++;
  }
  
  if (hasPBreak && output.length > 0) {
    output += '\n';
  }
  
  output += run.text;
  rIdx++;
}

console.log(output);
