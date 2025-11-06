// Test GPT-5 Nano with automatic fallback to GPT-4o-mini
import { getOpenAI, OPENAI_MODEL } from '@/lib/openai';

async function testGPT5NanoWithFallback() {
  const openai = getOpenAI();

  if (!openai) {
    console.error('❌ OpenAI client not initialized');
    return;
  }

  console.log('🧪 Testing GPT-5 Nano with fallback to GPT-4o-mini...\n');

  // Test 1: Try GPT-5 Nano
  console.log('Test 1: GPT-5 Nano');
  try {
    const start = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-5-nano',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in one sentence.' }
      ],
      max_tokens: 50,
    });

    const latency = Date.now() - start;
    console.log('✅ GPT-5 Nano works!');
    console.log(`⚡ Latency: ${latency}ms`);
    console.log(`💬 Response: ${response.choices[0].message.content}`);
    console.log(`💰 Tokens: ${response.usage?.total_tokens || 'N/A'}\n`);
  } catch (error: any) {
    console.log('❌ GPT-5 Nano failed:', error.message);
    console.log('🔄 Falling back to GPT-4o-mini...\n');

    // Fallback to GPT-4o-mini
    try {
      const start = Date.now();
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Say hello in one sentence.' }
        ],
        max_tokens: 50,
      });

      const latency = Date.now() - start;
      console.log('✅ GPT-4o-mini works (fallback)!');
      console.log(`⚡ Latency: ${latency}ms`);
      console.log(`💬 Response: ${response.choices[0].message.content}`);
      console.log(`💰 Tokens: ${response.usage?.total_tokens || 'N/A'}\n`);
    } catch (fallbackError: any) {
      console.log('❌ Fallback also failed:', fallbackError.message);
    }
  }

  // Test 2: Speed comparison
  console.log('\nTest 2: Speed Comparison (if both work)');
  const models = ['gpt-5-nano', 'gpt-4o-mini'];

  for (const model of models) {
    try {
      const start = Date.now();
      await openai.chat.completions.create({
        model,
        messages: [{ role: 'user', content: 'Classify this query as search/recommendation/comparison: "romantic restaurants in Paris"' }],
        max_tokens: 20,
      });
      const latency = Date.now() - start;
      console.log(`${model}: ${latency}ms`);
    } catch (error: any) {
      console.log(`${model}: ❌ ${error.message}`);
    }
  }

  // Test 3: Cost comparison
  console.log('\n💰 Cost Comparison (per 1M tokens):');
  console.log('GPT-5 Nano:   $0.05 input, $0.40 output');
  console.log('GPT-4o-mini:  $0.15 input, $0.60 output');
  console.log('Savings:      67% cheaper input, 33% cheaper output\n');
}

// Run the test
testGPT5NanoWithFallback().catch(console.error);
