---
layout: post
title:  "Faster OpenFOAM Processing with Google Cloud"
---

# Overview
My brother has been working on several OpenFOAM projects and running numerous simulations on his main machine. While his setup is adequate, it's not ideal for running simulations, with some taking up to 2 hours. The electricity company might be pleased, but he isn't.

Together, we've developed a simple system to run simulations on Google Cloud's Compute Engine (GCE). This has reduced processing times from 2 hours to 16 minutes and costs $0.63 per hour.

**Note:** This system, with some adaptations, can likely be applied to any platform that supports containers. While I've tested it only on GCE, I plan to add support for other cloud providers in the future.

**Note 2:** Running an instance of this size can be expensive. Ensure you delete the instance after using it and avoid letting it run unnecessarily.

**Note 3:** I'm still refining these projects, so please review the documentation before setting anything up.

GCP Processing Repository: [https://github.com/rexchoppers/openfoam-cloud-laborer-gcp](https://github.com/rexchoppers/openfoam-cloud-laborer-gcp)
Test Project Repository: [https://github.com/rexchoppers/OpenFoam-Cloud-Test](https://github.com/rexchoppers/OpenFoam-Cloud-Test)

# Prerequisites
- Google Cloud account
- Docker
- Increase your GCE RAM and CPU quotas. If you neglect this, Google Cloud will restrict you from creating the compute instance.

# What is OpenFOAM?
OpenFOAM is an open-source computational fluid dynamics (CFD) software package. It offers a suite of tools for modeling fluid flow, heat transfer, and related phenomena. Initially developed by CFD Direct Limited, OpenFOAM has become a favorite among researchers, engineers, and students due to its flexibility, extensibility, and strong community support.

# Steps
1. Build a Docker container using the image from the repository above. Ensure you include the scripts folder and Docker file in your project.
2. Push the container to a public container registry or Google Container Registry. (Note: Google Cloud has limited support for external private container registries, which is frustrating.)
3. Create an instance using the container image you've pushed:
    - `name`: Your choice
    - `region`: Your choice
    - `zone`: Your choice
    - `machine type`: I recommend c2-highcpu-56 (56 vCPUs, 28 cores, 122 GB memory)
    - `VM provisioning model`: Spot (Essential for cost-saving)
    - `Set a time limit for the VM`: I set mine to one hour. Activating this is advised.
    - `Deploy Container`: Choose the container image you pushed.
        - `Restart policy`: Never
        - Under `Environment variables`, define the core count: `PROCESSING_CORES=56`
    - `Boot Disk`:
        - `Operating System`: Container-Optimized OS
        - `Version`: The latest stable version is typically fine.
        - `Boot disk type`: SSD persistent disk
        - `Size`: I selected 500GB, but this can vary based on the project.
4. After the instance is set up, it will commence the simulation automatically.
5. Coming soon: Publishing of results (I'm still working on this part and updating the repository accordingly.)

# Cost
The cost of running this instance is $0.63 per hour. I'm not sure how this compares to other cloud providers, but it's a significant improvement over my brother's current setup.

# Conclusion
This is all heavily still work in progress, but I think it's important to see how much the flexibility of cloud computing can improve your workflow. I'm still working on this project, and my brother is working on more complex simulations so I'll update the Github repository accordingly and potentially a new post in a few weeks time.