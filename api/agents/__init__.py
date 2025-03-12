from typing import Any, List, Dict, Optional
import uuid
import asyncpg
from llama_index.core.llms import LLM
from llama_index.core.ingestion import IngestionCache, IngestionPipeline
from llama_index.core.schema import TransformComponent
from llama_index.core import StorageContext, VectorStoreIndex
from llama_index.core.chat_engine.types import BaseChatEngine
from llama_index.core.node_parser import SentenceSplitter
from llama_index.core.extractors import (
    KeywordExtractor,
    SummaryExtractor,
    TitleExtractor,
)
from llama_index.core.chat_engine.types import BaseChatEngine
from llama_index.storage.docstore.postgres import PostgresDocumentStore
from llama_index.storage.kvstore.postgres import PostgresKVStore
from llama_index.storage.index_store.postgres import PostgresIndexStore
from llama_index.storage.kvstore.postgres.base import params_from_uri
from llama_index.vector_stores.postgres import PGVectorStore
from llama_index.core.response_synthesizers import SimpleSummarize

import env
import agents.models as models
from agents.reader import MarkitDownReader
from agents.prompt import *
from agents.references import ReferenceStore, FetchError
from agents.keywords import KeywordsStore
import logging
logger = logging.getLogger(__name__)

class Models:
    def __init__(self, agent, embeddings, simple):
        self.agent = agent
        self.embeddings = embeddings
        self.simple = simple
        
    def get_llm(self, model_name: str | None = None) -> LLM:
        if model_name is None:
            return self.simple
        raise ValueError(f"Invalid model name: {model_name}")

class AI:
    storage: StorageContext
    transformations: list[TransformComponent]
    models: Models
    cache_store: PostgresKVStore
    ingest_pipeline: IngestionPipeline
    index: VectorStoreIndex
    references: ReferenceStore
    keywords: KeywordsStore

    def __init__(self, pg: Any, logger: logging.Logger):
        url = pg.database_url
        pg_params: dict[str, Any] = params_from_uri(url)
        pg_params["schema_name"] = "agentstore"
        
        self.pg = pg
        self.models = Models(
            embeddings=models.openai_embeddings,
            simple=models.openai_gpt4o_mini,
            agent=models.openai_gpt4o_mini,
        )

        self.storage = StorageContext.from_defaults(
            docstore=PostgresDocumentStore.from_params(
                table_name="documents",
                **pg_params,
            ),
            index_store=PostgresIndexStore.from_params(**pg_params, table_name="index"),
            graph_store=None,
            vector_store=PGVectorStore.from_params(**pg_params, table_name="vectors"),
            image_store=PGVectorStore.from_params(**pg_params, table_name="images"),
        )

        self.doc_transformations = [
            TitleExtractor(llm=self.models.simple),
            SummaryExtractor(llm=self.models.simple),
            KeywordExtractor(llm=self.models.simple),
        ]

        self.transformations = [
            SentenceSplitter(),
            SummaryExtractor(llm=models.openai_gpt4o_mini, summaries=["self"]),
            models.openai_embeddings,
        ]

        self.cache_store = PostgresKVStore.from_params(**pg_params, table_name="cache")
        self.ingest_pipeline = IngestionPipeline(
            transformations=self.transformations,
            vector_store=self.storage.vector_store,
            cache=IngestionCache(cache=self.cache_store),
            docstore=self.storage.docstore,
        )
        
        self.index = VectorStoreIndex(
            nodes=[],
            use_async=False,
            embed_model=self.models.embeddings,
            storage_context=self.storage,
            transformations=self.transformations,
            show_progress=True,
        )
        
        self.references = ReferenceStore(
            self.pg,
            self.models,
            self.cache_store,
            self.storage,
            self.ingest_pipeline,
            logger
        )
        self.keywords = KeywordsStore(self.pg)
        
    def get_llm(self, model_name: str | None = None) -> BaseChatEngine:
        llm = self.models.get_llm(model_name)
        return self.index.as_chat_engine(llm=llm)
    