"use client";

import { useEffect, useState } from 'react';

interface KeywordCount {
  [keyword: string]: number;
}

interface TagCloudProps {
  title?: string;
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  className?: string;
  fetchKeywords?: (selectedTags: string[]) => Promise<KeywordCount>;
  keywordCounts?: KeywordCount; // Static keyword counts
}

export default function TagCloud({ 
  title,
  selectedTags, 
  onTagToggle, 
  className = '',
  fetchKeywords,
  keywordCounts: staticKeywordCounts
}: TagCloudProps) {
  const [keywordCounts, setKeywordCounts] = useState<KeywordCount>(staticKeywordCounts || {});
  const [isLoading, setIsLoading] = useState(!staticKeywordCounts && !!fetchKeywords);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If static keyword counts are provided, use those instead of fetching
    if (staticKeywordCounts) {
      setKeywordCounts(staticKeywordCounts);
      setIsLoading(false);
      return;
    }

    // Only fetch if fetchKeywords is provided
    if (!fetchKeywords) {
      setKeywordCounts({});
      setIsLoading(false);
      return;
    }

    const fetchKeywordCounts = async () => {
      setIsLoading(true);
      try {
        const data = await fetchKeywords(selectedTags);
        setKeywordCounts(data);
      } catch (error) {
        console.error('Error fetching keyword counts:', error);
        setError('Failed to load keywords. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchKeywordCounts();
  }, [selectedTags, fetchKeywords, staticKeywordCounts]); // Re-fetch when selected tags, fetch function, or static counts change

  if (isLoading) {
    return (
      <div className={`p-4 flex flex-col ${className}`}>
        {title && <h2 className="text-lg font-medium mb-3">{title}</h2>}
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
      <div className={`p-4 flex flex-col ${className}`}>
        {title && <h2 className="text-lg font-medium mb-3">{title}</h2>}
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

  // Determine if a tag is selected
  const isTagSelected = (tag: string) => selectedTags.includes(tag);

  return (
    <div className={`p-4  flex flex-col ${className}`}>
      {title && <h2 className="text-lg font-medium mb-3">{title}</h2>}
      <h2 className="text-lg font-medium mb-3">
        {selectedTags.length > 0 && (
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Filtered)
          </span>
        )}
      </h2>
      
      {sortedKeywords.length === 0 ? (
        <p className="text-gray-500">
          {selectedTags.length > 0 
            ? "No matching keywords found with the current filter." 
            : "No keywords found."}
        </p>
      ) : (
        <div className="flex flex-wrap gap-2 overflow-y-auto flex-grow pr-1">
          {sortedKeywords.map(([keyword, count]) => (
            <span
              key={keyword}
              className={`${getFontSize(count)} 
                ${isTagSelected(keyword) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-50 text-blue-700'} 
                px-2 py-1 rounded-full cursor-pointer 
                hover:bg-blue-500 hover:text-white transition-colors`}
              onClick={() => onTagToggle(keyword)}
            >
              {keyword.replace(/_/g, ' ')}
              <span className={`text-xs ml-1 ${isTagSelected(keyword) ? 'text-blue-100' : 'text-blue-500'}`}>
                ({count})
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
} 