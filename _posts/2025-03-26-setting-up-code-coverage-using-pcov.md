---
layout: post
title:  "Setting Up Code Coverage Using Pcov"
toc: true
---

* TOC
{:toc}

# Overview
At one of my previous roles, our Gitlab pipelines ended up taking around 40 minutes for a minimal amount of tests. Once we had a look, we found that XDebug was running on every test and resulted in the tests taking a long time to run. As a result:

- Fixes were taking longer to get to production
- Our pipelines minutes were being used up very quickly (Gitlab ain't cheap either)

 After a bit of research, we decided to turn off XDebug on the pipelines (In all fairness, it shouldn't have been on anyway) and use Pcov for code coverage.

# Disclaimer
- This example is from a pretty old project so the versions of the tools may be different.


# What is Pcov?
[https://github.com/krakjoe/pcov](https://github.com/krakjoe/pcov)

Quite simply, it's a code-coverage driver. It's small, lightweight and integrates well with PHPUnit.

# Installation
The installation is pretty simple. The following files required updating to get Pcov working.

##### .gitlab-ci.yml
```yaml
unit_test:
  stage: test
  artifacts:
    when: always
    reports:
      junit: report.xml
  script:
    - pecl install pcov && docker-php-ext-enable pcov
    - php -d memory_limit=-1 -dpcov.enabled=1 -dpcov.directory=. -dpcov.exclude="~vendor~" ./vendor/bin/phpunit --configuration phpunit.xml --coverage-text --colors=never --log-junit report.xml
```

##### phpunit.xml
```xml
       <env name="DRIVER" value="pcov"/>
```


# Results
- Much quicker tests and multiple browser support
- The `trace` feature is a game-changer for debugging tests in CI/CD environments
- On average these particual set of tests would take 10 minutes to run in Cypress, now they take less than 2 minutes

# Trace
You may have noticed we uploaded traces as artifacts. Download these and head to [https://trace.playwright.dev/](https://trace.playwright.dev/) to view the traces. This will give a complete breakdown of the test, console, network and everything you need to debug the test. 

This has helped massively when we've had discrepancies between local and CI/CD environments.