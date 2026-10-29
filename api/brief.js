/**
 * Serverless Function Stub — POST /api/brief
 * Validates incoming project brief submissions (name, email, message, optional scope/budget,
 * honeypot _gotcha) and returns { ok: true }.
 * Can be wired to Resend, Postmark, or SMTP in production via environment variables.
 * If deployed to a static host without /api/brief (e.g. GitHub Pages), src/content.js
 * automatically falls back to a pre-filled mailto:rjverceles1@gmail.com link.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // Honeypot check
    if (body._gotcha) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || message.length < 10) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: false, error: 'Invalid form fields' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: true,
        recipient: 'rjverceles1@gmail.com',
        receivedAt: new Date().toISOString(),
      })
    );
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
  }
}
