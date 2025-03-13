import { useState, useCallback, useEffect, useRef } from 'react';
import ReferenceCard, { Reference } from './ReferenceCard';

interface ReferencesListProps {
  selectedTags: string[];
}

export default function ReferencesList({ selectedTags }: ReferencesListProps) {
  const [references, setReferences] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasUnindexedRef = useRef<boolean>(false);

  const fetchReferences = useCallback(async () => {
    try {
      // Include selected tags in the API request if any are selected
      const queryParams = selectedTags.length > 0 
        ? `?keywords=${selectedTags.join(',')}` 
        : '';
      
      const response = await fetch(`/api/references${queryParams}`);
      if (!response.ok) {
        throw new Error('Failed to fetch references');
      }
      const data = await response.json();
      setReferences(data);
      
      // Check if there are any unindexed references
      const hasUnindexed = data.some((ref: Reference) => !ref.indexed);
      hasUnindexedRef.current = hasUnindexed;
      
      // Start or stop polling based on whether there are unindexed references
      if (hasUnindexed) {
        startPolling();
      } else {
        stopPolling();
      }
      
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      return [];
    } finally {
      setLoading(false);
    }
  }, [selectedTags]); // Re-fetch when selected tags change

  const startPolling = useCallback(() => {
    // Clear any existing interval first
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    // Set up a new polling interval - check every 3 seconds
    pollingIntervalRef.current = setInterval(() => {
      console.log('Polling for reference updates...');
      fetchReferences();
    }, 3000);
  }, [fetchReferences]);

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchReferences();
    
    // Listen for the custom event when a new reference is added
    const handleReferenceAdded = () => {
      fetchReferences();
    };
    
    window.addEventListener('referenceAdded', handleReferenceAdded);
    
    // Clean up on unmount
    return () => {
      window.removeEventListener('referenceAdded', handleReferenceAdded);
      stopPolling();
    };
  }, [fetchReferences, stopPolling]);

  if (loading && references.length === 0) {
    return <div className="py-4">Loading references...</div>;
  }

  if (error && references.length === 0) {
    return <div className="py-4 text-red-500">Error: {error}</div>;
  }

  if (references.length === 0) {
    return (
      <div className="py-4 text-muted-foreground">
        {selectedTags.length > 0 
          ? "No references found matching the selected tags." 
          : "No references found. Add your first reference above."}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Your References
        {selectedTags.length > 0 && (
          <span className="text-sm font-normal text-gray-500 ml-2">
            (Filtered by: {selectedTags.map(tag => tag.replace(/_/g, ' ')).join(', ')})
          </span>
        )}
      </h2>
      {hasUnindexedRef.current && (
        <div className="text-sm text-amber-600 bg-amber-50 p-2 rounded-md">
          Some references are still being processed. The list will automatically update when complete.
        </div>
      )}
      {loading && (
        <div className="text-sm text-gray-500">Refreshing...</div>
      )}
      <div className="space-y-3">
        {references.map((reference) => (
          <ReferenceCard 
            key={reference.id} 
            reference={reference} 
            onRefresh={fetchReferences} 
          />
        ))}
      </div>
    </div>
  );
} 