---
layout: post
title:  "Apollo RT-760 Pager (138.075) MHz"
---

# Background

This particular pager was one of the physical devices I bought shortly after I made a simple pager with the RaspberryPi. My main aim was to buy a cheap device that I could use for several programs:

* Pager integration with OpsGenie
* Home paging network

Unlike the RFA-800WP Pager Watch, this particular pager was locked to one frequency.

Just a heads up, make sure you're following all the relevant laws in your area. Unauthorized broadcasting or interference can land you in deep shit.

# The pager

The pager I bought was from the following listing which can be found [here](https://www.ebay.co.uk/itm/125044580736) Similar to most pager models, I found that this particular model was a simple re-brand for PagersDirect.

From my research, I noticed this model of pager has been re-branded under many different names. Some examples are:

- [Interpage](https://iplp.com/products/enterprise-2-4-line-button-programmable-alphanumeric-pager/)
- [Visiplex](https://www.visiplex.com/product/alphanumeric-pager/)

The particular pager came with the following:

* 1 AAA Battery
* Plastic case
* Small chain for carrying
* A phone number to send a page to this device

As expected, when I tried to use the mobile number, I got knocked back with the message "This service is now closed" due to several providers shutting down their paging networks.

This device is currently locked to the frequency 138.075 MHz. Whilst older models (Post 2011) can have their frequency changed, older/locked models will have their frequency locked. 

This pager supports baud rates of 512, 1200 and 2400

# Pager configuration

Finding information for this device was incredibly difficult. No matter how much I looked on Google I could not find anything apart from a stray PDF document that provided some information how to get into the settings menu.

**View/Edit pager configuration**

* Turn the pager on if it isn't already
* Press ▲ and use the ► key to move to the ON/OFF PAGER option
* Press and hold both the ◄ and ► keys, a screen with the numbers "1234" will appear
* Use the ◄ and ► keys to move the cursor over each number and the ▲ to increment each numbers. With my device, I used the default of 0000. 
* Once done, press the GREEN button. A screen with "ADSYSBFRQT" will appear
* Each 2 characters is a separate menu
    * AD: Configure capcode/addresses
    * SY: System settings
    * SB: Not used anymore?
    * FR: Frequency setting (My device was built in 2008 and cannot be programmed)
    * QT: Save and quit

You should now be able to modify the address of the pager

**Update: 28th September 2022**
After doing some more research into these models, I managed to find a complete guide to programming these devices. I've stored down these PDFs for future use.

[RT760B 2013 Programming](https://storage.googleapis.com/rexchoppers-website-assets/pagers/RT760B-2013-programming.pdf)

[VP4 Pager Programming](https://storage.googleapis.com/rexchoppers-website-assets/pagers/vp4-pager-guide.pdf)


I'm still trying to find a way to program this specific device using a serial interface but cannot find anything so far.

**Sending a page using rpitx**

Once again be careful using this

```
echo -e "1923929:I LIKE THE COFFEE" | sudo ./pocsag -f "138075000" -b 3 -r 1200
```

**Other**

Most of the information on setting time etc... Can be found in the instruction booklet

# Images

**Home screen**

![Home screen](https://storage.googleapis.com/rexchoppers-website-assets/apollo-rt-760-pager-home-screen.jpeg "Home screen")

**Options screen**

![Programming: Page 1](https://storage.googleapis.com/rexchoppers-website-assets/apollo-rt-760-pager-options-screen.jpeg.jpeg "Options screen")

**Password screen**

![Password screen](https://storage.googleapis.com/rexchoppers-website-assets/apollo-rt-760-pager-password-screen.jpeg "Password screen")

**Configuration screen**

![Configuration screen](https://storage.googleapis.com/rexchoppers-website-assets/apollo-rt-760-pager-configuration-screen.jpeg "Configuration screen")
