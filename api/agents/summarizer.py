from typing import Any, List

from llama_index.core.extractors import (
    KeywordExtractor,
    SummaryExtractor,
    TitleExtractor,
)
from llama_index.core.ingestion import IngestionCache, IngestionPipeline
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.schema import Document
from llama_index.core.tools.tool_spec.base import BaseToolSpec

# if __name__ == "__main__":
from llama_index.readers.wikipedia import WikipediaReader
from llama_index.storage.kvstore.postgres import PostgresKVStore
from llama_index.storage.kvstore.postgres.base import params_from_uri
from llama_index.vector_stores.postgres import PGVectorStore

import agents.models as models
import env
from agents.wiki import WikipediaToolSpec

PostgresCacheStore = PostgresKVStore


from llama_index.core import DocumentSummaryIndex, StorageContext, VectorStoreIndex
from llama_index.storage.docstore.postgres import PostgresDocumentStore
from llama_index.storage.index_store.postgres import PostgresIndexStore

text = """
    A large language model (LLM) is a type of machine learning model designed for natural language processing tasks such as language generation. LLMs are language models with many parameters, and are trained with self-supervised learning on a vast amount of text.

    The largest and most capable LLMs are generative pretrained transformers (GPTs). Modern models can be fine-tuned for specific tasks or guided by prompt engineering.[1] These models acquire predictive power regarding syntax, semantics, and ontologies[2] inherent in human language corpora, but they also inherit inaccuracies and biases present in the data they are trained in.[3]
"""

reader = WikipediaToolSpec()
documents = reader.load_data(pages=["Albert Einstein"])

pg_params = params_from_uri(env.POSTGRES_URL)
pg_params["schema_name"] = "agentstore"

cache_store = PostgresCacheStore.from_params(**pg_params, table_name="cache")
storage = StorageContext.from_defaults(
    docstore=PostgresDocumentStore.from_params(**pg_params, table_name="documents"),
    index_store=PostgresIndexStore.from_params(**pg_params, table_name="index"),
    graph_store=None,
    vector_store=PGVectorStore.from_params(**pg_params, table_name="vectors"),
    image_store=PGVectorStore.from_params(**pg_params, table_name="images"),
)

transformations = [
    SentenceSplitter(),
    TitleExtractor(llm=models.openai_gpt4o_mini),
    SummaryExtractor(llm=models.openai_gpt4o_mini, summaries=["self"]),
    KeywordExtractor(llm=models.openai_gpt4o_mini),
    models.openai_embeddings,
]

ingest_pipeline = IngestionPipeline(
    transformations=transformations,
    vector_store=storage.vector_store,
    cache=IngestionCache(cache=cache_store),
    docstore=storage.docstore,
)

# index = DocumentSummaryIndex(pipeline=pipeline)
index = VectorStoreIndex(
    nodes=[],
    use_async=True,
    embed_model=models.openai_embeddings,
    storage_context=storage,
    transformations=transformations,
    show_progress=True,
)

chat = index.as_chat_engine(
    llm=models.openai_gpt4o_mini,
    mode="openai",
)
