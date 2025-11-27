import { redirect } from 'next/navigation';

interface DestinationPageProps {
  params: Promise<{ slug: string }>;
}

export default async function DestinationPage({ params }: DestinationPageProps) {
  const { slug } = await params;
  redirect(`/places/${slug}`);
}
