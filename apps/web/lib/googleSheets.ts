/**
 * Google Sheets Export Helper
 *
 * This module provides functions to append rows to Google Sheets for user tracking.
 * It uses a Google Service Account for authentication (server-side only).
 *
 * Required Environment Variables:
 * - GOOGLE_SHEETS_CLIENT_EMAIL: Service account email (e.g., your-service@project.iam.gserviceaccount.com)
 * - GOOGLE_SHEETS_PRIVATE_KEY: Service account private key (can be stored as single line with \n)
 * - GOOGLE_SHEETS_SPREADSHEET_ID: The spreadsheet ID from the Google Sheets URL
 *
 * Expected Sheet Names (tabs in the spreadsheet):
 * 1. AllUsers - Every user who signs up
 * 2. Registered_No_Sub - Users who signed up but do NOT have an active subscription
 * 3. Registered_With_Sub - Users who signed up AND have an active subscription
 * 4. Onboarding_Started_No_Signup - Anonymous users who started questionnaire before signup
 *
 * Column Order (for user sheets):
 * A: email
 * B: full_name
 * C: user_id
 * D: device_id
 * E: plan (monthly/yearly/none)
 * F: subscription_status (active/canceled/null)
 * G: created_at
 * H: onboarding_started_at
 * I: onboarding_completed_at
 * J: source
 *
 * Column Order (for Onboarding_Started_No_Signup):
 * A: email (empty)
 * B: full_name (empty)
 * C: user_id (empty)
 * D: device_id
 * E: plan (empty)
 * F: subscription_status (empty)
 * G: created_at
 * H: onboarding_started_at
 * I: onboarding_completed_at (null)
 * J: source
 * K: goals
 * L: height_cm
 * M: weight_kg
 */

import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Check if Google Sheets is configured
const isConfigured = Boolean(
  SPREADSHEET_ID &&
    process.env.GOOGLE_SHEETS_CLIENT_EMAIL &&
    process.env.GOOGLE_SHEETS_PRIVATE_KEY
);

if (!isConfigured) {
  console.warn(
    "[GoogleSheets] Not configured – missing GOOGLE_SHEETS_SPREADSHEET_ID, CLIENT_EMAIL, or PRIVATE_KEY"
  );
}

/**
 * Get JWT auth for Google Sheets API
 */
function getAuth() {
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );

  if (!clientEmail || !privateKey) {
    console.warn(
      "[GoogleSheets] Missing GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY"
    );
    return null;
  }

  return new google.auth.JWT(clientEmail, undefined, privateKey, SCOPES);
}

/**
 * Get authenticated Google Sheets client
 */
async function getSheetsClient() {
  if (!SPREADSHEET_ID) return null;
  const auth = getAuth();
  if (!auth) return null;

  return google.sheets({ version: "v4", auth });
}

/**
 * Append a row to a specific sheet
 * @param sheetName - The name of the sheet tab
 * @param row - Array of values for the row
 */
export async function appendRow(
  sheetName: string,
  row: (string | number | null)[]
) {
  const sheets = await getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    console.warn("[GoogleSheets] appendRow skipped – missing config");
    return;
  }

  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A1`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [row] },
    });
    console.log(`[GoogleSheets] ✅ Appended row to ${sheetName}`);
  } catch (err) {
    console.error(`[GoogleSheets] ❌ Error appending row to ${sheetName}:`, err);
  }
}

/**
 * Get sheet ID by name (needed for delete operations)
 */
async function getSheetIdByName(sheetName: string): Promise<number | null> {
  const sheets = await getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) return null;

  try {
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });
    const sheet = response.data.sheets?.find(
      (s) => s.properties?.title === sheetName
    );
    return sheet?.properties?.sheetId ?? null;
  } catch (err) {
    console.error(`[GoogleSheets] ❌ Error getting sheet ID for ${sheetName}:`, err);
    return null;
  }
}

/**
 * Find row index by user ID (column C, index 2)
 * @param sheetName - The name of the sheet tab
 * @param userId - The user ID to search for
 * @returns Row index (1-based) or null if not found
 */
export async function findRowByUserId(
  sheetName: string,
  userId: string
): Promise<number | null> {
  const sheets = await getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    console.warn("[GoogleSheets] findRowByUserId skipped – missing config");
    return null;
  }

  try {
    // Get all values from column C (user_id)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!C:C`,
    });

    const values = response.data.values;
    if (!values) return null;

    // Find the row with matching user ID (1-based index)
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === userId) {
        return i + 1; // Convert to 1-based row number
      }
    }
    return null;
  } catch (err) {
    console.error(`[GoogleSheets] ❌ Error finding user in ${sheetName}:`, err);
    return null;
  }
}

/**
 * Delete a row from a specific sheet
 * @param sheetName - The name of the sheet tab
 * @param rowIndex - The row index to delete (1-based)
 */
export async function deleteRow(
  sheetName: string,
  rowIndex: number
): Promise<boolean> {
  const sheets = await getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    console.warn("[GoogleSheets] deleteRow skipped – missing config");
    return false;
  }

  try {
    const sheetId = await getSheetIdByName(sheetName);
    if (sheetId === null) {
      console.error(`[GoogleSheets] ❌ Sheet ${sheetName} not found`);
      return false;
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // Convert to 0-based
                endIndex: rowIndex, // Exclusive end
              },
            },
          },
        ],
      },
    });
    console.log(`[GoogleSheets] ✅ Deleted row ${rowIndex} from ${sheetName}`);
    return true;
  } catch (err) {
    console.error(`[GoogleSheets] ❌ Error deleting row from ${sheetName}:`, err);
    return false;
  }
}

/**
 * Remove a user from a sheet by their user ID
 * @param sheetName - The name of the sheet tab
 * @param userId - The user ID to remove
 */
export async function removeUserFromSheet(
  sheetName: string,
  userId: string
): Promise<boolean> {
  const rowIndex = await findRowByUserId(sheetName, userId);
  if (rowIndex === null) {
    console.log(`[GoogleSheets] User ${userId} not found in ${sheetName}`);
    return false;
  }
  return deleteRow(sheetName, rowIndex);
}

/**
 * Remove user from Registered_No_Sub sheet
 */
export async function removeFromRegisteredNoSub(userId: string): Promise<boolean> {
  return removeUserFromSheet("Registered_No_Sub", userId);
}

/**
 * Find row index by device ID (column D, index 3)
 * Used for Onboarding_Started_No_Signup which tracks by device_id before user signs up
 */
export async function findRowByDeviceId(
  sheetName: string,
  deviceId: string
): Promise<number | null> {
  const sheets = await getSheetsClient();
  if (!sheets || !SPREADSHEET_ID) {
    console.warn("[GoogleSheets] findRowByDeviceId skipped – missing config");
    return null;
  }

  try {
    // Get all values from column D (device_id)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!D:D`,
    });

    const values = response.data.values;
    if (!values) return null;

    // Find the row with matching device ID (1-based index)
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === deviceId) {
        return i + 1; // Convert to 1-based row number
      }
    }
    return null;
  } catch (err) {
    console.error(`[GoogleSheets] ❌ Error finding device in ${sheetName}:`, err);
    return null;
  }
}

/**
 * Remove from Onboarding_Started_No_Signup by device ID
 * Called when a user who started onboarding anonymously finally signs up
 */
export async function removeFromOnboardingStartedNoSignup(deviceId: string): Promise<boolean> {
  const rowIndex = await findRowByDeviceId("Onboarding_Started_No_Signup", deviceId);
  if (rowIndex === null) {
    console.log(`[GoogleSheets] Device ${deviceId} not found in Onboarding_Started_No_Signup`);
    return false;
  }
  return deleteRow("Onboarding_Started_No_Signup", rowIndex);
}

// ============================================================================
// Types
// ============================================================================

export type ExportableProfile = {
  id: string;
  email: string | null;
  full_name?: string | null;
  device_id?: string | null;
  created_at?: string | null;
  onboarding_started_at?: string | null;
  onboarding_completed_at?: string | null;
  source?: string | null;
};

export type ExportableSubscription = {
  plan?: string | null; // monthly/yearly/...
  status?: string | null; // active/canceled/...
};

export type OnboardingDropoffPayload = {
  device_id: string;
  created_at: string;
  goals?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  source?: string | null;
};

// ============================================================================
// Row Builders
// ============================================================================

/**
 * Build a standard user row for AllUsers, Registered_No_Sub, Registered_With_Sub sheets
 */
export function buildUserRow(
  profile: ExportableProfile,
  subscription?: ExportableSubscription
): (string | number | null)[] {
  return [
    profile.email ?? "",
    profile.full_name ?? "",
    profile.id ?? "",
    profile.device_id ?? "",
    subscription?.plan ?? "",
    subscription?.status ?? "",
    profile.created_at ?? "",
    profile.onboarding_started_at ?? "",
    profile.onboarding_completed_at ?? "",
    profile.source ?? "",
  ];
}

/**
 * Build a row for Onboarding_Started_No_Signup sheet
 */
export function buildOnboardingDropoffRow(
  data: OnboardingDropoffPayload
): (string | number | null)[] {
  return [
    "", // email (unknown)
    "", // full_name
    "", // user_id
    data.device_id ?? "",
    "", // plan
    "", // subscription_status
    data.created_at ?? "",
    data.created_at ?? "", // onboarding_started_at = created_at
    null, // onboarding_completed_at
    data.source ?? "",
    data.goals ?? "",
    data.height_cm ?? null,
    data.weight_kg ?? null,
  ];
}

// ============================================================================
// Convenience Wrappers for Each Sheet
// ============================================================================

/**
 * Append user to AllUsers sheet (every signup)
 */
export async function appendAllUsers(
  profile: ExportableProfile,
  subscription?: ExportableSubscription
) {
  return appendRow("AllUsers", buildUserRow(profile, subscription));
}

/**
 * Append user to Registered_No_Sub sheet (signup without subscription)
 */
export async function appendRegisteredNoSub(profile: ExportableProfile) {
  return appendRow(
    "Registered_No_Sub",
    buildUserRow(profile, { plan: null, status: null })
  );
}

/**
 * Append user to Registered_With_Sub sheet (signup with active subscription)
 */
export async function appendRegisteredWithSub(
  profile: ExportableProfile,
  subscription: ExportableSubscription
) {
  return appendRow("Registered_With_Sub", buildUserRow(profile, subscription));
}

/**
 * Append to Onboarding_Started_No_Signup sheet (anonymous user started questionnaire)
 */
export async function appendOnboardingStartedNoSignup(
  data: OnboardingDropoffPayload
) {
  return appendRow(
    "Onboarding_Started_No_Signup",
    buildOnboardingDropoffRow(data)
  );
}

// ============================================================================
// Check if configured (for conditional usage)
// ============================================================================

export function isGoogleSheetsConfigured(): boolean {
  return isConfigured;
}
