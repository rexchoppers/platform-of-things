---
layout: post
title:  "Adventures Through Visonic's Powermaster GTX EEPROM"
---

# Overview
In late 2023, I purchased a  Powermaster GTX alarm system which so far has been a great little system for my home (Previous post can be found [here](/2023/09/20/visonic-powermaster-gtx-compact-review)).

Shortly afterwards, I also bought a Powerlink 3.1 module of eBay for £30 which means the panel is now able to connect to the internet and be controlled via the Visonic Go mobile app. The Powerlink module exposed a JSON-RPC API on port 8181 which I started to document at: [https://rexchoppers.github.io/visonic-pmaxservice-docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)

I'm currently using Visonic (Tyco's) free PowerManage server that allows you to connect your panel to the internet and control it via the Visonic Go mobile app. However, I'm not a fan of the fact that the panel is now reliant on a third party server to function. So I've done a bit of digging and whilst I don't have a solution yet, I'm hoping to find a way to create some self-hosted alternatives to the PowerManage server. Either that or use home assistant.

I've still been unable to find anything relating to encryption keys or the like, but I assume a lot of the inner workings are proprietary and not easily accessible.

# Mildy Interesting Findings

All requests were sent using the built in API client in the Powerlink module. The API client is a simple JSON-RPC client that sends requests to the Powerlink module on port 8181.

URL: `POST http://<PANEL IP>:8181/remote/json-rpc`

```json
{
    "params": [
      234, // Memory address?
      53, // Index of the item?
      10000 // Timeout?
    ],
    "jsonrpc": "2.0",
    "method": "PmaxService/getEepromItem",
    "id": 1
}
```

## Random FTP Credentials
- 426, 0
- 425, 0
- 424, 0

For some reason these addresses return FTP credentials. I'm not sure why but I was able to access the FTP server using these credentials and came across messages, debug logs etc... from other alarm systems








# Conclusion


# Resources
- [Visonic PmaxService Docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)
- [Visonic PmaxService Docs Github](https://github.com/rexchoppers/visonic-pmaxservice-docs)