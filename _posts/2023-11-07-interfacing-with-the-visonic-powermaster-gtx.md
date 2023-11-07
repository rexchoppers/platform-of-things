---
layout: post
title:  "Interfacing with the Visonic Powermaster GTX"
---

# Overview
After purchasing a Visonic Powermaster GTX alarm system (Previous post can be found [here](/2023/09/20/visonic-powermaster-gtx-compact-review)), I was pretty surprised to find a lack of service providers that would provide server hosting to use the Visonic Go mobile app. After not finding many solutions for self-hosting, I decided to start reverse engieering the JSON-RPC requests that are exposed on `http://<PANEL IP>:8181`

I was able to find the exposed port on 8181 with the help of NMAP: `sudo nmap -vvv -sS -p 1-65535 --max-retries=1 <Panel IP>`

The panel is connected with a pre-owned Visonic PowerLink3 (UK) IP Communicator Module 

To prevent filling this site with too much stuff, I've hosted the documentation on at: [https://rexchoppers.github.io/visonic-pmaxservice-docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)

# Conclusion
The site is still work in progress but I'm hoping to get it to a point where it's usable for others and most of the requests have been reverse engineered.

Also goes without saying but really, don't use this for anything other than personal use and on a local network

# Resources
- [Visonic PmaxService Docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)
- [Visonic PmaxService Docs Github](https://github.com/rexchoppers/visonic-pmaxservice-docs)