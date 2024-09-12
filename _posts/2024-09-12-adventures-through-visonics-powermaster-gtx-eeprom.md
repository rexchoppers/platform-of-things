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

#### Random FTP Credentials
- 426, 0
- 425, 0
- 424, 0

For some reason these addresses return FTP credentials. I'm not sure why but I was able to access the FTP server using these credentials and came across messages, debug logs etc... from other alarm systems

#### Weird Gmail Credentials
- 394, 0
- 393, 0

To my surprise, I found some Gmail credentials stored in the EEPROM. The email returned: `msp5.2cpu.visonic@gmail.com`. Obviously I won't post the password here but I'm not sure why these credentials are in here. Even worse, I was able to attempt a log in to the account but was stopped by the security checks.

This is strange - Any sort of email I'd expect to be sent to a email address with the Visonic/Tyco/Johnson Controls domain.

#### Panel Display Name
- 355, 0

This address returns the panel display name. For my panel this returned: `SECURITY SYSTEM` so I assume you can edit this via the EEPROM.

#### Credentials? Nope
- 181, 0
- 181, 1
- 38, 0
- 37, 1

I was hoping to find some sort of credentials in the EEPROM but I was unable to find anything. I assume it's in a different location. These 2 addresses returned:

- 2234567890123456
- 3234567890123456

I saw somewhere that Visonic has some default encyrption keys but other reports say the encryption key is set between the Panel and PowerManage server. I'm not sure yet and I tried running these through a decryption tool. These might be correct encryption keys but I may be pushing through the wrong IV and vise versa.

# Next Up
I'll add more findings as I go along. I've tried creating a script to dump the entire EEPROM but I end up with the requests hanging. I presume the PowerLink module is rate limiting the requests or it simply can't handle them.

Next steps will be to setup Home Assistant and replace the PowerLink module with a Ethernet to RS232 adapter.

# Resources
- [Visonic PmaxService Docs](https://rexchoppers.github.io/visonic-pmaxservice-docs)
- [Visonic PmaxService Docs Github](https://github.com/rexchoppers/visonic-pmaxservice-docs)