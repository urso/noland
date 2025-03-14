from typing import Any

class KeywordsStore:
    def __init__(self, pg: Any):
        self.pg = pg
        
    async def async_list_keywords(self) -> list[str]:
        async with self.pg.pool.acquire() as conn:
            result = await conn.fetch('SELECT keyword FROM keywords')
            return [row['keyword'] for row in result]
        
    async def async_get_reference_keywords(self, reference_id: str) -> list[str]:
        async with self.pg.pool.acquire() as conn:
            result = await conn.fetch('''
                SELECT k.keyword 
                FROM keywords k
                JOIN references_keywords rk ON k.id = rk.keyword_id
                WHERE rk.reference_id = $1
            ''', reference_id)
            return [row['keyword'] for row in result]
        
    async def async_get_reference_ids_for_keywords(self, keywords: list[str]) -> list[str]:
        async with self.pg.pool.acquire() as conn:
            result = await conn.fetch('''
                SELECT rk.reference_id
                FROM references_keywords rk
                JOIN keywords k ON rk.keyword_id = k.id
                WHERE k.keyword = ANY($1)
            ''', keywords)
            return [row['reference_id'] for row in result]
        
    async def async_get_keywords_counts(self, selected_tags: list[str] = None) -> dict[str, int]:
        async with self.pg.pool.acquire() as conn:
            if selected_tags:
                result = await conn.fetch('''
                    WITH filtered_refs AS (
                        SELECT r.id
                        FROM "references" r
                        JOIN references_keywords rk ON r.id = rk.reference_id
                        JOIN keywords k ON rk.keyword_id = k.id
                        WHERE k.keyword = ANY($1)
                        GROUP BY r.id
                        HAVING COUNT(DISTINCT k.keyword) = $2
                    )
                    SELECT k.keyword, COUNT(DISTINCT rk.reference_id) as count
                    FROM keywords k
                    JOIN references_keywords rk ON k.id = rk.keyword_id
                    JOIN filtered_refs fr ON rk.reference_id = fr.id
                    GROUP BY k.keyword
                    ORDER BY count DESC
                ''', selected_tags, len(selected_tags))
                
                if not result:
                    return {}  # No references match all selected tags
            else:
                # Get all keyword counts if no tags are selected
                result = await conn.fetch('''
                    SELECT k.keyword, COUNT(rk.reference_id) as count
                    FROM keywords k
                    JOIN references_keywords rk ON k.id = rk.keyword_id
                    GROUP BY k.keyword
                    ORDER BY count DESC
                ''')
            
            return {row['keyword']: row['count'] for row in result}
