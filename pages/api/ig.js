export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Try multiple IG downloaders
  const trySnapinsta = async () => {
    const home = await fetch('https://snapinsta.app/', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(8000),
    });
    const html = await home.text();
    const tok = html.match(/name="token"\s+value="([^"]+)"/i)?.[1] || '';

    const r = await fetch('https://snapinsta.app/action.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://snapinsta.app/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams({ url, token: tok, lang: 'en' }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    let resHtml = '';
    try { const d = await r.json(); resHtml = d.data || ''; }
    catch { resHtml = await r.text(); }
    return resHtml;
  };

  const tryInstasaved = async () => {
    const r = await fetch('https://instasaved.net/en', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://instasaved.net/',
        'User-Agent': 'Mozilla/5.0',
      },
      body: new URLSearchParams({ url }).toString(),
      signal: AbortSignal.timeout(10000),
    });
    return await r.text();
  };

  const extractFormats = (html) => {
    const formats = [];
    const seen = new Set();
    const re = /href="(https?:\/\/[^"]+\.(?:mp4|jpg|jpeg|webp)[^"]*)"/gi;
    let m, i = 0;
    while ((m = re.exec(html)) !== null) {
      const furl = m[1];
      if (seen.has(furl)) continue;
      seen.add(furl);
      const isVideo = furl.includes('.mp4') || furl.toLowerCase().includes('video');
      formats.push({
        label: `${isVideo ? 'Video' : 'Image'} ${++i}`,
        ext: isVideo ? 'mp4' : 'jpg',
        url: furl,
        sub: isVideo ? 'MP4' : 'JPG',
      });
    }
    return formats;
  };

  // Try snapinsta first
  try {
    const html = await trySnapinsta();
    const formats = extractFormats(html);
    if (formats.length > 0) {
      return res.json({ title: 'Instagram Media', thumb: null, platform: 'instagram', formats: formats.slice(0, 8) });
    }
  } catch {}

  // Fallback instasaved
  try {
    const html = await tryInstasaved();
    const formats = extractFormats(html);
    if (formats.length > 0) {
      return res.json({ title: 'Instagram Media', thumb: null, platform: 'instagram', formats: formats.slice(0, 8) });
    }
  } catch {}

  return res.status(500).json({ error: 'Instagram: No media found. Post may be private.' });
}
