import { DiscoveryEngineClient } from '@google-cloud/discoveryengine';

/**
 * Google Discovery Engine Service
 * Handles search, recommendations, and data management for Discovery Engine
 */
export class DiscoveryEngineService {
  private client: DiscoveryEngineClient | null = null;
  private dataStorePath: string;
  private projectId: string;
  private location: string;
  private dataStoreId: string;

  constructor() {
    // Get configuration from environment variables
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
    this.dataStoreId = process.env.DISCOVERY_ENGINE_DATA_STORE_ID || 'urban-manual-destinations';

    // Construct data store path
    // Format: projects/{project}/locations/{location}/dataStores/{data_store}
    this.dataStorePath = `projects/${this.projectId}/locations/${this.location}/dataStores/${this.dataStoreId}`;

    // Initialize client if credentials are available
    if (this.projectId) {
      try {
        this.client = new DiscoveryEngineClient({
          // Credentials can be provided via:
          // 1. GOOGLE_APPLICATION_CREDENTIALS env var (path to service account JSON)
          // 2. Default credentials from gcloud CLI
          // 3. Explicit credentials object
        });
      } catch (error) {
        console.warn('Discovery Engine client initialization failed:', error);
        this.client = null;
      }
    }
  }

  /**
   * Check if Discovery Engine is configured and available
   */
  isAvailable(): boolean {
    return this.client !== null && this.projectId !== '';
  }

  /**
   * Search destinations using Discovery Engine
   */
  async search(
    query: string,
    options: {
      userId?: string;
      pageSize?: number;
      pageToken?: string;
      filters?: {
        city?: string;
        category?: string;
        priceLevel?: number;
        minRating?: number;
      };
      boostSpec?: {
        condition?: string;
        boost?: number;
      }[];
    } = {}
  ): Promise<{
    results: any[];
    totalSize: number;
    nextPageToken?: string;
  }> {
    if (!this.client || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured. Please set GOOGLE_CLOUD_PROJECT_ID and DISCOVERY_ENGINE_DATA_STORE_ID');
    }

    const {
      userId,
      pageSize = 20,
      pageToken,
      filters = {},
      boostSpec = [],
    } = options;

    // Build filter string
    const filterParts: string[] = [];
    if (filters.city) {
      filterParts.push(`city:${filters.city}`);
    }
    if (filters.category) {
      filterParts.push(`category:${filters.category}`);
    }
    if (filters.priceLevel !== undefined) {
      filterParts.push(`price_level<=${filters.priceLevel}`);
    }
    if (filters.minRating !== undefined) {
      filterParts.push(`rating>=${filters.minRating}`);
    }

    const filterString = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    // Build boost specification
    const boostSpecObj = boostSpec.length > 0
      ? {
          conditionBoostSpecs: boostSpec.map((spec) => ({
            condition: spec.condition,
            boost: spec.boost || 1.0,
          })),
        }
      : undefined;

    try {
      const request = {
        servingConfig: `${this.dataStorePath}/servingConfigs/default_search`,
        query,
        pageSize,
        pageToken,
        filter: filterString,
        boostSpec: boostSpecObj,
        userInfo: userId
          ? {
              userId,
            }
          : undefined,
        personalizationSpec: {
          mode: userId ? 'AUTO' : 'DISABLED',
        },
      };

      const [response] = await this.client.search(request);

      const results = (response.results || []).map((result) => {
        const document = result.document;
        const structData = document?.structData || {};
        
        return {
          id: document?.id || '',
          name: structData.name || '',
          description: structData.description || '',
          city: structData.city || '',
          category: structData.category || '',
          tags: structData.tags || [],
          rating: structData.rating || 0,
          priceLevel: structData.price_level || 0,
          slug: structData.slug || '',
          uri: document?.uri || '',
          relevanceScore: result.relevanceScore || 0,
        };
      });

      return {
        results,
        totalSize: response.totalSize || 0,
        nextPageToken: response.nextPageToken,
      };
    } catch (error: any) {
      console.error('Discovery Engine search error:', error);
      throw new Error(`Discovery Engine search failed: ${error.message}`);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async recommend(
    userId: string,
    options: {
      pageSize?: number;
      filters?: {
        city?: string;
        category?: string;
      };
    } = {}
  ): Promise<any[]> {
    if (!this.client || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured');
    }

    const { pageSize = 10, filters = {} } = options;

    // Build filter string
    const filterParts: string[] = [];
    if (filters.city) {
      filterParts.push(`city:${filters.city}`);
    }
    if (filters.category) {
      filterParts.push(`category:${filters.category}`);
    }

    const filterString = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    try {
      const request = {
        servingConfig: `${this.dataStorePath}/servingConfigs/default_recommendation`,
        userEvent: {
          eventType: 'view-item',
          userInfo: {
            userId,
          },
        },
        pageSize,
        filter: filterString,
      };

      const [response] = await this.client.recommend(request);

      return (response.results || []).map((result) => {
        const document = result.document;
        const structData = document?.structData || {};
        
        return {
          id: document?.id || '',
          name: structData.name || '',
          description: structData.description || '',
          city: structData.city || '',
          category: structData.category || '',
          tags: structData.tags || [],
          rating: structData.rating || 0,
          priceLevel: structData.price_level || 0,
          slug: structData.slug || '',
          uri: document?.uri || '',
          relevanceScore: result.relevanceScore || 0,
        };
      });
    } catch (error: any) {
      console.error('Discovery Engine recommendation error:', error);
      throw new Error(`Discovery Engine recommendation failed: ${error.message}`);
    }
  }

  /**
   * Import a document (destination) into Discovery Engine
   */
  async importDocument(destination: any): Promise<void> {
    if (!this.client || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured');
    }

    try {
      const document = {
        id: destination.slug || destination.id?.toString(),
        name: destination.name || '',
        content: this.buildContent(destination),
        structData: {
          slug: destination.slug || '',
          name: destination.name || '',
          description: destination.description || '',
          city: destination.city || '',
          category: destination.category || '',
          tags: destination.tags || [],
          rating: destination.rating || 0,
          price_level: destination.price_level || 0,
          michelin_stars: destination.michelin_stars || 0,
          coordinates: destination.latitude && destination.longitude
            ? {
                latitude: destination.latitude,
                longitude: destination.longitude,
              }
            : undefined,
          images: destination.images || [],
          metadata: {
            trending_score: destination.trending_score || 0,
            views_count: destination.views_count || 0,
            saves_count: destination.saves_count || 0,
            visits_count: destination.visits_count || 0,
            created_at: destination.created_at || new Date().toISOString(),
            updated_at: destination.updated_at || new Date().toISOString(),
          },
        },
        uri: `/destination/${destination.slug || destination.id}`,
      };

      const request = {
        parent: this.dataStorePath,
        document,
      };

      await this.client.importDocuments(request);
    } catch (error: any) {
      console.error('Discovery Engine import error:', error);
      throw new Error(`Failed to import document: ${error.message}`);
    }
  }

  /**
   * Track a user event (for personalization)
   */
  async trackEvent(event: {
    userId: string;
    eventType: 'search' | 'view' | 'click' | 'save' | 'visit';
    documentId?: string;
    searchQuery?: string;
  }): Promise<void> {
    if (!this.client || !this.isAvailable()) {
      // Silently fail if not configured - events are optional
      return;
    }

    try {
      const userEvent = {
        eventType: event.eventType.toUpperCase(),
        userInfo: {
          userId: event.userId,
        },
        documentInfo: event.documentId
          ? {
              id: event.documentId,
              uri: `/destination/${event.documentId}`,
            }
          : undefined,
        searchInfo: event.searchQuery
          ? {
              searchQuery: event.searchQuery,
            }
          : undefined,
        eventTime: new Date().toISOString(),
      };

      const request = {
        parent: this.dataStorePath,
        userEvent,
      };

      await this.client.collectUserEvent(request);
    } catch (error: any) {
      // Log but don't throw - event tracking shouldn't break the app
      console.warn('Discovery Engine event tracking failed:', error);
    }
  }

  /**
   * Build searchable content from destination data
   */
  private buildContent(destination: any): string {
    const parts: string[] = [];

    if (destination.name) parts.push(destination.name);
    if (destination.description) parts.push(destination.description);
    if (destination.city) parts.push(`Located in ${destination.city}`);
    if (destination.category) parts.push(`Category: ${destination.category}`);
    if (destination.tags && Array.isArray(destination.tags)) {
      parts.push(`Tags: ${destination.tags.join(', ')}`);
    }
    if (destination.cuisine_type) parts.push(`Cuisine: ${destination.cuisine_type}`);
    if (destination.editorial_note) parts.push(destination.editorial_note);

    return parts.join('. ');
  }

  /**
   * Get data store path (for external use)
   */
  getDataStorePath(): string {
    return this.dataStorePath;
  }
}

// Singleton instance
let discoveryEngineService: DiscoveryEngineService | null = null;

export function getDiscoveryEngineService(): DiscoveryEngineService {
  if (!discoveryEngineService) {
    discoveryEngineService = new DiscoveryEngineService();
  }
  return discoveryEngineService;
}

