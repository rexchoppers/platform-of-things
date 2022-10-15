---
layout: post
title:  "Grafana Let Me In Project"
---

# Background
Whilst we were using the cloud version of Grafana (Free tier during testing) We needed a simple way to keep up with IP changes for Grafana so we could whitelist them with our [Cloud SQL](https://cloud.google.com/sql) database. Once the IPs were whitelisted, Grafana could connect to the database instances and show us some information.

As we were using GCP, it made sense to create a simple [Cloud Function](https://cloud.google.com/functions) that was triggered everyday by a cron job via the [Cloud Scheduler](https://cloud.google.com/scheduler/docs/creating)

Whilst the code might be niche, it can be used as an example for updating Cloud SQL instances or could be ported for another cloud service. This code is not currently used by any employers or clients of mine now as I recommend using Prometheus and self-host Grafana to prevent breaking changes during updates.

Grafana instance IPs for whitelist can be found at [https://grafana.com/api/hosted-grafana/source-ips](https://grafana.com/api/hosted-grafana/source-ips)

GLMI = Grafana Let Me In (The name makes no sense if I'm being honest but it was fun to come up with)

# Contributing
Absolutely feel free to add any ideas, issues or anything else to this project. It will remain open source, forever.

# Images
![Whitelisted IPs](https://storage.googleapis.com/rexchoppers-website-assets/glmi-whitelisted-ips.png "Whitelisted IPs"){: width="250" }

# Repository

[https://github.com/rexchoppers/glmi-google-cloud-sql](https://github.com/rexchoppers/glmi-google-cloud-sql)