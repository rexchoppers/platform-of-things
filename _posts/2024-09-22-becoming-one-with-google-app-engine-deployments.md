---
layout: post
title:  "Becoming One With Google App Engine Deployments"
---

# Overview
- Want to use Google App Engine for a small project? Go for it. 
- On a lower version of a programming language that isn't even supported anymore? Google App Engine is right for you.

Do you want to run an application highly available, without downtime during deployments on the flexible tier using modern PHP versions? And do you want to maintain multiple versions of your application because you know, backwards compatibility is pretty important? Then you can forget it.

During my tenure at one of my companies, GAE worked okay until we wanted a bit more flexibility and to do more complex tasks in it. Unfortunately, at the time, we were in no position to move to Kubernetes or another container service, so we ended up having to put in workarounds to get the application to work.

There were 2 issues with GAE: 

- Downtime during deployments on the same version (Flexible tier of GAE) even when liveness checks were enabled and set up correctly.
- Needing to maintain multiple versions of the application and having our load balancer point to the correct version.

# Resources