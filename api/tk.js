export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // Expand short URL
    let expanded = url;
    try {
      const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      expanded = head.url || url;
    } catch {}

    // tikwm API
    const form = new URLSearchParams({ url: expanded, hd: '1' });
    const r = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0',
      },
      body: form.toString(),
    });
    const d = await r.json();

    if (d.code !== 0) {
      return res.status(422).json({ error: d.msg || 'TikTok fetch failed' });
    }

    const data = d.data;
    const formats = [];

    if (data.hdplay) formats.push({ label: 'MP4 HD (No Watermark)', ext: 'mp4', url: data.hdplay, sub: 'HD • No watermark' });
    if (data.play)   formats.push({ label: 'MP4 SD (No Watermark)', ext: 'mp4', url: data.play,   sub: 'SD • No watermark' });
    if (data.wmplay) formats.push({ label: 'MP4 (Watermark)',        ext: 'mp4', url: data.wmplay, sub: 'With watermark' });
    if (data.music)  formats.push({ label: 'MP3 Audio',              ext: 'mp3', url: data.music,  sub: 'Audio only' });

    const dur = data.duration ? (() => {
      const m = Math.floor(data.duration / 60);
      const s = data.duration % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    })() : null;

    return res.json({
      title:    data.title || 'TikTok Video',
      thumb:    data.cover,
      author:   data.author?.nickname,
      duration: dur,
      platform: 'tiktok',
      formats,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
