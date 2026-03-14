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
  Card layout — 1200×1200px:
  ┌────────────────────────────────┐
  │ S │                            │  ← top row: 1200×1100
  │ P │   COVER ART  1100×1100     │    spine: 100px wide, accent colour
  │ I │                            │    cover: 1100×1100 (perfect square)
  │ N │                            │
  │ E │                            │
  ├───┴────────────────────────────┤
  │  DESCRIPTION STRIP  1200×100  │
  └────────────────────────────────┘
*/

const TOTAL  = 1200;
const SPINE  = 100;  // spine width = description height (so cover = 1100×1100, perfectly square)
const COVER  = 1100;
const DESC_H = 100;

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const title       = searchParams.get('title')   ?? 'Magyar Podcast';
    const podcastName = searchParams.get('podcast') ?? '';
    const imageUrl    = searchParams.get('image')   ?? null;
    const description = searchParams.get('desc')    ?? '';
    const id          = searchParams.get('id')      ?? title;

    const accentColor = pickColor(id);

    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: `${TOTAL}px`,
            height: `${TOTAL}px`,
            background: '#f0f0f0',
          }}
        >
          {/* ── TOP ROW: spine + cover ── */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              width: `${TOTAL}px`,
              height: `${COVER}px`,
            }}
          >
            {/* SPINE — accent colour with "hallod.hu" rotated */}
            <div
              style={{
                width: `${SPINE}px`,
                height: `${COVER}px`,
                background: accentColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: '30px',
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.92)',
                  letterSpacing: '10px',
                  textTransform: 'lowercase',
                  whiteSpace: 'nowrap',
                  transform: 'rotate(-90deg)',
                  display: 'block',
                }}
              >
                hallod.hu
              </span>
            </div>

            {/* COVER ART — 1100×1100, always square */}
            <div
              style={{
                width: `${COVER}px`,
                height: `${COVER}px`,
                overflow: 'hidden',
                display: 'flex',
              }}
            >
              {imageUrl ? (
                // next/og fetches remote images server-side — no CORS issue
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  width={COVER}
                  height={COVER}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }}
                  alt=""
                />
              ) : (
                // Last resort — no artwork at all
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
          </div>

          {/* ── DESCRIPTION STRIP — full width, left-aligned ── */}
          <div
            style={{
              width: `${TOTAL}px`,
              height: `${DESC_H}px`,
              background: '#f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '0 24px',
              gap: '4px',
            }}
          >
            {podcastName ? (
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '4px',
                  color: '#aaa',
                  lineHeight: 1,
                }}
              >
                {podcastName}
              </div>
            ) : null}
            {description ? (
              <div
                style={{
                  fontSize: '22px',
                  fontWeight: 500,
                  color: '#1a1a1a',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                }}
              >
                {description}
              </div>
            ) : null}
          </div>
        </div>
      ),
      { width: TOTAL, height: TOTAL }
    );
  } catch (e) {
    console.error('OG image error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}
