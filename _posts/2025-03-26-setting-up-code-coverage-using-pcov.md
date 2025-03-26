---
layout: post
title:  "Setting Up Code Coverage Using pcov"
toc: true
---

* TOC
{:toc}

# Overview
At one of my previous roles, our Gitlab pipelines ended up taking around 40 minutes for a minimal amount of tests. Once we had a look, we found that XDebug was running on every test and resulted in the tests taking a long time to run. As a result:

- Fixes were taking longer to get to production
- Our pipelines minutes were being used up very quickly (Gitlab ain't cheap either)

 After a bit of research, we decided to turn off XDebug on the pipelines (In all fairness, it shouldn't have been on anyway) and use pcov for code coverage.

# Disclaimer
- This example is from a pretty old project so the versions of the tools may be different.

# What is pcov?
[https://github.com/krakjoe/pcov](https://github.com/krakjoe/pcov)

Quite simply, it's a code-coverage driver. It's small, lightweight and integrates well with PHPUnit.

# Installation
The installation is pretty simple. The following files required updating to get pcov working.

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
- Our tests dropped from between 40-60 minutes to around 5 minutes
- We were able to obtain code coverage for our tests and see where we were lacking
- Bug fixes got to production quicker. A bug fix taking an hour to get to production is not ideal

# If you're on older PHPUnit versions
If you're on an older version of PHPUnit, you may need to install the following package to get pcov working. This example is for more up to date versions of PHPUnit but when I was working on this project, we were using a much older version of PHPUnit.

```bash
composer require --dev pcov/clobber
```

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
    - vendor/bin/pcov clobber # ADD THIS LINE
    - php -d memory_limit=-1 -dpcov.enabled=1 -dpcov.directory=. -dpcov.exclude="~vendor~" ./vendor/bin/phpunit --configuration phpunit.xml --coverage-text --colors=never --log-junit report.xml
```