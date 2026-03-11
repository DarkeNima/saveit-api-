export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // Extract video ID
    let vid = '';
    const m1 = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    const m2 = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    const m3 = url.match(/shorts\/([a-zA-Z0-9_-]{11})/);
    if (m1) vid = m1[1];
    else if (m2) vid = m2[1];
    else if (m3) vid = m3[1];
    else throw new Error('Invalid YouTube URL');

    // Use y2mate API
    const form = new URLSearchParams({
      q: url,
      vt: 'home',
    });

    const r = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://www.y2mate.com/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: form.toString(),
    });

    const text = await r.text();
    let d;
    try {
      d = JSON.parse(text);
    } catch {
      throw new Error('y2mate parse failed');
    }

    if (d.status !== 'ok') throw new Error('y2mate failed: ' + d.mess);

    const links = d.links || {};
    const formats = [];
    const seen = new Set();

    // MP4
    for (const [q, info] of Object.entries(links.mp4 || {})) {
      const label = `MP4 ${q}`;
      if (!seen.has(label) && info.k) {
        seen.add(label);
        formats.push({ label, ext: 'mp4', url: null, k: info.k, vid: d.vid, sub: info.size || '' });
      }
    }
    // MP3
    for (const [q, info] of Object.entries(links.mp3 || {})) {
      if (!seen.has('MP3 Audio') && info.k) {
        seen.add('MP3 Audio');
        formats.push({ label: 'MP3 Audio', ext: 'mp3', url: null, k: info.k, vid: d.vid, sub: info.size || '' });
      }
    }

    formats.sort((a, b) => {
      if (a.label === 'MP3 Audio') return 1;
      if (b.label === 'MP3 Audio') return -1;
      const na = parseInt(a.label.match(/\d+/)?.[0] || 0);
      const nb = parseInt(b.label.match(/\d+/)?.[0] || 0);
      return nb - na;
    });

    return res.json({
      title: d.title || 'YouTube Video',
      thumb: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
      platform: 'youtube',
      formats: formats.slice(0, 6),
    });

  } catch (e) {
    // Fallback: invidious API (no scraping needed)
    try {
      const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      if (!m) throw new Error('No video ID');
      const vid2 = m[1];

      const inv = await fetch(`https://inv.nadeko.net/api/v1/videos/${vid2}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const d2 = await inv.json();

      const formats = [];
      for (const f of (d2.formatStreams || [])) {
        if (f.url && f.qualityLabel) {
          formats.push({
            label: `MP4 ${f.qualityLabel}`,
            ext: 'mp4',
            url: f.url,
            sub: f.qualityLabel,
          });
        }
      }

      // Audio
      for (const f of (d2.adaptiveFormats || [])) {
        if (f.type?.includes('audio/mp4') && !formats.find(x => x.label === 'MP3 Audio')) {
          formats.push({ label: 'MP3 Audio', ext: 'mp3', url: f.url, sub: 'Audio only' });
        }
      }

      return res.json({
        title: d2.title || 'YouTube Video',
        thumb: `https://i.ytimg.com/vi/${vid2}/hqdefault.jpg`,
        platform: 'youtube',
        formats: formats.slice(0, 6),
      });
    } catch (e2) {
      return res.status(500).json({ error: e2.message });
    }
  }
}
