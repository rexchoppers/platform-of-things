---
layout: post
title:  "EB Platform Branch Update Tool"
---

# Overview
During my time at Papertrail, we used AWS Elastic Beanstalk (EB) to manage our application deployments. EB provides a convenient way to deploy and manage applications in the AWS cloud, but we really needed to incrementally update our platform branch to take advantage of new features and improvements.

When it came to language updates, EB (As far as I'm aware) does not support simply "Selecting a new language version" and having it automatically update your environment. Instead, we had to download the configuration of the current environment, modify the PlatformArn to the new version, and then reapply the configuration. Especially if you're really far behind on versions, this can be a bit tedious.

This is a quick tool to do the above process in a more automated fashion. It isn't pretty but will hopefully save you some time.

- [EB Platform Branch Update Tool](https://github.com/rexchoppers/eb-platform-branch-update)