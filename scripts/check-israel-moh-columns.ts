/**
 * Israeli MoH Dataset Column Detection
 * Inspects the CSV to detect barcode columns and structure
 * Run with: node --loader tsx scripts/check-israel-moh-columns.ts
 */

const ISRAEL_MOH_CSV_URL = 'https://data.gov.il/dataset/4e62e939-d7e3-4ee6-8c1e-b3a5c14a26d1/resource/7f41c25f-8ccf-49a9-8c3e-5c78b6a1e8c3/download/nutrition_dataset.csv';

// Barcode column patterns to detect (case-insensitive)
const BARCODE_PATTERNS = [
  'barcode',
  'ברקוד',
  'ean',
  'ean13',
  'ean-13',
  'upc',
  'gtin',
  'code',
  'product_code',
  'product code',
  'מספר_ברקוד',
  'מספר ברקוד',
];

interface DetectionResult {
  hasBarcode: boolean;
  barcodeColumn?: string;
  columns: string[];
  sampleRows: any[];
  rowCount: number;
}

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

/**
 * Detect if a column name matches barcode patterns
 */
function isBarcodeColumn(columnName: string): boolean {
  const normalized = columnName.toLowerCase().trim();
  return BARCODE_PATTERNS.some(pattern =>
    normalized.includes(pattern.toLowerCase())
  );
}

/**
 * Download and inspect the CSV dataset
 */
async function inspectDataset(): Promise<DetectionResult> {
  console.log('🔍 Fetching Israeli MoH dataset...');
  console.log(`   URL: ${ISRAEL_MOH_CSV_URL}\n`);

  try {
    const response = await fetch(ISRAEL_MOH_CSV_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
      throw new Error('CSV is empty');
    }

    console.log(`✅ Downloaded ${lines.length} lines\n`);

    // Parse header
    const headerLine = lines[0];
    const columns = parseCSVLine(headerLine);

    console.log('📋 Detected columns:');
    columns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col}`);
    });
    console.log('');

    // Check for barcode column
    let barcodeColumn: string | undefined;
    for (const col of columns) {
      if (isBarcodeColumn(col)) {
        barcodeColumn = col;
        break;
      }
    }

    // Parse sample rows (first 10 data rows)
    const sampleRows: any[] = [];
    const dataLines = lines.slice(1, Math.min(11, lines.length));

    for (const line of dataLines) {
      const values = parseCSVLine(line);
      const row: any = {};

      columns.forEach((col, idx) => {
        row[col] = values[idx] || '';
      });

      sampleRows.push(row);
    }

    return {
      hasBarcode: !!barcodeColumn,
      barcodeColumn,
      columns,
      sampleRows,
      rowCount: lines.length - 1, // Exclude header
    };
  } catch (error: any) {
    console.error('❌ Error fetching dataset:', error.message);
    throw error;
  }
}

/**
 * Display detection results
 */
function displayResults(result: DetectionResult) {
  console.log('═'.repeat(60));
  console.log('🎯 DETECTION RESULTS');
  console.log('═'.repeat(60));
  console.log('');

  if (result.hasBarcode) {
    console.log('✅ BARCODE COLUMN FOUND!');
    console.log(`   Column name: "${result.barcodeColumn}"`);
    console.log('');
    console.log('📊 Implementation Strategy: FULL BARCODE ETL');
    console.log('   → Will map barcodes directly to israel_moh_foods table');
    console.log('   → Israeli barcodes (729...) will resolve instantly');
    console.log('   → No manual linking required');
  } else {
    console.log('⚠️  NO BARCODE COLUMN DETECTED');
    console.log('');
    console.log('📊 Implementation Strategy: NAME SEARCH + COMMUNITY MAPPING');
    console.log('   → Will implement text search by product name');
    console.log('   → Users can link scanned barcodes to MoH items');
    console.log('   → barcode_aliases table will store community mappings');
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log('📈 Dataset Statistics:');
  console.log(`   Total rows: ${result.rowCount.toLocaleString()}`);
  console.log(`   Total columns: ${result.columns.length}`);
  console.log('');

  console.log('─'.repeat(60));
  console.log('🔬 Sample Data (first 3 rows):');
  console.log('');

  result.sampleRows.slice(0, 3).forEach((row, idx) => {
    console.log(`Row ${idx + 1}:`);
    Object.entries(row).forEach(([key, value]) => {
      const displayValue = String(value).substring(0, 50);
      console.log(`   ${key}: ${displayValue}`);
    });
    console.log('');
  });

  console.log('═'.repeat(60));
  console.log('');

  if (result.hasBarcode) {
    console.log('✨ Next Steps:');
    console.log('   1. Update ISRAEL_MOH_CSV_URL in .env.local');
    console.log('   2. Run: curl -X POST http://localhost:3000/api/israel-moh/refresh');
    console.log('   3. Test with an Israeli barcode (729...)');
  } else {
    console.log('✨ Next Steps:');
    console.log('   1. Implement name search endpoint');
    console.log('   2. Create barcode_aliases table');
    console.log('   3. Build NameSearchSheet UI component');
    console.log('   4. Test search and barcode linking flow');
  }
  console.log('');
}

/**
 * Main execution
 */
async function main() {
  try {
    const result = await inspectDataset();
    displayResults(result);
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Detection failed');
    process.exit(1);
  }
}

main();
