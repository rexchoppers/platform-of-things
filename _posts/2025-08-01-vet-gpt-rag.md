---
layout: post
title:  "VetGPT - RAG"
---

# Overview
I love AI. Will it take over my job one day? Probably. Like most jobs, at some point something will come along that will do it better than I can. I'll then either pivot, choose a different career or become a goose farmer. Who knows? But until then, I love how more efficient life and work has become. As a result, I've started delving into the technical side of AI (A bit late to the party but jumping on every trend until it becomes mainstream is risky. NFTs for example...)

My dog has recently had TPLO surgery - She's doing fine but it provided some inspiration to create a RAG (Retrieval Augmented Generation) system that can answer questions about her surgery and recovery. This post will cover how I set up VetGPT.

This isn't a complete project yet and I've got many more areas to cover including fine-tuning the model, improving the user interface, integrating with other systems, and eventually get this into the cloud (Which weirdly I know a lot more about than doing this locally).

# RAG (Retrieval Augmented Generation)
Tuning a model takes time, electricity and a lot of money. RAG is a way to use a pre-trained model and augment it with your own data. This allows you to get the benefits of a custom model without the cost of training one from scratch.

You essentially have a pre-trained model that can answer general questions, and then you provide it with additional context or data to improve its responses for specific topics. In this case, the topic is anything veterinary related.

Think about it like this: You have a doctor who knows a lot about the human body. You wouldn't expect them to remember every single detail about every patient they've ever seen, right? Instead, they have access to medical records, research papers, and other resources that help them make informed decisions. RAG works in a similar way by providing the model with relevant information to enhance its understanding and responses.