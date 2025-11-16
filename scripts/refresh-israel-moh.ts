/**
 * Manual Israeli MoH Dataset Refresh Script
 * Run with: pnpm tsx scripts/refresh-israel-moh.ts
 */

const REFRESH_URL = 'http://localhost:3000/api/israel-moh/refresh';

async function refreshDataset() {
  console.log('🔄 Triggering Israeli MoH dataset refresh...\n');

  try {
    const response = await fetch(REFRESH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Refresh failed:', response.status);
      console.error('   Error:', data.error || 'Unknown error');
      process.exit(1);
    }

    if (data.ok) {
      console.log('✅ Dataset refreshed successfully!');
      console.log(`   Products updated: ${data.updatedCount}`);
      console.log(`   Timestamp: ${data.timestamp}\n`);

      console.log('📋 Next steps:');
      console.log('   1. Test with an Israeli barcode (729...)');
      console.log('   2. Check logs for "[IsraelMoH] Found product"');
      console.log('   3. Verify product appears in app with correct source badge\n');
    } else {
      console.error('❌ Refresh returned error:', data.error);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Failed to connect to refresh endpoint');
    console.error('   Error:', error.message);
    console.error('\n💡 Make sure the dev server is running:');
    console.error('   pnpm --filter @gymbro/web dev\n');
    process.exit(1);
  }
}

refreshDataset();
