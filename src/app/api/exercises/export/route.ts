import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Exercise from '@/models/Exercise';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const records = await Exercise.find({}).sort({ nome: 1 });

    const data = records.map(ex => ({
      'Nome': ex.nome,
      'Grupo': ex.grupo,
      'Equipamento': ex.equipamento,
      'Instruções': ex.instrucoes || '',
      'GifUrl': ex.gifUrl || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Exercícios');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="exercicios.xlsx"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
