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

# What's needed?
So doing some research, I needed the following:

- A pre-trained model that won't destroy my computer: I chose Phi-3-mini, which is a smaller version of the Phi-3 model.
- A FastAPI project. Easy enough to setup.
- A fair bit of data to give to the model.
- A vector database to store the data and allow for quick retrieval. I used Qdrant - Easy enough to set up.

# 1. Boilerplate FastAPI Project
Boilerplate FastAPI project is easy enough to set up. An endpoint for querying the model. This AI Stuff is ready right?

**main.py**
```python
@app.post("/q")
async def query(query: Query):
    # Logic will come in here later on
```

# 2. Setup the database
Qdrant is a vector database that allows you to store and retrieve vectors efficiently. It's fairly easy to use and setup.

**db/qdrany.py**
```python
import os

from qdrant_client import QdrantClient

qdrant = QdrantClient(
    host=os.getenv("QDRANT_HOST", "localhost"),
    port=int(os.getenv("QDRANT_PORT", "6333")),
    api_key=os.getenv("QDRANT_API_KEY", None),
    https=os.getenv("QDRANT_HTTPS", "False").lower() == "true",
)
```

**docker-compose.yml**
```yml
services:
  qdrant:
    image: qdrant/qdrant:latest
    container_name: qdrant
    ports:
      - "6333:6333"
    restart: unless-stopped
```

Easy enough.

# 3. Load the data

