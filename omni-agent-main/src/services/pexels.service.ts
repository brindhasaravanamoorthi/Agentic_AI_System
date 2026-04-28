// Pexels API service for product images (add product, restock)

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_BASE = 'https://api.pexels.com/v1';

export interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    small: string;
    portrait: string;
    landscape: string;
    tiny: string;
  };
}

/**
 * Search Pexels for images by query (e.g. product name/description).
 * Returns up to perPage image URLs suitable for product display.
 */
export async function searchPexelsImages(
  query: string,
  perPage = 3
): Promise<string[]> {
  if (!PEXELS_API_KEY) {
    console.warn('PEXELS_API_KEY not set - skipping image fetch');
    return [];
  }

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  try {
    const res = await fetch(
      `${PEXELS_BASE}/search?query=${encodeURIComponent(query.trim())}&per_page=${perPage}`,
      {
        headers: {
          Authorization: PEXELS_API_KEY,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Pexels API error: ${res.status}`);
    }

    const data = (await res.json()) as { photos?: PexelsPhoto[] };
    const photos = data.photos || [];

    return photos.map((p) => p.src.medium || p.src.large || p.src.original);
  } catch (error) {
    console.error('Pexels search error:', error);
    return [];
  }
}
