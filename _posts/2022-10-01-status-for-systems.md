---
layout: post
title:  "Status For Systems"
---

# Background

I was pretty shocked at the lack of open source system status/status page systems out there in the market with all the integrations required. A lot of these also seemed to cost a lot of money. For example, Atlassian's StatusPage is $79 a month for a public and private page. And then on top of that, we had to update our OpsGenie integration just to get the 2 systems to talk to each other which cost a lot more money per user.

And the market just seems to be flooded with all these paid solutions. With all this in mind, the "Status For Systems" project has been created.

The project is currently a work in progress. I'm working on create a simple backend API in GO that will show if a system is up or down. Later on, I want to add the more complex features such as: 

* Integration with incident management systems
* Notifications to users via SMS, Email, Slack etc...
* Status feeds from other systems e.g AWS, GCP, DigitalOcean, Azure etc...

This project probably won't be my main focus but I'd like to create something free that can be used by anyone and will probably annoy the companies asking obscene amounts of money for a simple "System up, system down" page.

I created this project a while ago and have been toying about keeping it a simple MVC application or breaking out into a FE and API. I believe now we'll stick with a simple Angular project for the FE and GO using the GIN framework for the BE/API

# Contributing

Absolutely feel free to add any ideas, issues or anything else to this project. It will remain open source, forever, for all to use with the potential for a SaaS solution later on if there's a need for it.

# Repository

[https://github.com/Codox/Status-For-Systems](https://github.com/Codox/Status-For-Systems)