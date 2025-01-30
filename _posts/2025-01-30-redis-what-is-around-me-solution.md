---
layout: post
title:  "Redis - 'What is around me?' GeoSpatial Solution"
---

# Overview
Note: This solution uses Redis 5. It may or may not work with future versions of Redis. I'm also doing a lot of this from memory as I don't have access to the codebase anymore.

At a previous company I worked at, we had Workers and Workers would work at a Site. 

- Worker (M) <-> (1) Site

Quite a simple relationship and formed the basis of the application. For viewing sites, notifications, job alerts, and compliance reasons, we would often perform geo-spatial queries to find out what was around a Worker and what Workers were around a Site.

