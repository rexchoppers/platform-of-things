---
layout: post
title:  "VetGPT - RAG"
---

# Overview
I love AI. Will it take over my job one day? Probably. Like most jobs, at some point something will come along that will do it better than I can. I'll then either pivot, choose a different career or become a goose farmer. Who knows? But until then, I love how more efficient life and work has become. As a result, I've started delving into the technical side of AI (A bit late to the party but jumping on every trend until it becomes mainstream is a gamble. NFTs for example...)

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

# 3. Ingestion
To keep things simple, I decided to use a list of PDFs with vetinary related information and ingest them into the vector database. Few key bits to note:

- SentenceTransformers: This is used to convert the text into vectors (embeddings) that can be stored in the vector database. A great article on how this all works can be found [here](https://scaibu.medium.com/the-comprehensive-guide-to-vector-databases-and-qdrant-from-theory-to-production-ced44e4ae579).
- QdrantClient: This is used to interact with the Qdrant vector database.

The folder structure for the PDFs is as follows: 
```
vet-gpt/
    ├── resources/
    │   ├── procedures/
    │   │   ├── tplo
    │   │   │   ├── tplo.pdf
    │   │   │   └── tplo2.pdf
    └── main.py

```

The ingestion script will read the PDFs, tag the procedure from the folder structure, and then store the vectors in the Qdrant database.

**ingest/ingest_procedures.py**
```python
import uuid

from dotenv import load_dotenv
from pypdf import PdfReader
from qdrant_client.http.models import Distance, VectorParams
from sentence_transformers import SentenceTransformer

load_dotenv()

model = SentenceTransformer("all-MiniLM-L6-v2")

import sys
from pathlib import Path

# Add the project root to the Python path to allow importing from sibling directories
current_dir = Path(__file__).parent
project_root = current_dir.parent.resolve()
sys.path.insert(0, str(project_root))

# Now we can import from the db module
from db.qdrant import qdrant

# Get the absolute path to the procedures directory
current_dir = Path(__file__).parent
procedures_dir = (current_dir / ".." / "resources" / "procedures").resolve()

# Check if collection exists
if not qdrant.collection_exists("procedures"):
    print("Creating 'procedures' collection in Qdrant...")
    qdrant.create_collection(
        collection_name="procedures",
        vectors_config=VectorParams(
            size=384,
            distance=Distance.COSINE,
        )
    )
else:
    print("'procedures' collection already exists in Qdrant.")

# Iterate through each procedure directory
for procedure_dir in procedures_dir.iterdir():
    if procedure_dir.is_dir():
        procedure_name = procedure_dir.name
        print(f"Found procedure: {procedure_name}")

        # Iterate through files in the procedure directory
        for file_path in procedure_dir.glob("**/*"):
            if file_path.is_file():
                # If file ends with .txt, we can skip it
                if file_path.suffix.lower() == ".txt":
                    continue

                print(f"  - File: {file_path.relative_to(procedure_dir)}")

                pdf_reader = PdfReader(str(file_path))
                text = " ".join(page.extract_text() for page in pdf_reader.pages if page.extract_text())

                chunks = [text[i:i + 500] for i in range(0, len(text), 500)]

                for chunk in chunks:
                    embedding = model.encode(chunk).tolist()

                    qdrant.upsert(
                        collection_name="procedures",
                        points=[
                            {
                                "id": str(uuid.uuid4()),
                                "vector": embedding,
                                "payload": {
                                    "text": chunk,
                                    "procedure": procedure_name,
                                    "file_name": file_path.name,
                                    "source": "application/pdf"
                                }
                            }
                        ]
                    )

```

Messy at the moment as I want to abstract this to work with other topics such as medications, nutrition, etc. And eventually I want to support other file types such as images, videos, etc.

**Qdrant Dashboard**
![Qdrant Dashboard](https://storage.googleapis.com/rexchoppers-website-assets/vet-gpt-qdrant.png "Qdrant Dashboard")