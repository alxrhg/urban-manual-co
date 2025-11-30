import { PageBuilder } from '@/components/cms/builder';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CMSEditorPage({ params }: PageProps) {
  const { id } = await params;

  return <PageBuilder pageId={id} />;
}
