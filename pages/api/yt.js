export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
  if (!m) return res.status(400).json({ error: 'Invalid YouTube URL' });
  const vid = m[1];

  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.privacyredirect.com',
    'https://invidious.nerdvpn.de',
    'https://iv.datura.network',
    'https://invidious.io.lol',
  ];

  for (const inst of instances) {
    try {
      const r = await fetch(`${inst}/api/v1/videos/${vid}?fields=title,author,lengthSeconds,formatStreams,adaptiveFormats`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) continue;
      const d = await r.json();
      if (d.error || !d.title) continue;

      const formats = [];

      // formatStreams = already muxed video+audio (360p, 720p)
      for (const f of (d.formatStreams || [])) {
        if (f.url && f.qualityLabel) {
          formats.push({
            label: `MP4 ${f.qualityLabel}`,
            ext: 'mp4',
            url: f.url,
            sub: f.qualityLabel,
          });
        }
      }

      // adaptiveFormats = audio only
      for (const f of (d.adaptiveFormats || [])) {
        if (f.type?.includes('audio/mp4') && !formats.find(x => x.label === 'MP3 Audio')) {
          formats.push({ label: 'MP3 Audio', ext: 'mp3', url: f.url, sub: 'Audio only' });
        }
      }

      if (formats.length === 0) continue;

      const dur = d.lengthSeconds
        ? `${Math.floor(d.lengthSeconds/60)}:${String(d.lengthSeconds%60).padStart(2,'0')}`
        : null;

      return res.json({
        title: d.title,
        thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        author: d.author,
        duration: dur,
        platform: 'youtube',
        formats: formats.slice(0, 6),
      });
    } catch {}
  }

  return res.status(500).json({ error: 'YouTube: All instances failed. Try again later.' });
}
