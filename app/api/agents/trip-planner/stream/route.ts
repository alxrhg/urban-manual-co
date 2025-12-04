/**
 * AI Trip Planner Agent Streaming API
 * Real-time streaming endpoint for AI trip planning with tool calling
 */

import { NextRequest } from 'next/server';
import { GoogleGenerativeAI, FunctionDeclarationSchemaType, FunctionCall } from '@google/generative-ai';
import { ToolRegistry, ToolCallResult } from '@/lib/agents/ai-tools';
import { travelTools } from '@/lib/agents/travel-tools';
import { createServerClient } from '@/lib/supabase-server';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SYSTEM_PROMPT = `You are an expert travel planner for Urban Manual, a curated travel guide with 897+ destinations worldwide.

Your role is to help users plan trips by:
1. Understanding their travel needs and preferences
2. Searching for flights, hotels, and activities
3. Getting weather forecasts
4. Creating personalized itineraries

When a user asks about planning a trip:
1. First understand the destination, dates, and number of travelers
2. Search for flights if they need to fly
3. Search for hotels for their stay
4. Get weather forecast for packing advice
5. Find activities and recommendations from Urban Manual's curated database
6. Provide a comprehensive trip plan

Always prioritize Urban Manual's curated destinations when making recommendations.
Be conversational and helpful while providing specific, actionable information.`;

/**
 * Create SSE message
 */
function createSSEMessage(data: Record<string, unknown>): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/agents/trip-planner/stream
 * Stream trip planning responses with real-time tool execution
 */
export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const body = await request.json();
        const { prompt, tripId, context } = body;

        if (!prompt) {
          controller.enqueue(
            encoder.encode(
              createSSEMessage({ type: 'error', error: 'Prompt is required' })
            )
          );
          controller.close();
          return;
        }

        // Send initial status
        controller.enqueue(
          encoder.encode(
            createSSEMessage({ type: 'status', status: 'initializing' })
          )
        );

        // Get user info
        let userId: string | undefined;
        let userName: string | undefined;

        try {
          const supabase = await createServerClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          if (user) {
            userId = user.id;
            userName = user.user_metadata?.full_name || user.email?.split('@')[0];
          }
        } catch {
          // Continue without auth
        }

        // Setup tools
        const registry = new ToolRegistry();
        registry.registerAll(travelTools);
        registry.setContext({ userId, tripId });

        // Initialize Gemini
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) {
          controller.enqueue(
            encoder.encode(
              createSSEMessage({ type: 'error', error: 'AI service not configured' })
            )
          );
          controller.close();
          return;
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const functionDeclarations = getFunctionDeclarations(registry);

        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash-latest',
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations }],
        });

        // Build the full prompt
        let fullPrompt = prompt;
        if (userName) {
          fullPrompt = `User ${userName} says: ${prompt}`;
        }
        if (context) {
          const contextParts: string[] = [];
          if (context.destinations?.length) {
            contextParts.push(`Destinations: ${context.destinations.join(', ')}`);
          }
          if (context.dates) {
            contextParts.push(`Dates: ${context.dates.start} to ${context.dates.end}`);
          }
          if (context.travelers) {
            contextParts.push(`Travelers: ${context.travelers}`);
          }
          if (context.budget) {
            contextParts.push(`Budget: $${context.budget}`);
          }
          if (contextParts.length > 0) {
            fullPrompt += `\n\nExisting trip context:\n${contextParts.join('\n')}`;
          }
        }

        controller.enqueue(
          encoder.encode(
            createSSEMessage({ type: 'status', status: 'processing' })
          )
        );

        // Start chat
        const chat = model.startChat({ history: [] });
        let response = await chat.sendMessage(fullPrompt);
        let result = response.response;

        const toolCalls: ToolCallResult[] = [];
        const maxIterations = 10;
        let iteration = 0;

        // Process function calls
        while (iteration < maxIterations) {
          const functionCalls = result.functionCalls();

          if (!functionCalls || functionCalls.length === 0) {
            break;
          }

          // Execute and stream each tool call
          const functionResponses = await Promise.all(
            functionCalls.map(async (call: FunctionCall) => {
              // Stream tool call start
              controller.enqueue(
                encoder.encode(
                  createSSEMessage({
                    type: 'tool_call',
                    status: 'executing',
                    tool: call.name,
                    args: call.args,
                  })
                )
              );

              // Execute the tool
              const toolResult = await registry.execute(
                call.name,
                call.args as Record<string, unknown>
              );
              toolCalls.push(toolResult);

              // Stream tool result
              controller.enqueue(
                encoder.encode(
                  createSSEMessage({
                    type: 'tool_result',
                    tool: call.name,
                    success: !toolResult.error,
                    result: summarizeToolResult(toolResult),
                  })
                )
              );

              return {
                functionResponse: {
                  name: call.name,
                  response: toolResult.error
                    ? { error: toolResult.error }
                    : { result: toolResult.result },
                },
              };
            })
          );

          // Send function results back
          response = await chat.sendMessage(functionResponses);
          result = response.response;
          iteration++;
        }

        // Stream the final response
        controller.enqueue(
          encoder.encode(
            createSSEMessage({ type: 'response_start' })
          )
        );

        const textResponse = result.text();

        // Stream the text in chunks for better UX
        const words = textResponse.split(' ');
        let chunk = '';
        for (let i = 0; i < words.length; i++) {
          chunk += (i > 0 ? ' ' : '') + words[i];
          if (chunk.length >= 50 || i === words.length - 1) {
            controller.enqueue(
              encoder.encode(
                createSSEMessage({ type: 'chunk', content: chunk })
              )
            );
            chunk = '';
          }
        }

        // Extract plan from tool results
        const plan = extractPlan(toolCalls);

        // Send completion
        controller.enqueue(
          encoder.encode(
            createSSEMessage({
              type: 'complete',
              response: textResponse,
              toolCalls: toolCalls.map((tc) => ({
                tool: tc.toolName,
                success: !tc.error,
              })),
              plan,
            })
          )
        );

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[TripPlannerStream] Error:', errorMessage);

        controller.enqueue(
          encoder.encode(
            createSSEMessage({ type: 'error', error: errorMessage })
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}

/**
 * Get Gemini function declarations from registry
 */
function getFunctionDeclarations(registry: ToolRegistry) {
  const tools = registry.getAll();

  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: zodToGeminiSchema(tool.parameters),
  }));
}

/**
 * Convert Zod to Gemini schema
 */
function zodToGeminiSchema(schema: z.ZodType): {
  type: FunctionDeclarationSchemaType;
  properties?: Record<string, unknown>;
  required?: string[];
  items?: unknown;
  enum?: string[];
} {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      properties[key] = zodToGeminiSchema(value as z.ZodType);
      const zodValue = value as z.ZodType;
      if (!zodValue.isOptional() && !(zodValue instanceof z.ZodDefault)) {
        required.push(key);
      }
    }

    return {
      type: FunctionDeclarationSchemaType.OBJECT,
      properties,
      required: required.length > 0 ? required : undefined,
    };
  }

  if (schema instanceof z.ZodString) {
    return { type: FunctionDeclarationSchemaType.STRING };
  }

  if (schema instanceof z.ZodNumber) {
    return { type: FunctionDeclarationSchemaType.NUMBER };
  }

  if (schema instanceof z.ZodBoolean) {
    return { type: FunctionDeclarationSchemaType.BOOLEAN };
  }

  if (schema instanceof z.ZodArray) {
    return {
      type: FunctionDeclarationSchemaType.ARRAY,
      items: zodToGeminiSchema(schema.element),
    };
  }

  if (schema instanceof z.ZodEnum) {
    return {
      type: FunctionDeclarationSchemaType.STRING,
      enum: schema.options,
    };
  }

  if (schema instanceof z.ZodOptional) {
    return zodToGeminiSchema(schema.unwrap());
  }

  if (schema instanceof z.ZodDefault) {
    return zodToGeminiSchema(schema.removeDefault());
  }

  return { type: FunctionDeclarationSchemaType.STRING };
}

/**
 * Summarize tool result for streaming (reduce payload size)
 */
function summarizeToolResult(result: ToolCallResult): Record<string, unknown> {
  if (result.error) {
    return { error: result.error };
  }

  const data = result.result as Record<string, unknown>;

  // Summarize large arrays
  if (data.flights && Array.isArray(data.flights)) {
    return { flightsFound: (data.flights as unknown[]).length };
  }
  if (data.hotels && Array.isArray(data.hotels)) {
    return { hotelsFound: (data.hotels as unknown[]).length };
  }
  if (data.activities && Array.isArray(data.activities)) {
    return { activitiesFound: (data.activities as unknown[]).length };
  }
  if (data.recommendations && Array.isArray(data.recommendations)) {
    return { recommendationsFound: (data.recommendations as unknown[]).length };
  }
  if (data.forecast && Array.isArray(data.forecast)) {
    return { forecastDays: (data.forecast as unknown[]).length };
  }

  return { success: true };
}

/**
 * Extract plan from tool results
 */
function extractPlan(toolCalls: ToolCallResult[]): Record<string, unknown> | undefined {
  if (toolCalls.length === 0) return undefined;

  const plan: Record<string, unknown> = {};

  for (const call of toolCalls) {
    if (call.error) continue;
    const result = call.result as Record<string, unknown>;

    switch (call.toolName) {
      case 'searchFlights':
        if (result.flights) {
          plan.flights = (result.flights as unknown[]).slice(0, 3);
        }
        break;
      case 'searchHotels':
        if (result.hotels) {
          plan.hotels = (result.hotels as unknown[]).slice(0, 3);
        }
        break;
      case 'getWeather':
        if (result.forecast) {
          plan.weather = result.forecast;
        }
        break;
      case 'searchActivities':
      case 'getRecommendations':
        const items =
          (result.activities as unknown[]) || (result.recommendations as unknown[]);
        if (items) {
          plan.activities = [...((plan.activities as unknown[]) || []), ...items.slice(0, 5)];
        }
        break;
    }
  }

  return Object.keys(plan).length > 0 ? plan : undefined;
}
