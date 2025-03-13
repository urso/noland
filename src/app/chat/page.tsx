import Chat, { ChatHello } from '@/components/Chat';
import { Button } from '@/components/ui/button';
import { BookOpen, Info } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="max-w-5xl mx-auto w-full">
      <Chat>
        <ChatHello 
          title="Welcome to Your AI Assistant" 
          description="I can help you find information, answer questions, and more."
        >
{/*           <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <Button variant="outline" className="flex gap-2">
              <BookOpen className="h-4 w-4" />
              View Documentation
            </Button>
            <Button variant="outline" className="flex gap-2">
              <Info className="h-4 w-4" />
              About This AI
            </Button>
          </div> */}
          <div className="mt-6 text-sm text-muted-foreground">
            <p>Try asking questions like:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>"What references do I have about machine learning?"</li>
              <li>"Summarize the latest article I added"</li>
              <li>"Help me understand the concept of transformers"</li>
            </ul>
          </div>
        </ChatHello>
      </Chat>
    </div>
  );
} 