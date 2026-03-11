export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // Get token from snapinsta
    const home = await fetch('https://snapinsta.app/', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const homeHtml = await home.text();
    const tokMatch = homeHtml.match(/name="token"\s+value="([^"]+)"/i);
    const token = tokMatch ? tokMatch[1] : '';

    const form = new URLSearchParams({ url, token, lang: 'en' });
    const r = await fetch('https://snapinsta.app/action.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://snapinsta.app/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
      },
      body: form.toString(),
    });

    let html = '';
    try {
      const d = await r.json();
      html = d.data || '';
    } catch {
      html = await r.text();
    }

    const formats = [];
    const seen = new Set();
    const linkRe = /href="(https?:\/\/[^"]+\.(?:mp4|jpg|jpeg|webp)[^"]*)"/gi;
    let match;
    let i = 0;
    while ((match = linkRe.exec(html)) !== null) {
      const furl = match[1];
      const isVideo = furl.includes('.mp4') || furl.toLowerCase().includes('video');
      const ext = isVideo ? 'mp4' : 'jpg';
      const label = `${isVideo ? 'Video' : 'Image'} ${++i}`;
      if (!seen.has(furl)) {
        seen.add(furl);
        formats.push({ label, ext, url: furl, sub: ext.toUpperCase() });
      }
    }

    if (formats.length === 0) throw new Error('No media found — post may be private');

    return res.json({
      title: 'Instagram Media',
      thumb: formats.find(f => f.ext === 'jpg')?.url || null,
      platform: 'instagram',
      formats: formats.slice(0, 8),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
