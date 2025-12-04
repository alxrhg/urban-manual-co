/**
 * Trip Planner Agent
 * AI agent that autonomously plans trips using tool calling
 */

import { GoogleGenerativeAI, FunctionDeclarationSchemaType } from '@google/generative-ai';
import { ToolRegistry, ToolCallResult } from './ai-tools';
import { travelTools } from './travel-tools';
import { z } from 'zod';

// =============================================================================
// TYPES
// =============================================================================

export interface TripPlannerInput {
  prompt: string;
  userName?: string;
  userId?: string;
  tripId?: string;
  existingContext?: {
    destinations?: string[];
    dates?: { start: string; end: string };
    travelers?: number;
    budget?: number;
    preferences?: string[];
  };
}

export interface TripPlannerOutput {
  success: boolean;
  response: string;
  toolCalls: ToolCallResult[];
  plan?: TripPlan;
  error?: string;
}

export interface TripPlan {
  destination: string;
  dates: {
    start: string;
    end: string;
    duration: number;
  };
  flights?: FlightOption[];
  hotels?: HotelOption[];
  activities?: ActivityItem[];
  weather?: WeatherForecast[];
  estimatedBudget?: {
    flights: number;
    hotels: number;
    activities: number;
    total: number;
  };
}

interface FlightOption {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
}

interface HotelOption {
  id: string;
  name: string;
  location: string;
  pricePerNight: number;
  rating: number;
  source: string;
}

interface ActivityItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  price?: number;
  duration?: string;
}

interface WeatherForecast {
  date: string;
  condition: string;
  temperatureHigh: number;
  temperatureLow: number;
}

// =============================================================================
// AGENT CONFIGURATION
// =============================================================================

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
Be conversational and helpful while providing specific, actionable information.

If you don't have enough information, ask clarifying questions.
When presenting options, provide 2-3 choices with different price points when possible.`;

// =============================================================================
// TRIP PLANNER AGENT CLASS
// =============================================================================

export class TripPlannerAgent {
  private registry: ToolRegistry;
  private genAI: GoogleGenerativeAI;
  private model: string = 'gemini-1.5-flash-latest';

  constructor() {
    this.registry = new ToolRegistry();
    this.registry.registerAll(travelTools);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_API_KEY is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Execute the trip planning agent
   */
  async execute(input: TripPlannerInput): Promise<TripPlannerOutput> {
    const toolCalls: ToolCallResult[] = [];

    try {
      // Set context for tools
      this.registry.setContext({
        userId: input.userId,
        tripId: input.tripId,
      });

      // Build the prompt with context
      const fullPrompt = this.buildPrompt(input);

      // Get function declarations for Gemini
      const functionDeclarations = this.getFunctionDeclarations();

      // Create the model with tools
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        systemInstruction: SYSTEM_PROMPT,
        tools: [{ functionDeclarations }],
      });

      // Start the conversation
      const chat = model.startChat({
        history: [],
      });

      // Send the initial message
      let response = await chat.sendMessage(fullPrompt);
      let result = response.response;

      // Process function calls in a loop
      const maxIterations = 10;
      let iteration = 0;

      while (iteration < maxIterations) {
        const functionCalls = result.functionCalls();

        if (!functionCalls || functionCalls.length === 0) {
          // No more function calls, we're done
          break;
        }

        // Execute all function calls
        const functionResponses = await Promise.all(
          functionCalls.map(async (call) => {
            const toolResult = await this.registry.execute(call.name, call.args as Record<string, unknown>);
            toolCalls.push(toolResult);

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

        // Send function results back to the model
        response = await chat.sendMessage(functionResponses);
        result = response.response;
        iteration++;
      }

      // Extract the final text response
      const textResponse = result.text();

      // Try to extract a structured plan from tool results
      const plan = this.extractPlan(toolCalls);

      return {
        success: true,
        response: textResponse,
        toolCalls,
        plan,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[TripPlannerAgent] Error:', errorMessage);

      return {
        success: false,
        response: 'I encountered an error while planning your trip. Please try again.',
        toolCalls,
        error: errorMessage,
      };
    }
  }

  /**
   * Build the full prompt with context
   */
  private buildPrompt(input: TripPlannerInput): string {
    let prompt = input.prompt;

    if (input.userName) {
      prompt = `User ${input.userName} says: ${prompt}`;
    }

    if (input.existingContext) {
      const ctx = input.existingContext;
      const contextParts: string[] = [];

      if (ctx.destinations?.length) {
        contextParts.push(`Destinations: ${ctx.destinations.join(', ')}`);
      }
      if (ctx.dates) {
        contextParts.push(`Dates: ${ctx.dates.start} to ${ctx.dates.end}`);
      }
      if (ctx.travelers) {
        contextParts.push(`Travelers: ${ctx.travelers}`);
      }
      if (ctx.budget) {
        contextParts.push(`Budget: $${ctx.budget}`);
      }
      if (ctx.preferences?.length) {
        contextParts.push(`Preferences: ${ctx.preferences.join(', ')}`);
      }

      if (contextParts.length > 0) {
        prompt += `\n\nExisting trip context:\n${contextParts.join('\n')}`;
      }
    }

    return prompt;
  }

  /**
   * Get Gemini-compatible function declarations
   */
  private getFunctionDeclarations() {
    const tools = this.registry.getAll();

    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: this.zodToGeminiSchema(tool.parameters),
    }));
  }

  /**
   * Convert Zod schema to Gemini function schema
   */
  private zodToGeminiSchema(schema: z.ZodType): {
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
        properties[key] = this.zodToGeminiSchema(value as z.ZodType);
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
      return {
        type: FunctionDeclarationSchemaType.STRING,
      };
    }

    if (schema instanceof z.ZodNumber) {
      return {
        type: FunctionDeclarationSchemaType.NUMBER,
      };
    }

    if (schema instanceof z.ZodBoolean) {
      return {
        type: FunctionDeclarationSchemaType.BOOLEAN,
      };
    }

    if (schema instanceof z.ZodArray) {
      return {
        type: FunctionDeclarationSchemaType.ARRAY,
        items: this.zodToGeminiSchema(schema.element),
      };
    }

    if (schema instanceof z.ZodEnum) {
      return {
        type: FunctionDeclarationSchemaType.STRING,
        enum: schema.options,
      };
    }

    if (schema instanceof z.ZodOptional) {
      return this.zodToGeminiSchema(schema.unwrap());
    }

    if (schema instanceof z.ZodDefault) {
      return this.zodToGeminiSchema(schema.removeDefault());
    }

    // Default to string
    return {
      type: FunctionDeclarationSchemaType.STRING,
    };
  }

  /**
   * Extract a structured plan from tool call results
   */
  private extractPlan(toolCalls: ToolCallResult[]): TripPlan | undefined {
    if (toolCalls.length === 0) return undefined;

    const plan: Partial<TripPlan> = {};

    for (const call of toolCalls) {
      if (call.error) continue;

      const result = call.result as Record<string, unknown>;

      switch (call.toolName) {
        case 'searchFlights':
          if (result.flights && Array.isArray(result.flights)) {
            plan.flights = result.flights.slice(0, 3) as FlightOption[];
          }
          break;

        case 'searchHotels':
          if (result.hotels && Array.isArray(result.hotels)) {
            plan.hotels = result.hotels.slice(0, 3) as HotelOption[];
          }
          break;

        case 'getWeather':
          if (result.forecast && Array.isArray(result.forecast)) {
            plan.weather = result.forecast as WeatherForecast[];
          }
          break;

        case 'searchActivities':
        case 'getRecommendations':
          if (result.activities && Array.isArray(result.activities)) {
            plan.activities = [
              ...(plan.activities || []),
              ...(result.activities as ActivityItem[]),
            ];
          }
          if (result.recommendations && Array.isArray(result.recommendations)) {
            plan.activities = [
              ...(plan.activities || []),
              ...(result.recommendations as ActivityItem[]),
            ];
          }
          break;
      }
    }

    // Calculate estimated budget
    if (plan.flights?.length || plan.hotels?.length) {
      const flightsCost = plan.flights?.[0]?.price || 0;
      const hotelsCost = (plan.hotels?.[0]?.pricePerNight || 0) * 5; // Estimate 5 nights
      const activitiesCost = (plan.activities?.length || 0) * 50; // Estimate $50 per activity

      plan.estimatedBudget = {
        flights: flightsCost,
        hotels: hotelsCost,
        activities: activitiesCost,
        total: flightsCost + hotelsCost + activitiesCost,
      };
    }

    return Object.keys(plan).length > 0 ? (plan as TripPlan) : undefined;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create a new trip planner agent instance
 */
export function createTripPlannerAgent(): TripPlannerAgent {
  return new TripPlannerAgent();
}

/**
 * Quick helper to plan a trip
 */
export async function planTrip(
  prompt: string,
  options?: Partial<TripPlannerInput>
): Promise<TripPlannerOutput> {
  const agent = createTripPlannerAgent();
  return agent.execute({
    prompt,
    ...options,
  });
}
