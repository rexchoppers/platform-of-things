---
layout: post
title:  "Programming The Symbol MC70"
---

# Background
One of my first jobs "in the industry" was programming software for a fulfillment center near Wigan. It was a great place to work in terms of technology as a lot of the code you wrote was directly impacting throughput and performance of the warehouse. It also meant working with a few pieces of physical technology such as the [Cubiscan 100](https://cubiscan.com/cubiscan-100/); [Zebra GK420d label printers](https://www.thebarcodewarehouse.co.uk/barcode-printers-label-printers/desktop/GK42-202520-000/?ppc_keyword=&utm_term=&utm_campaign=All+Products&utm_source=adwords&utm_medium=ppc&hsa_acc=6299398270&hsa_cam=671071604&hsa_grp=36921298227&hsa_ad=144620662237&hsa_src=g&hsa_tgt=pla-58909121666&hsa_kw=&hsa_mt=&hsa_net=adwords&hsa_ver=3) and others bit of equipment that I might write about soon.

Most of the warehouse equipment had a lot of support and was fairly easy write code for. Until in October 2017, my manager decided to put one of these on my desk

![Symbol MC70](https://storage.googleapis.com/rexchoppers-website-assets/symbol-mc70.jpeg "Symbol MC70"){: width="250" }

[Image Source](https://www.thebarcodewarehouse.co.uk/shop/motorola/motorola-discontinued-products/symbol-mc70/)

The warehouse had a single PC with a barcode scanner that they used for loading in/out items to/from couriers. Whilst this worked well for small parcels, pallets, large/heavy items were an issue. The solution was to create an application on this device that would allow warehouse staff to easily load items in/out of the warehouse and from any loading bay. 

I had minimal production experience with .NET and C# at this point, but wanted a challenge so I went ahead with a prototype application for this device. All seemed to go well...Until I wanted to send a HTTP request to the API.

Note: I do not have permission to post my old employers code so any code I'll be posting will be from the initial open-source prototype we used as a proof of concept.

# Getting Started
I'm unsure of the release date of this device but I'm pretty sure I was still in primary school at this point. None of the software would work on my usual PC so I had to use the following

#### Windows XP
The only choice I had was to use Windows XP in order to install all the relevant software. I grabbed the lowest spec computer, flashed a USB and installed Windows XP again.

Whilst there was an option to use a VM, the lag whilst programming would have driven me crazy compared to a separate machine and a KVM.

I was terrified about installing lots of old software on this PC and having it anywhere near the company's network, so builds were transferred via USB instead.

![Under my work's desk](https://storage.googleapis.com/rexchoppers-website-assets/windows-xp-machine.jpeg "Under my work's desk"){: width="250" }

#### Visual Studio 2005
With Windows XP installed, I managed to locate a free install of Visual Studio 2005 on a website.

The picture isn't very clear but subsequent photos will be better. This was a quick picture I took to mark my progress of the prototype

![Visual Studio 2005](https://storage.googleapis.com/rexchoppers-website-assets/visual-studio-2005.jpeg "Visual Studio 2005"){: width="250" }

#### FTP Server
We had the charging attachment for this device but nothing to connect it to the PC. We opted to use the on-prem Filezilla server to distribute builds 

#### A New Access Point
During this prototype, we found that the signal near the door wasn't the best causing network issues to occur. Wether this was down to the device not being great or the Wi-Fi in that area being poor, we opted to get another cheap AP installed for smoother operation (And to also prevent support tickets coming in)

# The Coding