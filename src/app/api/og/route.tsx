import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title   = searchParams.get('title')   ?? 'Magyar Podcast';
    const podcast = searchParams.get('podcast') ?? 'hallod.hu';
    const imageUrl = searchParams.get('image');

    // Fetch and base64-encode the cover art so it renders without CORS issues
    let coverSrc: string | undefined;
    if (imageUrl) {
      try {
        const res  = await fetch(imageUrl);
        const buf  = await res.arrayBuffer();
        const uint8 = new Uint8Array(buf);
        let binary = '';
        for (let i = 0; i < uint8.length; i++) {
          binary += String.fromCharCode(uint8[i]);
        }
        const mime = res.headers.get('content-type') ?? 'image/jpeg';
        coverSrc = `data:${mime};base64,${btoa(binary)}`;
      } catch {
        coverSrc = undefined;
      }
    }

    // Scale font size based on title length
    const fontSize = title.length > 100 ? 26 : title.length > 70 ? 30 : title.length > 45 ? 36 : 42;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            width: '1200px',
            height: '630px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          {/* Left: square cover art */}
          <div
            style={{
              display: 'flex',
              width: '630px',
              height: '630px',
              flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {coverSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverSrc}
                alt=""
                width={630}
                height={630}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#2b946b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '120px',
                }}
              >
                🎧
              </div>
            )}
          </div>

          {/* Right: text content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '56px 52px',
              flex: 1,
              justifyContent: 'space-between',
            }}
          >
            {/* Podcast name */}
            <div
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '18px',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '3px',
              }}
            >
              {podcast}
            </div>

            {/* Episode title */}
            <div
              style={{
                color: '#ffffff',
                fontSize: `${fontSize}px`,
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              {title}
            </div>

            {/* hallod.hu branding */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  color: '#ffffff',
                  fontSize: '26px',
                  fontWeight: 800,
                  letterSpacing: '-0.5px',
                }}
              >
                hallod.hu
              </div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '16px' }}>
                A Magyar Podcast Gyűjtő
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch {
    return new Response('Failed to generate image', { status: 500 });
  }
}
