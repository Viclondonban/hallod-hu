import { ImageResponse } from 'next/og';
import type { NextRequest } from 'next/server';

export const runtime = 'edge';

// Brand colour palette — picked deterministically from episode/podcast ID
const COLORS = ['#2b946b', '#af2d42', '#437aac', '#0cc0df', '#92d1b0', '#ff5757'];

function pickColor(id: string): string {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return COLORS[hash % COLORS.length];
}

/*
  Card layout — 1200×630px (standard OG landscape):
  ┌──────────────────┬───────────────────────────┐
  │                  │  podcast name             │
  │   COVER ART      │                           │
  │   630 × 630      │  Episode title            │
  │   (square crop)  │                           │
  │                  │  hallod.hu                │
  └──────────────────┴───────────────────────────┘
  Right panel background = brand accent colour
*/

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title       = searchParams.get('title')   ?? 'Magyar Podcast';
    const podcastName = searchParams.get('podcast') ?? '';
    const imageUrl    = searchParams.get('image')   ?? null;
    const id          = searchParams.get('id')      ?? title;

    const accentColor = pickColor(id);

    // Scale episode title font size to avoid overflow
    const titleFontSize = title.length > 80 ? 34 : title.length > 55 ? 40 : title.length > 35 ? 48 : 56;

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            width: '1200px',
            height: '630px',
          }}
        >
          {/* LEFT — cover art, square crop */}
          <div
            style={{
              width: '630px',
              height: '630px',
              flexShrink: 0,
              overflow: 'hidden',
              display: 'flex',
            }}
          >
            {imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                width={630}
                height={630}
                style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                alt=""
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: accentColor,
                  display: 'flex',
                }}
              />
            )}
          </div>

          {/* RIGHT — brand colour panel with text */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              background: accentColor,
              padding: '52px 52px',
              justifyContent: 'space-between',
            }}
          >
            {/* Podcast name */}
            <div
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'rgba(255,255,255,0.75)',
                textTransform: 'uppercase',
                letterSpacing: '3px',
                lineHeight: 1,
              }}
            >
              {podcastName}
            </div>

            {/* Episode title */}
            <div
              style={{
                fontSize: `${titleFontSize}px`,
                fontWeight: 800,
                color: '#ffffff',
                lineHeight: 1.2,
              }}
            >
              {title}
            </div>

            {/* hallod.hu branding */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.5px',
                }}
              >
                hallod.hu
              </div>
              <div
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                A Magyar Podcast Gyűjtő
              </div>
            </div>
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    );
  } catch (e) {
    console.error('OG image error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
