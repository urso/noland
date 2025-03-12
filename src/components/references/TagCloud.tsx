"use client";

import { useEffect, useState } from 'react';

interface KeywordCount {
  [keyword: string]: number;
}

export default function TagCloud() {
  const [keywordCounts, setKeywordCounts] = useState<KeywordCount>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKeywordCounts = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/keywords/counts');
        if (!response.ok) {
          throw new Error('Failed to fetch keyword counts');
        }
        const data = await response.json();
        setKeywordCounts(data);
      } catch (error) {
        console.error('Error fetching keyword counts:', error);
        setError('Failed to load keywords. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeywordCounts();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <h2 className="text-lg font-medium mb-3">Popular Keywords</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg shadow-sm">
        <h2 className="text-lg font-medium mb-3">Popular Keywords</h2>
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  // Sort keywords by count (descending)
  const sortedKeywords = Object.entries(keywordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50); // Limit to top 50 keywords

  // Calculate font sizes based on counts
  const maxCount = sortedKeywords.length > 0 ? sortedKeywords[0][1] : 0;
  const minCount = sortedKeywords.length > 0 ? sortedKeywords[sortedKeywords.length - 1][1] : 0;
  
  const getFontSize = (count: number) => {
    if (maxCount === minCount) return 'text-sm';
    
    const minSize = 12;
    const maxSize = 20;
    const size = minSize + ((count - minCount) / (maxCount - minCount)) * (maxSize - minSize);
    
    if (size >= 18) return 'text-lg font-medium';
    if (size >= 16) return 'text-base font-medium';
    if (size >= 14) return 'text-sm font-medium';
    return 'text-xs';
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm">
      <h2 className="text-lg font-medium mb-3">Popular Keywords</h2>
      
      {sortedKeywords.length === 0 ? (
        <p className="text-gray-500">No keywords found.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {sortedKeywords.map(([keyword, count]) => (
            <span
              key={keyword}
              className={`${getFontSize(count)} bg-blue-50 text-blue-700 px-2 py-1 rounded-full cursor-pointer hover:bg-blue-100 transition-colors`}
              title={`${count} references`}
            >
              {keyword.replace(/_/g, ' ')}
              <span className="text-xs ml-1 text-blue-500">({count})</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 