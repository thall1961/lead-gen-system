import config from '../../config/index';
import { logger } from '../../utils/logger';
import { withRetry } from '../../utils/retry';
import { normalizePhone, normalizeUrl } from '../../utils/text';
import { DiscoveryResult } from '../../types/index';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';

// Fields requested via the FieldMask header. These determine the billing SKU —
// websiteUri / nationalPhoneNumber / rating push the request to the Pro tier.
const FIELD_MASK = [
  'places.displayName',
  'places.websiteUri',
  'places.nationalPhoneNumber',
  'places.formattedAddress',
  'places.addressComponents',
  'places.rating',
  'places.userRatingCount',
  'nextPageToken',
].join(',');

interface PlacesAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface PlacesResult {
  displayName?: { text?: string };
  websiteUri?: string;
  nationalPhoneNumber?: string;
  formattedAddress?: string;
  addressComponents?: PlacesAddressComponent[];
  rating?: number;
  userRatingCount?: number;
}

interface TextSearchResponse {
  places?: PlacesResult[];
  nextPageToken?: string;
}

export class GooglePlacesService {
  private apiKey: string | undefined;

  constructor() {
    this.apiKey = config.GOOGLE_PLACES_API_KEY;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /**
   * Run a Text Search (New) query and return mapped DiscoveryResults.
   * Paginates up to `maxResults` (Google returns up to 20 per page, 60 total).
   */
  async searchText(
    query: string,
    opts: { maxResults?: number; fallbackState?: string; fallbackCity?: string } = {}
  ): Promise<DiscoveryResult[]> {
    if (!this.apiKey) {
      throw new Error(
        'GOOGLE_PLACES_API_KEY is not set. Add it to your .env to run discovery.'
      );
    }

    const maxResults = opts.maxResults ?? 20;
    const results: DiscoveryResult[] = [];
    let pageToken: string | undefined;

    do {
      const body: Record<string, unknown> = {
        textQuery: query,
        regionCode: 'US',
        pageSize: Math.min(20, maxResults - results.length),
      };
      if (pageToken) {
        body.pageToken = pageToken;
      }

      const data = await withRetry(
        async () => {
          const res = await fetch(TEXT_SEARCH_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': this.apiKey as string,
              'X-Goog-FieldMask': FIELD_MASK,
            },
            body: JSON.stringify(body),
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Places API ${res.status}: ${text}`);
          }

          return (await res.json()) as TextSearchResponse;
        },
        { maxAttempts: 3, initialDelayMs: 1000 }
      );

      for (const place of data.places ?? []) {
        const mapped = this.mapPlace(place, opts.fallbackCity, opts.fallbackState);
        if (mapped) {
          results.push(mapped);
        }
      }

      pageToken = data.nextPageToken;
    } while (pageToken && results.length < maxResults);

    return results.slice(0, maxResults);
  }

  private mapPlace(
    place: PlacesResult,
    fallbackCity?: string,
    fallbackState?: string
  ): DiscoveryResult | null {
    const name = place.displayName?.text?.trim();
    if (!name) {
      return null;
    }

    const components = place.addressComponents ?? [];
    const find = (type: string): PlacesAddressComponent | undefined =>
      components.find((c) => (c.types ?? []).includes(type));

    const streetNumber = find('street_number')?.longText;
    const route = find('route')?.longText;
    const street = [streetNumber, route].filter(Boolean).join(' ') || undefined;
    const city = find('locality')?.longText || fallbackCity || '';
    // administrative_area_level_1 shortText is the 2-letter state code (e.g. "OK")
    const state = find('administrative_area_level_1')?.shortText || fallbackState || '';
    const zip = find('postal_code')?.longText || undefined;

    return {
      company_name: name,
      website: place.websiteUri ? normalizeUrl(place.websiteUri) : undefined,
      phone: place.nationalPhoneNumber ? normalizePhone(place.nationalPhoneNumber) : undefined,
      street,
      city,
      state,
      zip,
      google_rating: typeof place.rating === 'number' ? place.rating : undefined,
      google_reviews: typeof place.userRatingCount === 'number' ? place.userRatingCount : undefined,
      source: 'google_places',
    };
  }
}

export const googlePlacesService = new GooglePlacesService();
