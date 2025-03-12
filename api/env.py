import os
from dotenv import load_dotenv

load_dotenv('.env.local')

def must_env(key: str) -> str:
    value = os.getenv(key)
    if value is None:
        raise ValueError(f"Environment variable {key} is not set")
    return value

# Get configuration from environment variables
PORT = int(os.getenv("PORT", 6666))
HOST = os.getenv("HOST", "0.0.0.0")
DEBUG = os.getenv("DEBUG", "false").lower() in ("true", "1", "t")
RELOAD = os.getenv("RELOAD", "true").lower() in ("true", "1", "t")

OPENAI_API_KEY: str = must_env("OPENAI_API_KEY")
POSTGRES_URL: str = must_env("POSTGRES_URL")
