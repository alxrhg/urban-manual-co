# Conversational Travel Intelligence Implementation Plan

## Current State Analysis

### What Exists:
1. ✅ Database tables: `conversation_sessions`, `conversation_messages`
2. ✅ Context handler utilities: `getOrCreateSession`, `saveMessage`, `getConversationMessages`
3. ✅ Separate `/api/conversation/[user_id]/route.ts` endpoint (not used by main search)
4. ❌ `/api/ai-chat/route.ts` doesn't persist conversations
5. ❌ Frontend maintains conversation history in React state (not persisted)
6. ❌ No session token management for anonymous users
7. ❌ AI responses don't reference previous conversation context

### Problems:
- Conversation history is lost on page refresh
- No cross-device continuity
- AI doesn't build on previous messages ("show me more like this" doesn't work)
- Multiple components call `/api/ai-chat` but don't share session state
- Anonymous users can't maintain conversations

---

## Implementation Plan

### Phase 1: Integrate Session Management into `/api/ai-chat` ⚡ **CRITICAL**

**Goal:** Make `/api/ai-chat` truly conversational by persisting all messages and loading conversation history from database.

#### 1.1 Update `/api/ai-chat/route.ts`

**Changes:**
- Accept `sessionToken` parameter (for anonymous users)
- Use `getOrCreateSession()` to get/create session
- Load conversation history from database using `getConversationMessages()`
- Save user message and assistant response to `conversation_messages`
- Update conversation context based on extracted intent
- Generate embeddings for messages for semantic recall
- Return `sessionId` and `sessionToken` in response

**Key improvements:**
```typescript
// Before: conversationHistory passed from client
const { query, userId, conversationHistory = [] } = body;

// After: Load from database
const session = await getOrCreateSession(userId, sessionToken);
const conversationHistory = await getConversationMessages(session.sessionId, 20);
```

#### 1.2 Enhance AI Response Generation

**Changes:**
- Use GPT-4o (not gpt-4o-mini) for better conversational understanding
- Add comprehensive system prompt that emphasizes conversation continuity
- Reference previous messages explicitly in prompts
- Handle relative queries ("more", "another", "different", "similar") intelligently
- Detect when user is refining previous search vs. starting new topic

**System prompt example:**
```
You are Urban Manual's travel intelligence assistant. You maintain conversation context across messages.

CONVERSATION MEMORY:
- Remember previous searches, preferences, and destinations mentioned
- When user says "more", "another", "similar", infer context from previous messages
- Build on previous responses naturally
- If user asks follow-up questions, reference what you said before

PREVIOUS CONVERSATION:
{conversationHistory}

CURRENT CONTEXT:
- City: {context.city}
- Category: {context.category}
- Mood: {context.mood}
- Preferences: {context.preferences}
```

#### 1.3 Handle Anonymous Users

**Changes:**
- Generate `sessionToken` on first request if no `userId`
- Store `sessionToken` in localStorage/cookies
- Support both authenticated and anonymous sessions
- Allow upgrading anonymous session to user session on login

---

### Phase 2: Update Frontend Components 🔄

**Goal:** Make all UI components use persistent sessions instead of React state.

#### 2.1 Update `app/page.tsx` (Homepage Search)

**Changes:**
- Generate/retrieve `sessionToken` from localStorage
- Load conversation history on mount
- Pass `sessionToken` to `/api/ai-chat`
- Update conversation state from API response (not just local state)
- Display conversation history from database

#### 2.2 Update `components/AIAssistant.tsx`

**Changes:**
- Same session management as homepage
- Load conversation history when component opens
- Maintain session across component open/close

#### 2.3 Update `components/ModernAIChat.tsx` (if exists)

**Changes:**
- Integrate with session management
- Load history on mount

---

### Phase 3: Enhanced Conversational Features 💬

**Goal:** Make the AI truly conversational with advanced features.

#### 3.1 Context-Aware Responses

**Features:**
- Reference previous destinations: "Here are more restaurants like [previous place]"
- Remember preferences: "Since you liked [previous place], you might enjoy..."
- Handle pronouns: "Show me more like that" → infer from last result
- Detect topic changes: "What about hotels?" → switch context naturally

#### 3.2 Conversation Summarization

**Implementation:**
- When conversation > 20 messages, summarize context
- Store summary in `context_summary` field
- Use summary for long conversations to reduce token usage
- Maintain recent messages + summary for context

#### 3.3 Intent Drift Detection

**Features:**
- Track when user changes topics (city → category → mood)
- Update context accordingly
- Generate natural transitions: "Switching from restaurants to hotels..."

---

### Phase 4: UI Enhancements 🎨

**Goal:** Make conversation feel natural and responsive.

#### 4.1 Conversation History Display

**Features:**
- Show conversation history in sidebar or expandable section
- Display destinations from previous messages
- Allow clicking previous destinations to jump back
- Visual indicators for conversation turns

#### 4.2 Smart Suggestions

**Features:**
- Generate follow-up questions based on conversation context
- Suggest related searches: "You might also like..."
- Show context-aware prompts: "Explore more in [city]?"

#### 4.3 Loading States

**Features:**
- Show "Thinking..." indicators
- Display context being considered
- Animate conversation flow

---

## Implementation Steps

### Step 1: Fix `/api/ai-chat/route.ts` (Priority 1)

1. Import conversation utilities
2. Add session management
3. Load conversation history from DB
4. Save messages after response
5. Update context based on intent
6. Return session info

### Step 2: Update Frontend (Priority 2)

1. Add session token management utilities
2. Update homepage search component
3. Update AI assistant components
4. Add conversation history loading

### Step 3: Enhance AI Prompts (Priority 3)

1. Create comprehensive system prompt
2. Add conversation context to prompts
3. Handle relative queries better
4. Reference previous messages

### Step 4: Add Advanced Features (Priority 4)

1. Conversation summarization
2. Context-aware suggestions
3. Intent drift detection
4. UI enhancements

---

## Migration Requirements

### Check if tables exist:
```sql
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'conversation_sessions'
);
```

### If missing, run migration:
- `supabase/migrations/300_conversational_ai.sql` (already exists)
- Or `supabase/migrations/025_conversation_tables.sql`

### Add missing columns if needed:
- `session_token` column in `conversation_sessions` (for anonymous users)
- `last_activity` timestamp (for session expiration)

---

## Testing Checklist

- [ ] Anonymous user can start conversation and continue after refresh
- [ ] Authenticated user sessions persist across devices
- [ ] "Show me more like this" works correctly
- [ ] Conversation history loads on page refresh
- [ ] Multiple components share same session
- [ ] Context persists across navigation
- [ ] AI references previous messages naturally
- [ ] Session upgrades from anonymous to authenticated on login

---

## Success Metrics

1. **Conversation Continuity**: User can say "more like this" and AI understands
2. **Persistence**: Conversations survive page refresh
3. **Context Awareness**: AI references previous searches naturally
4. **User Experience**: Feels like talking to a travel expert, not a search engine

---

## Estimated Implementation Time

- **Phase 1** (Backend): 2-3 hours
- **Phase 2** (Frontend): 2-3 hours  
- **Phase 3** (Advanced Features): 3-4 hours
- **Phase 4** (UI Enhancements): 2-3 hours

**Total: ~10-13 hours**

---

## Next Steps

1. ✅ Review this plan
2. ⏳ Implement Phase 1 (backend)
3. ⏳ Test session management
4. ⏳ Implement Phase 2 (frontend)
5. ⏳ Add enhanced prompts
6. ⏳ Test end-to-end conversation flow

