import env

from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

openai_gpt4o_mini = OpenAI(
    model="gpt-4o-mini",
    api_key=env.OPENAI_API_KEY,
    temperature=0,
)

openai_embeddings = OpenAIEmbedding(api_key=env.OPENAI_API_KEY)
