export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { query, sessionId, img_base64 } = await req.json();
    const currentSessionId = sessionId || `int_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const apiRes = await fetch('https://mediassist-5eke.onrender.com/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(sessionId && { 'X-Interaction-ID': sessionId }) },
      body: JSON.stringify({ query, session_id: currentSessionId, img_base64 }),
    });

    if (!apiRes.ok) throw new Error(`Backend error: ${apiRes.status}`);

    const json = await apiRes.json();
    const text = json.response as string;
    console.log('Response from backend:', text);
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const char of text) {
          controller.enqueue(encoder.encode(char));
          await new Promise((r) => setTimeout(r, 10));
        }
    
        const heartbeatInterval = 10000; // every 10s
        const totalDelay = 5 * 60 * 1000; // 5 minutes
        const startTime = Date.now();
    
        while (Date.now() - startTime < totalDelay) {
          controller.enqueue(encoder.encode(" "));
          await new Promise((r) => setTimeout(r, heartbeatInterval));
        }
    
        controller.close();
      },
    });
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Interaction-ID': currentSessionId,
      },
    });
  } catch (err) {
    console.error(err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
