---
layout: post
title:  "Cypress To Playwright Migration"
toc: true
---

* TOC
{:toc}

# Overview
E2E testing can be slow and expensive. For years, everyone has used Cypress as the best tool for E2E testing. However, as projects grow, and more tests are required, the limitations of Cypress become more apparent. Some of the issue I've had with Cypress are:

- Slow UI interactions
- Limited cross-browser support
- No support for multiple tabs

And generally, I needed better performance and reliability. And found Playwright

# Disclaimer
- The project I've been working on is a large React/AngularJS web application, split into MFEs
- This project uses an older version of Node, and therefore a limited version of Playwright. This may not be the case for you
- I'm not a Playwright expert, and I'm still learning the tool
- There have been other optimisations behind the scenes that have improved the performance of the tests but overall, the migration to Playwright has been a huge improvement


# Why Playwright?
[https://playwright.dev/](https://playwright.dev/)

[https://github.com/microsoft/playwright](https://github.com/microsoft/playwright)

"Playwright is a powerful end-to-end testing framework developed by Microsoft that enables reliable and fast browser automation. It supports multiple browsers, including Chromium, Firefox, WebKit, and Edge, making it ideal for cross-browser testing. Playwright excels at handling multiple tabs, authentication flows, network interception, and mobile emulation, features that many other frameworks struggle with. It runs tests in parallel by default, significantly speeding up execution, and supports headless mode for CI/CD environments. With robust debugging tools, API testing capabilities, and auto-waiting for elements, Playwright is designed for testing modern web applications at scale while ensuring a smooth developer experience."

For myself, it solved the majority of issues I had with Cypress. It also came with the "Trace" feature which is a game-changer for debugging tests in CI/CD environments.

# Installation
```bash
yarn add playwright @playwright/test --dev
```

# Project Setup
- apps/
  - login/
    - src/
    - playwright/
      - tests/
        - login.spec.ts
        - signup.spec.ts
      - consts.ts
      - playwright.config.ts
      - utils.ts

# Initial Files
##### apps/login/playwright/playwright.config.ts
```typescript
import { defineConfig } from '@playwright/test'

export const playwrightConfig = defineConfig({
  testDir: './tests',
  retries: 2,
  use: {
    headless: true,
    baseURL: 'http://localhost',
    navigationTimeout: 60000,
    trace: 'on-first-retry'
  },
  timeout: 120000,
  fullyParallel: true
})
```

##### apps/login/playwright/consts.ts
```typescript
export const baseUrl = 'http://localhost'
export const viewportDesktop = { name: 'desktop', width: 1920, height: 1080 }
export const viewportMobile = { name: 'mobile', width: 414, height: 869 }
```

##### package.json
```json
{
  "scripts": {
    "playwright:test": "playwright test --config=playwright/playwright.config.ts --trace on",
    "playwright:test:local": "playwright test --config=playwright/playwright.config.ts --headed",
  }
}
```

# Moving tests from Cypress to Playwright
AI will one day make me redundant, but until then, I have saved hours of time by throwing it the old Cypress tests and letting it convert them to Playwright tests. This is a great starting point, but it's not perfect. It's a good idea to go through each test and make sure it's doing what you expect. I had to make a few behaviour changes to get the tests to work as expected.

# Test Files
##### apps/login/playwright/tests/login.spec.ts
```typescript
import { test, expect } from '@playwright/test'
import { baseUrl, viewportDesktop, viewportMobile } from '../consts'

const viewports = [viewportDesktop, viewportMobile]

test.describe('Login Actions', () => {
  viewports.forEach((viewport) => {
    test.describe(`${viewport.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
      })

      test('Logging in multiple times', async ({ page }) => {
        await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })

        // First login
        await page.fill('input[name="email"]', 'sales@rexchoppers.com')
        await page.fill('input[name="password"]', 'secret')
        await page.click('button:has-text("Login to Rexchoppers")')

        // Verify login
        await expect(page.locator('[data-testid="user-avatar"]')).toHaveText('SP')

        // Logout
        await page.locator('[data-testid="user-avatar"]').click()
        await page.locator('[data-testid="logout-menu-item"]').click()

        // Ensure redirected to login
        await expect(page).toHaveURL(/\/login/)

        // Second login with different credentials
        await page.fill('input[name="email"]', 'test@rexchoppers.com')
        await page.fill('input[name="password"]', 'secret')
        await page.click('button:has-text("Login to Rexchoppers")')

        // Verify new user login
        await expect(page.locator('[data-testid="user-avatar"]')).toHaveText('RR')
      })

      test('Wrong credentials', async ({ page }) => {
        await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' })

        await page.fill('input[name="email"]', 'sales@rexchoppers.com')
        await page.fill('input[name="password"]', 'wrong_secret')
        await page.click('button:has-text("Login to Rexchoppers")')

        // Verify error message
        await expect(page.locator('.MuiAlert-message')).toContainText('Please check your details and try again')
      })

      test('Not logged in redirect', async ({ page }) => {
        await page.goto(`${baseUrl}/accounts`, { waitUntil: 'domcontentloaded' })

        // Ensure redirected to login
        await expect(page).toHaveURL(/\/login/)
      })
    })
  })
})
```

##### apps/login/playwright/tests/signup.spec.ts
```typescript
import { test, expect } from '@playwright/test'
import { baseUrl, viewportDesktop, viewportMobile } from '../consts'

const viewports = [viewportDesktop, viewportMobile]

test.describe('Signup Actions', () => {
  viewports.forEach((viewport) => {
    test.describe(`Signup successful on ${viewport.name}`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(`${baseUrl}/signup`, { waitUntil: 'domcontentloaded' })
      })

      test('Signup form submission', async ({ page }) => {
        await page.fill('input[name="firstName"]', 'John')
        await page.fill('input[name="lastName"]', 'Doe')
        await page.fill('input[name="email"]', `${viewport.name}@rexchoppers.com`)
        await page.fill('input[name="phoneNumber"]', '0800-000-000')

        // Company name
        await page.fill('input[name="companyName"]', 'Rexchoppers')

        // Password
        await page.fill('input[name="password"]', 'RexchoppersPassword')
        await page.fill('input[name="confirmPassword"]', 'RexchoppersPassword')

        // Submit form
        await page.locator('button[data-testid="submit"]').click()

        // Check if the user is on the accounts page
        await expect(page).toHaveURL(/\/accounts/)
      })
    })
  })
})
```

# Notes on the test files
- I've split the tests into separate files for better organisation
- This particualr project uses a lot of 3rd party components. I've not yet added in code to workaround these in a testing environment (Non-critical ones) so I have added the `{ waitUntil: 'domcontentloaded' }` which will wait for just the main HTML to load before continuing.
- The `--headed` flag is useful for debugging tests locally
- The `--trace on` flag is useful for debugging tests in CI/CD environments

# CI/CD
I use Github Actions for almost all of my projects. Here is an example of a workflow file that runs the Playwright tests

##### .github/workflows/playwright.yml
```yaml
name: Playwright Workflow

on:
  workflow_call:

jobs:
  run:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v2

      - name: Use Node.js
        uses: actions/setup-node@v1
        with:
          node-version: '14'

      - name: Install dependencies
        run: yarn --frozen-lockfile

      - name: Install Playwright Browsers
        run: npx playwright install chromium

      - name: Run Playwright Tests
        run: yarn playwright:test

      - name: Upload Playwright traces
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-traces
          path: apps/login/test-results/**/*.zip
```

# Results
- Much quicker tests and multiple browser support
- The `trace` feature is a game-changer for debugging tests in CI/CD environments
- On average these particual set of tests would take 10 minutes to run in Cypress, now they take less than 2 minutes

# Trace
You may have noticed we uploaded traces as artifacts. Download these and head to [https://trace.playwright.dev/](https://trace.playwright.dev/) to view the traces. This will give a complete breakdown of the test, console, network and everything you need to debug the test. 

This has helped massively when we've had discrepancies between local and CI/CD environments.