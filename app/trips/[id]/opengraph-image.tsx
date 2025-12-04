import { ImageResponse } from 'next/og';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { Trip, parseDestinations, formatDestinations } from '@/types/trip';

export const runtime = 'edge';

export const alt = 'Trip on The Urban Manual';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function OGImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch trip data using service role client (bypasses RLS for OG crawlers)
  const supabase = createServiceRoleClient();
  const { data: trip, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  // Handle trip not found
  if (error || !trip) {
    return new ImageResponse(
      (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0a0a',
            color: '#ffffff',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700 }}>Trip Not Found</div>
          <div style={{ fontSize: 24, marginTop: 16, color: '#888888' }}>
            The Urban Manual
          </div>
        </div>
      ),
      { ...size }
    );
  }

  const typedTrip = trip as Trip;
  const destinations = parseDestinations(typedTrip.destination);
  const destinationText = formatDestinations(destinations);

  // Format dates if available
  let dateText = '';
  if (typedTrip.start_date || typedTrip.end_date) {
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    if (typedTrip.start_date && typedTrip.end_date) {
      dateText = `${formatDate(typedTrip.start_date)} - ${formatDate(typedTrip.end_date)}`;
    } else if (typedTrip.start_date) {
      dateText = formatDate(typedTrip.start_date);
    }
  }

  // Status badge styling
  const statusColors: Record<string, { bg: string; text: string }> = {
    planning: { bg: '#fef3c7', text: '#92400e' },
    upcoming: { bg: '#dbeafe', text: '#1e40af' },
    ongoing: { bg: '#dcfce7', text: '#166534' },
    completed: { bg: '#f3f4f6', text: '#374151' },
  };
  const statusStyle = statusColors[typedTrip.status] || statusColors.planning;

  // If there's a cover image, use it as background
  const hasCoverImage = typedTrip.cover_image && typedTrip.cover_image.length > 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Background */}
        {hasCoverImage ? (
          <img
            src={typedTrip.cover_image!}
            alt=""
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          />
        )}

        {/* Overlay for readability */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: hasCoverImage
              ? 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.2) 100%)'
              : 'transparent',
          }}
        />

        {/* Content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            height: '100%',
            padding: 60,
            position: 'relative',
          }}
        >
          {/* Status badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: 20,
            }}
          >
            <div
              style={{
                backgroundColor: statusStyle.bg,
                color: statusStyle.text,
                padding: '8px 16px',
                borderRadius: 20,
                fontSize: 18,
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
            >
              {typedTrip.status}
            </div>
          </div>

          {/* Trip title */}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              lineHeight: 1.1,
              marginBottom: 16,
              textShadow: '0 2px 10px rgba(0,0,0,0.5)',
              maxWidth: '90%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {typedTrip.title}
          </div>

          {/* Destination */}
          {destinationText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ marginRight: 8 }}
              >
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  fill="#ffffff"
                />
              </svg>
              <div
                style={{
                  fontSize: 28,
                  color: '#ffffff',
                  opacity: 0.9,
                }}
              >
                {destinationText}
              </div>
            </div>
          )}

          {/* Dates */}
          {dateText && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                style={{ marginRight: 8 }}
              >
                <path
                  d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"
                  fill="#ffffff"
                />
              </svg>
              <div
                style={{
                  fontSize: 24,
                  color: '#ffffff',
                  opacity: 0.8,
                }}
              >
                {dateText}
              </div>
            </div>
          )}

          {/* Branding */}
          <div
            style={{
              position: 'absolute',
              top: 40,
              right: 60,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 600,
                color: '#ffffff',
                opacity: 0.9,
                textShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              The Urban Manual
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
