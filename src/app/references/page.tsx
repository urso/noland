"use client";

import { useEffect, useState, useCallback } from "react";
import AddReferenceForm from "@/components/references/AddReferenceForm";
import ReferencesList from "@/components/references/ReferencesList";
import TagCloud from "@/components/ui/TagCloud";
import Chat, { ChatHello } from "@/components/Chat";
import { ChevronDown, ChevronUp } from "lucide-react";

interface KeywordCount {
  [keyword: string]: number;
}

// Simple collapsible section component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

function CollapsibleSection({ title, children, defaultExpanded = true }: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  return (
    <div className="border rounded-lg shadow-sm bg-white">
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex justify-between items-center text-left hover:bg-gray-50 rounded-t-lg transition-colors"
      >
        <h2 className="text-xl font-semibold">{title}</h2>
        {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-500" /> : <ChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}

export default function ReferencesPage() {
  // State for selected tags
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Handler for tag selection/deselection
  const handleTagToggle = (tag: string) => {
    setSelectedTags(prevTags => {
      // If tag is already selected, remove it
      if (prevTags.includes(tag)) {
        return prevTags.filter(t => t !== tag);
      } 
      // Otherwise, add it to the selection
      return [...prevTags, tag];
    });
  };

  // Handler to clear all selected tags
  const clearSelectedTags = () => {
    setSelectedTags([]);
  };

  // Custom fetch function for keywords
  const fetchKeywords = useCallback(async (selectedTags: string[]): Promise<KeywordCount> => {
    const queryParams = selectedTags.length > 0 
      ? `?selected_tags=${selectedTags.join(',')}` 
      : '';
    
    const response = await fetch(`/api/keywords/counts${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch keyword counts');
    }
    return await response.json();
  }, []);

  // Example of static keyword counts (not used in this implementation)
  // const staticKeywordCounts: KeywordCount = {
  //   javascript: 42,
  //   react: 35,
  //   typescript: 28,
  //   nextjs: 20,
  //   tailwindcss: 15,
  //   api: 12,
  //   database: 10,
  //   testing: 8,
  //   deployment: 5,
  // };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">References</h1>
          {selectedTags.length > 0 && (
            <button 
              onClick={clearSelectedTags}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main content - References */}
          <div className="md:w-2/3">
            <AddReferenceForm />
            <div className="mt-6">
              <ReferencesList selectedTags={selectedTags} />
            </div>
          </div>
          
          {/* Sidebar - Tag Cloud and Chat */}
          <div className="md:w-1/3 mt-6 md:mt-0 space-y-4">
            {/* Tag Cloud */}
            <CollapsibleSection title="Popular Keywords" defaultExpanded={true}>
              <div className="h-[300px] overflow-y-auto">
                <TagCloud 
                  selectedTags={selectedTags} 
                  onTagToggle={handleTagToggle} 
                  fetchKeywords={fetchKeywords}
                  className="h-[300px]"
                />
              </div>
            </CollapsibleSection>
            
            {/* Chat Box */}
            <CollapsibleSection title="Chat with your references" defaultExpanded={true}>
              <div className="overflow-hidden">
                <Chat className="h-[350px]">
                  <ChatHello
                    title="Ask about your references"
                    description="I can help you find information in your references or answer questions about them."
                  >
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>Try asking questions like:</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>"Find references about machine learning"</li>
                        <li>"Summarize the article about React hooks"</li>
                      </ul>
                    </div>
                  </ChatHello>
                </Chat>
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </div>
    </div>
  );
} 