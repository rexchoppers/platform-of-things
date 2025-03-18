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

# Why Playwright?
"Playwright is a powerful end-to-end testing framework developed by Microsoft that enables reliable and fast browser automation. It supports multiple browsers, including Chromium, Firefox, WebKit, and Edge, making it ideal for cross-browser testing. Playwright excels at handling multiple tabs, authentication flows, network interception, and mobile emulation, features that many other frameworks struggle with. It runs tests in parallel by default, significantly speeding up execution, and supports headless mode for CI/CD environments. With robust debugging tools, API testing capabilities, and auto-waiting for elements, Playwright is designed for testing modern web applications at scale while ensuring a smooth developer experience."

For myself, it solved the majority of issues I had with Cypress. 

# Migration
