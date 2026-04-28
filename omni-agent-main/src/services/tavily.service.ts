// Tavily API service for Architect agent product research

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const TAVILY_BASE = 'https://api.tavily.com';

export async function tavilySearch(query: string, maxResults = 5): Promise<{ title: string; url: string; content: string }[]> {
  if (!TAVILY_API_KEY) {
    console.warn('TAVILY_API_KEY not set - returning empty results');
    return [];
  }

  try {
    const res = await fetch(`${TAVILY_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Tavily API error: ${res.status}`);
    }

    const data = (await res.json()) as { results?: Array<{ title?: string; url?: string; content?: string }> };
    const results: { title: string; url: string; content: string }[] = (data.results || []).map(
      (r: { title?: string; url?: string; content?: string }) => ({
        title: r.title || '',
        url: r.url || '',
        content: r.content || '',
      })
    );
    return results;
  } catch (error) {
    console.error('Tavily search error:', error);
    return [];
  }
}
