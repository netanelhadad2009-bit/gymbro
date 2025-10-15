/**
 * Network Debug Script
 * Tests API connectivity and health endpoints
 */

async function testAPI() {
  const API_URL = process.env.API_URL || 'http://localhost:3001';

  console.log('🔍 Testing API connectivity...\n');
  console.log(`Target: ${API_URL}\n`);

  try {
    // Test health endpoint
    console.log('1️⃣  Testing /health endpoint...');
    const healthRes = await fetch(`${API_URL}/health`);
    const healthData = await healthRes.json();
    console.log('✅ Health:', healthData);
    console.log('   Status:', healthRes.status, healthRes.statusText);
    console.log('');

    // Test database health
    console.log('2️⃣  Testing /db endpoint...');
    const dbRes = await fetch(`${API_URL}/db`);
    const dbData = await dbRes.json();
    console.log('✅ Database:', dbData);
    console.log('   Status:', dbRes.status, dbRes.statusText);
    console.log('');

    console.log('🎉 All tests passed! API is reachable.\n');
  } catch (e) {
    console.error('❌ Cannot reach API:', e);
    console.error('\n💡 Make sure the API server is running:');
    console.error('   cd services/api && pnpm dev\n');
    process.exit(1);
  }
}

testAPI();
