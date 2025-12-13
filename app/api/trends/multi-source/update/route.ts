/**
 * API Route: Update Multi-Source Trends
 * Updates Reddit, News, and Eventbrite trend data for destinations
 */

import { NextRequest } from 'next/server';
import { withAdminAuth, AdminContext, createSuccessResponse } from '@/lib/errors';
import { fetchRedditTrends } from '@/lib/reddit-trends';
import { fetchNewsTrends, fetchGNewsTrends } from '@/lib/news-trends';
import { fetchEventbriteTrends } from '@/lib/eventbrite-trends';

export const maxDuration = 300; // 5 minutes

export const POST = withAdminAuth(async (request: NextRequest, { serviceClient: supabase }: AdminContext) => {
  const body = await request.json().catch(() => ({}));
  const { limit = 20, city, sources = ['reddit', 'news', 'eventbrite'] } = body;

  // Get destinations that need updating
  let query = supabase
    .from('destinations')
    .select('id, name, city')
    .limit(limit);

  if (city) {
    query = query.eq('city', city);
  }

  const { data: destinations, error } = await query;

  if (error) {
    throw error;
  }

  if (!destinations || destinations.length === 0) {
    return createSuccessResponse({
      message: 'No destinations to update',
      updated: 0,
    });
  }

  const results = {
    reddit: 0,
    news: 0,
    eventbrite: 0,
    errors: [] as string[],
  };

  // Update each destination
  for (const dest of destinations) {
    try {
      // Update Reddit trends
      if (sources.includes('reddit')) {
        try {
          const redditData = await fetchRedditTrends(dest.name, dest.city);

          await supabase
            .from('destinations')
            .update({
              reddit_mention_count: redditData.mentionCount,
              reddit_upvote_score: redditData.upvoteScore,
              reddit_trending_subreddits: redditData.trendingSubreddits,
              reddit_updated_at: new Date().toISOString(),
            })
            .eq('id', dest.id);

          results.reddit++;
          await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limiting
        } catch (error: any) {
          results.errors.push(`Reddit error for ${dest.name}: ${error.message}`);
        }
      }

      // Update News trends
      if (sources.includes('news')) {
        try {
          const newsApiKey = process.env.NEWS_API_KEY;
          const gNewsApiKey = process.env.GNEWS_API_KEY;

          let newsData;
          if (gNewsApiKey) {
            newsData = await fetchGNewsTrends(dest.name, dest.city, gNewsApiKey);
          } else if (newsApiKey) {
            newsData = await fetchNewsTrends(dest.name, dest.city, newsApiKey);
          }

          if (newsData) {
            await supabase
              .from('destinations')
              .update({
                news_article_count: newsData.articleCount,
                news_sentiment_score: newsData.sentimentScore,
                news_top_sources: newsData.topSources,
                news_updated_at: new Date().toISOString(),
              })
              .eq('id', dest.id);

            results.news++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          results.errors.push(`News error for ${dest.name}: ${error.message}`);
        }
      }

      // Update Eventbrite trends (city-level)
      if (sources.includes('eventbrite')) {
        try {
          const eventbriteApiKey = process.env.EVENTBRITE_API_KEY;
          if (eventbriteApiKey) {
            const eventData = await fetchEventbriteTrends(dest.city, eventbriteApiKey);

            // Update all destinations in the same city
            await supabase
              .from('destinations')
              .update({
                eventbrite_event_count: eventData.upcomingEventCount,
                eventbrite_total_attendance: eventData.totalEventAttendance,
                eventbrite_event_categories: eventData.eventCategories,
                eventbrite_updated_at: new Date().toISOString(),
              })
              .eq('city', dest.city);

            results.eventbrite++;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          results.errors.push(`Eventbrite error for ${dest.city}: ${error.message}`);
        }
      }
    } catch (error: any) {
      results.errors.push(`General error for ${dest.name}: ${error.message}`);
    }
  }

  // Recompute multi-source trending scores
  try {
    await supabase.rpc('compute_multi_source_trending_scores');
  } catch (error) {
    console.error('Error computing multi-source trending scores:', error);
  }

  return createSuccessResponse({
    updated: {
      destinations: destinations.length,
      sources: results,
    },
    errors: results.errors.length > 0 ? results.errors : undefined,
  });
});

