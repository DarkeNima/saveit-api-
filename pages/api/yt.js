export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!m) return res.status(400).json({ error: 'Invalid YouTube URL' });
  const vid = m[1];

  const cobaltInstances = [
    'https://cobalt.synzr.space',
    'https://cobalt.privacyredirect.com',
    'https://cobalt.zt-tech.eu',
    'https://dl.lao.sb',
    'https://cobalt.vuiis.eu',
  ];

  const qualities = ['1080', '720', '480', '360'];
  const formats = [];
  const seen = new Set();

  for (const inst of cobaltInstances) {
    let gotOne = false;
    for (const q of qualities) {
      try {
        const r = await fetch(`${inst}/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0',
          },
          body: JSON.stringify({
            url,
            videoQuality: q,
            downloadMode: 'auto',
            filenameStyle: 'pretty',
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (!r.ok) continue;
        const d = await r.json();
        const furl = d.url;
        if (!furl || seen.has(q)) continue;
        seen.add(q);
        formats.push({ label: `MP4 ${q}p`, ext: 'mp4', url: furl, sub: `${q}p` });
        gotOne = true;
      } catch {}
    }

    // Audio
    try {
      const r = await fetch(`${inst}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
        body: JSON.stringify({
          url,
          downloadMode: 'audio',
          filenameStyle: 'pretty',
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (r.ok) {
        const d = await r.json();
        if (d.url && !seen.has('audio')) {
          seen.add('audio');
          formats.push({ label: 'MP3 Audio', ext: 'mp3', url: d.url, sub: 'Audio only' });
        }
      }
    } catch {}

    if (formats.length > 0) break;
  }

  if (formats.length === 0) {
    return res.status(500).json({ error: 'YouTube: Failed to get download links. Try again.' });
  }

  return res.json({
    title: 'YouTube Video',
    thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
    platform: 'youtube',
    formats,
  });
}
