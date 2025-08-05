---
layout: post
title:  "discovery.onl Contributions"
---

* TOC
{:toc}

# Overview
At the start of 2025, I was involved in a community driven project called [discovery.onl](https://discovery.onl). This site offers game modifications and enhancements for various titles. It's not my scene as such but I was happy to help as there was tight budget contraints. I thought it would be good to share some of the contributions and how an application can be made performant on very little hardware.

# Tech Stack
- **Laravel**: The core framework for the application.
- **MySQL**: The database system used to store game data and user information.
- **Redis**: Employed for caching to enhance performance.
- **Docker**: Used for containerisation, ensuring consistent environments across development and production.
- **Nginx**: The web server used to serve the application.

# 1. `->with` is king
I hate overfetching with a passion but sometimes it's needed especially for showing mass amounts of data. For 5 games, there was: 

- Verions to show
- Game data to show
- Game files to show
- Game file versions to show
- Authors to show
- Authors' social media to show

And the rest of it. Without eager loading, this would have resulted in 6 extra queries per game. And then whatever else needs loading under that. 