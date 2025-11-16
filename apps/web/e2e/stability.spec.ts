import { test, expect } from '@playwright/test';

/**
 * Stability/Chaos E2E Tests
 *
 * These tests validate error handling under adverse conditions:
 * - Corrupted localStorage
 * - API timeouts
 * - Malformed API responses
 * - Unhandled promise rejections
 *
 * To run: NEXT_PUBLIC_CHAOS=1 PW_BASE_URL=http://localhost:3000 pnpm playwright test e2e/stability.spec.ts
 */

// Helper to read our global error events
async function getErrEvents(page: any) {
  return await page.evaluate(() => (window as any).__gbErrorEvents || []);
}

test.beforeEach(async ({ page }) => {
  // Turn on client-side chaos flag for dev runs if env asks
  if (process.env.NEXT_PUBLIC_CHAOS === '1') {
    await page.addInitScript(() => {
      (window as any).__GB_CHAOS__ = true;
    });
  }
});

/**
 * Test 1: Corrupted localStorage Recovery
 *
 * Validates that corrupted localStorage doesn't crash the app and
 * the error boundary catches any rendering errors gracefully.
 */
test('recovers from corrupted localStorage on generating page', async ({ page }) => {
  console.log('[Test] Starting corrupted localStorage test...');

  // Navigate to generating page with corruptLocalStorage flag
  await page.goto('/onboarding/generating?corruptLocalStorage=1');

  // Wait for page to load and process the chaos injection
  await page.waitForTimeout(2000);

  // Check if error boundary is visible (in case corruption causes React error)
  const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();

  if (errorBoundary > 0) {
    // Error boundary caught the error - this is expected behavior
    console.log('[Test] Error boundary appeared (expected for corrupted storage)');

    // Verify retry button exists
    const retryBtn = page.locator('[data-testid="error-retry-btn"]');
    await expect(retryBtn).toBeVisible({ timeout: 5000 });

    // Check error events
    const events = await getErrEvents(page);
    console.log('[Test] Error events:', events);

    // Verify boundary caught the error
    const caughtEvent = events.find((e: any) => e.type === 'boundary-caught');
    expect(caughtEvent).toBeTruthy();
  } else {
    // No error boundary - storage corruption was handled gracefully
    console.log('[Test] No error boundary (storage corruption handled transparently)');

    // Verify page didn't crash - check for any content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText).toBeTruthy();
    expect(bodyText).not.toContain('Application error');
  }

  console.log('[Test] Corrupted localStorage test passed!');
});

/**
 * Test 2: API Timeout Handling (Stall Chaos)
 *
 * Validates that API timeouts don't crash the app and proper
 * error handling/retry mechanisms are in place.
 */
test('handles nutrition API timeout without crashing (stall chaos)', async ({ page }) => {
  console.log('[Test] Starting API timeout test...');

  // This test might take longer due to timeout simulation
  test.setTimeout(120_000); // 120s timeout for this test

  // Navigate to generating page with stall chaos flag
  // Note: The API will stall for 70s, triggering the AbortController timeout
  await page.goto('/onboarding/generating?chaos=stall');

  // Wait for the page to attempt generation
  await page.waitForTimeout(5000);

  // The app should show loading state or error, but NOT crash
  const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
  const bodyText = await page.locator('body').textContent();

  // Verify app didn't show white error screen
  expect(bodyText).not.toContain('Application error: a client-side exception has occurred');

  // App should either:
  // 1. Show error boundary with retry (if timeout causes error)
  // 2. Show loading state (if still processing)
  // 3. Show soft timeout message (if implemented)

  if (errorBoundary > 0) {
    console.log('[Test] Error boundary appeared for timeout');
    const retryBtn = page.locator('[data-testid="error-retry-btn"]');
    await expect(retryBtn).toBeVisible({ timeout: 5000 });
  } else {
    console.log('[Test] App handling timeout gracefully without error boundary');
    // Check that we're not showing a white crash screen
    const hasContent = await page.locator('body').textContent();
    expect(hasContent).toBeTruthy();
  }

  console.log('[Test] API timeout test passed!');
});

/**
 * Test 3: Malformed API Response Handling
 *
 * Validates that malformed API responses don't crash the app
 * and validation/error handling works correctly.
 */
test('handles malformed API payload gracefully (malformed chaos)', async ({ page }) => {
  console.log('[Test] Starting malformed payload test...');

  // Navigate to generating page with malformed chaos flag
  await page.goto('/onboarding/generating?chaos=malformed');

  // Wait for generation to attempt
  await page.waitForTimeout(5000);

  // Check if error boundary caught the malformed response
  const errorBoundary = await page.locator('[data-testid="error-boundary"]').count();
  const bodyText = await page.locator('body').textContent();

  // Verify no white error screen
  expect(bodyText).not.toContain('Application error: a client-side exception has occurred');

  if (errorBoundary > 0) {
    console.log('[Test] Error boundary caught malformed response');

    // Verify retry button
    const retryBtn = page.locator('[data-testid="error-retry-btn"]');
    await expect(retryBtn).toBeVisible({ timeout: 5000 });

    // Check events
    const events = await getErrEvents(page);
    const caughtEvent = events.find((e: any) => e.type === 'boundary-caught');
    expect(caughtEvent).toBeTruthy();
  } else {
    // Malformed response was validated and handled gracefully
    console.log('[Test] Malformed response handled without error boundary');
    expect(bodyText).toBeTruthy();
  }

  console.log('[Test] Malformed payload test passed!');
});

/**
 * Test 4: Unhandled Promise Rejection Capture
 *
 * Validates that global error handlers catch unhandled promise rejections
 * and log them without crashing the app.
 */
test('global unhandledrejection is captured without app crash', async ({ page }) => {
  console.log('[Test] Starting unhandled rejection test...');

  // Navigate to home page
  await page.goto('/');

  // Wait for page load and error handlers to initialize
  await page.waitForTimeout(2000);

  // Inject an unhandled promise rejection
  await page.evaluate(() => {
    console.log('[Test] Injecting unhandled rejection...');
    Promise.reject(new Error('boom-test-rejection'));
  });

  // Wait for error to be processed
  await page.waitForTimeout(1000);

  // Check error events
  const events = await getErrEvents(page);
  console.log('[Test] Error events after rejection:', events);

  // Verify the rejection was captured
  const rejectionEvent = events.find((e: any) =>
    e.type === 'unhandled-rejection' && e.reason?.includes('boom-test-rejection')
  );

  expect(rejectionEvent).toBeTruthy();

  // Verify app didn't crash
  const bodyText = await page.locator('body').textContent();
  expect(bodyText).toBeTruthy();
  expect(bodyText).not.toContain('Application error');

  console.log('[Test] Unhandled rejection test passed!');
});

/**
 * Test 5: Error Boundary Mount Tracking
 *
 * Validates that error boundary mounts correctly and tracking works.
 */
test('error boundary mounts and tracks initialization', async ({ page }) => {
  console.log('[Test] Starting error boundary mount test...');

  await page.goto('/');
  await page.waitForTimeout(2000);

  // Check that error boundary mounted
  const events = await getErrEvents(page);
  console.log('[Test] Mount events:', events);

  const mountEvent = events.find((e: any) => e.type === 'boundary-mount');
  expect(mountEvent).toBeTruthy();

  console.log('[Test] Error boundary mount test passed!');
});
