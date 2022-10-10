---
layout: post
title:  "Data Decoding With SDR"
---

# Background

Before I get into this, please please please check the laws in your country. Decoding data/messing with frequencies can land you in deep shit. All examples/code below has either been tested/performed in-line with local regulations or are completely theoretical.

I always had an idea that the airwaves are full of data but I never understood how much until I jumped into the world of scanning the airwaves and saw the amount of cool information that's available...But also some of the sensitive information that's being exposed including medical data (I found an article [here](https://techcrunch.com/2019/10/30/nhs-pagers-medical-health-data/?guccounter=1&guce_referrer=aHR0cHM6Ly93d3cuZ29vZ2xlLmNvbS8&guce_referrer_sig=AQAAAH3lnt2wh1_EiHl-P1IYWNd_09yITGiN48FHbUh_x6jhYyf4v10D0SOlp4WZlAgqXCyU-8z2t8m1jM7NzR_s3eO8uMC10uokbZX-XyIIXkAScypx6jEjjgOjT3P8qU4U2hqaDkLadWkuwudfU2zR5XcH0X7ObnKmy2Mii77_pPot) which truly explains how much information is being leaked)

Whilst my mum used to have a scanner and full setup up in the last back in the early 2000s, I was still a complete novice and ended up purchasing the **Nooelec NESDR SMArt v4 SDR** 

[Amazon](https://www.amazon.co.uk/Nooelec-NESDR-SMArt-SDR-R820T2-Based/dp/B01HA642SW/ref=asc_df_B01HA642SW/?tag=googshopuk-21&linkCode=df0&hvadid=310778830989&hvpos=&hvnetw=g&hvrand=15004920723387215845&hvpone=&hvptwo=&hvqmt=&hvdev=c&hvdvcmdl=&hvlocint=&hvlocphy=1006912&hvtargid=pla-403313148407&psc=1)

Incredibly easy to setup, worked with most devices I put it into (Usual PC, RaspberryPi)

# Looking for data
One of the most popular sources of information is the paging networks that are still in use. The networks are used by: 

- Fire fighters
- Local hospitals
- Ambulances
- Data centers
- RNLI
- Vets

[POCSAG Information](https://www.sigidwiki.com/wiki/POCSAG)

You can also get data sent from your car keys, weather stations, and even from buoys way out in the ocean

# A bit more on the UK paging networks
The data sent over paging networks is not encrypted so if decoded (Which you shouldn't do) can be revealed in plain text. However, with the reliability of paging, the low power usage for pagers themselves and the UK wide coverage, is it worth sending this data in plain text?

My friend in the Netherlands said when GDPR came into effect, they removed personal data from their networks instead, something the UK doesn't seem to have adopted yet especially in a medical setting. 

The following article from The BMJ [https://www.bmj.com/content/372/bmj.n684.full](https://www.bmj.com/content/372/bmj.n684.full) states that even though they planned to remove pagers from hospitals in 2021, they're still actively in use. And I believe that they want to replace these with smart phones or some alternative device...Some power hungry, non-resilient device in old concrete buildings. I'm skeptical.

I'm sure the problem here isn't the usefulness of pagers but the issue around encryption of data. In that case, this issue is already being solved [https://www.spok.com/solutions/paging-services/paging-devices/](https://www.spok.com/solutions/paging-services/paging-devices/)

# Decoding
For this example and since it's so well documented already, we'll pretend to decode a pager frequency.

First, you'll need to find a frequency so either Google or find a frequency that sounds like one of the following below

[POCSAG 512 bps](https://www.sigidwiki.com/images/b/b8/Pocsag5.mp3)

[POCSAG 1200 bps](https://www.sigidwiki.com/images/9/97/Pocsag12.mp3)

[POCSAG 2400 bps](https://www.sigidwiki.com/images/4/41/Pocsag24.mp3)

And now we can decode. There are plenty of articles on the internet with the same implementation as this. I'll re-iterate it on here for the sake of it though.

1. Install **RTL_FM**. I found [this](https://fuzzthepiguy.tech/rtl_fm-install/) tutorial very helpful for my RaspberryPi. RTL_FM will be the software that does the "listening"
2. Install **multimon-ng** from [Github](https://github.com/EliasOenal/multimon-ng) This will do the "decoding" for the data coming in
3. **MAKE SURE TO RESTART YOUR DEVICE IF YOU HAVEN'T ALREADY** 

Once the above is done, modify the below script and run it

```bash
#!/bin/bash

rtl_fm -f 153.350M -s 22050 -d 0 | multimon-ng -t raw -a POCSAG512 -a POCSAG1200 -a POCSAG2400 -a FLEX -a EAS -a FMSFSK -a AFSK1200 -a AFSK2400 -a AFSK2400_2 -a AFSK2400_3 -f alpha /dev/stdin
```

I added a ton more frequencies just for testing although for the paging frequencies you'll need **POCSAG512**, **POCSAG1200**, **POCSAG2400** or **FLEX**

As you can see, the raw data from **rtl_fm** is piped into **multimon-ng** for decoding and the result will show for us. I actually managed to get the above working in a GO application so any outputs can be stored and use later on (ONLY DO IF IT'S LEGAL. LAST TIME I'LL SAY IT)

```go
func main() {
      cmd := exec.Command("sh", "-c", "rtl_fm -f 153.350M -s 22050 -d 0 | multimon-ng -t raw -a POCSAG512 -a POCSAG1200 -a POCSAG2400 -a FLEX -a EAS -f alpha /dev/stdin")

      stdout, err := cmd.StdoutPipe()

      // Start the command
      err = cmd.Start()
	   fmt.Println("The command is running")
	   
      if err != nil {
         fmt.Println(err)
      }

      // Scan the output
      scanner := bufio.NewScanner(stdout)

      for scanner.Scan() {
         m := scanner.Text()

         // This removes any rubbish or decoding mistakes that resulted in an empty string
         if len(m) <= 0 {
            continue
         }

         // Save stuff down here!
      }
}
```

# Conclusion
Whilst learning everything about radio has been fun, I unfortunately can't do much more with it due to the legal issues. Maybe I'll do something in a lab setting one day. But for now, happy decoding (If you can...)