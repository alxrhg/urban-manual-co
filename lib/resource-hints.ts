type ResourceHint =
  | {
      rel: 'preconnect';
      href: string;
      crossOrigin?: 'anonymous' | 'use-credentials';
    }
  | {
      rel: 'dns-prefetch';
      href: string;
    };

const preconnectHosts = [
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

const dnsPrefetchHosts = [
  "https://vitals.vercel-insights.com",
  "https://guide.michelin.com",
  "https://maps.googleapis.com",
  "https://api.mapbox.com",
  "https://cdn.amcharts.com",
  "https://www.googletagmanager.com",
];

export function getResourceHints(): ResourceHint[] {
  const hints: ResourceHint[] = [];

  for (const host of preconnectHosts) {
    if (host) {
      hints.push({
        rel: "preconnect",
        href: host,
        crossOrigin: host.includes("gstatic") ? "anonymous" : undefined,
      });
    }
  }

  for (const host of dnsPrefetchHosts) {
    hints.push({
      rel: "dns-prefetch",
      href: host,
    });
  }

  return hints;
}
