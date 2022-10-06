---
layout: post
title:  "Converting Data To Videos Using FFmpeg"
---

# Background

I've recently been tasked by a client to create a system that collects sporting event data, and generates a video (MP4 format) that later on can be used for streaming. Whilst I won't go into the details of the streaming side of things such as the server setup, I'll be going through how I was able to get this full process working.

The video would be in a slideshow sort of format e.g

- Show slide 1 
- 10 second delay
- Show slide 2
- 10 second delay
- Show slide 3

I won't be able to share any Git repositories as these are private, but I am able to share example snippets and how I was able to get this working.

# Software/Technologies used
* [FFmpeg](https://ffmpeg.org/)
* [node-html-to-image](https://www.npmjs.com/package/node-html-to-image)
* [shelljs](https://www.npmjs.com/package/shelljs)
* [Kubernetes](https://kubernetes.io/)

# The code

#### Step 1: Get the data
A simple enough step, grab sporting data from an API.

#### Step 2: Creating the HTML template
I'll go into the details of using **node-html-to-image** later on. The main aim was to build a simple screen in HTML that I could then convert later on into a .PNG format. After a bit of re-rigging, the code finally looked like this

```html
<html>
   <head>
      <style>
         body {
            width: 1280px;
            height: 720px;
            margin: 0px;
         }
         .main-border {
            display: inline-block;
            margin: 16px 16px 16px 16px;
            width: 1238px;
            height: 680px;
         }
      </style>
   </head>
   <body style="background-image: url('../image.png'); background-size: 1280px 720px;">
      <div style="border-style: solid;" class="main-border">
         <h4 style="width: 100%; text-align: center">10/4/2022 - Page currentPage/totalPages</h4>
         <div>
            <p>
               <span style="text-decoration: underline;">
               <span>
               <strong>Event Category</strong>
               </span>
               </span>
            </p>
            <p>
               <strong>
               <span style="text-decoration: underline;">TIME&nbsp; &nbsp; SOME OTHER DATA&nbsp; &nbsp; SOME MORE DATA</span>
               </strong>
            </p>
            <p>
               <span>DATA</span>
               <span>DATA<br/></span>
            </p>
         </div>
      </div>
   </body>
</html>
```

Forgive the use of PX. This is only a rough example template that should work for the next couple of steps

#### Step 3: Converting HTML to images
Once the data was injected into the HTML template, the next step was to put this template through the **node-html-to-image** library.

NPM: https://www.npmjs.com/package/node-html-to-image

Github: https://github.com/frinyvonnick/node-html-to-image

When doing my research, I found this was the perfect way to generates images from my HTML templates. Whilst I didn't use the handlebars functionality for this projects, I will probably use this in future.

**node-html-to-image** states that `It uses puppeteer in headless mode` which means we had to adjust our Docker images to support this. Below is an example Dockerfile

```Dockerfile
FROM node:16-alpine3.15
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
RUN npm i
RUN apk add --no-cache chromium ffmpeg
COPY . .
```

The **chromium** dependency in particular is important to use [Puppeteer](https://github.com/puppeteer/puppeteer)

Once all the above was setup, I was able to use the library to generate the images

```typescript
for (let i = 0; i < pages.length; i++) {
        let page = pages[i];
        page = page.replace('currentPage', i + 1).replace('totalPages', pages.length);

        await nodeHtmlToImage({
            output: `/images/${i}.png`,
            html: page,
            puppeteerArgs: {
                executablePath: '/usr/bin/chromium-browser',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            },
        });
    }
```

If we break the above down 
* `page.replace('currentPage', i + 1).replace('totalPages', pages.length);` Adds the page numbers etc...
* `puppeteerArgs` **node-html-to-image** allows us to pass arguments straight to Puppeteer
* `executablePath: '/usr/bin/chromium-browser',` With Alpine Docker images, I had a few issues with Puppeteer not picking up the chromium executable so I passed it manually
* `args: ['--no-sandbox',]` It's my code so no spooky malware. More info can be found [here](https://www.google.com/googlebooks/chrome/med_26.html) about this flag

The image output size is defined in the HTML template above meaning all of the generated images were 720p

```html
      <style>
         body {
            width: 1280px;
            height: 720px;
            margin: 0px;
         }
      </style>
```

For some components such as a border, these did not react to styling changes such as left/right adjustments until the following styling was added. In this case, the `display: inline-block` was key

```html
    <style>
         .main-border {
            display: inline-block;
            margin: 16px 16px 16px 16px;
            width: 1238px;
            height: 680px;
         }
    </style>
```

#### Step 4: FFmpeg's concat demuxer

More info [here](https://trac.ffmpeg.org/wiki/Concatenate)

With a directory full of images in the following format:

- images
    - 1.png
    - 2.png
    - 3.png
    - 4.png
    - 5.png

I wanted to now ensure that all of these images were added to the final .MP4 file and were added in that order. Also if I wanted to add arbitrary files later on, this could be done fairly easy (This is why I didn't opt for the glob functionality)

Adding in the delays between pages was also going to be important and appeared more visual when presented in a single text file - Easier for debugging.

To generate the `list.txt` file 

```typescript
    _.forEach(pages, (page, index) => {
        fileData += `file '/images/${index.toString()}.png'\nduration 10\n`;
    });

    fileData += `file '/app/images/${pages.length - 1}.png'\n`;
```

This small bit of code created the text file required

```text
file '/images/0.png'
duration 10
file '/images/1.png'
duration 10
file '/images/2.png'
duration 10
file '/images/3.png'
duration 10
file '/images/4.png'
duration 10
file '/images/4.png'
```

You've probably noticed that the final file is has a duplicated line. This is on purpose as FFmpeg has a weird quirk where it won't delay the last page for the time you've specified. This seemed to the be recommended fix and wasn't anything too taxing for us to sort out

#### Step 5: Generating the video

I setup a small bash script for convenience sake and use **shelljs** to execute it. There was countless ways to do this but a bash script meant my DevOps friend wouldn't have to touch any of the code should they need to make any changes.

```typescript
    exec('./generate-video.sh');
```

Example bash file

```bash
ffmpeg -f concat -safe 0 -i /app/images/list.txt -c:v libx264 -vf "fps=25,format=yuv420p" /app/images/output.mp4

cp /app/images/output.mp4 /app/output/output.mp4
```

The following bash file takes the `list.txt` file and eventually spits out our `output.mp4` file. 

#### Step 6: Hosting solutions

We opted to use Kubernetes CronJob to spin up the code, create the output file and send that somewhere for streaming (I might add details about this later) The instance is then stopped and waits until it's next required to execute

# Conclusion

Whilst it's hard to explain a lot of things in the form of code snippets, hopefully this helps anyone who's asking the question "How do I design something to create a file/stream with a design I want"

If you have any questions about this particular project, drop me a message on LinkedIn