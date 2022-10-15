---
layout: post
title:  "Grafana Let Me In Project (Cloud SQL IP Whitelisting)"
---

# Background
Whilst we were using the cloud version of Grafana (Free tier during testing) We needed a simple way to keep up with IP changes so we could whitelist them with our [Cloud SQL](https://cloud.google.com/sql) database. 

As we were using GCP, it made sense to create a simple Cloud Function that was triggered everyday by a cron job via the [Cloud Scheduler](https://cloud.google.com/scheduler/docs/creating)

# Features
* Converts text to international morse code
* Plays morse code "dits" and "dahs" to the default audio driver

# Potential future improvements
* Support other characters (At the moment, it only supports A-Z + 0-9)
* Follow conventions with gaps between words and sentences

# Resources
* Repository: [https://github.com/rexchoppers/Text-to-Morse](https://github.com/rexchoppers/Text-to-Morse)

# Images

![Screen shot](https://storage.googleapis.com/rexchoppers-website-assets/text-to-morse-image.png "Screen shot")