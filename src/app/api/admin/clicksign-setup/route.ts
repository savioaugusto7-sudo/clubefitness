import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const token = process.env.CLICKSIGN_ACCESS_TOKEN;
    const baseUrl = (process.env.CLICKSIGN_API_URL || 'https://sandbox.clicksign.com').replace(/\/$/, '');

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'CLICKSIGN_ACCESS_TOKEN não está configurado nas variáveis de ambiente.'
      }, { status: 400 });
    }

    const adminName = process.env.CLICKSIGN_ADMIN_NAME || 'Albert Nunes Queiroz dos Santos';
    const adminEmail = process.env.CLICKSIGN_ADMIN_EMAIL || 'clubefitnessbh@gmail.com';

    // Testar conectividade com a API v3
    const res = await fetch(`${baseUrl}/api/v3/envelopes?page[size]=1`, {
      headers: {
        'Authorization': token,
        'Content-Type': 'application/vnd.api+json',
        'Accept': 'application/vnd.api+json'
      }
    });

    const isConnected = res.ok;
    let envelopesCount = 0;
    let apiError = null;

    if (isConnected) {
      const data = await res.json();
      envelopesCount = data.meta?.record_count || data.data?.length || 0;
    } else {
      const errData = await res.json().catch(() => ({}));
      apiError = errData;
    }

    return NextResponse.json({
      success: isConnected,
      baseUrl,
      isConnected,
      envelopesCount,
      adminConfig: {
        name: adminName,
        email: adminEmail,
        cpfConfigurado: Boolean(process.env.CLICKSIGN_ADMIN_CPF),
        birthdayConfigurado: Boolean(process.env.CLICKSIGN_ADMIN_BIRTHDAY),
        autoSignPronto: Boolean(process.env.CLICKSIGN_ADMIN_CPF && process.env.CLICKSIGN_ADMIN_BIRTHDAY)
      },
      apiError
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
