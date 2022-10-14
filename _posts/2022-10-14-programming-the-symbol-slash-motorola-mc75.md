---
layout: post
title:  "Programming The Symbol/Motorola MC75"
---

# Background
One of my first jobs "in the industry" was programming software for a fulfillment center near Wigan. It was a great place to work in terms of technology as a lot of the code you wrote was directly impacting throughput and performance of the warehouse. It also meant working with a few pieces of physical technology such as the [Cubiscan 100](https://cubiscan.com/cubiscan-100/); [Zebra GK420d label printers](https://www.thebarcodewarehouse.co.uk/barcode-printers-label-printers/desktop/GK42-202520-000/?ppc_keyword=&utm_term=&utm_campaign=All+Products&utm_source=adwords&utm_medium=ppc&hsa_acc=6299398270&hsa_cam=671071604&hsa_grp=36921298227&hsa_ad=144620662237&hsa_src=g&hsa_tgt=pla-58909121666&hsa_kw=&hsa_mt=&hsa_net=adwords&hsa_ver=3) and others bit of equipment that I might write about soon.

Most of the warehouse equipment had a lot of support and was fairly easy write code for. Until in October 2017, my manager decided to put one of these on my desk

![Symbol MC75](https://storage.googleapis.com/rexchoppers-website-assets/symbol-mc75-screen-on.jpeg "Symbol MC75"){: width="250" }

[Image Source](https://www.ebay.co.uk/itm/184071112608?mkevt=1&mkcid=1&mkrid=710-53481-19255-0&campid=5338703918&toolid=20006%26customid%3Ds%253AGS%253Bgc%253A{gclid}%253Bpt%253A1%253Bchoc%253A2&customid=s%3AGS%3Bgc%3A{gclid}%3Bpt%3A1%3Bchoc%3A1)

The warehouse had a single PC with a barcode scanner that they used for loading in/out items to/from couriers. Whilst this worked well for small parcels, pallets, large/heavy items would be an issue. The solution was to create an application on this device that would allow warehouse staff to easily load items in/out of the warehouse and from any loading bay. 

I had minimal production experience with .NET and C# at this point, but wanted a challenge so I went ahead with a prototype application for this device. All seemed to go well...Until I wanted to send a HTTP request to the API.

Note: I do not have permission to post my old employers code so any code I'll be posting will be from the initial open-source prototype we used as a proof of concept.

