---
layout: post
title:  "Unravelling Visonic Communication Protocol - Part 1"
---

# Overview
In late 2023, I purchased a  Powermaster GTX alarm system which so far has been a great little system for my home (Previous post can be found [here](/2023/09/20/visonic-powermaster-gtx-compact-review)).

Shortly afterwards, I also bought a Powerlink 3.1 module of eBay for £30 which means the panel is now able to connect to the internet and be controlled via the Visonic Go mobile app. The Powerlink module exposed a JSON-RPC API on port 8181 which I started to document at: [https://rexchoppers.github.io/visonic-pmaxservice-docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)

I'm currently using Visonic (Tyco's) free PowerManage server that allows you to connect your panel to the internet and control it via the Visonic Go mobile app. However, I'm not a fan of the fact that the panel is now reliant on a third party server to function. So I've done a bit of digging and whilst I don't have a solution yet, I'm hoping to find a way to create some self-hosted alternatives to the PowerManage server.

# 









I was pretty surprised to find a lack of service providers that would provide server hosting to use the Visonic Go mobile app. After not finding many solutions for self-hosting, I decided to start reverse engieering the JSON-RPC requests that are exposed on `http://<PANEL IP>:8181`

I was able to find the exposed port on 8181 with the help of NMAP: `sudo nmap -vvv -sS -p 1-65535 --max-retries=1 <Panel IP>`

The panel is connected with a pre-owned Visonic PowerLink3 (UK) IP Communicator Module 

To prevent filling this site with too much stuff, I've hosted the documentation on at: [https://rexchoppers.github.io/visonic-pmaxservice-docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)

# Conclusion
The site is still work in progress but I'm hoping to get it to a point where it's usable for others and most of the requests have been reverse engineered.

Also goes without saying but really, don't use this for anything other than personal use and on a local network

# Resources
- [Visonic PmaxService Docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)
- [Visonic PmaxService Docs Github](https://github.com/rexchoppers/visonic-pmaxservice-docs)