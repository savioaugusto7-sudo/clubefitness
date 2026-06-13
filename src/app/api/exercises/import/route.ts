import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';
import * as XLSX from 'xlsx';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Arquivo não fornecido' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Read the workbook in-memory
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      return NextResponse.json({ success: false, error: 'A planilha está vazia ou inválida' }, { status: 400 });
    }

    // Convert sheet to JSON array
    const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

    if (rawRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum registro encontrado na planilha' }, { status: 400 });
    }

    let countImported = 0;
    
    // We will process each row. We support updating by exercise name to avoid duplicate insertions.
    for (const row of rawRows) {
      // Find key matching headers case-insensitively and ignoring accents
      const getVal = (possibleKeys: string[]) => {
        for (const k of Object.keys(row)) {
          const normalizedKey = k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (possibleKeys.includes(normalizedKey)) {
            return row[k];
          }
        }
        return undefined;
      };

      const nome = getVal(['nome']);
      const grupoRaw = getVal(['grupo']);
      const equipamento = getVal(['equipamento']);
      const instrucoes = getVal(['instrucoes', 'instrucao']);
      const gifUrl = getVal(['gifurl', 'gif']);

      // Validation
      if (!nome || !grupoRaw || !equipamento) {
        // Skip invalid rows silently to prevent crash
        continue;
      }

      // Normalize muscle groups (uppercase)
      const grupo = String(grupoRaw).toUpperCase().trim();
      const trimmedNome = String(nome).trim();

      // Case-insensitive exact name match using regex with escaped characters
      const escapedName = trimmedNome.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');

      // Upsert: update if matching name, create if not found
      await Exercise.findOneAndUpdate(
        { nome: { $regex: new RegExp(`^${escapedName}$`, 'i') } },
        {
          nome: trimmedNome,
          grupo,
          equipamento: String(equipamento).trim(),
          instrucoes: instrucoes ? String(instrucoes).trim() : '',
          gifUrl: gifUrl ? String(gifUrl).trim() : ''
        },
        { upsert: true, new: true }
      );

      countImported++;
    }

    return NextResponse.json({ success: true, count: countImported });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
