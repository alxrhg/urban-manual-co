import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createServerClient } from '@/lib/supabase/server';
import { CMSPageRenderer } from '@/components/cms/renderer/CMSPageRenderer';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createServerClient();

  const { data: page } = await supabase
    .from('cms_pages')
    .select('name, title, description, meta_image, seo_config')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (!page) {
    return {
      title: 'Page Not Found',
    };
  }

  const seoConfig = (page.seo_config || {}) as Record<string, unknown>;

  return {
    title: (seoConfig.title as string) || page.title || page.name,
    description: (seoConfig.description as string) || page.description,
    openGraph: {
      title: (seoConfig.title as string) || page.title || page.name,
      description: (seoConfig.description as string) || page.description || undefined,
      images: page.meta_image ? [page.meta_image] : undefined,
    },
  };
}

export default async function CMSPublicPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createServerClient();

  // Fetch published page
  const { data: page, error: pageError } = await supabase
    .from('cms_pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .single();

  if (pageError || !page) {
    notFound();
  }

  // Fetch blocks
  const { data: blocks } = await supabase
    .from('cms_blocks')
    .select('*')
    .eq('page_id', page.id)
    .order('position', { ascending: true });

  return <CMSPageRenderer page={page} blocks={blocks || []} />;
}
