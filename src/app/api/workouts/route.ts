import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import ClientWorkout from '@/models/ClientWorkout';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    if (!clientId) {
      const workouts = await ClientWorkout.find({});
      return NextResponse.json({ success: true, data: workouts });
    }

    let workout = await ClientWorkout.findOne({ clienteId: clientId });
    if (!workout) {
      const defaultWorksheets = [
        { id: 'A', nome: 'Ficha A', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
        { id: 'B', nome: 'Ficha B', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] },
        { id: 'C', nome: 'Ficha C', ultimaAtualizacao: '', observacoesGerais: '', exercicios: [] }
      ];
      workout = await ClientWorkout.create({
        clienteId: clientId,
        fichasMonitorado: defaultWorksheets,
        fichasLivre: defaultWorksheets
      });
    }

    return NextResponse.json({ success: true, data: workout });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { clientId, category, workoutData } = body;

    if (!clientId || !category || !workoutData) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // category is 'fichasMonitorado' or 'fichasLivre'
    const updateQuery = { [category]: workoutData };
    
    let workout = await ClientWorkout.findOneAndUpdate(
      { clienteId: clientId },
      { $set: updateQuery },
      { new: true, upsert: true }
    );

    return NextResponse.json({ success: true, data: workout });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
