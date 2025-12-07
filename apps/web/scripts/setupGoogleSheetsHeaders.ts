/**
 * Setup script: Add headers to an existing Google Sheets spreadsheet
 *
 * Use this if you created the spreadsheet manually and shared it with the service account.
 *
 * Usage:
 *   pnpm setup:google-sheets-headers <SPREADSHEET_ID>
 *
 * Example:
 *   pnpm setup:google-sheets-headers 1abc123xyz...
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

// Sheet names matching the existing API routes
const SHEET_NAMES = [
  "AllUsers",
  "Registered_No_Sub",
  "Registered_With_Sub",
  "Onboarding_Started_No_Signup",
];

// Header row for all sheets
const HEADERS = [
  "email",
  "full_name",
  "user_id",
  "device_id",
  "plan",
  "subscription_status",
  "created_at",
  "onboarding_started_at",
  "onboarding_completed_at",
  "source",
];

async function main() {
  const spreadsheetId = process.argv[2];

  if (!spreadsheetId) {
    console.error("❌ Usage: pnpm setup:google-sheets-headers <SPREADSHEET_ID>");
    console.error("\nExample: pnpm setup:google-sheets-headers 1abc123xyz...");
    console.error("\nTo get the spreadsheet ID:");
    console.error("  1. Create a new Google Sheet at https://sheets.google.com");
    console.error("  2. The ID is in the URL: https://docs.google.com/spreadsheets/d/<ID>/edit");
    console.error("  3. Share the sheet with: fitjourney-sheets-writer@fitjourney-analytics.iam.gserviceaccount.com");
    process.exit(1);
  }

  console.log("🚀 Setting up Google Sheets headers...\n");
  console.log(`   Spreadsheet ID: ${spreadsheetId}`);

  // Load service account credentials
  const serviceAccountPath = path.join(
    __dirname,
    "../service-accounts/google-sheets.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.error("❌ Service account JSON not found at:", serviceAccountPath);
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));
  console.log("✅ Loaded service account:", credentials.client_email);

  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES
  );

  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Check if we have access
    console.log("\n📊 Checking access to spreadsheet...");
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`✅ Connected to: "${spreadsheet.data.properties?.title}"`);

    // Get existing sheet names
    const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];
    console.log(`   Existing sheets: ${existingSheets.join(", ")}`);

    // Add missing sheets
    const missingSheets = SHEET_NAMES.filter(name => !existingSheets.includes(name));
    if (missingSheets.length > 0) {
      console.log(`\n📝 Creating missing sheets: ${missingSheets.join(", ")}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: missingSheets.map(title => ({
            addSheet: { properties: { title } }
          }))
        }
      });
      console.log("   ✅ Sheets created");
    }

    // Add headers to all sheets
    console.log("\n📝 Adding headers to all sheets...");
    for (const sheetName of SHEET_NAMES) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [HEADERS],
        },
      });
      console.log(`   ✅ ${sheetName}`);
    }

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! Google Sheets is ready.");
    console.log("=".repeat(60));
    console.log(`\n📋 Spreadsheet ID: ${spreadsheetId}`);
    console.log(`   URL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
    console.log("\n📌 NEXT STEPS:");
    console.log("   1. Go to Vercel → Project Settings → Environment Variables");
    console.log("   2. Add: GOOGLE_SHEETS_SPREADSHEET_ID = " + spreadsheetId);
    console.log("   3. Add: GOOGLE_SHEETS_CLIENT_EMAIL = " + credentials.client_email);
    console.log("   4. Add: GOOGLE_SHEETS_PRIVATE_KEY = (copy from service account JSON)");
    console.log("\n");

  } catch (error: any) {
    console.error("\n❌ Error:", error.message);
    if (error.response?.data?.error) {
      console.error("   Details:", JSON.stringify(error.response.data.error, null, 2));
    }

    if (error.message?.includes("not found") || error.response?.status === 404) {
      console.error("\n🔧 FIX: Make sure you shared the spreadsheet with:");
      console.error("   " + credentials.client_email);
    }

    process.exit(1);
  }
}

main();
