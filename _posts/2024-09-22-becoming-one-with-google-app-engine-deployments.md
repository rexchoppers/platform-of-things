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

    # Create a Network Endpoint Group (NEG), and BE Service deployment
    # Sometimes if we were redeploying the same version, we would get errors here which we didn't mind so they can be ignored
    - gcloud beta compute network-endpoint-groups create my-project-appengine-$VERSION_STRING --project my-project --region=europe-west2 --network-endpoint-type=SERVERLESS --app-engine-app --app-engine-service=default --app-engine-version="${VERSION_STRING}" > /dev/null 2>&1 || FAILURE=true

    # Create a backend service which will be used by the load balancer
    - gcloud compute backend-services create --project my-project --global my-project-appengine-backend-$VERSION_STRING > /dev/null 2>&1 || FAILURE=true

    # Add the backend service to the NEG we created earlier
    - gcloud beta compute backend-services add-backend my-project-appengine-backend-$VERSION_STRING --project my-project --global --network-endpoint-group=my-project-appengine-$VERSION_STRING --network-endpoint-group-region=europe-west2 > /dev/null 2>&1 || FAILURE=true

    # All components have been created successfully, so call our magic script to update the load balancer
    - gcloud functions call gae-update-load-balancer --project my-project --region=europe-west2 --data "{\"majorVersion\":\"$MAJOR_VERSION\", \"gaeVersion\":\"$VERSION_STRING\"}"
```

# What Happens Next
We've created all the components needed for the load balancer to point to the correct version of the application. There is the: 

- URL Map: This should have already been created when you've configured the load balancer in GCP
- Network Endpoint Group (NEG)
- Backend Service
- Fresh GAE instance running the new version of the application

# The Magic Script
This script was created as a Google Cloud Function by myself and used to update the load balancer to point to the correct version of the application.

```js
const {google} = require('googleapis');
const constants = require('./constants');
 
const SCOPES = [
    'https://www.googleapis.com/auth/cloud-platform'
];
 
const PROJECT = 'my-project';
const URL_MAP = 'my-api-url-map';
 
const auth = new google.auth.GoogleAuth({
    keyFile: 'keyfile.json',
    scopes: SCOPES
});

exports.getDefaultPathMatcher = async (pathMatchers) => {
    if(pathMatchers === null) return null;
 
    for (const [pathMatcherIndex, pathMatcher] of pathMatchers.entries()) {
        if (pathMatcher.name !== constants.DEFAULT_TARGET_PATH_MATCHER) continue;
        
        return {
            index: pathMatcherIndex,
            pathMatcher: pathMatcher
        }
    }
 
    return null;
};
 
exports.getVersionPathRule = async (pathRules, majorVersion) => {
    if(pathRules === null || majorVersion === null) return null;
 
    for (const [pathRuleIndex, pathRule] of pathRules.entries()) {
        if(!pathRule.paths.includes('/v' + majorVersion.toString())) continue;
 
        return {
            index: pathRuleIndex,
            pathRule: pathRule
        }
    }
    return null;
};
 
exports.updatePathMatcherService = async (data, pathMatcher, pathRule, gaeVersion) => {
    if(data === null || pathMatcher === null || pathRule === null || gaeVersion === null) return null;
 
    data.pathMatchers[pathMatcher.index]
        .pathRules[pathRule.index].service = pathRule.pathRule.service.replace(new RegExp(constants.REGEX_VERSION_NUMBER), gaeVersion);
 
    return data;
};
 
exports.addPathMatcherService = async (data, pathMatcher, newPathRule) => {
    if(data === null || pathMatcher === null || newPathRule === null) return null;
 
    data.pathMatchers[pathMatcher.index].pathRules.push(newPathRule);
 
    return data;
};
 
exports.createPathRule = async (majorVersion, gaeVersion) => {
    return {
        service: constants.URL_BACKEND_SERVICE_BASE_URL + gaeVersion,
        paths: [
            '/v' + majorVersion.toString(),
            '/v' + majorVersion.toString() + '/*',
        ],
        routeAction: {
            urlRewrite: {
                pathPrefixRewrite: '/'
            }
        }
    }
};
 
exports.updateLoadBalancer = async (computeClient, data, responseObject) => {
    try {
        await computeClient.urlMaps.patch({
            project: PROJECT,
            urlMap: URL_MAP,
            requestBody: {
                pathMatchers: data.pathMatchers
            }
        });
 
        return responseObject.status(200).send({'message': 'Load balancer successfully updated'});
    } catch (error) {
        return responseObject.status(500).send({'error': error.message});
    }
};
 
// majorVersion: 100
// gaeVersion: v10-0-0
exports.updateApiLoadBalancer = async (request, response) => {
    // Check if method is POST - return response.status(500).send({'error': 'Operation not supported'});
    // Perform request validation
 
    const majorVersion = request.body.majorVersion;
    const gaeVersion = request.body.gaeVersion;
 
    const authClient = await auth.getClient();
    const compute = google.compute({
        version: 'v1',
        project: PROJECT,
        auth: authClient
    });
 
    const urlMaps = await compute.urlMaps.get({
        project: PROJECT,
        urlMap: URL_MAP
    });
 
    const urlMapData = urlMaps.data;
 
    const pathMatchers = urlMapData.pathMatchers;
 
    const defaultPathMatcher = await this.getDefaultPathMatcher(pathMatchers);
 
    const pathRules = defaultPathMatcher.pathMatcher.pathRules;
 
    const versionPathRule = await this.getVersionPathRule(pathRules, majorVersion);
 
    // If there is a path rule setup for this version, then we can just update it
    if(versionPathRule !== null) {
        const updatedData = await this.updatePathMatcherService(urlMapData, defaultPathMatcher, versionPathRule, gaeVersion);

        urlMapData.data = updatedData;
 
        await this.updateLoadBalancer(compute, urlMapData.data, response);
    } else {
        const newPathRule = await this.createPathRule(majorVersion, gaeVersion);
        const updatedData = await this.addPathMatcherService(urlMapData, defaultPathMatcher, newPathRule);
 
        urlMapData.data = updatedData;
 
        await this.updateLoadBalancer(compute, urlMapData.data, response);
    }
};
```

# And Now What?
The load balancer mapping will point to the correct version of the application. For example if: v7.2.4 is deployed, the load balancer will point to the correct version of the application on URL: `https://my-api.com/v7/` and `https://my-api.com/v7/*`

If the version doesn't exist, the load balancer will create this in the URL map and point to the correct version of the application.

# Downsides
- Grim solution to a problem that shouldn't exist
- The old GAE instances will still be running and costing you money so you'll need to manually delete them (Same applies for BE services and NEG)

# Conclusion
Don't do this. But if you have to, I hope the above helps you out. If you're application is small then by all means feel free to use one of these PaaS services. But if you're looking for more flexibility and control, then I would recommend looking at Kubernetes or a completely different solution.