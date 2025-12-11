/**
 * Chat & Concierge Tools
 *
 * Conversational AI capabilities:
 * - AI concierge queries
 * - Conversation context management
 * - Follow-up suggestions
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { createServiceClient } from "../utils/supabase.js";
import { searchVectors } from "../utils/vector.js";

export const chatTools: Tool[] = [
  {
    name: "concierge_query",
    description:
      "Ask the AI concierge a travel question. Uses RAG to provide context-aware answers based on Urban Manual's destination database.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The user's question or request",
        },
        city: {
          type: "string",
          description: "City context for the query",
        },
        session_id: {
          type: "string",
          description: "Session ID for conversation continuity",
        },
        include_sources: {
          type: "boolean",
          description: "Include source destinations in response (default: true)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "chat_get_context",
    description: "Get conversation context and history for a session.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID",
        },
        limit: {
          type: "number",
          description: "Number of recent messages (default: 10)",
        },
      },
      required: ["session_id"],
    },
  },
  {
    name: "chat_save_message",
    description: "Save a message to conversation history.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID",
        },
        role: {
          type: "string",
          enum: ["user", "assistant"],
          description: "Message role",
        },
        content: {
          type: "string",
          description: "Message content",
        },
        metadata: {
          type: "object",
          description: "Optional metadata (destinations mentioned, etc.)",
        },
      },
      required: ["session_id", "role", "content"],
    },
  },
  {
    name: "chat_get_suggestions",
    description: "Get follow-up question suggestions based on conversation context.",
    inputSchema: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID for context",
        },
        last_response: {
          type: "string",
          description: "The last assistant response",
        },
        city: {
          type: "string",
          description: "City context",
        },
        count: {
          type: "number",
          description: "Number of suggestions (default: 3)",
        },
      },
    },
  },
  {
    name: "chat_analyze_intent",
    description: "Analyze user message to determine intent and extract entities.",
    inputSchema: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "User message to analyze",
        },
      },
      required: ["message"],
    },
  },
];

export async function handleChatTool(
  name: string,
  args: Record<string, unknown> | undefined
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const supabase = createServiceClient();

  switch (name) {
    case "concierge_query": {
      const { query, city, session_id, include_sources = true } = args || {};

      if (!query) {
        return { content: [{ type: "text", text: "Error: query is required" }] };
      }

      // Search for relevant destinations using vector search
      const searchResults = await searchVectors(String(query), {
        city: city as string | undefined,
        limit: 5,
      });

      // Build context from search results
      const context = searchResults
        .map(
          (d) =>
            `${d.name} (${d.city}): ${d.micro_description || d.description || "A destination in " + d.city}`
        )
        .join("\n\n");

      // Build response
      const response: Record<string, unknown> = {
        query,
        city: city || "global",
        context_used: context,
        relevant_destinations: include_sources
          ? searchResults.map((d) => ({
              slug: d.slug,
              name: d.name,
              city: d.city,
              category: d.category,
              relevance_score: d.score,
            }))
          : undefined,
        suggested_response: generateConciergeResponse(String(query), searchResults, city as string | undefined),
      };

      // Save to conversation if session provided
      if (session_id) {
        await supabase.from("conversation_messages").insert({
          session_id,
          role: "user",
          content: query,
          metadata: { city, destinations_referenced: searchResults.map((d) => d.slug) },
        });
      }

      return {
        content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
      };
    }

    case "chat_get_context": {
      const { session_id, limit = 10 } = args || {};

      if (!session_id) {
        return { content: [{ type: "text", text: "Error: session_id is required" }] };
      }

      const { data: messages, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: false })
        .limit(Number(limit));

      if (error) {
        // Table might not exist
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  session_id,
                  messages: [],
                  note: "Conversation history not available",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Reverse to get chronological order
      const chronological = (messages || []).reverse();

      // Extract context
      const destinations_mentioned = new Set<string>();
      const cities_mentioned = new Set<string>();

      chronological.forEach((m) => {
        if (m.metadata?.destinations_referenced) {
          (m.metadata.destinations_referenced as string[]).forEach((d) => destinations_mentioned.add(d));
        }
        if (m.metadata?.city) {
          cities_mentioned.add(m.metadata.city as string);
        }
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                session_id,
                message_count: chronological.length,
                messages: chronological,
                context_summary: {
                  destinations_discussed: Array.from(destinations_mentioned),
                  cities_discussed: Array.from(cities_mentioned),
                },
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "chat_save_message": {
      const { session_id, role, content, metadata } = args || {};

      if (!session_id || !role || !content) {
        return { content: [{ type: "text", text: "Error: session_id, role, and content required" }] };
      }

      const { data, error } = await supabase
        .from("conversation_messages")
        .insert({
          session_id,
          role,
          content,
          metadata: metadata || {},
        })
        .select()
        .single();

      if (error) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true, message: data }, null, 2),
          },
        ],
      };
    }

    case "chat_get_suggestions": {
      const { session_id, last_response, city, count = 3 } = args || {};

      // Generate contextual follow-up suggestions
      const genericSuggestions = [
        "What are the best restaurants nearby?",
        "Any hidden gems I should know about?",
        "What's the best time to visit?",
        "Can you recommend something similar?",
        "What should I book in advance?",
        "Any tips for first-time visitors?",
      ];

      const citySuggestions = city
        ? [
            `What's unique about ${city}?`,
            `Best neighborhoods to explore in ${city}?`,
            `Local favorites in ${city}?`,
          ]
        : [];

      const suggestions = [...citySuggestions, ...genericSuggestions]
        .sort(() => Math.random() - 0.5)
        .slice(0, Number(count));

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                suggestions: suggestions.map((text, i) => ({ id: i + 1, suggestion: text })),
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "chat_analyze_intent": {
      const { message } = args || {};

      if (!message) {
        return { content: [{ type: "text", text: "Error: message is required" }] };
      }

      const msgLower = (message as string).toLowerCase();

      // Simple intent detection
      const intents: Array<{ intent: string; confidence: number }> = [];

      // Search intent
      if (
        msgLower.includes("find") ||
        msgLower.includes("looking for") ||
        msgLower.includes("search") ||
        msgLower.includes("show me")
      ) {
        intents.push({ intent: "search", confidence: 0.8 });
      }

      // Recommendation intent
      if (
        msgLower.includes("recommend") ||
        msgLower.includes("suggest") ||
        msgLower.includes("best") ||
        msgLower.includes("should i")
      ) {
        intents.push({ intent: "recommendation", confidence: 0.85 });
      }

      // Trip planning intent
      if (
        msgLower.includes("trip") ||
        msgLower.includes("itinerary") ||
        msgLower.includes("plan") ||
        msgLower.includes("days in")
      ) {
        intents.push({ intent: "trip_planning", confidence: 0.8 });
      }

      // Information intent
      if (
        msgLower.includes("what is") ||
        msgLower.includes("tell me about") ||
        msgLower.includes("information") ||
        msgLower.includes("how")
      ) {
        intents.push({ intent: "information", confidence: 0.7 });
      }

      // Booking intent
      if (
        msgLower.includes("book") ||
        msgLower.includes("reservation") ||
        msgLower.includes("reserve") ||
        msgLower.includes("availability")
      ) {
        intents.push({ intent: "booking", confidence: 0.85 });
      }

      // Extract entities
      const entities: Record<string, unknown> = {};

      // City extraction (simple pattern matching)
      const cityPatterns = [
        /in\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /visiting\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      ];

      for (const pattern of cityPatterns) {
        const match = (message as string).match(pattern);
        if (match) {
          entities.city = match[1];
          break;
        }
      }

      // Category extraction
      const categories = [
        "restaurant",
        "hotel",
        "bar",
        "cafe",
        "museum",
        "attraction",
        "shop",
        "gallery",
      ];
      for (const cat of categories) {
        if (msgLower.includes(cat)) {
          entities.category = cat;
          break;
        }
      }

      // Number extraction (for trip days, etc.)
      const numberMatch = msgLower.match(/(\d+)\s*(days?|nights?)/);
      if (numberMatch) {
        entities.duration = { value: parseInt(numberMatch[1]), unit: numberMatch[2] };
      }

      // Sort intents by confidence
      intents.sort((a, b) => b.confidence - a.confidence);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                message,
                primary_intent: intents[0] || { intent: "general", confidence: 0.5 },
                all_intents: intents,
                entities,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    default:
      return { content: [{ type: "text", text: `Unknown chat tool: ${name}` }] };
  }
}

function generateConciergeResponse(
  query: string,
  destinations: Array<Record<string, unknown>>,
  city?: string
): string {
  if (destinations.length === 0) {
    return `I couldn't find specific recommendations for "${query}"${city ? ` in ${city}` : ""}. Could you provide more details about what you're looking for?`;
  }

  const topPicks = destinations.slice(0, 3);
  const names = topPicks.map((d) => d.name).join(", ");

  return `Based on your query "${query}", I'd suggest checking out ${names}. ${
    topPicks[0]?.micro_description || ""
  } Would you like more details about any of these?`;
}
