---
layout: post
title:  "Converting Data To Videos"
---

# Background

I've recently been tasked by a client to create a system that collects sporting event data, and generates a video (MP4 format) that later on can be used for streaming. Whilst I won't go into the details of the streaming side of things such as the server setup, I'll be going through how I was able to get this full process working.

I won't be able to share any Git repositories as these are private, but I am able to share example snippets and how I was able to get this working.

# Software used
* [FFmpeg](https://ffmpeg.org/)
* [node-html-to-image](https://www.npmjs.com/package/node-html-to-image)
* [shelljs](https://www.npmjs.com/package/shelljs)


## Step 1: Get the data
A simple enough step, grab sporting data from an API.

## Step 2: Creating the HTML template
I'll go into the details of using **node-html-to-image** later on. The main aim was to build a simple screen in HTML that I could then convert later on into a .PNG format. After a bit of re-rigging, the code finally looked like this

```html

```