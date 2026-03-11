export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!m) return res.status(400).json({ error: 'Invalid YouTube URL' });
  const vid = m[1];

  try {
    const r = await fetch('https://save-from.net/api/convert', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(15000),
    });

    const data = await r.json();
    const formats = [];
    const seen = new Set();

    for (const item of (data.url || [])) {
      const furl = item.url || item.urls?.[0];
      if (!furl) continue;
      const isAudio = item.ext === 'mp3' || (item.id||'').includes('mp3');
      const label = isAudio ? 'MP3 Audio' : `MP4 ${item.id || ''}`.trim();
      if (!seen.has(label)) {
        seen.add(label);
        formats.push({ label, ext: isAudio ? 'mp3' : 'mp4', url: furl, sub: item.size || '' });
      }
    }

    formats.sort((a, b) => {
      if (a.label === 'MP3 Audio') return 1;
      if (b.label === 'MP3 Audio') return -1;
      return (parseInt(b.label.match(/\d+/)?.[0]||0)) - (parseInt(a.label.match(/\d+/)?.[0]||0));
    });

    if (formats.length === 0) throw new Error('No formats found');

    return res.json({
      title: data.meta?.title || 'YouTube Video',
      thumb: data.meta?.thumb || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      platform: 'youtube',
      formats: formats.slice(0, 6),
    });
  } catch (e) {
    return res.status(500).json({ error: 'YouTube: ' + e.message });
  }
}
