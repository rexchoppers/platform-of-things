---
layout: post
title:  "RFA-800WP Pager Watch"
---

# Background

I've recently invested in several paging systems that are quite old but still useful Today. Whilst a lot of the paging networks have been taken down (Most notable Vodafone's network shut down - More info can be found [here](https://www.pagers.co.uk/pages/closure-of-vodafone-paging-network#:~:text=Earlier%20this%20year%20Vodafone%20announced,network%20on%2031st%20March%202018.&text=will%20no%20longer%20be%20able,paging%20services%20after%20that%20date.)

Whilst a lot of these networks have been closed down, pagers can still be used providing there is a transmitter and you know the CAPCODE/Address of the device.

Just a heads up, make sure you're following all the relevant laws in your area. Unauthorized broadcasting or interference can land you in deep shit.

# The pager

The pager I bought was from the following listing which can be found [here](https://www.ebay.co.uk/itm/125044595307?_trkparms=amclksrc%3DITM%26aid%3D111001%26algo%3DREC.SEED%26ao%3D1%26asc%3D20160908105057%26meid%3De15bd8ec7c5740daac51c278b6a481a1%26pid%3D100675%26rk%3D1%26rkt%3D15%26sd%3D125044595307%26itm%3D125044595307%26pmt%3D0%26noa%3D1%26pg%3D2380057&_trksid=p2380057.c100675.m4236&_trkparms=pageci%3A785d6ab5-3e7f-11ed-9102-628d81d4df8b%7Cparentrq%3A7fba7dc41830a7650d52d370fffea7c6%7Ciid%3A1) Considering this model is usually 75$ on some of the other sites I've found, £9 wasn't a bad price. It comes with the charger, instruction guide and everything else required to get started.

From my research, I noticed this model of pager has been re-branded under many different names. Some examples are:

- [Bridgemate](https://www.bridgemate.com/resources/documents/BMPagerManual.pdf)
- [Alphapoc](https://www.alphapoc-europe.de/epages/es754865.mobile/en_GB/?ObjectPath=/Shops/es754865/Products/801-W)

# Pager configuration

Most of my information I obtained from the Alphapoc website after using Google Lens on my phone to look for similar models and how to program them. I'll re-iterate these however as this information is only in the form of a listing so could potentially be removed at any point.

**View current pager configuration**
* Hold down ▲ and ▼ to see all the pager's current configuration

**Sending a page using rpitx**

Once again be careful using this

```
echo -e "1338888:I LIKE THE COFFEE" | sudo ./pocsag -f "459050000" -b 3 -r 512
```

**Programming**

* Press GREEN and ▲ for **3** seconds. A screen should appear asking you for a password.
* Depending on your device, the default password should be 0000. To move the cursor, use the ▲ and ▼. To modify the numbers, use • and ▬ If your password is 0000, just edit the last number from 0 to 9 and then back to 0, when you press ▼, this should then accept the password and present you with the programming screen.

From this screen, you can modify the addresses, frequencies, baud rates etc... I'd recommend using the baud rate of 512 as 1200/2400 crashed my device for some reason, so much so, I had to short the CPU pins to get it back into working order. (I think this was my mistake though)

* Press • on **PROGRAM** to program the changes to EPROM or press • on **EXIT** to exit without saving changes

**Other**

Most of the information on setting time etc... Can be found in the instruction booklet. Most of the controls are the exact same as my Apollo RT-760 pager

# Images

**Home screen**

![Home screen](https://storage.googleapis.com/rexchoppers-website-assets/general-screen.jpeg "Home screen")

**Password screen**

![Password screen](https://storage.googleapis.com/rexchoppers-website-assets/password-screen.jpeg "Password screen")

**Programming: Page 1**

![Programming: Page 1](https://storage.googleapis.com/rexchoppers-website-assets/programming-first-page.jpeg "Programming: Page 1")

**Programming: Page 2**

![Programming: Page 2](https://storage.googleapis.com/rexchoppers-website-assets/programming-second-page.jpeg "Programming: Page 2")
