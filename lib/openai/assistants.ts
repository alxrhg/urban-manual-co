/**
 * OpenAI Assistants API integration
 * Provides persistent conversation threads and tool integration
 */

import { getOpenAI } from '../openai';

const ASSISTANT_ID = process.env.OPENAI_ASSISTANT_ID || null;
const ASSISTANT_NAME = 'Travel Planning Assistant';

/**
 * Create or get travel planning assistant
 */
export async function getOrCreateAssistant() {
  const openai = getOpenAI();
  if (!openai?.beta) {
    console.warn('[Assistants] OpenAI client not available');
    return null;
  }

  try {
    // If assistant ID is set, use it
    if (ASSISTANT_ID) {
      try {
        const assistant = await openai.beta.assistants.retrieve(ASSISTANT_ID);
        return assistant;
      } catch (error) {
        console.warn('[Assistants] Assistant ID not found, creating new one');
      }
    }

    // Create new assistant
    const assistant = await openai.beta.assistants.create({
      name: ASSISTANT_NAME,
      instructions: `You are a helpful travel planning assistant for Urban Manual, a curated guide to the world's best hotels, restaurants, and travel destinations.

Your role:
- Help users discover amazing destinations, restaurants, and hotels
- Provide personalized recommendations based on their preferences
- Answer questions about destinations, cuisine, culture, and travel
- Help plan trips and itineraries
- Remember user preferences and past conversations

Guidelines:
- Be friendly, knowledgeable, and helpful
- Provide specific, actionable recommendations
- Ask clarifying questions when needed
- Remember context from previous messages
- Use the available tools to search for destinations and perform actions`,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tools: [
        {
          type: 'function',
          function: {
            name: 'search_destinations',
            description: 'Search for destinations (restaurants, hotels, attractions) by city, category, and filters',
            parameters: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query or keywords'
                },
                city: {
                  type: 'string',
                  description: 'City name (e.g., "tokyo", "paris", "new-york")'
                },
                category: {
                  type: 'string',
                  description: 'Category (e.g., "Dining", "Hotel", "Culture", "Bar")'
                },
                priceLevel: {
                  type: 'number',
                  description: 'Price level (1-4, where 1 is budget and 4 is luxury)',
                  minimum: 1,
                  maximum: 4
                },
                minRating: {
                  type: 'number',
                  description: 'Minimum rating (0-5)',
                  minimum: 0,
                  maximum: 5
                }
              },
              required: ['query']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'save_destination',
            description: 'Save a destination to user\'s saved places',
            parameters: {
              type: 'object',
              properties: {
                destinationSlug: {
                  type: 'string',
                  description: 'Destination slug or ID'
                }
              },
              required: ['destinationSlug']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'mark_visited',
            description: 'Mark a destination as visited',
            parameters: {
              type: 'object',
              properties: {
                destinationSlug: {
                  type: 'string',
                  description: 'Destination slug or ID'
                }
              },
              required: ['destinationSlug']
            }
          }
        }
      ]
    });

    console.log('[Assistants] Created assistant:', assistant.id);
    return assistant;
  } catch (error: any) {
    console.error('[Assistants] Error creating assistant:', error);
    return null;
  }
}

/**
 * Create or get thread for a user
 */
export async function getOrCreateThread(userId: string): Promise<string | null> {
  const openai = getOpenAI();
  if (!openai?.beta) {
    return null;
  }

  try {
    // In a real implementation, you'd store thread IDs in your database
    // For now, we'll create a new thread each time (you can optimize this later)
    const thread = await openai.beta.threads.create({
      metadata: {
        userId: userId
      }
    });

    return thread.id;
  } catch (error: any) {
    console.error('[Assistants] Error creating thread:', error);
    return null;
  }
}

/**
 * Add message to thread and get response
 */
export async function chatWithAssistant(
  threadId: string,
  message: string,
  userId?: string
): Promise<{ response: string; toolCalls?: any[] } | null> {
  const openai = getOpenAI();
  if (!openai?.beta) {
    return null;
  }

  try {
    // Add user message
    await openai.beta.threads.messages.create(threadId, {
      role: 'user',
      content: message
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(threadId, {
      assistant_id: (await getOrCreateAssistant())?.id || '',
    });

    // Wait for completion
    let runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      await new Promise(resolve => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(threadId, run.id);
    }

    if (runStatus.status === 'completed') {
      // Get messages
      const messages = await openai.beta.threads.messages.list(threadId);
      const assistantMessage = messages.data.find((m: any) => m.role === 'assistant');
      
      if (assistantMessage) {
        const content = assistantMessage.content[0];
        if (content.type === 'text') {
          return {
            response: content.text.value,
            toolCalls: runStatus.required_action?.submit_tool_outputs?.tool_calls || []
          };
        }
      }
    } else if (runStatus.status === 'requires_action') {
      // Handle tool calls
      return {
        response: '',
        toolCalls: runStatus.required_action?.submit_tool_outputs?.tool_calls || []
      };
    }

    return null;
  } catch (error: any) {
    console.error('[Assistants] Error chatting with assistant:', error);
    return null;
  }
}

