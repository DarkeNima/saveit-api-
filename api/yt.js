export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    const form = new URLSearchParams({ q: url, vt: 'home' });
    const r = await fetch('https://www.yt1s.com/api/ajaxSearch/index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.yt1s.com/',
        'User-Agent': 'Mozilla/5.0',
      },
      body: form.toString(),
    });
    const d = await r.json();
    if (d.status !== 'ok') throw new Error('yt1s analyze failed');

    const vid = d.vid || '';
    const links = d.links || {};
    const formats = [];
    const seen = new Set();

    // MP4
    for (const [q, info] of Object.entries(links.mp4 || {})) {
      const label = `MP4 ${q}`;
      if (!seen.has(label) && info.k) {
        seen.add(label);
        formats.push({ label, ext: 'mp4', url: null, k: info.k, vid, sub: info.size || '' });
      }
    }
    // MP3
    for (const [q, info] of Object.entries(links.mp3 || {})) {
      if (!seen.has('MP3 Audio') && info.k) {
        seen.add('MP3 Audio');
        formats.push({ label: 'MP3 Audio', ext: 'mp3', url: null, k: info.k, vid, sub: info.size || '' });
      }
    }

    // Sort best quality first
    formats.sort((a, b) => {
      if (a.label === 'MP3 Audio') return 1;
      if (b.label === 'MP3 Audio') return -1;
      const na = parseInt(a.label.match(/\d+/)?.[0] || 0);
      const nb = parseInt(b.label.match(/\d+/)?.[0] || 0);
      return nb - na;
    });

    return res.json({
      title:    d.title || 'YouTube Video',
      thumb:    vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : null,
      platform: 'youtube',
      formats:  formats.slice(0, 6),
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
