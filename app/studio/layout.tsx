import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: "Sanity Studio | Urban Manual",
  description: "Content management studio for Urban Manual",
};

/**
 * Dedicated layout for Sanity Studio
 * This layout removes the site header and footer to give Studio full-screen real estate
 */
export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="!min-h-screen" style={{ height: '100vh' }}>
      {children}
    </div>
  );
}
