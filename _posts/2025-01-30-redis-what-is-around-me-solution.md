---
layout: post
title:  "Redis - 'What is around me?' GeoSpatial Solution"
---

# Overview
Note: This solution uses Redis 5. It may or may not work with future versions of Redis. I'm also doing a lot of this from memory as I don't have access to the codebase anymore.

At a previous company I worked at, we had Workers and Workers would work at a Site. 

- Worker (M) <-> (1) Site

Quite a simple relationship and formed the basis of the application. For viewing sites, notifications, job alerts, and compliance reasons, we would often perform geo-spatial queries to find out what was around a Worker and what Workers were around a Site.

# Problem
Performing equations with the Haversine Formula worked great for several years, ensuring workers could see which sites were near them and vice versa. However, as the company grew, so did the number of workers and sites. As a result, the data scaled, and the code/query performance dipped, causing 100% CPU usage on our MySQL instance at the time.

After many attempts to index the tables to the max and throwing a bit more money at the problem, it was time to implement a solution that would be backwards-compatible with the current Mobile and Web application.

Problem: This was during COVID, and the business could not afford to invest heavily in a new solution that required a lot of our time. This could have included offloading the calculations elsewhere, using a different type of database, or even a microservice. But it just wasn’t the right time.

# Solution
Here comes Redis. We already had a very underutalised Redis instance that was used for caching and pub-sub for events in Laravel. We decided to use Redis' GeoSpatial capabilities to store the Worker and Site locations instead.

- On Site create, push the Site to Redis with the coordinates.
- On Site update, update the Site in Redis with the new coordinates.
- On Site delete, remove the Site from Redis.
- On Worker create, push the Worker to Redis with the coordinates.
- On Worker update, update the Worker in Redis with the new coordinates.
- On Worker delete, remove the Worker from Redis.

The extra maintenance to keep Redis in sync with the MySQL database was minimal and was done in the same transaction as the MySQL database. Now we can start querying Redis for what is around a Worker or Site.

# The Code - Find Sites around me (Worker)
```php
    /**
     * $id = Worker ID (MySQL ID - We will use this later)
     * $lat = Latitude of Worker
     * $lng = Longitude of Worker
     */
    public function upsertWorker(int $id, float $lat, float $lng)
    {
        /**
         * [0] = Redis Key
         * [1] = Longitude (BE CAREFUL OF THE ORDER)
         * [2] = Latitude
         * [3] = Worker ID
         */

        Redis::command('GEOADD', ['workers', $lng, $lat, $id]);
    }
```
