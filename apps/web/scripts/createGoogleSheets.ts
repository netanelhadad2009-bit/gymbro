/**
 * One-time setup script: Create Google Sheets spreadsheet for FitJourney analytics
 *
 * This script creates a new spreadsheet with 4 tabs and adds header rows.
 * Run with: pnpm create:google-sheets
 *
 * After running, copy the spreadsheetId to your Vercel env as GOOGLE_SHEETS_SPREADSHEET_ID
 */

import { google } from "googleapis";
import * as fs from "fs";
import * as path from "path";

// Need both Sheets and Drive scopes - creating spreadsheets requires Drive API
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
];

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
  console.log("🚀 Creating Google Sheets spreadsheet for FitJourney...\n");

  // Load service account credentials
  const serviceAccountPath = path.join(
    __dirname,
    "../service-accounts/google-sheets.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.error(
      "❌ Service account JSON not found at:",
      serviceAccountPath
    );
    console.error(
      "\nPlease copy your service account JSON to:\n  apps/web/service-accounts/google-sheets.json"
    );
    process.exit(1);
  }

  const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, "utf-8"));

  console.log("✅ Loaded service account:", credentials.client_email);

  // Create JWT auth client
  const auth = new google.auth.JWT(
    credentials.client_email,
    undefined,
    credentials.private_key,
    SCOPES
  );

  const sheets = google.sheets({ version: "v4", auth });

  try {
    // Step 1: Create the spreadsheet with 4 sheets
    console.log("\n📊 Creating spreadsheet with 4 tabs...");

    const createResponse = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: "Fitjourney Users",
        },
        sheets: SHEET_NAMES.map((title) => ({
          properties: {
            title,
          },
        })),
      },
    });

    const spreadsheetId = createResponse.data.spreadsheetId!;
    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    console.log("✅ Spreadsheet created!");
    console.log(`   ID: ${spreadsheetId}`);
    console.log(`   URL: ${spreadsheetUrl}`);

    // Step 2: Add header rows to each sheet
    console.log("\n📝 Adding header rows to each sheet...");

    for (const sheetName of SHEET_NAMES) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:J1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [HEADERS],
        },
      });
      console.log(`   ✅ ${sheetName} - headers added`);
    }

    // Step 3: Format header row (bold, freeze)
    console.log("\n🎨 Formatting header rows...");

    const sheetIds = createResponse.data.sheets!.map(
      (s) => s.properties!.sheetId!
    );

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: sheetIds.flatMap((sheetId) => [
          // Bold header row
          {
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
              },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                },
              },
              fields: "userEnteredFormat(textFormat,backgroundColor)",
            },
          },
          // Freeze header row
          {
            updateSheetProperties: {
              properties: {
                sheetId,
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
              fields: "gridProperties.frozenRowCount",
            },
          },
        ]),
      },
    });

    console.log("   ✅ All sheets formatted");

    // Final summary
    console.log("\n" + "=".repeat(60));
    console.log("🎉 SUCCESS! Google Sheets spreadsheet is ready.");
    console.log("=".repeat(60));
    console.log("\n📋 Spreadsheet Details:");
    console.log(`   Title: Fitjourney Users`);
    console.log(`   ID: ${spreadsheetId}`);
    console.log(`   URL: ${spreadsheetUrl}`);
    console.log(`   Sheets: ${SHEET_NAMES.join(", ")}`);
    console.log("\n⚠️  IMPORTANT: The spreadsheet is owned by the service account.");
    console.log("   To view it in your browser, share it with your email.");
    console.log("\n📌 NEXT STEPS:");
    console.log("   1. Copy the spreadsheet ID above");
    console.log("   2. Go to Vercel → Project Settings → Environment Variables");
    console.log("   3. Add: GOOGLE_SHEETS_SPREADSHEET_ID = " + spreadsheetId);
    console.log("   4. Also add GOOGLE_SHEETS_CLIENT_EMAIL and GOOGLE_SHEETS_PRIVATE_KEY");
    console.log("\n");
  } catch (error: any) {
    console.error("\n❌ Error creating spreadsheet:", error.message);
    if (error.response?.data?.error) {
      console.error("   Details:", JSON.stringify(error.response.data.error, null, 2));
    }

    // Provide helpful instructions for common errors
    if (error.message?.includes("permission") || error.response?.data?.error?.status === "PERMISSION_DENIED") {
      console.error("\n🔧 FIX: You need to enable BOTH APIs for your project:");
      console.error("\n   Step 1 - Enable Google Sheets API:");
      console.error("   https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=fitjourney-analytics");
      console.error("\n   Step 2 - Enable Google Drive API:");
      console.error("   https://console.cloud.google.com/apis/library/drive.googleapis.com?project=fitjourney-analytics");
      console.error("\n   Step 3 - Wait ~1 minute for changes to propagate");
      console.error("   Step 4 - Run this script again: pnpm create:google-sheets");
    }

    process.exit(1);
  }
}

main();
