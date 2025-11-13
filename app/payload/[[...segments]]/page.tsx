/**
 * Payload Admin Page
 * 
 * Payload's admin UI is automatically rendered by Next.js integration.
 * Authentication is handled by middleware.ts
 * 
 * Route: /payload
 */
export default function PayloadAdminPage() {
  // Payload's admin UI is automatically rendered by Next.js integration
  // The withPayload() wrapper in next.config.ts handles the routing
  // Authentication is checked in middleware.ts
  // We return null to let Payload's internal routing take over
  return null
}

