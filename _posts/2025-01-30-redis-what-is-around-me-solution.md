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
Here comes Redis. We already had a very underutilised Redis instance that was used for caching and pub-sub for events in Laravel. We decided to use Redis' geospatial capabilities to store Worker and Site locations instead.

On Site creation, push the Site to Redis with the coordinates.
On Site update, update the Site in Redis with the new coordinates.
On Site deletion, remove the Site from Redis.
On Worker creation, push the Worker to Redis with the coordinates.
On Worker update, update the Worker in Redis with the new coordinates.
On Worker deletion, remove the Worker from Redis.
The extra maintenance required to keep Redis in sync with the MySQL database was minimal and was handled within the same transaction as MySQL. Now, we could start querying Redis to find what was around a Worker or Site.

Whilst the code below is in PHP and Laravel, the parameters should be the same for other languages and Redis clients.

# The Code
```php
    /**
     * $id = Worker ID (MySQL ID - We will use this later)
     * $lat = Latitude of Worker
     * $lng = Longitude of Worker
     * 
     * GEOADD will update or add depending if the value exists or not
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

    public function removeWorker(int $id) {
        Redis::command('ZREM', ['workers' $id]);
    }

    public function addSite(int $id, float $lat, float $lng) {
        /**
         * [0] = Redis Key
         * [1] = Longitude (BE CAREFUL OF THE ORDER)
         * [2] = Latitude
         * [3] = Site ID
         */
        Redis::command('GEOADD', ['sites', $lng, $lat, $id]);
    }

    public function removeSite(int $id)
    {
        Redis::command('ZREM', ['sites', $id]);
    }

    /**
     * GEO CALCULATIONS
     */
    public function getSitesForWorker(float $lat, float $lng, int $distance, string $unit = 'mi', string $order = 'ASC'): ?array
    {
        return Redis::command('GEORADIUS', ['sites', $lng, $lat, $distance, $unit, $order]);
    }

    public function getWorkersAroundSite(float $lat, float $lng, int $distance = 50, string $unit = 'mi', string $order = 'ASC', bool $withDistance = true): ?array {
        $queryParameters = ['workers', $lng, $lat, $distance, $unit, $order];

        if ($withDistance) array_push($queryParameters, 'WITHDIST');

        return Redis::command('GEORADIUS', $queryParameters);
    }
```

# Implementation

- Finding Sites around a Worker

```php
$sites = $this->repository->getSitesForWorker($worker->lat, $worker->lng, 50, 'mi');
```

Which would return an array of Site IDs that are within 50 miles of the Worker.

```json
[
    "1",
    "2",
    "3"
]
```

These would then be fed into a MySQL whereIn:

```sql
SELECT * FROM sites WHERE id IN (1, 2, 3);
```

- Finding Workers around a Site

```php
$workers = $this->repository->getWorkersAroundSite($site->lat, $site->lng, 50, 'mi');
```

Which would return an array of Worker IDs that are within 50 miles of the Site. Notice the `WITHDIST` parameter. This would return the distance in the array.

```json
[
    "1" => 23.4,
    "2" => 12.3,
    "3" => 124.5
]
```

These would then be fed into a MySQL whereIn:

```sql
SELECT * FROM workers WHERE id IN (1, 2, 3);
```

And from there on, we can show each worker and map their distance from the site.

# Speed?
From ~5s on a good day or infinite (Or whenever we killed the stalled queries) to ~1s. The bottleneck we had was on our Database and any relationships we needed to load in the application. The Redis queries themselves were sub-millisecond and dropped overall MySQL CPU usage.

# Issues
- If Redis went down (Which it did once) we had to rebuild the list from MySQL which wasn't a problem but meant we had to fallback to the MySQL query just in case. This was a rare occurrence however and was worth it for the performance increase.
- The returned list of IDs was not paginated, so we often had to obtain the list of IDs and then paginate the MySQL query. This presented some strange behaviour at times and required a bit of extra work to ensure the correct data was returned.

# Conclusion
This solution was only every meant to be temporary and was a quick win for the business. Thanks Redis.

At the time, the MySQL version was 5.7 so the fancy geo-spatial features weren't available to us. Remember, keep your stuff updated. Don't let environmental tech debt get the better of you.

# Credits
- My technical lead at this point for suggesting Redis as a potential low-cost solution.
- I think Pokemon Go used something similar to this. I read an article about it years ago. So thanks Pokemon Go I guess?