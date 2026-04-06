export default async (request, context) => {
  const url = new URL(request.url);

  // ── CONFIG endpoint — serves public tokens to the frontend ──
  if (url.pathname === '/config') {
    return new Response(JSON.stringify({
      mapboxToken: Deno.env.get('MAPBOX_TOKEN') || ''
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── VERIFY endpoint — AI pothole verification ──
  if (url.pathname === '/verify') {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const { image } = await request.json();
      const apiKey = Deno.env.get('ANTHROPIC_API_KEY');

      if (!apiKey) {
        return new Response(JSON.stringify({ valid: false, reason: 'Verification unavailable — please try again' }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 100,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: { type: 'base64', media_type: 'image/jpeg', data: image }
              },
              {
                type: 'text',
                text: 'You are a strict pothole verification system. Is there a genuine road pothole visible — a hole, crater, or significant damage in actual road tarmac? Reply ONLY with JSON: {"valid": true, "reason": "Pothole confirmed"} or {"valid": false, "reason": "short British reason"}. Reject screens, photos of photos, grass, indoors, cars. No markdown.'
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || '{"valid":false,"reason":"Could not verify — try again"}';
      const clean = text.replace(/```json|```/g, '').trim();
      const result = JSON.parse(clean);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (e) {
      console.error(e);
      return new Response(JSON.stringify({ valid: false, reason: 'Verification failed — please try again' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not found', { status: 404 });
};

export const config = { path: ['/verify', '/config'] };
