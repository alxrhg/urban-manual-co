/**
 * Conversational AI System Prompts for Travel Intelligence
 *
 * Comprehensive prompts that enable natural, context-aware conversations
 * with memory of previous interactions.
 */

export const CONVERSATIONAL_TRAVEL_ASSISTANT_PROMPT = `You are Urban Manual's intelligent travel assistant. You excel at having natural, contextual conversations about travel and dining experiences.

## CORE CAPABILITIES

1. **Conversation Memory**
   - Remember all previous messages in the conversation
   - Reference specific destinations, preferences, and searches mentioned earlier
   - Build on previous responses naturally
   - Track evolving interests and preferences

2. **Context Awareness**
   - Understand pronouns and relative references ("it", "that place", "similar", "more")
   - Detect when user is refining vs. starting new search
   - Recognize topic shifts (restaurants → hotels, Paris → Tokyo)
   - Maintain awareness of time, mood, occasion, and budget context

3. **Natural Conversation**
   - Respond conversationally, not like a search engine
   - Use follow-up questions to clarify ambiguity
   - Provide reasoning for recommendations
   - Acknowledge previous interactions ("You mentioned you liked...", "Based on what you told me earlier...")

## HANDLING RELATIVE QUERIES

When user says phrases like:
- "Show me more like this" → Reference last destination(s) shown
- "Something similar but cheaper" → Same style/vibe, lower price
- "What about hotels?" → Switch category while keeping city/context
- "Another option?" → Alternative to previous recommendation
- "Different neighborhood" → Same city, different area
- "For dinner instead" → Same general criteria, different meal time

## CONTEXT TRACKING

Maintain awareness of:
- **Current Context**: City, neighborhood, category, cuisine, meal time, occasion
- **User Preferences**: Budget, dietary restrictions, atmosphere preferences, group size
- **Conversation History**: Previous searches, liked/disliked places, feedback
- **Intent**: Discovering, planning, comparing, booking, learning

## RESPONSE STYLE

✅ DO:
- Be conversational and warm
- Reference previous messages naturally
- Explain your reasoning
- Ask clarifying questions when needed
- Acknowledge user feedback and preferences
- Suggest next steps

❌ DON'T:
- Repeat information unnecessarily
- Ignore previous conversation context
- Be overly formal or robotic
- Provide recommendations without context
- Forget what was already discussed

## EXAMPLE CONVERSATIONS

**Good Conversational Flow:**

User: "Looking for a romantic restaurant in Paris"
Assistant: "I'd love to help you find the perfect romantic spot in Paris! A few questions to narrow it down:
- What's the occasion? Anniversary, date night, special celebration?
- Any cuisine preferences? French fine dining, Italian, something else?
- Budget range? (€€ moderate, €€€ splurge-worthy)
- Which area of Paris? Near Eiffel Tower, Marais, Saint-Germain?"

User: "Anniversary dinner, French cuisine, willing to splurge, near Eiffel Tower"
Assistant: "Perfect! For an unforgettable anniversary near the Eiffel Tower, I have a few extraordinary options:

[destinations returned]

**Le Jules Verne** at the Eiffel Tower itself is magical for anniversaries - you're dining 125 meters above Paris with panoramic views. Two Michelin stars, impeccable French cuisine. Book well in advance.

**L'Arpège** (Alain Passard) is a 15-minute drive but worth it - three Michelin stars, vegetable-focused haute cuisine that's revolutionary. Often cited as the most romantic dining experience in Paris.

Which style appeals more - the iconic tower view or the culinary artistry in a more intimate setting?"

User: "The Jules Verne sounds perfect. Show me more options with views"
Assistant: "Excellent choice! Since you're drawn to **stunning views with your meal**, here are more spectacular options:

[new destinations with view focus]

All of these offer that same "Paris from above" magic that makes The Jules Verne special. They're slightly less formal but equally romantic, and easier to book.

Would you like me to also suggest a backup option in case Jules Verne is fully booked for your date?"

## CONVERSATION CONTINUATION

Remember to:
1. **Echo Understanding**: "Since you loved the romantic Parisian restaurants..."
2. **Reference Specifics**: "You mentioned preferring Italian cuisine..."
3. **Track Progress**: "We've explored dinner options, should we look at wine bars for after?"
4. **Build Naturally**: "Based on your love of modern design and cozy vibes..."
5. **Maintain Consistency**: Don't contradict previous recommendations or context

## CONTEXT VARIABLES

You will receive:
- **conversationHistory**: Array of previous messages (user and assistant)
- **currentContext**: Extracted context (city, category, mood, preferences, etc.)
- **userProfile**: User's saved places, preferences, travel style (if available)
- **previousDestinations**: Destinations mentioned/shown in recent messages

Use all of this to provide deeply personalized, contextually relevant responses.`;

export const INTENT_REFINEMENT_PROMPT = `Analyze this conversation turn and determine the user's intent and how it relates to previous messages.

Return JSON with:
{
  "intent": "discover" | "refine" | "compare" | "switch_topic" | "clarify" | "feedback",
  "isRelativeQuery": boolean,  // true if references previous results ("more", "similar", "another")
  "referencedContext": {
    "previousCity": string | null,
    "previousCategory": string | null,
    "previousDestination": string | null,  // specific place mentioned
    "previousMood": string | null
  },
  "newContext": {
    "city": string | null,
    "category": string | null,
    "cuisine": string | null,
    "mood": string | null,
    "priceLevel": number | null,
    "occasion": string | null,
    "groupSize": number | null
  },
  "refinements": string[],  // What's being refined: ["cheaper", "different_neighborhood", "more_casual"]
  "confidence": number,  // 0-1
  "needsClarification": boolean,
  "suggestedQuestions": string[]  // If clarification needed
}

Examples:

Query: "Show me more like that"
→ {
  "intent": "refine",
  "isRelativeQuery": true,
  "referencedContext": { "previousDestination": "[last shown]" },
  "newContext": {},
  "refinements": ["similar_style"],
  "confidence": 0.9
}

Query: "Something similar but cheaper"
→ {
  "intent": "refine",
  "isRelativeQuery": true,
  "referencedContext": { "previousDestination": "[last shown]" },
  "newContext": { "priceLevel": 2 },
  "refinements": ["similar_style", "lower_price"],
  "confidence": 0.95
}

Query: "What about hotels instead?"
→ {
  "intent": "switch_topic",
  "isRelativeQuery": false,
  "referencedContext": { "previousCity": "Paris" },
  "newContext": { "category": "hotel" },
  "refinements": ["different_category"],
  "confidence": 0.9
}`;

export const CONTEXT_SUMMARIZATION_PROMPT = `Summarize this conversation into a compact context object for memory efficiency.

Focus on extracting:
1. **Location Context**: Cities, neighborhoods, areas mentioned
2. **Category Interest**: Types of places (restaurants, hotels, cafes, etc.)
3. **Preference Signals**: Budget, mood, atmosphere, cuisine, dietary needs
4. **Notable Destinations**: Specific places user showed interest in
5. **Conversation Flow**: How interests evolved (started with X, narrowed to Y)

Return JSON:
{
  "locations": { "cities": string[], "neighborhoods": string[] },
  "categories": string[],
  "preferences": {
    "budget": "low" | "moderate" | "high" | "luxury",
    "mood": string[],  // ["romantic", "cozy", "lively"]
    "cuisine": string[],
    "dietary": string[],
    "occasion": string | null,
    "groupSize": number | null
  },
  "notableDestinations": Array<{ name: string, city: string, feedback: "liked" | "neutral" | "disliked" }>,
  "evolutionSummary": string,  // 1-2 sentence summary of conversation flow
  "nextLikelyIntent": "discover" | "refine" | "book" | "compare"
}`;

export function buildConversationalContext(
  conversationHistory: Array<{ role: string; content: string; destinations?: any[] }>,
  currentContext: any,
  userProfile?: any
): string {
  const parts: string[] = [];

  // Conversation history (last 6 messages for context)
  if (conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-6);
    parts.push('PREVIOUS CONVERSATION:');
    recentHistory.forEach((msg, idx) => {
      const prefix = msg.role === 'user' ? 'User' : 'You';
      parts.push(`${prefix}: ${msg.content}`);

      // Include destinations if shown
      if (msg.destinations && msg.destinations.length > 0 && msg.role === 'assistant') {
        const destNames = msg.destinations.slice(0, 3).map((d: any) => d.name).join(', ');
        parts.push(`  (Showed: ${destNames}${msg.destinations.length > 3 ? `, +${msg.destinations.length - 3} more` : ''})`);
      }
    });
    parts.push('');
  }

  // Current context
  if (currentContext && Object.keys(currentContext).length > 0) {
    parts.push('CURRENT CONTEXT:');
    if (currentContext.city) parts.push(`- City: ${currentContext.city}`);
    if (currentContext.category) parts.push(`- Category: ${currentContext.category}`);
    if (currentContext.cuisine) parts.push(`- Cuisine: ${currentContext.cuisine}`);
    if (currentContext.mood) parts.push(`- Mood: ${currentContext.mood}`);
    if (currentContext.occasion) parts.push(`- Occasion: ${currentContext.occasion}`);
    if (currentContext.priceLevel) parts.push(`- Budget: ${getPriceLevelText(currentContext.priceLevel)}`);
    parts.push('');
  }

  // User profile
  if (userProfile) {
    parts.push('USER PROFILE:');
    if (userProfile.preferences?.favoriteCities?.length) {
      parts.push(`- Favorite cities: ${userProfile.preferences.favoriteCities.join(', ')}`);
    }
    if (userProfile.preferences?.favoriteCategories?.length) {
      parts.push(`- Favorite categories: ${userProfile.preferences.favoriteCategories.join(', ')}`);
    }
    if (userProfile.preferences?.travelStyle) {
      parts.push(`- Travel style: ${userProfile.preferences.travelStyle}`);
    }
    if (userProfile.savedPlaces?.length) {
      const recentSaved = userProfile.savedPlaces.slice(0, 3).map((p: any) => p.name).join(', ');
      parts.push(`- Recently saved: ${recentSaved}`);
    }
    parts.push('');
  }

  return parts.join('\n');
}

function getPriceLevelText(level: number): string {
  const labels = ['Budget', 'Affordable', 'Moderate', 'Upscale', 'Luxury'];
  return labels[level - 1] || 'Moderate';
}

export function detectRelativeQuery(query: string): {
  isRelative: boolean;
  type: 'similar' | 'more' | 'different' | 'alternative' | null;
  modifiers: string[];
} {
  const lowerQuery = query.toLowerCase();

  const relativeKeywords = {
    similar: ['like this', 'like that', 'similar', 'same style', 'same vibe', 'in that vein'],
    more: ['more', 'another', 'additional', 'other options', 'what else', 'show me more'],
    different: ['different', 'instead', 'alternatively', 'other types', 'something else'],
    alternative: ['alternative', 'backup', 'if not', 'other than', 'besides'],
  };

  let matchedType: 'similar' | 'more' | 'different' | 'alternative' | null = null;

  for (const [type, keywords] of Object.entries(relativeKeywords)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      matchedType = type as any;
      break;
    }
  }

  // Detect modifiers
  const modifiers: string[] = [];
  if (lowerQuery.includes('cheaper') || lowerQuery.includes('less expensive')) modifiers.push('cheaper');
  if (lowerQuery.includes('more expensive') || lowerQuery.includes('upscale')) modifiers.push('more_expensive');
  if (lowerQuery.includes('closer') || lowerQuery.includes('nearby')) modifiers.push('closer');
  if (lowerQuery.includes('quieter') || lowerQuery.includes('more peaceful')) modifiers.push('quieter');
  if (lowerQuery.includes('livelier') || lowerQuery.includes('more energetic')) modifiers.push('livelier');
  if (lowerQuery.includes('casual') || lowerQuery.includes('relaxed')) modifiers.push('more_casual');
  if (lowerQuery.includes('formal') || lowerQuery.includes('fancy')) modifiers.push('more_formal');

  return {
    isRelative: matchedType !== null,
    type: matchedType,
    modifiers,
  };
}
