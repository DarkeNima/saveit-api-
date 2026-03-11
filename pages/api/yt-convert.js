export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { vid, k } = req.method === 'POST' ? req.body : req.query;
  if (!vid || !k) return res.status(400).json({ error: 'vid and k required' });

  try {
    const form = new URLSearchParams({ vid, k });
    const r = await fetch('https://www.yt1s.com/api/ajaxConvert/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.yt1s.com/',
        'User-Agent': 'Mozilla/5.0',
      },
      body: form.toString(),
    });
    const d = await r.json();
    if (d.status === 'ok' && d.dlink) {
      return res.json({ url: d.dlink });
    }
    throw new Error('Convert failed: ' + JSON.stringify(d));
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
