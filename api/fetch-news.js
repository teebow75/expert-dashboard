export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in Vercel environment' });

  try {
    const { query, expertNames, date } = req.body;

    const systemPrompt = `You are an expert intelligence researcher. Search the web for real, current news and insights from or about these global leaders: ${expertNames}.

Return ONLY a JSON array (no markdown, no backticks, no explanation) in this exact format:
[{
  "title": "Real article title",
  "expert": "Expert Name · Organization",
  "expertName": "Expert Name",
  "category": "Technology|Finance|Strategy|Policy|Sustainability|Manufacturing|Operations|Investment|Healthcare",
  "region": "EU|US|China|APAC|Japan",
  "summary": "2-3 sentence factual summary of what was actually reported",
  "tags": ["tag1","tag2","tag3"],
  "source": "web|news",
  "sourceName": "e.g. Financial Times, Bloomberg, Reuters",
  "url": "actual URL if available, else empty string",
  "date": "${date}",
  "icon": "single relevant emoji"
}]

Return 8-12 real articles only. Do not invent quotes or fabricate content.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: `Search for today's (${date}) most important news from these global business leaders: ${expertNames}. Focus on: ${query}. Return as JSON array only.`
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return res.status(response.status).json({ error: err.error?.message || 'API error' });
    }

    const data = await response.json();
    const textBlocks = data.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = textBlocks.match(/\[[\s\S]*\]/);
    if (!match) return res.status(500).json({ error: 'No articles in response' });

    const articles = JSON.parse(match[0]);
    return res.status(200).json({ articles });

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
