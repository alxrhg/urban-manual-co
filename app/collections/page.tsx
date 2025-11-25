import { Metadata } from "next";
import Link from "next/link";

import { ContentCard } from "@/components/layout/ContentCard";
import { SubpageHero } from "@/components/layout/SubpageHero";
import { createServerClient } from "@/lib/supabase/server";

type PublicCollection = {
  id: string;
  name: string;
  description: string | null;
  emoji: string | null;
  color: string | null;
  destination_count: number | null;
  view_count: number | null;
  user_profiles:
    | {
        username?: string | null;
        display_name?: string | null;
      }
    | null;
};

export const metadata: Metadata = {
  title: "Collections | Urban Manual",
  description: "Browse the shared vocabulary of collections before managing your own inside the account area.",
};

export const revalidate = 60;

async function getPublicCollections(): Promise<PublicCollection[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("collections")
    .select(
      `
        id,
        name,
        description,
        emoji,
        color,
        destination_count,
        view_count,
        user_profiles: user_profiles!collections_user_id_fkey (
          username,
          display_name
        )
      `,
    )
    .eq("is_public", true)
    .order("view_count", { ascending: false })
    .limit(24);

  return (data as PublicCollection[]) || [];
}

export default async function CollectionsPage() {
  const collections = await getPublicCollections();
  const heroMeta = [
    { label: "Public lists", value: collections.length.toString() },
    { label: "Average places", value: `${Math.round(
      collections.reduce((sum, c) => sum + (c.destination_count || 0), 0) /
        (collections.length || 1),
    )} places` },
    { label: "Most viewed", value: `${collections[0]?.view_count ?? 0} views` },
    { label: "CTA", value: "Manage via Account" },
  ];

  return (
    <main className="w-full px-6 md:px-10 lg:px-16 py-16 md:py-20 min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <SubpageHero
          eyebrow="Collections"
          title="A shared language of lists."
          description="These public collections borrow the same cards, pills, and rounded corners you see on the homepage and account experience. Sign in to remix them or create your own."
          meta={heroMeta}
          pills={[
            { label: "Account-inspired tabs" },
            { label: "Drawer-ready layouts" },
          ]}
          actions={
            <Link
              href="/account?tab=collections"
              className="inline-flex items-center rounded-full border border-neutral-200/80 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-300 dark:hover:text-white"
            >
              Manage your collections →
            </Link>
          }
        />

        <ContentCard
          title="Community highlights"
          description="A sampling of public lists curated by the community and editors."
        >
          {collections.length === 0 ? (
            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              No public collections yet. Sign in to create the first one.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {collections.map(collection => (
                <div
                  key={collection.id}
                  className="rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-white/90 dark:bg-white/[0.04] p-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl" aria-hidden>
                      {collection.emoji || "🗂️"}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">
                        {collection.name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        {collection.destination_count || 0} places •{" "}
                        {collection.user_profiles?.display_name || "Urban Manual"}
                      </p>
                    </div>
                  </div>
                  {collection.description && (
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300 line-clamp-3">
                      {collection.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ContentCard>

        <ContentCard
          variant="muted"
          title="Bring these lists into your account"
          description="Collections sync with the same pill filters and rounded cards you see on the homepage."
          actions={
            <Link
              href="/account?tab=collections"
              className="inline-flex items-center rounded-full border border-neutral-300/70 px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 dark:border-white/10 dark:text-neutral-200"
            >
              Go to account →
            </Link>
          }
        >
          <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <li>• Save collections privately or publish them for friends.</li>
            <li>• Use the same destination drawer actions—save, visit, add to trips.</li>
            <li>• Tabs mirror the account page so navigation stays familiar.</li>
          </ul>
        </ContentCard>
      </div>
    </main>
  );
}

