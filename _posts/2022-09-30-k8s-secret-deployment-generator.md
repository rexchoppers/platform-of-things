---
layout: post
title:  "K8s Secret + Deployment Generator"
---

# Background

Whilst this site will be filled with all types of stuff, I'll also push up nichè scripts and bits of work that I'm sure someone out there will need at some point.

In our move from Google App Engine to Kubernetes (many many reasons why this is good by the way), we needed to move around 60 environment variables from their current list format e.g

```yaml
env_varables:
    SENDGRID_API_KEY: akey
    A_MAIL_SERVICE_KEY: anotherbigkey
    AN_EXTERNAL_API: anexternalapi
```

Into a Kubernetes secret and deployment file.

Our DevOps guy asked "Is there an easier way to do this?" To which I said "Give me an hour"

3 hours later, I created this scruffy script that ingests a file full of environment variables and spits out 2 files

# Repository

[https://github.com/rexchoppers/k8s-secret-deployment-generator](https://github.com/rexchoppers/k8s-secret-deployment-generator)

All the setup instructions are in the repository

# Files

Input file: `template.yaml`
```yaml
DB_CREDENTIALS:
  DB_NAME: ADATABASENAME
  DB_PASSWORD: AstrongDBpassword

SENDGRID_API_CREDENTIALS:
  KEY: AstrongAPIkey
  SECRET: AstrongAPIsecret
```

Output file: `deployment.yaml`
```yaml
spec:
  template:
    spec:
      containers:
        - name: acontainer
          image: alpine
          env:
            - name: DB_NAME
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: name
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-credentials
                  key: password
            - name: KEY
              valueFrom:
                secretKeyRef:
                  name: sendgrid-api-credentials
                  key: key
            - name: SECRET
              valueFrom:
                secretKeyRef:
                  name: sendgrid-api-credentials
                  key: secret
```

Output file: `secrets.yaml`
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-credentials
  namespace: default
type: Opaque
data:
  name: QURBVEFCQVNFTkFNRQ==
  password: QXN0cm9uZ0RCcGFzc3dvcmQ=
---
apiVersion: v1
kind: Secret
metadata:
  name: sendgrid-api-credentials
  namespace: default
type: Opaque
data:
  key: QXN0cm9uZ0FQSWtleQ==
  secret: QXN0cm9uZ0FQSXNlY3JldA==
---
```