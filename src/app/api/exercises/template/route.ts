import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET(request: Request) {
  try {
    const data = [
      {
        'Nome': 'Supino Reto',
        'Grupo': 'PEITO',
        'Equipamento': 'BARRA',
        'Instruções': 'Deitar no banco, descer a barra de forma controlada até o peito e empurrar mantendo os ombros encaixados.',
        'GifUrl': 'http://example.com/supino.gif'
      },
      {
        'Nome': 'Puxada Frente',
        'Grupo': 'COSTAS',
        'Equipamento': 'POLIA',
        'Instruções': 'Puxar a barra em direção ao peito superior inclinando levemente o tronco para trás e contraindo as costas.',
        'GifUrl': 'http://example.com/puxada.gif'
      },
      {
        'Nome': 'Agachamento Livre',
        'Grupo': 'PERNAS',
        'Equipamento': 'HALTERES',
        'Instruções': 'Flexionar quadris e joelhos descendo até aproximadamente 90 graus mantendo a postura ereta e abdômen contraído.',
        'GifUrl': ''
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="template_exercicios.xlsx"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
