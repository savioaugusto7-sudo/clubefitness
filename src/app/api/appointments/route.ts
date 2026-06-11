import { NextResponse } from 'next/server';
import dbConnect from '@/utils/dbConnect';
import Appointment from '@/models/Appointment';
import Client from '@/models/Client';
import Professional from '@/models/Professional';

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const clientId = searchParams.get('clientId');
    const professionalId = searchParams.get('professionalId');

    // Make sure models are registered
    const _client = Client;
    const _prof = Professional;

    let query: any = {};
    if (date) query.data = date;
    if (clientId) query.clienteId = clientId;
    if (professionalId) query.profissionalId = professionalId;

    const appointments = await Appointment.find(query)
      .populate('clienteId')
      .populate('profissionalId');

    return NextResponse.json({ success: true, data: appointments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { data, horario, tipo, servico, consumeCredito, profissionalId, clienteId } = body;

    // 1. Check if client has credits if consumeCredito is true
    if (consumeCredito) {
      const client = await Client.findById(clienteId);
      if (!client) {
        return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
      }
      const availableCredits = (client.dadosComerciais.creditosTotal || 0) - (client.dadosComerciais.creditosUsados || 0) - (client.dadosComerciais.creditosReservados || 0);
      if (availableCredits <= 0) {
        return NextResponse.json({ success: false, error: 'Sem créditos disponíveis para agendamento.' }, { status: 400 });
      }

      // Reserve credit
      client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
      await client.save();
    }

    // 2. Create Appointment
    const appointment = await Appointment.create({
      data,
      horario,
      tipo,
      servico,
      consumeCredito,
      profissionalId,
      clienteId,
      status: 'agendado'
    });

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id, status } = body; // status: 'presenca' | 'cancelado' | 'agendado'

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'Missing appointment ID or status' }, { status: 400 });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    const client = await Client.findById(appointment.clienteId);
    const oldStatus = appointment.status;

    // State transition handling for credits
    if (client && appointment.consumeCredito) {
      // 1. Confirm attendance: agendado -> presenca
      if (oldStatus === 'agendado' && status === 'presenca') {
        client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
        client.dadosComerciais.creditosUsados = (client.dadosComerciais.creditosUsados || 0) + 1;
      }
      // 2. Cancel: agendado -> cancelado (release reservation)
      else if (oldStatus === 'agendado' && status === 'cancelado') {
        client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
      }
      // 3. Undo attendance: presenca -> agendado
      else if (oldStatus === 'presenca' && status === 'agendado') {
        client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
        client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
      }
      // 4. Undo cancellation: cancelado -> agendado
      else if (oldStatus === 'cancelado' && status === 'agendado') {
        client.dadosComerciais.creditosReservados = (client.dadosComerciais.creditosReservados || 0) + 1;
      }
      // 5. Cancel after attended: presenca -> cancelado (release used credit)
      else if (oldStatus === 'presenca' && status === 'cancelado') {
        client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
      }
      
      await client.save();
    }

    appointment.status = status;
    await appointment.save();

    return NextResponse.json({ success: true, data: appointment });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing appointment ID' }, { status: 400 });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return NextResponse.json({ success: false, error: 'Appointment not found' }, { status: 404 });
    }

    // Refund credits if deleted appointment was active
    const client = await Client.findById(appointment.clienteId);
    if (client && appointment.consumeCredito) {
      if (appointment.status === 'agendado') {
        client.dadosComerciais.creditosReservados = Math.max(0, (client.dadosComerciais.creditosReservados || 0) - 1);
      } else if (appointment.status === 'presenca') {
        client.dadosComerciais.creditosUsados = Math.max(0, (client.dadosComerciais.creditosUsados || 0) - 1);
      }
      await client.save();
    }

    await Appointment.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Appointment deleted' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
