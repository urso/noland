"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import ReferenceContents from "@/components/references/ReferenceContents";

// Define interface for Reference type
interface Reference {
  id: string;
  title?: string;
  type?: string;
  source?: string;
  content?: string;
  contents?: string;
  createdAt?: string;
  // Add other properties as needed
}

export default function ReferenceDetailPage() {
  const params = useParams();
  const reference_id = params.reference_id as string;
  const [reference, setReference] = useState<Reference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReference = async () => {
      try {
        const response = await fetch(`/api/references/${reference_id}?contents=true`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch reference: ${response.statusText}`);
        }
        
        const data = await response.json();
        setReference(data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        
        console.error("Error fetching reference:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReference();
  }, [reference_id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          <h2 className="text-lg font-medium mb-2">Error Loading Reference</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/references" className="text-blue-500 hover:text-blue-700">
          ← Back to References
        </Link>
      </div>

      {reference ? (
        <div className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{reference.title || "Untitled Reference"}</h1>
            {reference.source && (
              <p className="text-sm text-gray-500">
                Source: <span className="text-blue-600">{reference.source}</span>
              </p>
            )}
          </div>
          
          {reference.contents && (
            <div className="mb-6">
              <ReferenceContents content={reference.contents} />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
          <p>Reference not found or has been deleted.</p>
        </div>
      )}
    </div>
  );
} 