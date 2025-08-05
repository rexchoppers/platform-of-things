---
layout: post
title:  "discovery.onl Contributions"
---

* TOC
{:toc}

# Overview
At the start of 2025, I was involved in a community driven project called [discovery.onl](https://discovery.onl). This site offers game modifications and enhancements for various titles. It's not my scene as such but I was happy to help as there was tight budget contraints. I thought it would be good to share some of the contributions and how an application can be made performant on very little hardware.

This post will cover mainly my contributions to the project in terms of optimising the codebase, improving performance, and ensuring the application runs smoothly on limited resources.

# Tech Stack
- **Laravel**: The core framework for the application.
- **MySQL**: The database system used to store game data and user information.
- **Redis**: Employed for caching to enhance performance.
- **Docker**: Used for containerisation, ensuring consistent environments across development and production.
- **Nginx**: The web server used to serve the application.

# Stuff
#### `->with` is king
I hate overfetching with a passion but sometimes it's needed especially for showing mass amounts of data. For 5 games, there was: 

- Verions to show
- Game data to show
- Game files to show
- Game file versions to show
- Authors to show
- Authors' social media to show

And the rest of it. Without eager loading, this would have resulted in 6 extra queries per game. And then whatever else needs loading under that. 

```php

$query->with([
    'type',
    'author',
    // Etc...
]);
```

#### Database Indexing
Simple really. 

- Compound indexes are powerful but use with caution.
- Always compare query performance before and after indexing.
- Not all indexes are created equal. Some may not be used at all. Every app is different.

#### Tweak PHP
Tweak and tune PHP settings to ensure optimal performance.

```conf
# Base image
FROM webdevops/php-nginx:8.3-alpine

# Set the document root to the Laravel public directory
ENV WEB_DOCUMENT_ROOT=/app/public
ENV PHP_UPLOAD_MAX_FILESIZE=500M
ENV PHP_POST_MAX_SIZE=500M

# PHP Performance Tweaks
ENV PHP_OPCACHE_MEMORY_CONSUMPTION=512 \
    PHP_OPCACHE_MAX_ACCELERATED_FILES=50000 \
    PHP_OPCACHE_VALIDATE_TIMESTAMPS=0 \
    PHP_OPCACHE_REVALIDATE_FREQ=0 \
    PHP_OPCACHE_JIT=1255 \
    PHP_OPCACHE_JIT_BUFFER_SIZE=256M \
    PHP_OPCACHE_INTERNED_STRINGS_BUFFER=32 \
    PHP_OPCACHE_FAST_SHUTDOWN=1 \
    PHP_OPCACHE_HUGE_CODE_PAGES=1 \
    PHP_OPCACHE_ENABLE_FILE_OVERRIDE=1

ENV PHP_FPM_PM=ondemand \
    PHP_FPM_PM_MAX_CHILDREN=20 \
    PHP_FPM_PM_PROCESS_IDLE_TIMEOUT=5s \
    PHP_FPM_PM_MAX_REQUESTS=500

# Etc......
```

#### Update Framework, Language + Dependencies
Longer you leave upgrades, the harder it is to upgrade. Fact of development.

- Updating PHP 8.2 -> 8.3
- Laravel 8 -> 11

#### Features 
Done quite a few features for the site.

- Password reset
- Statistics
- Scheduling
- General security improvements

#### CI/CD Pipelines
Setting up Github Actions to automate the deployment process

#### CloudFront Integration
This project includes a lot of assets: game files, images, gifs and the rest. To reduce the data-out transfer costs and improve performance, CloudFront was setup to cache static assets. Reduces the cost by 50%. I love CDNs - Very underused on a lot of projects.

#### Infrastructure Setup
I won't delve into the details too much here but complete infrastructure setup:

- Nginx Web Server
- MySQL Database
- Redis Cache