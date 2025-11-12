'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Loader2,
  MapPin,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { PageContainer } from '@/components/PageContainer';
import { PageIntro } from '@/components/PageIntro';
import { TripPlanner } from '@/components/TripPlanner';
import {
  appendDestinationToTrip,
  createTrip,
  DestinationInput,
  fetchTripDetails,
  updateTrip,
} from '@/services/tripPlannerService';

const STEP_ORDER = ['destination', 'dates', 'budget', 'plan'] as const;
type WizardStep = typeof STEP_ORDER[number];

interface StoredProgress {
  tripId?: string | null;
  tripName?: string;
  destinationName?: string;
  destinationSlug?: string | null;
  destinationCity?: string;
  destinationCategory?: string;
  startDate?: string;
  endDate?: string;
  budget?: number | null;
  step?: WizardStep;
}

export default function NewTripWizardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const storageKey = useMemo(
    () => `trip-wizard-progress-${user?.id ?? 'guest'}`,
    [user?.id]
  );

  const [currentStep, setCurrentStep] = useState<WizardStep>('destination');
  const [tripName, setTripName] = useState('');
  const [destinationName, setDestinationName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [tripId, setTripId] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationInput | null>(null);
  const [plannerReady, setPlannerReady] = useState(false);
  const [isLoadingTrip, setIsLoadingTrip] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [hasAppliedInitialDestination, setHasAppliedInitialDestination] =
    useState(false);

  const steps: Array<{ id: WizardStep; label: string; description: string }> = [
    { id: 'destination', label: 'Destination', description: 'Name your trip' },
    { id: 'dates', label: 'Dates', description: 'Lock in your travel window' },
    { id: 'budget', label: 'Budget', description: 'Set expectations' },
    { id: 'plan', label: 'Plan', description: 'Build your itinerary' },
  ];

  const currentIndex = STEP_ORDER.indexOf(currentStep);

  const tripIdParam = searchParams?.get('tripId');
  const slugParam = searchParams?.get('destinationSlug');
  const nameParam = searchParams?.get('destinationName');
  const cityParam = searchParams?.get('city');
  const categoryParam = searchParams?.get('category');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Reset to defaults when storage key changes
    setTripId(null);
    setTripName('');
    setDestinationName('');
    setStartDate('');
    setEndDate('');
    setBudget('');
    setCurrentStep('destination');
    setPlannerReady(false);
    setSelectedDestination(null);
    setHasAppliedInitialDestination(false);

    const storedRaw = window.localStorage.getItem(storageKey);
    if (storedRaw) {
      try {
        const stored: StoredProgress = JSON.parse(storedRaw);
        if (stored.tripId) {
          setTripId(stored.tripId);
        }
        if (stored.tripName) {
          setTripName(stored.tripName);
        }
        if (stored.destinationName) {
          setDestinationName(stored.destinationName);
        }
        if (stored.destinationSlug) {
          setSelectedDestination({
            slug: stored.destinationSlug,
            name: stored.destinationName || stored.destinationSlug,
            city: stored.destinationCity,
            category: stored.destinationCategory,
          });
        }
        if (stored.startDate) {
          setStartDate(stored.startDate);
        }
        if (stored.endDate) {
          setEndDate(stored.endDate);
        }
        if (typeof stored.budget === 'number') {
          setBudget(stored.budget.toString());
        }
        if (stored.step) {
          setCurrentStep(stored.step);
          setPlannerReady(stored.step === 'plan' && !!stored.tripId);
        }
      } catch (parseError) {
        console.warn('Unable to restore trip wizard progress', parseError);
      }
    }

    setHasHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!slugParam && !nameParam && !cityParam && !categoryParam) return;

    setSelectedDestination((prev) => {
      const updated: DestinationInput = {
        slug: slugParam || prev?.slug || '',
        name: nameParam || prev?.name || '',
        city: cityParam || prev?.city || undefined,
        category: categoryParam || prev?.category || undefined,
      };
      return updated.slug ? updated : prev;
    });

    if (nameParam && !tripName) {
      setTripName(nameParam);
    }
    if (cityParam && !destinationName) {
      setDestinationName(cityParam);
    } else if (nameParam && !destinationName) {
      setDestinationName(nameParam);
    }

    setHasAppliedInitialDestination(false);
    setPlannerReady(false);
    setCurrentStep('destination');
  }, [slugParam, nameParam, cityParam, categoryParam, tripName, destinationName]);

  useEffect(() => {
    if (!hasHydrated) return;
    if (!searchParams) return;

    if (!tripIdParam || !user) return;
    if (tripId && tripId === tripIdParam) return;

    setIsLoadingTrip(true);
    setError(null);
    fetchTripDetails(user.id, tripIdParam)
      .then((details) => {
        if (!details) return;
        setTripId(details.trip.id);
        setTripName(details.trip.title ?? '');
        setDestinationName(details.trip.destination ?? '');
        setStartDate(details.trip.start_date ?? '');
        setEndDate(details.trip.end_date ?? '');
        if (typeof details.trip.budget === 'number') {
          setBudget(details.trip.budget.toString());
        }
        setCurrentStep('plan');
        setPlannerReady(true);
        setHasAppliedInitialDestination(true);
      })
      .catch((fetchError) => {
        console.error('Failed to load trip for wizard', fetchError);
        setError('We could not load that trip. Please try again.');
      })
      .finally(() => setIsLoadingTrip(false));
  }, [hasHydrated, user, tripIdParam, tripId, searchParams]);

  useEffect(() => {
    if (!hasHydrated || typeof window === 'undefined') return;

    const payload: StoredProgress = {
      tripId,
      tripName,
      destinationName,
      destinationSlug: selectedDestination?.slug ?? null,
      destinationCity: selectedDestination?.city ?? undefined,
      destinationCategory: selectedDestination?.category ?? undefined,
      startDate,
      endDate,
      budget: budget ? Number(budget) : null,
      step: currentStep,
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [
    hasHydrated,
    storageKey,
    tripId,
    tripName,
    destinationName,
    selectedDestination,
    startDate,
    endDate,
    budget,
    currentStep,
  ]);

  const goToStep = (step: WizardStep) => {
    setCurrentStep(step);
    setPlannerReady(step === 'plan' && !!tripId);
  };

  const goNext = () => {
    const next = STEP_ORDER[currentIndex + 1];
    if (next) {
      goToStep(next);
    }
  };

  const goBack = () => {
    const prev = STEP_ORDER[currentIndex - 1];
    if (prev) {
      goToStep(prev);
    }
  };

  const handleStartPlanning = async () => {
    if (!tripName.trim() || !destinationName.trim() || !startDate || !endDate) {
      setError('Please complete destination and date details before planning.');
      return;
    }

    if (!user) {
      router.push('/auth/login?redirect=/trips/new');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const numericBudget = budget ? Number(budget) : null;
      let activeTripId = tripId;

      if (activeTripId) {
        await updateTrip(user.id, activeTripId, {
          title: tripName,
          destination: destinationName,
          start_date: startDate,
          end_date: endDate,
          budget: Number.isFinite(numericBudget) ? numericBudget : null,
        });
      } else {
        const created = await createTrip(user.id, {
          title: tripName,
          destination: destinationName,
          start_date: startDate,
          end_date: endDate,
          budget: Number.isFinite(numericBudget) ? numericBudget : null,
          description: null,
        });
        if (created?.id) {
          activeTripId = created.id;
          setTripId(created.id);
        }
      }

      if (
        activeTripId &&
        selectedDestination?.slug &&
        selectedDestination?.name &&
        !hasAppliedInitialDestination
      ) {
        try {
          await appendDestinationToTrip(user.id, activeTripId, selectedDestination);
          setHasAppliedInitialDestination(true);
        } catch (appendError) {
          console.warn('Unable to prefill destination in trip', appendError);
        }
      }

      setPlannerReady(true);
      setCurrentStep('plan');
    } catch (saveError) {
      console.error('Failed to save trip draft', saveError);
      setError('We could not save your trip. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDestinationStepValid = Boolean(tripName.trim() && destinationName.trim());
  const isDatesStepValid = Boolean(startDate && endDate);

  return (
    <PageContainer>
      <PageIntro
        eyebrow="Trip planner"
        title="Craft your next getaway"
        description="Capture the basics in a few guided steps, then refine every detail with the planner you already know."
      />

      <div className="mt-8 space-y-8">
        <nav className="flex flex-wrap items-center gap-3 rounded-3xl border border-gray-200 bg-white/70 p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep;
            const isComplete = currentIndex > index;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  isActive
                    ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                    : isComplete
                    ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
                    : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-900'
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold ${
                    isActive
                      ? 'border-white bg-white/10'
                      : isComplete
                      ? 'border-transparent bg-emerald-500 text-white'
                      : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-950'
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </span>
                <span>
                  <span className="block text-xs font-semibold uppercase tracking-[2px]">
                    {step.label}
                  </span>
                  <span className="mt-1 block text-sm opacity-80">{step.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {error && (
          <div className="rounded-3xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </div>
        )}

        {currentStep === 'destination' && (
          <section className="space-y-6">
            {selectedDestination && (
              <div className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white/80 p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                <span className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                  Selected from explore
                </span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold uppercase tracking-[2px] text-white dark:bg-gray-100 dark:text-gray-900">
                    <MapPin className="h-3.5 w-3.5" />
                    {selectedDestination.name}
                  </span>
                  {selectedDestination.city && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[2px] text-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      {selectedDestination.city}
                    </span>
                  )}
                  {selectedDestination.category && (
                    <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[2px] text-gray-600 dark:bg-gray-900 dark:text-gray-200">
                      {selectedDestination.category}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  We’ll carry this into your itinerary when you start planning.
                </p>
              </div>
            )}

            <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                    Trip name
                  </label>
                  <input
                    type="text"
                    value={tripName}
                    onChange={(event) => setTripName(event.target.value)}
                    placeholder="Summer in Barcelona"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                    Primary destination
                  </label>
                  <input
                    type="text"
                    value={destinationName}
                    onChange={(event) => setDestinationName(event.target.value)}
                    placeholder="Barcelona, Spain"
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:ring-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/trips"
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to trips
              </Link>
              <button
                type="button"
                onClick={goNext}
                disabled={!isDestinationStepValid}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {currentStep === 'dates' && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                    End date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus:ring-gray-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={!isDatesStepValid}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        )}

        {currentStep === 'budget' && (
          <section className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                <label className="text-xs font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                  Total budget (optional)
                </label>
                <div className="mt-3 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 focus-within:border-gray-300 focus-within:ring-2 focus-within:ring-gray-300 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:focus-within:ring-gray-600">
                  <Wallet className="h-4 w-4 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    value={budget}
                    onChange={(event) => setBudget(event.target.value)}
                    placeholder="2500"
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  We’ll surface this inside the planner so you can compare actual spend.
                </p>
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
                <h3 className="text-sm font-semibold uppercase tracking-[2px] text-gray-500 dark:text-gray-400">
                  Overview
                </h3>
                <ul className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-300">
                  <li className="flex items-center gap-3">
                    <MapPin className="h-4 w-4" />
                    {destinationName || 'Destination to be confirmed'}
                  </li>
                  <li className="flex items-center gap-3">
                    <Calendar className="h-4 w-4" />
                    {startDate && endDate
                      ? `${new Date(startDate).toLocaleDateString()} – ${new Date(endDate).toLocaleDateString()}`
                      : 'Dates to confirm'}
                  </li>
                  <li className="flex items-center gap-3">
                    <Wallet className="h-4 w-4" />
                    {budget ? `$${Number(budget).toLocaleString()}` : 'No budget set'}
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={handleStartPlanning}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900 dark:hover:bg-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    Start planning
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {currentStep === 'plan' && (
          <section className="space-y-6">
            <div className="rounded-3xl border border-gray-200 bg-white/80 p-6 shadow-sm dark:border-gray-800 dark:bg-gray-950/70">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Your itinerary workspace
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    Fine-tune schedules, budgets, and packing without losing the progress you just saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => goToStep('budget')}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-white dark:border-gray-700 dark:text-gray-200 dark:hover:border-gray-500 dark:hover:bg-gray-900/60"
                >
                  Edit trip basics
                </button>
              </div>
            </div>

            {isLoadingTrip && (
              <div className="flex items-center justify-center rounded-3xl border border-gray-200 bg-white/80 p-8 text-sm text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-300">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading trip…
              </div>
            )}

            {plannerReady && tripId ? (
              <TripPlanner
                tripId={tripId}
                variant="inline"
                initialDestination={hasAppliedInitialDestination ? undefined : selectedDestination ?? undefined}
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-gray-300 bg-white/50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-950/40 dark:text-gray-300">
                Complete the previous steps to unlock the planner.
              </div>
            )}
          </section>
        )}
      </div>
    </PageContainer>
  );
}
