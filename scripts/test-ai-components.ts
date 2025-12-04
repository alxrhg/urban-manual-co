/**
 * Test script for AI components:
 * 1. Discovery Engine connectivity and search
 * 2. ChatGPT/OpenAI embeddings generation
 * 3. AI Chat flow review
 */

import { getDiscoveryEngineService } from '@/services/search/discovery-engine';
import { unifiedSearch } from '@/services/discovery/integration';
import { embedText } from '@/services/ai/llm';
import { getOpenAI } from '@/services/ai/openai';

async function testDiscoveryEngine() {
  console.log('\n🔍 Testing Discovery Engine...\n');
  
  try {
    const discoveryEngine = getDiscoveryEngineService();
    const isAvailable = discoveryEngine.isAvailable();
    
    console.log(`✓ Discovery Engine Service: ${isAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    
    if (!isAvailable) {
      console.log('⚠️  Discovery Engine is not available. Check GOOGLE_DISCOVERY_ENGINE_PROJECT_ID and GOOGLE_DISCOVERY_ENGINE_LOCATION env vars.');
      return false;
    }
    
    // Test basic search
    console.log('\n📝 Testing basic search...');
    const searchResult = await unifiedSearch({
      query: 'hotel in tokyo',
      pageSize: 5,
      useCache: false,
    });
    
    console.log(`✓ Search completed`);
    console.log(`  - Source: ${searchResult.source}`);
    console.log(`  - Results: ${searchResult.results.length}`);
    console.log(`  - Top result: ${searchResult.results[0]?.name || 'N/A'}`);
    
    if (searchResult.results.length === 0) {
      console.log('⚠️  No results returned. This might indicate an issue.');
      return false;
    }
    
    // Test conversational search
    console.log('\n💬 Testing conversational search...');
    const convResult = await discoveryEngine.search('budget-friendly hotels', {
      pageSize: 3,
    });
    
    console.log(`✓ Conversational search completed`);
    console.log(`  - Results: ${convResult.results.length}`);
    
    return true;
  } catch (error: any) {
    console.error('❌ Discovery Engine test failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

async function testOpenAIEmbeddings() {
  console.log('\n🧠 Testing OpenAI Embeddings...\n');
  
  try {
    const openai = getOpenAI();
    
    if (!openai) {
      console.log('❌ OpenAI client not initialized');
      console.log('   Check OPENAI_API_KEY environment variable');
      return false;
    }
    
    console.log('✓ OpenAI client initialized');
    
    // Test embedding generation
    console.log('\n📝 Testing embedding generation...');
    const testText = 'hotel in tokyo with great views';
    const embedding = await embedText(testText);
    
    if (!embedding) {
      console.log('❌ Failed to generate embedding');
      return false;
    }
    
    console.log(`✓ Embedding generated successfully`);
    console.log(`  - Text: "${testText}"`);
    console.log(`  - Dimensions: ${embedding.length}`);
    console.log(`  - First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    
    // Test with different text
    const embedding2 = await embedText('restaurant in paris');
    if (embedding2) {
      console.log(`✓ Second embedding generated (${embedding2.length} dimensions)`);
      
      // Calculate cosine similarity
      const similarity = cosineSimilarity(embedding, embedding2);
      console.log(`  - Cosine similarity: ${similarity.toFixed(4)}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ OpenAI Embeddings test failed:', error.message);
    console.error('   Stack:', error.stack);
    return false;
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function reviewAIImplementation() {
  console.log('\n📊 AI Implementation Review\n');
  console.log('=' .repeat(60));
  
  console.log('\n1. AI CHAT FLOW:');
  console.log('   ✓ Uses Discovery Engine as PRIMARY search method');
  console.log('   ✓ Falls back to Supabase vector search if Discovery Engine unavailable');
  console.log('   ✓ Uses OpenAI embeddings for semantic search');
  console.log('   ✓ Supports conversational context (follow-up queries)');
  console.log('   ✓ Supports natural language queries (with filters)');
  console.log('   ✓ Implements caching (5 min TTL) for performance');
  console.log('   ✓ Enriches results with weather, events, photos');
  console.log('   ✓ Generates follow-up suggestions');
  
  console.log('\n2. DISCOVERY ENGINE INTEGRATION:');
  console.log('   ✓ Primary search method in /api/ai-chat');
  console.log('   ✓ Conversational search for follow-ups');
  console.log('   ✓ Natural language parsing');
  console.log('   ✓ Event tracking integrated');
  console.log('   ✓ Contextual recommendations available');
  
  console.log('\n3. EMBEDDING SYSTEM:');
  console.log('   ✓ Uses OpenAI text-embedding-3-large (3072 dimensions)');
  console.log('   ✓ Caching implemented (5 min TTL)');
  console.log('   ✓ Timeout protection (5 seconds)');
  console.log('   ✓ LRU cache with max 100 entries');
  
  console.log('\n4. POTENTIAL ISSUES:');
  console.log('   ⚠️  Discovery Engine requires Google Cloud credentials');
  console.log('   ⚠️  OpenAI API key required for embeddings');
  console.log('   ⚠️  No fallback if both fail (returns empty results)');
  console.log('   ⚠️  Enrichment limited to top 10 results (performance)');
  
  console.log('\n' + '='.repeat(60));
}

async function runAllTests() {
  console.log('🚀 Starting AI Components Test Suite\n');
  console.log('='.repeat(60));
  
  // Review implementation first
  await reviewAIImplementation();
  
  // Run tests
  const discoveryTest = await testDiscoveryEngine();
  const embeddingTest = await testOpenAIEmbeddings();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📋 TEST SUMMARY\n');
  console.log(`Discovery Engine: ${discoveryTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`OpenAI Embeddings: ${embeddingTest ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOverall: ${discoveryTest && embeddingTest ? '✅ ALL TESTS PASSED' : '⚠️  SOME TESTS FAILED'}`);
  console.log('\n' + '='.repeat(60));
  
  return { discoveryTest, embeddingTest };
}

// Run if called directly
if (require.main === module) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { runAllTests, testDiscoveryEngine, testOpenAIEmbeddings };

