'use client';

import { useEffect, useState } from 'react';
import { Sparkles, Calendar, MapPin } from 'lucide-react';
import { DiscoveryPrompt } from '@/types/discovery';

// Format prompt for display
function formatPrompt(prompt: DiscoveryPrompt): string {
  if (prompt.short_prompt) {
    return prompt.short_prompt;
  }
  return prompt.prompt_text;
}

interface DiscoveryPromptsProps {
  city: string;
  destinationSlug?: string;
  userId?: string;
  userName?: string;
  showPersonalized?: boolean;
  showCrossCity?: boolean;
  className?: string;
}

export default function DiscoveryPrompts({
  city,
  destinationSlug,
  userId,
  userName,
  showPersonalized = false,
  showCrossCity = false,
  className = '',
}: DiscoveryPromptsProps) {
  const [prompts, setPrompts] = useState<DiscoveryPrompt[]>([]);
  const [personalizedPrompt, setPersonalizedPrompt] = useState<string | null>(null);
  const [crossCityCorrelations, setCrossCityCorrelations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrompts();
  }, [city, destinationSlug, userId]);

  const fetchPrompts = async () => {
    try {
      setLoading(true);

      // Fetch base prompts
      const baseUrl = `/api/discovery-prompts?city=${encodeURIComponent(city)}${destinationSlug ? `&destination_slug=${encodeURIComponent(destinationSlug)}` : ''}`;
      const baseResponse = await fetch(baseUrl);
      const baseData = await baseResponse.json();

      if (baseData.prompts) {
        setPrompts(baseData.prompts);
      }

      // Fetch personalized prompt if enabled and user logged in
      if (showPersonalized && userId) {
        const personalizedUrl = `/api/discovery-prompts/personalized?city=${encodeURIComponent(city)}&user_id=${encodeURIComponent(userId)}${userName ? `&user_name=${encodeURIComponent(userName)}` : ''}`;
        const personalizedResponse = await fetch(personalizedUrl);
        const personalizedData = await personalizedResponse.json();

        if (personalizedData.personalized_prompt) {
          setPersonalizedPrompt(personalizedData.personalized_prompt);
        }
      }

      // Fetch cross-city correlations if enabled and user logged in
      if (showCrossCity && userId) {
        const crossCityUrl = `/api/discovery-prompts/cross-city?city=${encodeURIComponent(city)}&user_id=${encodeURIComponent(userId)}`;
        const crossCityResponse = await fetch(crossCityUrl);
        const crossCityData = await crossCityResponse.json();

        if (crossCityData.correlations && crossCityData.correlations.length > 0) {
          setCrossCityCorrelations(crossCityData.correlations);
        }
      }
    } catch (error) {
      console.error('Error fetching discovery prompts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && prompts.length === 0 && !personalizedPrompt && crossCityCorrelations.length === 0) {
    return null;
  }

  if (prompts.length === 0 && !personalizedPrompt && crossCityCorrelations.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Personalized Prompt (Highest Priority) */}
      {personalizedPrompt && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {personalizedPrompt}
            </p>
          </div>
        </div>
      )}

      {/* Base Prompts */}
      {prompts.slice(0, 2).map((prompt) => (
        <div
          key={prompt.id}
          className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4"
        >
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                {prompt.title}
              </h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {formatPrompt(prompt)}
              </p>
              {prompt.action_text && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                  💡 {prompt.action_text}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}

      {/* Cross-City Correlations */}
      {crossCityCorrelations.slice(0, 1).map((correlation, index) => (
        <div
          key={index}
          className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4"
        >
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
              {correlation.prompt}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

