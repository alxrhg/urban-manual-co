import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * Planning Trip Page
 * Redirects to the main trip editor at /trips/[id]
 * This route exists for semantic URL structure (planning context)
 */
export default async function PlanningTripPage({ params }: PageProps) {
  const { id } = await params;
  redirect(`/trips/${id}`);
}
