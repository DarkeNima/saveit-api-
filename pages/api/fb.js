export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // fdownloader.net - reliable FB downloader
    const r = await fetch('https://fdownloader.net/api/ajaxSearch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://fdownloader.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ q: url, lang: 'en', cftoken: '' }).toString(),
    });

    const text = await r.text();
    let d;
    try { d = JSON.parse(text); } catch { throw new Error('Parse failed'); }

    if (d.status !== 'ok') throw new Error('fdownloader failed');

    const html = d.data || '';
    const formats = [];
    const seen = new Set();

    // Extract download links
    const linkRe = /href="(https?:\/\/[^"]+)"[^>]*>([^<]*)/g;
    let match;
    while ((match = linkRe.exec(html)) !== null) {
      const href = match[1];
      const text2 = match[2].trim().toLowerCase();
      if (!href.includes('fbcdn') && !href.includes('facebook') && !href.includes('fdownloader')) continue;
      
      const label = text2.includes('hd') || text2.includes('high') ? 'MP4 HD' : 'MP4 SD';
      if (!seen.has(label)) {
        seen.add(label);
        formats.push({ label, ext: 'mp4', url: href, sub: label.includes('HD') ? 'High quality' : 'Standard quality' });
      }
    }

    if (formats.length === 0) throw new Error('No links found');

    return res.json({ title: 'Facebook Video', thumb: null, platform: 'facebook', formats });
  } catch (e) {
    // Fallback: getfvid
    try {
      const r2 = await fetch(`https://getfvid.com/downloader?url=${encodeURIComponent(url)}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://getfvid.com/',
        },
        signal: AbortSignal.timeout(10000),
      });
      const html = await r2.text();
      const formats = [];
      const seen = new Set();

      const re = /href="(https?:\/\/(?:[^"]*fbcdn[^"]*|[^"]*facebook[^"]*))"/g;
      let m;
      let i = 0;
      while ((m = re.exec(html)) !== null && i < 4) {
        const label = i === 0 ? 'MP4 HD' : 'MP4 SD';
        if (!seen.has(label)) {
          seen.add(label);
          formats.push({ label, ext: 'mp4', url: m[1], sub: '' });
          i++;
        }
      }

      if (formats.length === 0) throw new Error('No FB links found');
      return res.json({ title: 'Facebook Video', thumb: null, platform: 'facebook', formats });
    } catch (e2) {
      return res.status(500).json({ error: 'Facebook: ' + e2.message });
    }
  }
}
