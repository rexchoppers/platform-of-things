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

- Downtime during deployments on the same version (Flexible tier of GAE) even when liveness/readiness checks were enabled and set up correctly.
- Needing to maintain multiple versions of the application and having our load balancer point to the correct version.

So with some help from the team, we managed to put a long-term bodge in place. Please note: This is an old solution and may not work anymore. Also it was a bodge, so it's really not the best solution.

If you know how to, start off with Kubernetes or another container service. As much as I love AWS, I even have my gripes with Elastic Beanstalk

# The Gitlab File
You can use whatever CI-CD but I'm using Gitlab for this example. 

```yaml
script:
    # First convert the tag (v7.2.4) into the GAE version string e.g v7-2-4
    # This will be used for setting up the networking bits as the CLI
    # doesn't like dots in the version string
    - export VERSION_STRING=${CI_COMMIT_TAG//./-}

    # Remove the v from the tag
    - export APP_VERSION=${CI_COMMIT_TAG:1}
    
    # Get only MAJOR and MINOR version
    - export MAJOR_MINOR_VERSION=${APP_VERSION%.*}
    
    # Get only the MAJOR version
    - export MAJOR_VERSION=${MAJOR_MINOR_VERSION%.*}
    
    # Set the final version string
    - export APP_ENGINE_SERVICE_VERSION="v${MAJOR_VERSION}"

    # Do the rest of the script stuff up until your deployment...

    # Deploy the GAE instance
    - gcloud --quiet --project my-project app deploy --version=$VERSION_STRING app.yaml

    
```

# Resources