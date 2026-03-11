export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url || req.body?.url;
  if (!url) return res.status(400).json({ error: 'URL required' });

  try {
    // snapsave.app
    const form = new URLSearchParams({ url });
    const r = await fetch('https://snapsave.app/action.php?lang=en', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': 'https://snapsave.app/',
        'User-Agent': 'Mozilla/5.0',
      },
      body: form.toString(),
    });
    const d = await r.json();
    const html = d.data || '';

    const formats = [];
    const seen = new Set();
    const linkRe = /href="(https?:\/\/[^"]+)"/g;
    const labelRe = /<[^>]*>([^<]*(?:HD|SD|High|Normal|Standard)[^<]*)<\/[^>]*>/gi;

    // Simple regex parse
    const hdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*(?:HD|High)[^<]*</i) ||
                    html.match(/HD[^<]*href="(https?:\/\/[^"]+)"/i);
    const sdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>[^<]*(?:SD|Normal|Standard)[^<]*</i) ||
                    html.match(/(?:SD|Normal)[^<]*href="(https?:\/\/[^"]+)"/i);

    // Extract all https links from html
    let match;
    const allLinks = [];
    while ((match = linkRe.exec(html)) !== null) {
      if (match[1].includes('fbcdn') || match[1].includes('facebook') || match[1].includes('snapsave')) {
        allLinks.push(match[1]);
      }
    }

    if (allLinks.length >= 2) {
      formats.push({ label: 'MP4 HD', ext: 'mp4', url: allLinks[0], sub: 'High quality' });
      formats.push({ label: 'MP4 SD', ext: 'mp4', url: allLinks[1], sub: 'Standard quality' });
    } else if (allLinks.length === 1) {
      formats.push({ label: 'MP4 Video', ext: 'mp4', url: allLinks[0], sub: '' });
    }

    if (formats.length === 0) throw new Error('No download links found — video may be private');

    return res.json({
      title: 'Facebook Video',
      thumb: null,
      platform: 'facebook',
      formats,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
