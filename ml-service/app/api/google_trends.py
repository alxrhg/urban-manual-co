"""Google Trends API endpoints."""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime, timedelta
from pytrends.request import TrendReq
from app.utils.logger import get_logger
import pandas as pd

logger = get_logger(__name__)
router = APIRouter()


def get_pytrends_client():
    """Initialize and return a pytrends client."""
    try:
        # Initialize pytrends with some basic settings
        # Using empty string for host language (automatically detects)
        # tz=360 is US timezone offset
        pytrends = TrendReq(hl='en-US', tz=360)
        return pytrends
    except Exception as e:
        logger.error(f"Failed to initialize pytrends client: {e}")
        raise HTTPException(status_code=500, detail="Failed to initialize Google Trends client")


@router.get("/trending-searches")
async def get_trending_searches(
    region: str = Query(default="united_states", description="Region code for trending searches"),
):
    """
    Get currently trending searches from Google Trends for a specific region.

    Args:
        region: Region code (e.g., 'united_states', 'united_kingdom', 'japan')

    Returns:
        List of trending search terms with traffic data
    """
    try:
        pytrends = get_pytrends_client()

        # Get trending searches for the region
        trending_searches_df = pytrends.trending_searches(pn=region)

        # Convert to list
        trending_list = trending_searches_df[0].tolist()

        return {
            "region": region,
            "timestamp": datetime.utcnow().isoformat(),
            "trending_searches": trending_list[:20]  # Return top 20
        }
    except Exception as e:
        logger.error(f"Error fetching trending searches: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trending searches: {str(e)}")


@router.get("/interest-over-time")
async def get_interest_over_time(
    keywords: str = Query(..., description="Comma-separated keywords to search (max 5)"),
    timeframe: str = Query(default="today 3-m", description="Timeframe for data (e.g., 'today 3-m', 'today 12-m', 'now 7-d')"),
    geo: str = Query(default="", description="Geographic location (e.g., 'US', 'GB', 'US-NY')"),
    category: int = Query(default=0, description="Category code (0 for all categories)")
):
    """
    Get interest over time for specific keywords.

    Args:
        keywords: Comma-separated list of keywords (max 5)
        timeframe: Time range ('now 1-H', 'now 4-H', 'now 1-d', 'now 7-d', 'today 1-m', 'today 3-m', 'today 12-m', 'today 5-y', 'all')
        geo: Two-letter country code or state code
        category: Category number (0 = all categories, 67 = travel, etc.)

    Returns:
        Time series data showing interest over time
    """
    try:
        # Parse keywords
        keyword_list = [k.strip() for k in keywords.split(',')][:5]  # Max 5 keywords

        if not keyword_list:
            raise HTTPException(status_code=400, detail="At least one keyword is required")

        pytrends = get_pytrends_client()

        # Build payload
        pytrends.build_payload(
            kw_list=keyword_list,
            cat=category,
            timeframe=timeframe,
            geo=geo,
            gprop=''
        )

        # Get interest over time
        interest_df = pytrends.interest_over_time()

        if interest_df.empty:
            return {
                "keywords": keyword_list,
                "timeframe": timeframe,
                "geo": geo,
                "data": []
            }

        # Remove 'isPartial' column if it exists
        if 'isPartial' in interest_df.columns:
            interest_df = interest_df.drop(columns=['isPartial'])

        # Convert to records
        data = []
        for date, row in interest_df.iterrows():
            record = {"date": date.isoformat()}
            for keyword in keyword_list:
                if keyword in row:
                    record[keyword] = int(row[keyword])
            data.append(record)

        return {
            "keywords": keyword_list,
            "timeframe": timeframe,
            "geo": geo,
            "category": category,
            "data": data
        }

    except Exception as e:
        logger.error(f"Error fetching interest over time: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch interest data: {str(e)}")


@router.get("/interest-by-region")
async def get_interest_by_region(
    keywords: str = Query(..., description="Comma-separated keywords to search (max 5)"),
    timeframe: str = Query(default="today 3-m", description="Timeframe for data"),
    resolution: str = Query(default="COUNTRY", description="Resolution: COUNTRY, REGION, CITY, or DMA"),
    include_low_search_volume: bool = Query(default=False, description="Include regions with low search volume")
):
    """
    Get interest by geographic region for specific keywords.

    Args:
        keywords: Comma-separated list of keywords
        timeframe: Time range
        resolution: Geographic resolution (COUNTRY, REGION, CITY, DMA)
        include_low_search_volume: Whether to include low volume regions

    Returns:
        Regional interest data
    """
    try:
        keyword_list = [k.strip() for k in keywords.split(',')][:5]

        if not keyword_list:
            raise HTTPException(status_code=400, detail="At least one keyword is required")

        pytrends = get_pytrends_client()

        # Build payload
        pytrends.build_payload(
            kw_list=keyword_list,
            timeframe=timeframe,
            geo='',
            gprop=''
        )

        # Get interest by region
        region_df = pytrends.interest_by_region(
            resolution=resolution,
            inc_low_vol=include_low_search_volume,
            inc_geo_code=False
        )

        if region_df.empty:
            return {
                "keywords": keyword_list,
                "resolution": resolution,
                "data": []
            }

        # Convert to records
        data = []
        for region, row in region_df.iterrows():
            record = {"region": region}
            for keyword in keyword_list:
                if keyword in row:
                    record[keyword] = int(row[keyword])
            data.append(record)

        # Sort by first keyword's interest (descending)
        if keyword_list and data:
            data.sort(key=lambda x: x.get(keyword_list[0], 0), reverse=True)

        return {
            "keywords": keyword_list,
            "timeframe": timeframe,
            "resolution": resolution,
            "data": data[:50]  # Return top 50 regions
        }

    except Exception as e:
        logger.error(f"Error fetching interest by region: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch regional interest: {str(e)}")


@router.get("/related-queries")
async def get_related_queries(
    keyword: str = Query(..., description="Keyword to search"),
    timeframe: str = Query(default="today 3-m", description="Timeframe for data"),
    geo: str = Query(default="", description="Geographic location")
):
    """
    Get related queries for a specific keyword.

    Args:
        keyword: The keyword to search
        timeframe: Time range
        geo: Geographic location

    Returns:
        Top and rising related queries
    """
    try:
        pytrends = get_pytrends_client()

        # Build payload
        pytrends.build_payload(
            kw_list=[keyword],
            timeframe=timeframe,
            geo=geo,
            gprop=''
        )

        # Get related queries
        related_queries = pytrends.related_queries()

        result = {
            "keyword": keyword,
            "timeframe": timeframe,
            "geo": geo,
            "top": [],
            "rising": []
        }

        if keyword in related_queries:
            # Top queries
            if related_queries[keyword]['top'] is not None:
                top_df = related_queries[keyword]['top']
                result['top'] = top_df.to_dict('records')[:20]

            # Rising queries
            if related_queries[keyword]['rising'] is not None:
                rising_df = related_queries[keyword]['rising']
                result['rising'] = rising_df.to_dict('records')[:20]

        return result

    except Exception as e:
        logger.error(f"Error fetching related queries: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch related queries: {str(e)}")


@router.get("/suggestions")
async def get_suggestions(
    keyword: str = Query(..., description="Partial keyword to get suggestions for")
):
    """
    Get keyword suggestions from Google Trends.

    Args:
        keyword: Partial keyword

    Returns:
        List of suggested keywords
    """
    try:
        pytrends = get_pytrends_client()

        # Get suggestions
        suggestions = pytrends.suggestions(keyword=keyword)

        return {
            "keyword": keyword,
            "suggestions": suggestions
        }

    except Exception as e:
        logger.error(f"Error fetching suggestions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch suggestions: {str(e)}")


@router.get("/realtime-trends")
async def get_realtime_trends(
    region: str = Query(default="US", description="Two-letter country code (e.g., 'US', 'GB', 'IN')"),
    category: str = Query(default="all", description="Category (e.g., 'all', 'b' for business, 'e' for entertainment)")
):
    """
    Get real-time trending searches from Google Trends.

    Args:
        region: Two-letter country code
        category: Trend category

    Returns:
        Real-time trending searches with metadata
    """
    try:
        pytrends = get_pytrends_client()

        # Get realtime trends
        trends_df = pytrends.realtime_trending_searches(pn=region)

        if trends_df.empty:
            return {
                "region": region,
                "category": category,
                "timestamp": datetime.utcnow().isoformat(),
                "trends": []
            }

        # Convert to records
        trends = trends_df.to_dict('records')

        return {
            "region": region,
            "category": category,
            "timestamp": datetime.utcnow().isoformat(),
            "trends": trends[:20]  # Top 20
        }

    except Exception as e:
        logger.error(f"Error fetching realtime trends: {e}")
        # Realtime trends may not be available for all regions
        return {
            "region": region,
            "category": category,
            "timestamp": datetime.utcnow().isoformat(),
            "trends": [],
            "error": "Realtime trends not available for this region"
        }
