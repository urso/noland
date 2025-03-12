from markitdown import MarkItDown
from llama_index.core.schema import Document
from llama_index.core.readers.base import BaseReader

class MarkitDownReader(BaseReader):
    def load_data(self, source: str) -> Document:
        md = MarkItDown()
        result = md.convert(source)
        doc = Document(text=result.text_content)
        doc.metadata["source"] = source
        return doc
