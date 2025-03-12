"use client";

import { useState, useRef } from 'react';

export default function AddReferenceForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    
    try {
      const form = e.currentTarget || formRef.current;
      if (!form) {
        throw new Error('Form not found');
      }
      
      const formData = new FormData(form);
      const url = formData.get('url') as string;

      if (!url) {
        throw new Error('URL is required');
      }

      const response = await fetch('/api/references/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'url',
          contents: url
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add reference');
      }

      // Clear the input
      form.reset();
      
      // Trigger a refresh of the references list
      window.dispatchEvent(new CustomEvent('referenceAdded'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold mb-2">Add New Reference</h2>
      <form 
        ref={formRef}
        className="flex gap-2 mb-2" 
        onSubmit={handleSubmit}
      >
        <input
          type="url"
          name="url"
          placeholder="Enter URL to add reference"
          className="flex-1 px-3 py-2 border rounded-md"
          required
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Adding...' : 'Add'}
        </button>
      </form>
      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
} 