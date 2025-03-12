"use client";

import { Separator } from '@/components/ui/separator';
import { MessageSquare, BookOpen, StickyNote, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Menu, MenuItem } from '@/components/Menu';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div 
      className={`h-screen bg-background border-r flex flex-col transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="p-4 flex items-center justify-between">
        {!isCollapsed && <h1 className="text-xl font-bold">AI Research Assistant</h1>}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      
      <Separator />
      
      <Menu isCollapsed={isCollapsed}>
        <MenuItem href="/notes" icon={StickyNote} isCollapsed={isCollapsed}>
          Notes
        </MenuItem>
        <MenuItem href="/references" icon={BookOpen} isCollapsed={isCollapsed}>
          References
        </MenuItem>
        <MenuItem href="/chat" icon={MessageSquare} isCollapsed={isCollapsed}>
          Chat
        </MenuItem>
          <MenuItem href="/settings" icon={Settings} isCollapsed={isCollapsed}>
            Settings
          </MenuItem>
      </Menu>
      <Separator />
      
      <div className="p-4">
        {!isCollapsed && <p className="text-sm text-muted-foreground">© Noland</p>}
      </div>
    </div>
  );
} 