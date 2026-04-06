export default async (request, context) => {
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
              text: `You are a strict pothole verification system for a civic reporting app.
Examine this image carefully.

Is there a genuine road pothole visible — a hole, crater, depression, or significant damage in actual road tarmac or pavement?

Reply with ONLY a JSON object, nothing else, no markdown:
{"valid": true, "reason": "Pothole confirmed"}
or
{"valid": false, "reason": "One short dismissive British reason why this isn't a pothole"}

Be strict. Reject: screens, photos of photos, grass, pavements without damage, puddles without holes, people, cars, indoor floors, screenshots of apps or websites. If it looks like a screen or digital image rather than a real photo of a road, reject it with a cheeky comment. If it IS a genuine pothole in a real road, approve it.`
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
};

export const config = { path: '/verify' };
