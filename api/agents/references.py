from typing import Any, List, Dict, Optional
import uuid
import logging
import datetime
import asyncio
from llama_index.core.schema import Document
from llama_index.core.ingestion import IngestionCache, IngestionPipeline
from llama_index.core import StorageContext
from llama_index.core.extractors import (
    KeywordExtractor,
    SummaryExtractor,
    TitleExtractor,
)
from llama_index.core.response_synthesizers import TreeSummarize
from llama_index.storage.kvstore.postgres import PostgresKVStore
from llama_index.core.node_parser import SentenceSplitter

from agents.reader import MarkitDownReader
import agents.models as models
from agents.keywords import KeywordsStore

class FetchError(Exception):
    def __init__(self, url: str, message: str):
        self.url = url
        self.message = message
        super().__init__(f"Failed to fetch url: {url} - {message}")

class ReferenceStore:
    pg_pool: Any
    storage: StorageContext
    ingest_pipeline: IngestionPipeline
    logger: logging.Logger
    models: Any
    cache_store: PostgresKVStore

    def __init__(
        self,
        pg: Any,
        models: Any,
        cache_store: PostgresKVStore,
        storage: StorageContext,
        ingest_pipeline: IngestionPipeline,
        logger: logging.Logger,
    ):
        self.pg = pg
        self.storage = storage
        self.ingest_pipeline = ingest_pipeline
        self.models = models
        self.logger = logger
        self.cache_store = cache_store
        
    async def async_list(self, include_contents: bool = False, keywords: List[str] | None = None) -> List[Dict[str, Any]]:
        """List all references from the database"""
        self.logger.info("Listing references")
        try:
            # Build SELECT clause based on whether contents is requested
            select_fields = "id, type, source, title, summary, indexed, created_at"
            if include_contents:
                select_fields += ", contents"
                
            async with self.pg.pool.acquire() as conn:
                if keywords:
                    # Join with reference_keywords table and filter by keywords
                    result = await conn.fetch(f'''
                        SELECT DISTINCT r.{select_fields}
                        FROM "references" r
                        INNER JOIN references_keywords rk ON r.id = rk.reference_id
                        INNER JOIN keywords k ON rk.keyword_id = k.id
                        WHERE k.keyword = ANY($1)
                        GROUP BY r.id, r.{select_fields}
                        HAVING COUNT(DISTINCT k.keyword) = array_length($1, 1)
                        ORDER BY r.created_at DESC
                    ''', keywords)
                else:
                    result = await conn.fetch(f'SELECT {select_fields} FROM "references" ORDER BY created_at DESC')
                references = [self._normalize_reference(dict(row)) for row in result]
                self.logger.info(f"Found {len(references)} references")
                return references
        except Exception as e:
            self.logger.error(f"Error listing references: {str(e)}")
            self.logger.exception(e)  # Log the full exception with traceback
            return []
        
    async def async_add_url(self, url: str) -> Dict[str, Any]:
        """Add a URL reference to the database and process it"""
        self.logger.info(f"Adding URL reference: {url}")
        try:
            # Check if the URL already exists. We want to return if it is already indexed, otherwise we read the contents from the DB record
            reference = await self.async_get_reference_by_url(url)
            if reference:
                self.logger.info(f"URL already exists: {url}")
                if not reference["indexed"]:
                    # If it exists but is not indexed, trigger background indexing
                    asyncio.create_task(self._index_reference(reference))
                return reference
            
            # URL doesn't exist, fetch and create a new reference
            self.logger.info(f"URL does not exist: {url}")
            reader = MarkitDownReader()
            contents = reader.load_data(url)
            reference_id = str(uuid.uuid4())

            # Insert unindexed reference into DB
            async with self.pg.pool.acquire() as conn:
                result = await conn.fetchrow(
                    'INSERT INTO "references" (id, type, source, contents) VALUES ($1, $2, $3, $4) RETURNING *',
                    reference_id, "url", url, contents.text
                )
                reference = self._normalize_reference(dict(result))
            
            # Start indexing in the background
            asyncio.create_task(self._index_reference(reference))
            
            # Return the unindexed reference immediately
            return reference
            
        except Exception as e:
            self.logger.error(f"Error adding URL reference: {str(e)}")
            self.logger.exception(e)
            raise
        
    async def async_reindex_reference(self, reference_id: str) -> Dict[str, Any]:
        """Reindex a reference by ID"""
        self.logger.info(f"Reindexing reference: {reference_id}")
        try:
            reference = await self.async_get_reference(reference_id)
            if reference is None:
                self.logger.error(f"Reference not found: {reference_id}")
                raise ValueError(f"Reference not found: {reference_id}")
            
            # Mark as unindexed first
            async with self.pg.pool.acquire() as conn:
                await conn.execute(
                    'UPDATE "references" SET indexed = false WHERE id = $1',
                    reference_id
                )
                
            # Get the updated reference
            reference = await self.async_get_reference(reference_id)
            
            if reference["type"] == "url":
                # Fetch and process the URL again
                reader = MarkitDownReader()
                contents = reader.load_data(reference["source"])
                
                # Update the contents in the database
                async with self.pg.pool.acquire() as conn:
                    await conn.execute(
                        'UPDATE "references" SET contents = $2 WHERE id = $1',
                        reference_id, contents.text
                    )
                
                # Get the updated reference
                reference = await self.async_get_reference(reference_id)
            
            # Start indexing in the background
            asyncio.create_task(self._index_reference(reference))
            
            # Return the current reference immediately
            return reference
            
        except Exception as e:
            self.logger.error(f"Error reindexing reference: {str(e)}")
            self.logger.exception(e)
            raise
        
    async def _index_reference(self, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Index a reference"""
        try:
            self.logger.info(f"Starting indexing for reference: {reference['id']}")
            doc = Document(id_=str(reference["id"]), text=reference["contents"])
            reference_id = reference["id"]
            
            nodes_transformations = [
                SentenceSplitter(),
                TitleExtractor(llm=self.models.simple, max_tokens=40),
                SummaryExtractor(llm=self.models.simple, summaries=["self"], max_tokens=250),
                KeywordExtractor(llm=self.models.simple, max_tokens=100),
                models.openai_embeddings,
            ]
            nodes_pipeline = IngestionPipeline(
                transformations=nodes_transformations,
                cache=IngestionCache(cache=self.cache_store),
                docstore=self.storage.docstore,
                vector_store=self.storage.vector_store,
            )
            
            # Process the document
            nodes = await nodes_pipeline.arun(documents=[doc], show_progress=True)
            self.logger.info(f"Nodes computed for reference: {reference_id}")
            
            # Extract keywords from all nodes
            keywords = set()
            for node in nodes:
                if "excerpt_keywords" in node.metadata:
                    excerpt = node.metadata["excerpt_keywords"]
                    if excerpt.startswith("Keywords: "):
                        excerpt = excerpt[len("Keywords: "):]
                    for keyword in excerpt.split(","):
                        keyword = _normalize_keyword(keyword)
                        if keyword:  # Skip empty keywords
                            keywords.add(keyword)

            self.logger.info(f"Keywords extracted from reference {reference_id}: {keywords}")

            tree_summarizer = TreeSummarize(llm=self.models.simple, use_async=True)
            summary = await tree_summarizer.aget_response(
                "Summarize the following text",
                [doc.text],
                max_tokens=250,
            )
            
            title = None
            if nodes:
                title = nodes[0].metadata["document_title"]

            async with self.pg.pool.acquire() as conn:
                # Start a transaction
                async with conn.transaction():
                    # Update the reference
                    await conn.execute(
                        'UPDATE "references" SET title = $2, summary = $3, indexed = true WHERE id = $1',
                        reference_id,
                        title,
                        summary,
                    )
                    
                    # Store keywords
                    if keywords:
                        # First, clear any existing keywords for this reference
                        await conn.execute(
                            'DELETE FROM "references_keywords" WHERE reference_id = $1',
                            reference_id
                        )
                        
                        # Insert or get keywords
                        for keyword in keywords:
                            # Get existing keyword or insert new one
                            keyword_row = await conn.fetchrow(
                                'INSERT INTO "keywords" (keyword) VALUES ($1) ON CONFLICT (keyword) DO NOTHING RETURNING id',
                                keyword
                            )
                            
                            # Get the keyword ID from the insert/get operation above
                            keyword_id = keyword_row['id'] if keyword_row else await conn.fetchval(
                                'SELECT id FROM keywords WHERE keyword = $1',
                                keyword
                            )
                            
                            # Associate keyword with reference
                            await conn.execute(
                                'INSERT INTO "references_keywords" (reference_id, keyword_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                                reference_id,
                                keyword_id
                            )
            
            self.logger.info(f"Successfully indexed reference: {reference_id}")
            
            # Return the updated reference
            return await self.async_get_reference(reference_id)
        except Exception as e:
            self.logger.error(f"Error during indexing of reference {reference['id']}: {str(e)}")
            self.logger.exception(e)
            # Don't re-raise the exception since this is running in the background
            return reference
        
    async def async_delete_reference(self, reference_id: str) -> None:
        """Delete a reference by ID"""
        self.logger.info(f"Deleting reference: {reference_id}")
        try:
            # Delete the entries from the index store first
            await self.storage.vector_store.adelete_nodes(node_ids=[reference_id])
            await self.storage.docstore.adelete_document(reference_id)

            async with self.pg.pool.acquire() as conn:
                # The references_keywords entries will be deleted automatically due to CASCADE
                await conn.execute('DELETE FROM "references" WHERE id = $1', reference_id)
        except Exception as e:
            self.logger.error(f"Error deleting reference: {str(e)}")
            self.logger.exception(e)
            raise
        
    async def async_get_reference(self, reference_id: str, include_contents: bool = False, include_keywords: bool = True) -> Optional[Dict[str, Any]]:
        resp = await self.async_get_references([reference_id], include_contents=include_contents, include_keywords=include_keywords)
        return resp[0] if resp else None
    
    async def async_get_references(self, reference_ids: List[str], include_contents: bool = False, include_keywords: bool = False) -> List[Dict[str, Any]]:
        """Get references by IDs"""
        keywords_store = KeywordsStore(self.pg)
        async with self.pg.pool.acquire() as conn:
            # Build the SELECT clause based on whether contents is requested
            select_fields = "id, type, source, title, summary, indexed, created_at"
            if include_contents:
                select_fields += ", contents"
                
            results = await conn.fetch(f'''
                SELECT {select_fields}
                FROM "references" 
                WHERE id = ANY($1)
            ''', reference_ids)
            references = []
            
            for result in results:
                reference = self._normalize_reference(dict(result))
                
                # Get keywords for this reference if requested
                if include_keywords:
                    keywords = await keywords_store.async_get_reference_keywords(reference["id"])
                    if keywords:
                        reference["keywords"] = keywords
                references.append(reference)
            return references

    async def async_get_reference_contents(self, reference_id: str) -> Optional[str]:
        """Get the contents of a reference"""
        async with self.pg.pool.acquire() as conn:
            result = await conn.fetchrow('SELECT contents FROM "references" WHERE id = $1', reference_id)
            return result['contents'] if result else None
                

    async def async_get_reference_by_url(self, url: str) -> Optional[Dict[str, Any]]:
        """Get a specific reference by URL"""
        async with self.pg.pool.acquire() as conn:
            result = await conn.fetchrow('SELECT * FROM "references" WHERE type = $1 AND source = $2 LIMIT 1', "url", url)
            if result is None:
                return None
            reference = self._normalize_reference(dict(result))
            
            # Get keywords for this reference
            keywords = await self._get_reference_keywords(reference["id"])
            if keywords:
                reference["keywords"] = keywords
                
            return reference
    
    async def _get_reference_keywords(self, reference_id: str) -> List[str]:
        """Get keywords for a reference"""
        async with self.pg.pool.acquire() as conn:
            rows = await conn.fetch('''
                SELECT k.keyword 
                FROM keywords k
                JOIN references_keywords rk ON k.id = rk.keyword_id
                WHERE rk.reference_id = $1
                ORDER BY k.keyword
            ''', reference_id)
            return [row['keyword'] for row in rows]
        
    def _normalize_reference(self, reference: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize the reference data for JSON serialization"""
        if not reference:
            return reference
        
        # Create a copy to avoid modifying the original
        result = dict(reference)
            
        # Convert UUID to string
        if "id" in result and result["id"] is not None:
            try:
                result["id"] = str(result["id"])
            except Exception as e:
                self.logger.warning(f"Error converting UUID to string: {str(e)}")
            
        # Convert datetime to ISO format string
        if "created_at" in result and result["created_at"] is not None:
            try:
                if isinstance(result["created_at"], datetime.datetime):
                    result["created_at"] = result["created_at"].isoformat()
                elif not isinstance(result["created_at"], str):
                    result["created_at"] = str(result["created_at"])
            except Exception as e:
                self.logger.warning(f"Error converting datetime to string: {str(e)}")
                
        # Ensure boolean fields are properly typed
        if "indexed" in result and result["indexed"] is not None:
            try:
                result["indexed"] = bool(result["indexed"])
            except Exception as e:
                self.logger.warning(f"Error converting indexed to boolean: {str(e)}")
                
        return result
    
def _normalize_keyword(kw: str) -> str:
    """
    Normalize a keyword for storage
    keywords should be lowercase. Spaces and '-` symbols should be replaced with underscores.
    """
    return kw.strip().lower().replace(" ", "_").replace("-", "_")