export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // Not needed with Invidious - direct URLs
  return res.json({ status: 'not needed' });
}
