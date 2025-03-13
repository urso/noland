"use client";

import { useChat } from '@ai-sdk/react';
import { useRef, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send } from 'lucide-react';

// ChatHello component for welcome content
interface ChatHelloProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function ChatHello({ 
  title = "Welcome to AI Chat", 
  description = "Start a conversation by typing a message below.",
  children,
  className = ""
}: ChatHelloProps) {
  return (
    <div className={`text-center ${className}`}>
      {title && <h2 className="text-2xl font-bold">{title}</h2>}
      {description && <p className="text-muted-foreground mt-2">{description}</p>}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

interface ChatProps {
  api?: string;
  streamProtocol?: 'text' | 'data';
  children?: ReactNode;
  className?: string;
}

export default function Chat({ api, streamProtocol, children, className = '' }: ChatProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: api || '/api/chat',
    streamProtocol: streamProtocol || 'text',
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className={`flex flex-col ${className || 'h-screen'}`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && children ? (
          <div className="flex items-center justify-center h-full">
            {children}
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card className={`max-w-[80%] ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : ''
              }`}>
                <CardContent className="p-3">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </CardContent>
              </Card>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="border-t p-4">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <Input
            value={input}
            onChange={handleInputChange}
            placeholder="Type your message..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
} 