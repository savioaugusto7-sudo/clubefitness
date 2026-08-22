import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Se já for data URL base64, não precisa de proxy
    if (targetUrl.startsWith('data:')) {
      return NextResponse.redirect(targetUrl);
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch image (${response.status})` }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || 'image/gif';
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error: any) {
    console.error('[image-proxy] Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
