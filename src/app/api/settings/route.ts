import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Settings from '@/models/Settings';

export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (key) {
      const setting = await Settings.findOne({ key });
      return NextResponse.json({ success: true, data: setting ? setting.value : null });
    }
    const settings = await Settings.find({});
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();
    const { key, value } = body;
    if (!key) return NextResponse.json({ success: false, error: 'Chave obrigatória' }, { status: 400 });

    const setting = await Settings.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
