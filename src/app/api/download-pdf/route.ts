import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const pdfB64 = formData.get('pdfB64') as string;
    const filename = formData.get('filename') as string;

    if (!pdfB64 || !filename) {
      return new Response('Missing parameters', { status: 400 });
    }

    // Convert base64 to binary buffer
    const buffer = Buffer.from(pdfB64, 'base64');

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return new Response(error.message, { status: 500 });
  }
}
