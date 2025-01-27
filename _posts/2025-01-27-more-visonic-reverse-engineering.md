---
layout: post
title:  "More Visonic Reverse Engineering"
---

# Overview
I'm still fed up with:

A: Not being able to decrypt SIA messages from the Visonic PowerMaster panels

B: Not providing enough contributions to the HomeAssistant Visonic integration

C: Still not a lot of API documentation for the Visonic PowerManage servers

They won't talk to me as a peasent end-user which I expected when I bought the panel.

# A: Decrypting SIA Messages
Still stuck - I'm searching everywhere for some sort of key or protocol. However, I hope the point below will help in my quest.

# B: Intercepting Serial Communication
I have instead took the decision to intercept the serial communication between the Visonic PowerMaster panel and the PowerLink3 module.

```
+---------------------------+
|        IDC1 (Panel)       |
|   [●●●●●●●●●●]            |
|      10-pin 2x5           |
+---------------------------+
         | | | | |         (Straight-through connections)
         | | | | |
+---------------------------+
|       Tapping Points      |  <-- Screw terminals or pin headers
|   Pin 4: TX  [●]          |  <-- Example: Tap panel TX
|   Pin 3: RX  [●]          |  <-- Example: Tap comms TX
|   Pin 2: GND [●]          |  <-- Common ground tap
|   ...                     |
|   Pin 10 [●]              |
+---------------------------+
         | | | | |
         | | | | |         (Straight-through connections)
+---------------------------+
|       IDC2 (Comms)        |
|   [●●●●●●●●●●]            |
|      10-pin 2x5           |
+---------------------------+
```

On the tapping points, I've used diodes to prevent backflow of current and then pipe the RX, TX and GND to a Ethernet-to-serial adapter.

- Breakout board: [https://czh-labs.com/products/czh-labs-dual-idc-10-pitch-20mm-male-header-terminal-block-breakout-board-281](https://czh-labs.com/products/czh-labs-dual-idc-10-pitch-20mm-male-header-terminal-block-breakout-board-281)

- Ethernet-to-serial adapter: Any "Serial TTL To RJ45 Ethernet Module Device USR-TCP232-T2" should do.

Various IDC cables and connectors can be found on AliExpress or eBay. I also had to buy a few 2.54mm pitch to 2.0mm pitch adapters to connect the breakout board to the Ethernet-to-serial adapter.

This approach is a bit of a bodge in order to intercept the serial communication between the panel and the PowerLink3 module. I'm hoping to use this to reverse engineer and contribute more to the HomeAssistant integration in future.

I've also noticed that the PowerLink3 module has some DBG points on the PCB which if I get brave enough, I might try to solder some wires to.

# C: Visonic PowerManage API
Using an old Android device with LineageOS, I've managed to intercept the API calls between the Visonic PowerManage app and the server. Whilst there's no encryption information, if you're interested in the API calls, you can find them at: [https://rexchoppers.github.io/visonic-pmaxservice-docs/](https://rexchoppers.github.io/visonic-pmaxservice-docs/)