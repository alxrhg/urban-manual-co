'use client';

import { useEffect } from 'react';
import { useUserContext } from '@/contexts/UserContext';
import { useManagedForm, handleBooleanInput } from '@/lib/forms';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function AccountPreferencesPage() {
  const {
    user,
    notificationSettings,
    privacySettings,
    connectedServices,
    updateNotificationSettings,
    updatePrivacySettings,
    updateConnectedServices,
  } = useUserContext();

  const notificationForm = useManagedForm(notificationSettings);
  const privacyForm = useManagedForm(privacySettings);
  const servicesForm = useManagedForm(connectedServices);

  const { setValues: setNotificationValues } = notificationForm;
  const { setValues: setPrivacyValues } = privacyForm;
  const { setValues: setServicesValues } = servicesForm;

  useEffect(() => {
    setNotificationValues(notificationSettings);
  }, [notificationSettings, setNotificationValues]);

  useEffect(() => {
    setPrivacyValues(privacySettings);
  }, [privacySettings, setPrivacyValues]);

  useEffect(() => {
    setServicesValues(connectedServices);
  }, [connectedServices, setServicesValues]);

  if (!user) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Sign in required</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Sign in to manage your notification preferences and connected services.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 text-sm">
      <header className="space-y-2">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Preferences</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Personalize notifications, manage connected apps, and adjust privacy controls.
        </p>
      </header>

      <section aria-labelledby="notification-settings" className="space-y-3">
        <h2 id="notification-settings" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Notification settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose how Urban Manual keeps you informed about new recommendations and activity.
        </p>
        <form
          className="space-y-4"
          onSubmit={async event => {
            event.preventDefault();
            try {
              await notificationForm.submit(() => updateNotificationSettings(notificationForm.values));
            } catch (error) {
              // handled in form state
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="email-updates">Email updates</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive itinerary updates and itinerary reminders.</p>
              </div>
              <Switch
                id="email-updates"
                checked={notificationForm.values.emailUpdates}
                onCheckedChange={handleBooleanInput(notificationForm.updateValue, 'emailUpdates')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="product-announcements">Product highlights</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hear about product updates and new launch announcements.</p>
              </div>
              <Switch
                id="product-announcements"
                checked={notificationForm.values.productAnnouncements}
                onCheckedChange={handleBooleanInput(notificationForm.updateValue, 'productAnnouncements')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="travel-alerts">Travel alerts</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Receive time-sensitive alerts about saved places and trips.</p>
              </div>
              <Switch
                id="travel-alerts"
                checked={notificationForm.values.travelAlerts}
                onCheckedChange={handleBooleanInput(notificationForm.updateValue, 'travelAlerts')}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="community-highlights">Community highlights</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Discover curated stories and itineraries from trusted locals.</p>
              </div>
              <Switch
                id="community-highlights"
                checked={notificationForm.values.communityHighlights}
                onCheckedChange={handleBooleanInput(notificationForm.updateValue, 'communityHighlights')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="submit"
              disabled={notificationForm.status === 'saving'}
              className="underline hover:text-blue-600 disabled:text-gray-400"
            >
              {notificationForm.status === 'saving' ? 'Saving…' : 'Save notification preferences'}
            </button>
            {notificationForm.status === 'success' && (
              <span className="text-green-600 dark:text-green-400">Saved</span>
            )}
            {notificationForm.status === 'error' && notificationForm.message && (
              <span className="text-red-600 dark:text-red-400">{notificationForm.message}</span>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="connected-services" className="space-y-3">
        <h2 id="connected-services" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Connected services
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Link accounts to sync reservations, calendars, and photos.
        </p>
        <form
          className="space-y-4"
          onSubmit={async event => {
            event.preventDefault();
            try {
              await servicesForm.submit(() => updateConnectedServices(servicesForm.values));
            } catch {
              // handled in form state
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="google-sync">Google</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sync Google Trips, Gmail confirmations, and Google Calendar.</p>
              </div>
              <Switch
                id="google-sync"
                checked={servicesForm.values.google}
                onCheckedChange={handleBooleanInput(servicesForm.updateValue, 'google')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="apple-sync">Apple</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Connect with Apple Sign-In and sync Reminders.</p>
              </div>
              <Switch
                id="apple-sync"
                checked={servicesForm.values.apple}
                onCheckedChange={handleBooleanInput(servicesForm.updateValue, 'apple')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="instagram-sync">Instagram</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Surface saved inspiration from Instagram Guides.</p>
              </div>
              <Switch
                id="instagram-sync"
                checked={servicesForm.values.instagram}
                onCheckedChange={handleBooleanInput(servicesForm.updateValue, 'instagram')}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="calendar-sync">Calendar sync</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Automatically add confirmed plans to your calendar.</p>
              </div>
              <Switch
                id="calendar-sync"
                checked={servicesForm.values.calendarSync}
                onCheckedChange={handleBooleanInput(servicesForm.updateValue, 'calendarSync')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="submit"
              disabled={servicesForm.status === 'saving'}
              className="underline hover:text-blue-600 disabled:text-gray-400"
            >
              {servicesForm.status === 'saving' ? 'Saving…' : 'Save connections'}
            </button>
            {servicesForm.status === 'success' && (
              <span className="text-green-600 dark:text-green-400">Saved</span>
            )}
            {servicesForm.status === 'error' && servicesForm.message && (
              <span className="text-red-600 dark:text-red-400">{servicesForm.message}</span>
            )}
          </div>
        </form>
      </section>

      <section aria-labelledby="privacy-controls" className="space-y-3">
        <h2 id="privacy-controls" className="text-base font-medium text-gray-900 dark:text-gray-100">
          Privacy controls
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Decide what others can see and how we personalize your recommendations.
        </p>
        <form
          className="space-y-4"
          onSubmit={async event => {
            event.preventDefault();
            try {
              await privacyForm.submit(() => updatePrivacySettings(privacyForm.values));
            } catch {
              // handled in form state
            }
          }}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="public-profile">Public profile</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Showcase saved lists and achievements on your profile.</p>
              </div>
              <Switch
                id="public-profile"
                checked={privacyForm.values.isPublic}
                onCheckedChange={handleBooleanInput(privacyForm.updateValue, 'isPublic')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="privacy-mode">Privacy mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Hide location-based insights and pause activity sharing.</p>
              </div>
              <Switch
                id="privacy-mode"
                checked={privacyForm.values.privacyMode}
                onCheckedChange={handleBooleanInput(privacyForm.updateValue, 'privacyMode')}
              />
            </div>
            <div className="flex items-center justify-between gap-3 border-b border-gray-200 pb-3 dark:border-gray-800">
              <div>
                <Label htmlFor="allow-tracking">Personalized analytics</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Allow us to use your activity to improve recommendations.</p>
              </div>
              <Switch
                id="allow-tracking"
                checked={privacyForm.values.allowTracking}
                onCheckedChange={handleBooleanInput(privacyForm.updateValue, 'allowTracking')}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="show-activity">Share activity</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Allow followers to see your recent saves and visits.</p>
              </div>
              <Switch
                id="show-activity"
                checked={privacyForm.values.showActivity}
                onCheckedChange={handleBooleanInput(privacyForm.updateValue, 'showActivity')}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <button
              type="submit"
              disabled={privacyForm.status === 'saving'}
              className="underline hover:text-blue-600 disabled:text-gray-400"
            >
              {privacyForm.status === 'saving' ? 'Saving…' : 'Save privacy settings'}
            </button>
            {privacyForm.status === 'success' && (
              <span className="text-green-600 dark:text-green-400">Saved</span>
            )}
            {privacyForm.status === 'error' && privacyForm.message && (
              <span className="text-red-600 dark:text-red-400">{privacyForm.message}</span>
            )}
          </div>
        </form>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Privacy mode overrides public profile visibility. When enabled, your lists and activity feed will be hidden until you turn it off.
        </p>
      </section>
    </div>
  );
}
