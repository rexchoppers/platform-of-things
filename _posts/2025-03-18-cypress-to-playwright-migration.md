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
- This is all still work in progress

# Why Playwright?
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
#### apps/login/playwright/playwright.config.ts
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

#### apps/login/playwright/consts.ts
```typescript
export const baseUrl = 'http://localhost'
export const viewportDesktop = { name: 'desktop', width: 1920, height: 1080 }
export const viewportMobile = { name: 'mobile', width: 414, height: 869 }
```

#### package.json
```json
{
  "scripts": {
    "playwright:test": "playwright test --config=playwright/playwright.config.ts --trace on",
    "playwright:test:local": "playwright test --config=playwright/playwright.config.ts --headed",
  }
}
```

# Migration tests from Cypress to Playwright
AI will one day make me redundant, but until then, I have saved hours of time by throwing it the old Cypress tests and letting it convert them to Playwright tests. This is a great starting point, but it's not perfect. It's a good idea to go through each test and make sure it's doing what you expect. I had to make a few behaviour changes to get the tests to work as expected.

