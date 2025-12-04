'use client';

import { useState } from 'react';
import {
  X,
  User,
  UserPlus,
  Mail,
  Clock,
  Trash2,
  Copy,
  Check,
  Calendar,
  Download,
  Share2,
  AlertTriangle,
  ChevronDown,
  Users,
  Globe,
  Lock,
  Send,
} from 'lucide-react';
import type { Trip } from '@/types/trip';
import { parseDestinations, stringifyDestinations } from '@/types/trip';

/**
 * Collaborator role type
 */
export type CollaboratorRole = 'owner' | 'editor' | 'viewer';

/**
 * Trip collaborator type
 */
export interface TripCollaborator {
  id: string;
  trip_id: string;
  user_id?: string;
  email: string;
  role: CollaboratorRole;
  status: 'active' | 'pending';
  invited_at: string;
  accepted_at?: string;
}

interface TripSettingsProps {
  trip: Trip;
  collaborators: TripCollaborator[];
  onUpdateTrip: (updates: Partial<Trip>) => void;
  onInvite: (email: string, role: CollaboratorRole) => void;
  onRemoveCollaborator: (id: string) => void;
  onDeleteTrip: () => void;
  onClose?: () => void;
  currentUserEmail?: string;
}

// Common trip emojis
const tripEmojis = [
  '🏖️', '🏔️', '🌴', '✈️', '🗺️', '🌍', '🌏', '🌎',
  '🏰', '🎡', '🎢', '🌅', '🍷', '🍕', '🍜', '🎉',
  '❤️', '🎂', '💍', '👨‍👩‍👧‍👦', '🏠', '🚗', '🚂', '⛵',
];

// Currency options
const currencies = [
  { code: 'USD', label: 'US Dollar', symbol: '$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'GBP', label: 'British Pound', symbol: '£' },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥' },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$' },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF' },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥' },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹' },
  { code: 'MXN', label: 'Mexican Peso', symbol: '$' },
];

/**
 * TripSettings - Settings panel for trip configuration
 *
 * Sections:
 * 1. Trip Details (name, emoji, destinations, dates, travelers)
 * 2. Display Preferences (time format, temperature, distance, currency)
 * 3. Sharing (visibility, share link, collaborators)
 * 4. Export (calendar, PDF, image)
 * 5. Danger Zone (delete trip)
 */
export default function TripSettings({
  trip,
  collaborators,
  onUpdateTrip,
  onInvite,
  onRemoveCollaborator,
  onDeleteTrip,
  onClose,
  currentUserEmail,
}: TripSettingsProps) {
  // Local state for form fields
  const [title, setTitle] = useState(trip.title);
  const [emoji, setEmoji] = useState(getStoredEmoji(trip) || '🏖️');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [destinations, setDestinations] = useState(parseDestinations(trip.destination));
  const [newDestination, setNewDestination] = useState('');
  const [startDate, setStartDate] = useState(trip.start_date || '');
  const [endDate, setEndDate] = useState(trip.end_date || '');
  const [travelers, setTravelers] = useState(getStoredTravelers(trip) || 2);

  // Display preferences (would be stored in trip settings)
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h');
  const [tempUnit, setTempUnit] = useState<'F' | 'C'>('F');
  const [distanceUnit, setDistanceUnit] = useState<'miles' | 'km'>('miles');
  const [currency, setCurrency] = useState('USD');

  // Sharing
  const [visibility, setVisibility] = useState<'private' | 'shared' | 'public'>(
    trip.is_public ? 'public' : 'private'
  );
  const [shareLink, setShareLink] = useState(`urbanmanual.co/t/${trip.id.slice(0, 8)}`);
  const [linkCopied, setLinkCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<CollaboratorRole>('editor');

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Save trip details
  const handleSaveDetails = () => {
    onUpdateTrip({
      title,
      destination: stringifyDestinations(destinations),
      start_date: startDate || null,
      end_date: endDate || null,
      // Store emoji and travelers in notes JSON
      notes: JSON.stringify({
        ...safeParseNotes(trip.notes),
        emoji,
        travelers,
      }),
    });
  };

  // Copy share link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`https://${shareLink}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Send invite
  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    onInvite(inviteEmail.trim(), inviteRole);
    setInviteEmail('');
  };

  // Add destination
  const handleAddDestination = () => {
    if (!newDestination.trim()) return;
    setDestinations([...destinations, newDestination.trim()]);
    setNewDestination('');
  };

  // Remove destination
  const handleRemoveDestination = (index: number) => {
    setDestinations(destinations.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Trip Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* 1. Trip Details */}
        <section className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            TRIP DETAILS
          </h3>

          {/* Trip Name */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Trip name
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleSaveDetails}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            />
          </div>

          {/* Emoji */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Emoji
            </label>
            <div className="relative">
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <span className="text-xl">{emoji}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg z-10">
                  <div className="grid grid-cols-8 gap-1">
                    {tripEmojis.map((e) => (
                      <button
                        key={e}
                        onClick={() => {
                          setEmoji(e);
                          setShowEmojiPicker(false);
                          // Auto-save
                          setTimeout(handleSaveDetails, 0);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-xl transition-colors"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Destinations */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Destination(s)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {destinations.map((dest, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
                >
                  {dest}
                  <button
                    onClick={() => handleRemoveDestination(index)}
                    className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDestination}
                onChange={(e) => setNewDestination(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDestination()}
                placeholder="Add destination"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
              <button
                onClick={handleAddDestination}
                className="px-3 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Start date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                onBlur={handleSaveDetails}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                End date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                onBlur={handleSaveDetails}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
            </div>
          </div>

          {/* Travelers */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Travelers
            </label>
            <select
              value={travelers}
              onChange={(e) => {
                setTravelers(Number(e.target.value));
                setTimeout(handleSaveDetails, 0);
              }}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'traveler' : 'travelers'}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 2. Display Preferences */}
        <section className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            DISPLAY PREFERENCES
          </h3>

          {/* Time Format */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Time format
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTimeFormat('12h')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeFormat === '12h'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                12-hour (8:30 PM)
              </button>
              <button
                onClick={() => setTimeFormat('24h')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeFormat === '24h'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                24-hour (20:30)
              </button>
            </div>
          </div>

          {/* Temperature */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Temperature
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setTempUnit('F')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tempUnit === 'F'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                °F
              </button>
              <button
                onClick={() => setTempUnit('C')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  tempUnit === 'C'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                °C
              </button>
            </div>
          </div>

          {/* Distance */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Distance
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setDistanceUnit('miles')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  distanceUnit === 'miles'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Miles
              </button>
              <button
                onClick={() => setDistanceUnit('km')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  distanceUnit === 'km'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                Kilometers
              </button>
            </div>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} - {c.label}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 3. Sharing */}
        <section className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            SHARING
          </h3>

          {/* Visibility */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Visibility
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setVisibility('private');
                  onUpdateTrip({ is_public: false });
                }}
                className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'private'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Lock className="w-4 h-4" />
                Private
              </button>
              <button
                onClick={() => {
                  setVisibility('shared');
                  onUpdateTrip({ is_public: false });
                }}
                className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'shared'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Users className="w-4 h-4" />
                Shared
              </button>
              <button
                onClick={() => {
                  setVisibility('public');
                  onUpdateTrip({ is_public: true });
                }}
                className={`flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  visibility === 'public'
                    ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Globe className="w-4 h-4" />
                Public
              </button>
            </div>
          </div>

          {/* Share Link */}
          {visibility !== 'private' && (
            <div className="mb-4">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                Share link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400"
                />
                <button
                  onClick={handleCopyLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    linkCopied
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Collaborators */}
          <div className="mb-4">
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              Collaborators
            </label>
            <div className="space-y-2 mb-3">
              {/* Owner (current user) */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-900 dark:text-white">You</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Owner</p>
                  </div>
                </div>
              </div>

              {/* Other collaborators */}
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 dark:text-white">{collab.email}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                        {collab.status === 'pending' && (
                          <span className="text-amber-500 ml-1">(pending)</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {collab.status === 'pending' && (
                      <button
                        onClick={() => onInvite(collab.email, collab.role)}
                        className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        Resend
                      </button>
                    )}
                    <button
                      onClick={() => onRemoveCollaborator(collab.id)}
                      className="text-xs text-red-500 hover:text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Invite form */}
            <div className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email address"
                className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as CollaboratorRole)}
                className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <UserPlus className="w-4 h-4" />
                Invite
              </button>
            </div>
          </div>
        </section>

        {/* 4. Export */}
        <section className="p-6 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            EXPORT
          </h3>

          <div className="space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Calendar className="w-4 h-4" />
              Export to Google Calendar
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Calendar className="w-4 h-4" />
              Export to Apple Calendar
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Download className="w-4 h-4" />
              Download as PDF
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              <Share2 className="w-4 h-4" />
              Share as image
            </button>
          </div>
        </section>

        {/* 5. Danger Zone */}
        <section className="p-6">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-500 mb-4">
            DANGER ZONE
          </h3>

          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete trip
            </button>
          ) : (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">
                    Are you sure you want to delete this trip?
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    This action cannot be undone. All itinerary items, notes, and settings will be permanently deleted.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onDeleteTrip}
                  className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Delete trip
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Helper functions

function safeParseNotes(notes: string | null): Record<string, unknown> {
  if (!notes) return {};
  try {
    return JSON.parse(notes);
  } catch {
    return {};
  }
}

function getStoredEmoji(trip: Trip): string | undefined {
  const parsed = safeParseNotes(trip.notes);
  return typeof parsed.emoji === 'string' ? parsed.emoji : undefined;
}

function getStoredTravelers(trip: Trip): number | undefined {
  const parsed = safeParseNotes(trip.notes);
  return typeof parsed.travelers === 'number' ? parsed.travelers : undefined;
}
