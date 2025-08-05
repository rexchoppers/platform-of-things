---
layout: post
title:  "Tik Tik Tik"
---

* TOC
{:toc}

# Overview
I love learning about older technology and how it worked to solve a problem that was present in that era. My inner nerd thought it'd be cool to make a simple speaking clock that would announce the time in a similar way to the old speaking clocks that were used in the UK.

Wikipedia: [https://en.wikipedia.org/wiki/Speaking_clock](https://en.wikipedia.org/wiki/Speaking_clock)

BBC: [https://www.bbc.co.uk/news/magazine-14198506](https://www.bbc.co.uk/news/magazine-14198506)

Telephones UK: [https://telephonesuk.org.uk/speaking-clock/](https://telephonesuk.org.uk/speaking-clock)

# Plan
The plan was:

- Get the time from a NTP server
- Attempt to support multiple languages
- Use text-to-speech to announce the time
- Stream the audio using Icecast or similar
- Keep the audio as similar to the original speaking clock as possible
- Try and keep the clock as accurate as possible (Bit ambitious with using TTS)

# End-Result
It speaks! It streams! And it works! Main difficulty was getting the timing right with the text-to-speech engine and broadcasting that. It's around 10 seconds out but good enough for now.

As I write this, I'm still in the process of getting a Docker image created for this. Currently having disk space issues due to the size of the TTS models.

Important to note as well, this wasn't "vibe" coded. I'm sure GenAI could have crapped this out in a few minutes, but it's cool to do things by yourself sometimes. 

# Resources

Github Repository: [https://github.com/rexchoppers/tik-tik-tik](https://github.com/rexchoppers/tik-tik-tik)