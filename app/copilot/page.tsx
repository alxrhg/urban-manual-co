'use client';

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useAuth } from "@/contexts/AuthContext";

export default function CopilotPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <div className="w-full px-6 md:px-10 py-20">
        <div className="mb-12">
          <h1 className="text-2xl font-light mb-2">
            AI Travel Assistant
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Powered by A2UI - Get rich, interactive travel recommendations with AI-generated UI components.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
              A2UI Preview
            </span>
            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
              Gemini 2.0
            </span>
          </div>
        </div>

        <CopilotKit runtimeUrl="/api/copilotkit">
          <div className="bg-white dark:bg-[#1A1C1F] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden h-[calc(100vh-16rem)]">
            <CopilotChat
              labels={{
                title: "Urban Manual AI",
                initial: "Hi! I'm your AI travel assistant. Ask me about restaurants, hotels, cities, or help planning your next trip. I can show you interactive cards and recommendations!",
                placeholder: "Ask about destinations, restaurants, hotels...",
              }}
              instructions={`You are the Urban Manual AI travel assistant. You help users discover amazing travel destinations, restaurants, hotels, and experiences worldwide.

Key behaviors:
- Be conversational and helpful
- When users ask about destinations, use the searchDestinations action to find real places from the Urban Manual database
- Provide specific, actionable recommendations
- Include details like location, category, and why it's special
- If a user mentions a city, provide a curated selection of the best spots there
- Be enthusiastic but professional about travel

When presenting destinations, format them nicely with:
- Name and category
- Brief description of what makes it special
- Location/city
- Any notable features (Michelin stars, awards, etc.)

The Urban Manual has 897+ curated destinations across 50+ cities worldwide, focusing on:
- Michelin-starred restaurants
- Boutique and luxury hotels
- Hidden gem cafes and bars
- Cultural attractions
- Architectural landmarks

${user ? `The user is logged in as ${user.email}. You can reference their saved places or trip history if relevant.` : 'The user is browsing as a guest.'}`}
              className="h-full"
            />
          </div>
        </CopilotKit>
      </div>
    </div>
  );
}
