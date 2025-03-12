"use client";

import { useEffect, useState } from "react";
import AddReferenceForm from "@/components/references/AddReferenceForm";
import ReferencesList from "@/components/references/ReferencesList";
import TagCloud from "@/components/references/TagCloud";

export default function ReferencesPage() {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">References</h1>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Main content - References */}
          <div className="md:w-2/3">
            <AddReferenceForm />
            <div className="mt-6">
              <ReferencesList />
            </div>
          </div>
          
          {/* Sidebar - Tag Cloud */}
          <div className="md:w-1/3 mt-6 md:mt-0">
            <TagCloud />
          </div>
        </div>
      </div>
    </div>
  );
} 