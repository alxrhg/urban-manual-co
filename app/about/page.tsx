import { Metadata } from 'next';
import Link from 'next/link';
import {
  Compass,
  MapPinned,
  Sparkles,
  BookmarkCheck,
  ShieldCheck,
  Share2,
  MessageCircle,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About | The Urban Manual',
  description:
    'Learn about The Urban Manual and our mission to help you discover amazing places.',
};

const stats = [
  { label: 'Cities curated', value: '120+', detail: 'Constantly refreshed with new finds' },
  { label: 'Places reviewed', value: '18k+', detail: 'Thoughtful curation over volume' },
  { label: 'Collections built', value: '4.2k', detail: 'Shared by locals and travelers' },
];

const pillars = [
  {
    title: 'Curation with intent',
    description:
      'We pair editorial review with live signals to highlight what matters now—no filler, no noise.',
    icon: Sparkles,
  },
  {
    title: 'Clarity first',
    description:
      'Structured cards, honest descriptions, and consistent metadata make comparing places effortless.',
    icon: Compass,
  },
  {
    title: 'Reliability everywhere',
    description:
      'From map accuracy to offline-friendly notes, we obsess over details that keep trips on track.',
    icon: ShieldCheck,
  },
];

const tools = [
  {
    title: 'Personal collections',
    copy: 'Save the essentials, add context, and keep them synced across devices.',
    icon: BookmarkCheck,
  },
  {
    title: 'Smart discovery',
    copy: 'Surface destinations by mood, distance, and momentum—not just search terms.',
    icon: MapPinned,
  },
  {
    title: 'Shareable guides',
    copy: 'Publish curated lists with cover art, notes, and deep links for friends or clients.',
    icon: Share2,
  },
];

const commitments = [
  'Keep design minimal so the places shine.',
  'Respect privacy—no dark patterns, ever.',
  'Stay fast on low bandwidth and mobile-first.',
  'Invite community feedback and act on it.',
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100">
      <div className="relative overflow-hidden border-b border-gray-200/70 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(circle_at_20%_20%,_rgba(99,102,241,0.12),_transparent_35%),_radial-gradient(circle_at_80%_0,_rgba(16,185,129,0.12),_transparent_32%),_radial-gradient(circle_at_40%_80%,_rgba(59,130,246,0.08),_transparent_30%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-6 pb-16 pt-14 md:px-10 lg:px-12">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full bg-black text-white px-4 py-2 text-xs font-medium tracking-wide shadow-sm dark:bg-white dark:text-black">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
                Built for confident discovery
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                  Urban Manual is the unified layer for discovering places worth your time.
                </h1>
                <p className="max-w-2xl text-base text-gray-600 dark:text-gray-400 sm:text-lg">
                  We blend thoughtful curation with live intelligence so you can navigate any city with clarity, save what matters, and share it beautifully.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-white dark:text-black dark:hover:shadow-white/10"
                >
                  Explore the guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:border-gray-700"
                >
                  Partner with us
                </Link>
              </div>
            </div>
            <div className="grid w-full max-w-sm grid-cols-3 gap-2 rounded-2xl border border-gray-200/80 bg-white/80 p-4 shadow-sm backdrop-blur dark:border-gray-800/80 dark:bg-gray-900/70">
              {stats.map(stat => (
                <div key={stat.label} className="rounded-xl bg-gray-50 px-3 py-4 text-center dark:bg-gray-800">
                  <div className="text-xl font-semibold text-gray-900 dark:text-white">{stat.value}</div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">{stat.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-12 md:px-10 lg:px-12">
        <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <div
              key={title}
              className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-emerald-400 to-cyan-400" />
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gray-900 text-white shadow-sm transition group-hover:scale-105 dark:bg-white dark:text-black">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">What we build</p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                The toolkit for confident discovery
              </h3>
            </div>
            <Link
              href="/collections"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:border-gray-800 dark:text-gray-100 dark:hover:border-gray-700"
            >
              View collections
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tools.map(({ title, copy, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-gray-200 bg-gray-50 p-5 shadow-sm transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/70 dark:hover:border-gray-700"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-900 shadow-sm dark:bg-gray-900 dark:text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h4 className="text-base font-semibold text-gray-900 dark:text-white">{title}</h4>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8 text-white shadow-sm dark:border-gray-800">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-emerald-300">
              <Sparkles className="h-4 w-4" />
              Our approach
            </div>
            <h3 className="mt-3 text-2xl font-semibold leading-snug">Precision over noise, collaboration over silos.</h3>
            <p className="mt-3 max-w-3xl text-sm text-gray-300">
              We combine editorial judgement, lived experience, and live data to keep the guide sharp. Every release tightens the details: better metadata, clearer grouping, and faster access from any device.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {commitments.map(line => (
                <div
                  key={line}
                  className="flex items-start gap-3 rounded-2xl bg-white/5 p-4 text-sm text-gray-100 ring-1 ring-white/10"
                >
                  <div className="mt-0.5 h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
                  <p>{line}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Stay close</p>
            <h3 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">How we work with you</h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700">
                <MessageCircle className="mt-0.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Feedback loops that ship</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    We gather signals weekly and push design-safe improvements rapidly.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700">
                <Share2 className="mt-0.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Share-ready assets</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Exportable links, embeddable cards, and consistent cover art for every list.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-2xl border border-gray-200 px-4 py-3 transition hover:border-gray-300 dark:border-gray-800 dark:hover:border-gray-700">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Trust by design</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Clear sourcing, reliable hours, and map accuracy you can count on mid-trip.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-gray-200 bg-white px-6 py-8 shadow-sm md:px-10 md:py-10 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Work with us</p>
              <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">Help shape the next release</h3>
              <p className="max-w-2xl text-sm text-gray-600 dark:text-gray-400">
                Whether you are a traveler, a local curator, or a brand partner, we collaborate openly to keep the experience cohesive. Tell us what you need—we build fast and iterate together.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/submit"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:bg-white dark:text-black"
              >
                Submit a place
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:border-gray-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 dark:border-gray-800 dark:text-gray-100 dark:hover:border-gray-700"
              >
                Start a conversation
              </Link>
            </div>
          </div>
        </section>

        <div className="flex justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
