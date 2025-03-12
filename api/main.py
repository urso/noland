from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
import uvicorn
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Union
from contextlib import contextmanager
from contextlib import asynccontextmanager
import logging
import asyncpg
from uuid import UUID
import datetime

import agents
import env

# Configure proper logging
logging.basicConfig(
    level=logging.INFO if env.DEBUG else logging.WARNING,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger("api")

async def init_connection(conn):
    """Initialize a database connection with custom type codecs"""
    try:
        # Register UUID type conversion
        await conn.set_type_codec(
            'uuid',
            encoder=lambda u: str(u),
            decoder=lambda s: s,
            schema='pg_catalog'
        )
        
        # Register timestamp type conversion - use the correct type name
        await conn.set_type_codec(
            'timestamptz',  # This is the correct type name for timestamp with time zone
            encoder=lambda dt: dt.isoformat() if dt else None,
            decoder=lambda s: s,
            schema='pg_catalog'
        )
        
        logger.debug("PostgreSQL type conversions registered for connection")
    except Exception as e:
        logger.error(f"Error registering PostgreSQL type codecs: {str(e)}")
        logger.exception(e)
        # Re-raise to ensure the connection initialization fails
        raise

class Postgres:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.pool = None

    async def connect(self):
        try:
            logger.info("Creating connection pool to PostgreSQL")
            self.pool = await asyncpg.create_pool(
                self.database_url,
                init=init_connection,  # Use the init callback for each new connection
                min_size=2,            # Minimum number of connections
                max_size=10            # Maximum number of connections
            )
            logger.info("Connection pool created successfully with type codecs")
        except Exception as e:
            logger.error(f"Error connecting to PostgreSQL: {str(e)}")
            logger.exception(e)
            # Re-raise to ensure the application fails to start if the database connection fails
            raise

    async def disconnect(self):
        if self.pool:
            try:
                logger.info("Closing PostgreSQL connection pool")
                await self.pool.close()
                logger.info("PostgreSQL connection pool closed")
            except Exception as e:
                logger.error(f"Error closing PostgreSQL connection pool: {str(e)}")
                logger.exception(e)
        
database = Postgres(env.POSTGRES_URL)

# Initialize AI with the proper logger
ai = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Connect to the database when the app starts
        logger.info("Connecting to database...")
        await database.connect()
        logger.info("Database connected")
        
        # Initialize AI
        logger.info("Initializing AI...")
        global ai
        ai = agents.AI(database, logger)
        logger.info("AI initialized")
        
        yield
    except Exception as e:
        logger.error(f"Error during application startup: {str(e)}")
        logger.exception(e)
        raise
    finally:
        # Close database connection when the app shuts down
        logger.info("Disconnecting from database...")
        await database.disconnect()
        logger.info("Database disconnected")

app = FastAPI(
    title="AI Chat API",
    description="FastAPI backend for the AI Chat App",
    version="0.1.0",
    debug=env.DEBUG,
    lifespan=lifespan
)


# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.middleware("http")
async def handle_http_exception(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        import traceback
        traceback.print_exc()
        logger.error(e)
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))
    

class ChatRequest(BaseModel):
    messages: List[agents.Message]
    

@app.post("/api/chat")
async def chat(request: ChatRequest):
    messages = request.messages
    if len(messages) == 0:
        raise HTTPException(status_code=400, detail="No messages provided")

    query = ''
    msg, history = messages[-1], [msg.to_chatmessage() for msg in messages[:-1]]
    if not isinstance(msg, agents.CoreUserMessage):
        history.append(msg.to_chatmessage())
    else:
        query = msg.content_str()

    print(messages)
    messages = [msg.to_chatmessage() for msg in messages]
    print(messages)
    
    chat = ai.get_llm()
    response = await chat.astream_chat(query, chat_history=history)
    streaming = StreamingResponse(response.async_response_gen())
    streaming.headers['x-vercel-ai-data-stream'] = 'v1'
    return streaming
    
class ReferenceRequest(BaseModel):
    type: str
    contents: str

class ReferenceResponse(BaseModel):
    id: str
    type: str
    title: str | None = None
    summary: str | None = None
    source: str | None = None
    indexed: bool
    created_at: str
    contents: str | None = None
    keywords: List[str] | None = None
    
@app.get("/api/references")
async def get_references(keywords: str | None = None) -> List[ReferenceResponse]:
    """Get all references, optionally filtered by keywords"""
    logger.info(f"Getting references with keywords filter: {keywords}")
    keyword_list = keywords.split(',') if keywords else None
    return await ai.references.async_list(keywords=keyword_list)

@app.get("/api/references/{reference_id}")
async def get_reference(reference_id: str, contents: bool = False) -> ReferenceResponse:
    """Get a specific reference by ID"""
    logger.info(f"Getting reference with ID: {reference_id}, include_contents: {contents}")
    reference = await ai.references.async_get_reference(reference_id, include_contents=contents)
    if reference is None:
        raise HTTPException(status_code=404, detail="Reference not found")
    if "contents" in reference:
        logger.info(f"Contents: {reference['contents']}")
    return reference

@app.get("/api/references/{reference_id}/keywords")
async def get_reference_keywords(reference_id: str) -> List[str]:
    """Get keywords for a specific reference by ID"""
    logger.info(f"Getting keywords for reference with ID: {reference_id}")
    keywords = await ai.keywords.async_get_reference_keywords(reference_id)
    return keywords

@app.get("/api/references/{reference_id}/contents")
async def get_reference_contents(reference_id: str) -> str:
    """Get contents for a specific reference by ID"""
    logger.info(f"Getting contents for reference with ID: {reference_id}")
    contents = await ai.references.async_get_reference_contents(reference_id)
    return contents

@app.post("/api/references/add", response_model=ReferenceResponse)
async def add_reference(request: ReferenceRequest):
    """Add a new reference"""
    logger.info(f"Adding reference of type: {request.type}")
    if request.type == "url":
        reference = await ai.references.async_add_url(request.contents)
        return reference
    else:
        raise HTTPException(status_code=400, detail="Invalid reference type, must be 'url'")

@app.delete("/api/references/{reference_id}")
async def delete_reference(reference_id: str):
    """Delete a reference by ID"""
    logger.info(f"Deleting reference with ID: {reference_id}")
    
    await ai.references.async_delete_reference(reference_id)
    return {"status": "success"}

@app.post("/api/references/{reference_id}/reindex", response_model=ReferenceResponse)
async def reindex_reference(reference_id: str):
    """Reindex a reference by ID"""
    logger.info(f"Reindexing reference with ID: {reference_id}")
    reference = await ai.references.async_get_reference(reference_id)
    if reference is None:
        raise HTTPException(status_code=404, detail="Reference not found")
    
    reindexed = await ai.references.async_reindex_reference(reference_id)
    return reindexed

@app.get("/api/keywords/counts")
async def get_keywords_counts() -> dict[str, int]:
    """Get counts of keywords in references"""
    logger.info("Getting keyword counts")
    return await ai.keywords.async_get_keywords_counts()
    
if __name__ == "__main__":
    print(f"Starting server on http://{env.HOST}:{env.PORT}")
    print(f"Debug mode: {env.DEBUG}")
    print(f"Hot reload: {env.RELOAD}")

    # Configure Uvicorn with hot reloading
    uvicorn.run(
        "main:app",
        host=env.HOST,
        port=env.PORT,
        reload=env.RELOAD,
        reload_dirs=["./"],  # Watch the current directory for changes
        log_level="info" if env.DEBUG else "warning",
    )
