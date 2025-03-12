from typing import Any
from llama_index.core.ingestion import IngestionPipeline
from llama_index.core.schema import Document


from llama_index.core.tools.tool_spec.base import BaseToolSpec


class WikipediaToolSpec(BaseToolSpec):
    """
    Tools for querying information from Wikipedia.
    """

    spec_functions = ["load_data", "search_data", "index_pages"]

    def load_data(
        self, pages: list[str], lang_prefix: str = "en", **load_kwargs: Any
    ) -> list[Document]:
        """
        Read pages from Wikipedia. Wikipedia is a free online encyclopedia. Access information from Wikipedia to gain insights on a wide range of topics.
        Get a WikipediaPage object for the page with given page titles.

        Args:
            pages (List[str]): List of pages to read.
            lang_prefix (str): Language prefix for Wikipedia. Defaults to English. Valid Wikipedia language codes
            can be found at https://en.wikipedia.org/wiki/List_of_Wikipedias.
        """
        import wikipedia

        if lang_prefix.lower() != "en":
            if lang_prefix.lower() in wikipedia.languages():
                wikipedia.set_lang(lang_prefix.lower())
            else:
                raise ValueError(
                    f"Language prefix '{lang_prefix}' for Wikipedia is not supported. Check supported languages at https://en.wikipedia.org/wiki/List_of_Wikipedias."
                )

        results = []
        for page in pages:
            wiki_page = wikipedia.page(page, **load_kwargs)
            page_content = wiki_page.content
            page_id = wiki_page.pageid
            doc = Document(id_=page_id, text=page_content)
            doc.metadata["url"] = (
                f"https://{lang_prefix}.wikipedia.org/?curid={doc.id_}"
            )
            results.append(doc)
        return results

    def search_data(self, query: str, lang: str = "en", results=10) -> list[Document]:
        """
        Search Wikipedia for a page related to the given query.
        Use this tool when `load_data` returns no results.

        Args:
            query (str): the string to search for
            lang (str): the language to search in
            results (int): the max number of pages to read
        """
        import wikipedia

        pages = wikipedia.search(query)
        if len(pages) == 0:
            return "No search results."
        return self.load_data(pages, lang)


class WikipediaIndexerToolSpec(BaseToolSpec):
    spec_functions = ["index_pages"]

    _ingest_pipeline: IngestionPipeline

    def __init__(self, ingest_pipeline: IngestionPipeline):
        self._ingest_pipeline = ingest_pipeline

    async def index_pages(
        self, pages: list[str], lang_prefix: str = "en", **load_kwargs: Any
    ) -> list[Document]:
        """
        Retrieve and index pages from Wikipedia. Index pages are summarized and
        can provide additional information in the future.

        Args:
            pages (list[str]): List of pages to read.
            lang_prefix (str): Language prefix for Wikipedia. Defaults to English. Valid Wikipedia language codes
            can be found at https://en.wikipedia.org/wiki/List_of_Wikipedias.
        """

        tool = WikipediaToolSpec()
        documents = tool.load_data(pages, lang_prefix, **load_kwargs)
        return self._ingest_pipeline.arun(documents=documents)
