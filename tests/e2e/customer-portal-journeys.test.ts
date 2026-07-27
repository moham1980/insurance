/**
 * E2E Tests for Customer Portal Journeys
 * Epic: E3-T8
 * Coverage: 5 critical customer journeys
 */

import { test, expect } from '@playwright/test';

// Test Configuration
const CUSTOMER_PORTAL_URL = process.env.CUSTOMER_PORTAL_URL || 'http://localhost:18043';
const TEST_CUSTOMER = {
  username: process.env.TEST_CUSTOMER_USERNAME || 'test_customer',
  password: process.env.TEST_CUSTOMER_PASSWORD || 'test_password',
  nationalId: process.env.TEST_CUSTOMER_NATIONAL_ID || '1234567890',
};

test.describe('Customer Portal E2E Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to customer portal
    await page.goto(CUSTOMER_PORTAL_URL);
  });

  /**
   * Journey 1: Login → Dashboard → FNOL Submission
   * Test ID: T-E2E-CP-01
   * Priority: P0
   */
  test('Journey 1: Login to Dashboard and submit FNOL', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to customer portal', async () => {
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      
      // Verify login success - should be redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('h1')).toContainText('داشبورد مشتری');
    });

    // Step 2: Verify Dashboard
    await test.step('Verify dashboard displays correctly', async () => {
      await expect(page.locator('text=بیمه‌نامه‌های فعال')).toBeVisible();
      await expect(page.locator('text=خسارت‌های در حال بررسی')).toBeVisible();
      await expect(page.locator('text=پرداخت‌های سررسید')).toBeVisible();
    });

    // Step 3: Navigate to FNOL
    await test.step('Navigate to FNOL page', async () => {
      await page.click('text=ثبت خسارت');
      await expect(page).toHaveURL(/.*fnol/);
      await expect(page.locator('h1')).toContainText('ثبت خسارت جدید');
    });

    // Step 4: Submit FNOL
    await test.step('Submit FNOL form', async () => {
      // Select policy from list
      await page.click('select[name="policyId"]');
      await page.selectOption('select[name="policyId']", { index: 0 });
      
      // Select loss type
      await page.click('[data-testid="loss-type-accident"]');
      
      // Fill accident details
      await page.fill('input[name="accidentDate"]', '۱۴۰۵/۰۲/۱۰');
      await page.fill('input[name="accidentTime"]', '۱۴:۳۰');
      await page.fill('textarea[name="description"]', 'توضیحات تست خسارت');
      
      // Fill driver information
      await page.fill('input[name="driverName"]', 'علی رضایی');
      await page.fill('input[name="driverLicense"]', '۱۲۳۴۵۶۷۸۹۰');
      
      // Submit form
      await page.click('button[type="submit"]');
      
      // Verify success message
      await expect(page.locator('.success-message')).toContainText('خسارت با موفقیت ثبت شد');
      await expect(page.locator('.claim-number')).toBeVisible();
    });

    // Step 5: Verify claim appears in dashboard
    await test.step('Verify claim appears in dashboard', async () => {
      await page.click('text=داشبورد');
      await expect(page.locator('text=خسارت‌های در حال بررسی')).toBeVisible();
      await page.click('text=مشاهده خسارت‌ها');
      await expect(page.locator('.claim-row')).toHaveCount(1);
    });
  });

  /**
   * Journey 2: Endorsement Request → Approval → Confirmation
   * Test ID: T-E2E-CP-02
   * Priority: P0
   */
  test('Journey 2: Submit endorsement request and track approval', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to customer portal', async () => {
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // Step 2: Navigate to Endorsement
    await test.step('Navigate to endorsement page', async () => {
      await page.click('text=اصلاحیه بیمه‌نامه');
      await expect(page).toHaveURL(/.*endorsement/);
    });

    // Step 3: Submit Endorsement Request
    await test.step('Submit endorsement form', async () => {
      // Select policy
      await page.click('select[name="policyId"]');
      await page.selectOption('select[name="policyId"]', { index: 0 });
      
      // Select endorsement type
      await page.click('[data-testid="endorsement-type-coverage"]');
      
      // Fill endorsement details
      await page.fill('input[name="effectiveDate"]', '۱۴۰۵/۰۲/۱۵');
      await page.fill('input[name="newValue"]', '۵۰۰۰۰۰۰۰۰');
      await page.fill('textarea[name="reason"]', 'درخواست افزایش پوشش');
      
      // Upload document
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/test-document.pdf');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Verify success
      await expect(page.locator('.success-message')).toContainText('درخواست اصلاحیه ثبت شد');
    });

    // Step 4: Track Endorsement Status
    await test.step('Track endorsement status', async () => {
      await page.click('text=پیگیری درخواست‌ها');
      await expect(page.locator('.endorsement-status')).toContainText('در حال بررسی');
      
      // Note: Actual approval would require admin/staff action
      // This test verifies the tracking UI
      await expect(page.locator('.endorsement-timeline')).toBeVisible();
    });
  });

  /**
   * Journey 3: Complaint Filing → Categorization → Escalation
   * Test ID: T-E2E-CP-03
   * Priority: P0
   */
  test('Journey 3: File complaint and track categorization', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to customer portal', async () => {
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // Step 2: Navigate to Complaints
    await test.step('Navigate to complaints page', async () => {
      await page.click('text=ثبت شکایت');
      await expect(page).toHaveURL(/.*complaints/);
    });

    // Step 3: Submit Complaint
    await test.step('Submit complaint form', async () => {
      // Select category
      await page.click('select[name="category"]');
      await page.selectOption('select[name="category"]', 'service');
      
      // Fill complaint details
      await page.fill('input[name="subject"]', 'شکایت تست');
      await page.fill('textarea[name="description"]', 'توضیحات شکایت تست');
      
      // Upload attachments
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles('tests/fixtures/test-document.pdf');
      
      // Submit
      await page.click('button[type="submit"]');
      
      // Verify success
      await expect(page.locator('.success-message')).toContainText('شکایت ثبت شد');
      await expect(page.locator('.complaint-number')).toBeVisible();
    });

    // Step 4: Verify Categorization
    await test.step('Verify complaint categorization', async () => {
      await page.click('text=پیگیری شکایت‌ها');
      await expect(page.locator('.complaint-category')).toContainText('سرویس');
      await expect(page.locator('.complaint-status')).toContainText('در حال بررسی');
      
      // Verify escalation tracking
      await expect(page.locator('.escalation-timeline')).toBeVisible();
    });
  });

  /**
   * Journey 4: Payment History → Receipt Download
   * Test ID: T-E2E-CP-04
   * Priority: P0
   */
  test('Journey 4: View payment history and download receipt', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to customer portal', async () => {
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // Step 2: Navigate to Payments
    await test.step('Navigate to payment history', async () => {
      await page.click('text=پرداخت‌ها');
      await expect(page).toHaveURL(/.*payments/);
    });

    // Step 3: Apply Filters
    await test.step('Apply payment filters', async () => {
      await page.click('select[name="status"]');
      await page.selectOption('select[name="status"]', 'PAID');
      
      await page.fill('input[name="fromDate"]', '۱۴۰۵/۰۱/۰۱');
      await page.fill('input[name="toDate"]', '۱۴۰۵/۰۲/۳۰');
      
      await page.click('button[type="submit"]');
    });

    // Step 4: View Payment Details
    await test.step('View payment details', async () => {
      await page.click('.payment-row:first-child .view-details');
      
      // Verify modal opens
      await expect(page.locator('.payment-modal')).toBeVisible();
      await expect(page.locator('.payment-amount')).toBeVisible();
      await expect(page.locator('.payment-date')).toBeVisible();
    });

    // Step 5: Download Receipt
    await test.step('Download receipt', async () => {
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("دانلود رسید")');
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toContain('receipt');
    });

    // Step 6: Close Modal
    await test.step('Close payment modal', async () => {
      await page.click('.close-modal');
      await expect(page.locator('.payment-modal')).not.toBeVisible();
    });
  });

  /**
   * Journey 5: Policy Renewal → Payment → Confirmation
   * Test ID: T-E2E-CP-05
   * Priority: P0
   */
  test('Journey 5: Renew policy and complete payment', async ({ page }) => {
    // Step 1: Login
    await test.step('Login to customer portal', async () => {
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      await expect(page).toHaveURL(/.*dashboard/);
    });

    // Step 2: Navigate to Policies
    await test.step('Navigate to policies page', async () => {
      await page.click('text=بیمه‌نامه‌ها');
      await expect(page).toHaveURL(/.*policies/);
    });

    // Step 3: Find Expiring Policy
    await test.step('Find policy eligible for renewal', async () => {
      // Filter for policies expiring soon
      await page.click('select[name="status"]');
      await page.selectOption('select[name="status"]', 'EXPIRING_SOON');
      
      // Verify at least one policy is shown
      await expect(page.locator('.policy-row')).toHaveCount(1);
    });

    // Step 4: Initiate Renewal
    await test.step('Initiate policy renewal', async () => {
      await page.click('.policy-row:first-child .renew-button');
      
      // Verify renewal page
      await expect(page).toHaveURL(/.*renew/);
      await expect(page.locator('h1')).toContainText('تمدید بیمه‌نامه');
    });

    // Step 5: Review Renewal Details
    await test.step('Review renewal details', async () => {
      await expect(page.locator('.renewal-premium')).toBeVisible();
      await expect(page.locator('.renewal-coverage')).toBeVisible();
      await expect(page.locator('.renewal-terms')).toBeVisible();
      
      // Accept terms
      await page.check('input[name="acceptTerms"]');
    });

    // Step 6: Complete Payment
    await test.step('Complete payment', async () => {
      // Select payment method
      await page.click('input[name="paymentMethod"][value="credit_card"]');
      
      // Fill payment details (mock)
      await page.fill('input[name="cardNumber"]', '4111111111111111');
      await page.fill('input[name="cardExpiry"]', '۱۲/۲۵');
      await page.fill('input[name="cardCvv"]', '۱۲۳');
      
      // Submit payment
      await page.click('button:has-text("پرداخت و تمدید")');
    });

    // Step 7: Verify Confirmation
    await test.step('Verify renewal confirmation', async () => {
      await expect(page.locator('.success-message')).toContainText('تمدید با موفقیت انجام شد');
      await expect(page.locator('.new-policy-number')).toBeVisible();
      await expect(page.locator('.payment-receipt')).toBeVisible();
    });

    // Step 8: Verify Updated Policy
    await test.step('Verify policy is renewed', async () => {
      await page.click('text=بیمه‌نامه‌ها');
      await expect(page.locator('.policy-status')).toContainText('فعال');
      await expect(page.locator('.policy-expiry')).not.toContainText('۱۴۰۵');
    });
  });
});

/**
 * Cross-Browser Testing Configuration
 * These tests should run on multiple browsers
 */
test.describe('Customer Portal Cross-Browser', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`Journey 1 works on ${browserName}`, async ({ page, browserName: currentBrowser }) => {
      test.skip(currentBrowser !== browserName, `Skipping ${currentBrowser}, only testing ${browserName}`);
      
      // Run basic login flow
      await page.goto(CUSTOMER_PORTAL_URL);
      await page.fill('input[name="username"]', TEST_CUSTOMER.username);
      await page.fill('input[name="password"]', TEST_CUSTOMER.password);
      await page.click('button[type="submit"]');
      
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('h1')).toContainText('داشبورد مشتری');
    });
  });
});

/**
 * Mobile Device Testing
 * These tests verify responsive design on mobile
 */
test.describe('Customer Portal Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('Journey 1 on mobile device', async ({ page }) => {
    await page.goto(CUSTOMER_PORTAL_URL);
    
    // Verify mobile layout
    await expect(page.locator('.mobile-menu')).toBeVisible();
    
    // Login
    await page.click('.mobile-menu-toggle');
    await page.fill('input[name="username"]', TEST_CUSTOMER.username);
    await page.fill('input[name="password"]', TEST_CUSTOMER.password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify mobile dashboard
    await expect(page.locator('.mobile-dashboard')).toBeVisible();
    await expect(page.locator('.stat-card')).toHaveCount(3);
  });
});

/**
 * Accessibility Testing
 * These tests verify WCAG compliance
 */
test.describe('Customer Portal Accessibility', () => {
  test('Journey 1 accessibility check', async ({ page }) => {
    await page.goto(CUSTOMER_PORTAL_URL);
    
    // Check for proper ARIA labels
    await expect(page.locator('input[name="username"]')).toHaveAttribute('aria-label');
    await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-label');
    
    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="username"]')).toBeFocused();
    
    await page.keyboard.press('Tab');
    await expect(page.locator('input[name="password"]')).toBeFocused();
    
    // Check for proper heading hierarchy
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);
  });
});
