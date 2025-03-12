"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import ActionButton, { ReindexIcon, DeleteIcon, CollapseIcon, ExpandIcon } from './ActionButton';

export interface Reference {
  id: string;
  type: string;
  title?: string;
  summary?: string;
  source?: string;
  contents?: string;
  indexed: boolean;
  created_at: string;
  keywords?: string[];
}

export default function ReferenceCard({ reference, onRefresh }: { reference: Reference; onRefresh: () => void }) {
  const isUrl = reference.type === 'url';
  const title = reference.title || reference.source || 'Untitled Reference';
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [keywords, setKeywords] = useState(reference.keywords || []);
  const [isLoadingKeywords, setIsLoadingKeywords] = useState(!reference.keywords);

  useEffect(() => {
    if (!reference.keywords) {
      const fetchKeywords = async () => {
        try {
          const response = await fetch(`/api/references/${reference.id}/keywords`);
          if (!response.ok) {
            throw new Error('Failed to fetch keywords');
          }
          const data = await response.json();
          setKeywords(data);
        } catch (error) {
          console.error('Error fetching keywords:', error);
        } finally {
          setIsLoadingKeywords(false);
        }
      };
      fetchKeywords();
    }
  }, [reference.id, reference.keywords]);

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const response = await fetch(`/api/references/${reference.id}/reindex`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to reindex reference');
      }
      onRefresh();
    } catch (err) {
      console.error('Error reindexing reference:', err);
    } finally {
      setIsReindexing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this reference?')) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/references/${reference.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete reference');
      }
      onRefresh();
    } catch (err) {
      console.error('Error deleting reference:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleCollapse = async () => {
    setIsCollapsed(!isCollapsed);
    return Promise.resolve();
  };

  return (
    <div className="p-4 border rounded-lg shadow-sm relative">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <ActionButton
            onClick={handleToggleCollapse}
            icon={isCollapsed ? <ExpandIcon /> : <CollapseIcon />}
            title={isCollapsed ? "Expand" : "Collapse"}
            isLoading={false}
            disabled={false}
          />
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            {reference.type}
          </span>
          <h3 className="font-medium hover:underline cursor-pointer" onClick={() => window.location.href = `/references/${reference.id}`}>
            {title}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${
            reference.indexed 
              ? "bg-green-100 text-green-700"
              : "bg-amber-100 text-amber-700"
          }`}>
            {reference.indexed ? "Indexed" : "Processing"}
          </span>
          
          <ActionButton
            onClick={handleReindex}
            icon={<ReindexIcon />}
            title={reference.indexed ? "Reindex" : "Already processing"}
            isLoading={isReindexing}
            disabled={!reference.indexed}
          />

          <ActionButton
            onClick={handleDelete}
            icon={<DeleteIcon />}
            title="Delete"
            isLoading={isDeleting}
            disabled={!reference.indexed}
            hoverColor="hover:text-red-600"
          />
        </div>
      </div>

      {reference.source && (
        <div className="mt-1 text-sm text-gray-500">
          {isUrl ? (
            <a href={reference.source} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {reference.source}
            </a>
          ) : (
            reference.source
          )}
        </div>
      )}

      {reference.summary && !isCollapsed && (
        <p className="mt-2 text-sm text-gray-600">{reference.summary}</p>
      )}

      {!isCollapsed && isLoadingKeywords && (
        <div className="mt-3">Loading keywords...</div>
      )}

      {!isCollapsed && !isLoadingKeywords && keywords.length > 0 && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {keywords.map((keyword) => (
              <span 
                key={keyword} 
                className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
              >
                {keyword.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">
        Added: {new Date(reference.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}
