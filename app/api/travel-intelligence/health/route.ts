import { NextRequest, NextResponse } from 'next/server';
import { getCacheStats } from '@/lib/travel-intelligence/cache';
import { TravelIntelligenceConfig } from '@/lib/travel-intelligence/config';

/**
 * Travel Intelligence Health Check API
 *
 * GET /api/travel-intelligence/health
 *
 * Returns system health, configuration, and performance metrics
 */
export async function GET(request: NextRequest) {
  try {
    const cacheStats = getCacheStats();

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',

      // Configuration summary
      config: {
        embeddings: {
          model: TravelIntelligenceConfig.embeddings.model,
          dimensions: TravelIntelligenceConfig.embeddings.dimensions,
          cacheEnabled: TravelIntelligenceConfig.embeddings.cacheEnabled,
        },
        recommendations: {
          weights: TravelIntelligenceConfig.recommendations.weights,
          cacheHours: TravelIntelligenceConfig.recommendations.cacheHours,
        },
        reranking: {
          signals: TravelIntelligenceConfig.reranking.signals,
        },
        personalization: {
          userEmbeddingEnabled: TravelIntelligenceConfig.personalization.userEmbedding.enabled,
        },
      },

      // Cache performance
      cache: cacheStats,

      // Feature status
      features: {
        embeddings: process.env.OPENAI_API_KEY ? 'enabled' : 'disabled',
        intentAnalysis: process.env.GOOGLE_API_KEY ? 'enabled' : 'disabled',
        personalization: TravelIntelligenceConfig.personalization.userEmbedding.enabled ? 'enabled' : 'disabled',
        forecasting: TravelIntelligenceConfig.forecasting.enabled ? 'enabled' : 'disabled',
        knowledgeGraph: TravelIntelligenceConfig.knowledgeGraph.enabled ? 'enabled' : 'disabled',
      },

      // Environment check
      environment: {
        openaiConfigured: !!process.env.OPENAI_API_KEY,
        googleConfigured: !!process.env.GOOGLE_API_KEY,
        supabaseConfigured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
