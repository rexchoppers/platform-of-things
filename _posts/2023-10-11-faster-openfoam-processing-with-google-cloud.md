---
layout: post
title:  "Faster OpenFOAM Processing with Google Cloud"
---

# Overview
My brother has been working on a few OpenFOAM projects and running a lot of simulations in his main machine. Whilst his setup his okay, it's not ideal for running simulations with them taking up to 2 hours to run. The electricity company will be happy, but he won't be.

I've worked with him to create a very simple little system to run simulations on Google Cloud's Compute Engine (GCE) which has cut processing times from 2 hours down to 16 minutes.



# What is OpenFOAM?
OpenFOAM is an open-source computational fluid dynamics (CFD) software package that provides a comprehensive suite of tools for modeling fluid flow, heat transfer, and various related phenomena. Developed originally by the CFD Direct Limited, OpenFOAM has grown into a popular choice among researchers, engineers, and students due to its flexibility, extensibility, and robust community support.

# 