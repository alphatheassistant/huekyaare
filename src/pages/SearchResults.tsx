import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ArrowUpIcon,
  BoldIcon,
  CopyIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  LayoutGridIcon,
  RefreshCwIcon,
  ShareIcon,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  images?: { src: string }[];
  isStreaming?: boolean;
  hasStartedStreaming?: boolean;
}

const ImageSkeleton = () => (
  <div className="grid grid-cols-4 gap-2">
    {[...Array(4)].map((_, i) => (
      <div
        key={i}
        className="animate-pulse bg-muted rounded-sm h-40 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
      </div>
    ))}
  </div>
);

const MessageSkeleton = () => (
  <div className="space-y-2">
    {[...Array(3)].map((_, i) => (
      <div
        key={i}
        className="h-4 bg-muted rounded animate-pulse relative overflow-hidden"
        style={{ width: `${Math.random() * 40 + 60}%` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent shimmer" />
      </div>
    ))}
  </div>
);

const MessageContent = ({ message }: { message: Message }) => {
  const [imagesLoaded, setImagesLoaded] = useState(false);

  useEffect(() => {
    if (message.images) {
      Promise.all(
        message.images.map(
          (img) =>
            new Promise((resolve) => {
              const image = new Image();
              image.src = img.src;
              image.onload = resolve;
            })
        )
      ).then(() => setImagesLoaded(true));
    }
  }, [message.images]);

  return (
    <div
      className={cn(
        'group relative',
        message.role === 'user' ? 'text-right' : '',
        'animate-in fade-in-0 duration-300'
      )}
    >
      <div
        className={cn(
          'inline-block max-w-[100%] text-left',
          message.role === 'user'
            ? 'bg-primary text-primary-foreground user-msg'
            : 'rounded-lg p-4 w-[100%]'
        )}
      >
        {message.role === 'bot' && (
          <>
            <div className="mb-4">
              {!imagesLoaded && <ImageSkeleton />}
              {message.images && imagesLoaded && (
                <div className="grid grid-cols-4 gap-2">
                  {message.images.slice(0, 4).map((image, i) => (
                    <img
                      key={i}
                      src={image.src}
                      alt={`Result ${i + 1}`}
                      className="border h-40 w-64 rounded-sm object-cover transition-all duration-200 hover:scale-105"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}
            </div>
            {!message.hasStartedStreaming ? (
              <MessageSkeleton />
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                className="prose prose-neutral dark:prose-invert max-w-none"
              >
                {message.content}
              </ReactMarkdown>
            )}
          </>
        )}
        {message.role === 'user' && message.content}
      </div>
      {message.role === 'bot' && !message.isStreaming && (
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="transition-opacity"
            onClick={() => {
              navigator.clipboard.writeText(message.content);
              toast.success('Copied to clipboard');
            }}
          >
            <CopyIcon className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button variant="ghost" size="sm" className="transition-opacity">
            <ShareIcon className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      )}
    </div>
  );
};

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [textFormatting, setTextFormatting] = useState({
    bold: false,
    italic: false,
    link: false,
    list: false,
  });
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const initialQuery = searchParams.get('q') || '';

  useEffect(() => {
    if (initialQuery && !hasInitialized) {
      handleSearch(initialQuery);
      setHasInitialized(true);
    }
  }, [initialQuery, hasInitialized]);

  const scrollToBottom = useCallback(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const createMessage = useCallback(
    (
      role: 'user' | 'bot',
      content: string,
      isStreaming = false,
      hasStartedStreaming = false
    ): Message => ({
      id: `${role}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      isStreaming,
      hasStartedStreaming,
    }),
    []
  );

  const updateLastBotMessage = useCallback(
    (content: string, isStreaming = true) => {
      setMessages((prev) => {
        const lastBotMessageIndex = prev.findLastIndex((m) => m.role === 'bot');
        if (lastBotMessageIndex === -1) return prev;

        const newMessages = [...prev];
        newMessages[lastBotMessageIndex] = {
          ...newMessages[lastBotMessageIndex],
          content,
          isStreaming,
          hasStartedStreaming: true,
        };
        return newMessages;
      });
    },
    []
  );

  const handleFormatting = (type: keyof typeof textFormatting) => {
    setTextFormatting((prev) => ({ ...prev, [type]: !prev[type] }));

    const textarea = textAreaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newMessage.substring(start, end);
    let formattedText = '';

    switch (type) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        break;
      case 'link':
        formattedText = `[${selectedText}](url)`;
        break;
      case 'list':
        formattedText = `\n- ${selectedText}`;
        break;
    }

    const newValue =
      newMessage.substring(0, start) +
      formattedText +
      newMessage.substring(end);
    setNewMessage(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + formattedText.length,
        start + formattedText.length
      );
    }, 0);
  };

  const handleSearch = async (query: string) => {
    if (isLoading) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    const userMessage = createMessage('user', query);
    const botMessage = createMessage('bot', '', true, false);

    if (!hasInitialized && initialQuery === query) {
      setMessages([userMessage, botMessage]);
    } else {
      setMessages((prev) => [...prev, userMessage, botMessage]);
    }

    try {
      const imagesPromise = fetch(
        `https://red-panda-v1.koyeb.app/images?query=${encodeURIComponent(
          query
        )}&images=4`
      ).then((res) => res.json());

      const response = await fetch('https://red-panda-v1.koyeb.app/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          model: 'llama-3.1-70b',
          history: messages
            .filter((msg) => !msg.isStreaming)
            .map(({ role, content }) => ({ role, content })),
        }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        accumulatedContent += text;
        updateLastBotMessage(accumulatedContent);
      }

      const images = await imagesPromise;
      setMessages((prev) => {
        const lastBotMessageIndex = prev.findLastIndex((m) => m.role === 'bot');
        if (lastBotMessageIndex === -1) return prev;

        const newMessages = [...prev];
        newMessages[lastBotMessageIndex] = {
          ...newMessages[lastBotMessageIndex],
          content: accumulatedContent,
          images,
          isStreaming: false,
          hasStartedStreaming: true,
        };
        return newMessages;
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Error:', error);
        toast.error('Failed to get response. Please try again.');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() && !isLoading) {
      handleSearch(newMessage.trim());
      setNewMessage('');
      if (textAreaRef.current) {
        textAreaRef.current.style.height = 'auto';
      }
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[40%] -left-[40%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl animate-pulse" />
        <div
          className="absolute -bottom-[40%] -right-[40%] w-[80%] h-[80%] rounded-full bg-gradient-to-br from-secondary/20 to-transparent blur-3xl animate-pulse"
          style={{
            animationDelay: '1s',
            animationDuration: '4s',
          }}
        />
        {newMessage && (
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-gradient-to-br from-accent/10 to-transparent blur-3xl"
            style={{
              transform: `translate(-50%, -50%) scale(${Math.min(
                newMessage.length / 50,
                1.5
              )})`,
              opacity: Math.min(newMessage.length / 100, 0.3),
              transition: 'all 0.3s ease-out',
            }}
          />
        )}
      </div>

      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">NewEra</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <LayoutGridIcon className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm">
              <Sparkles className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>
        </div>
      </header>

      <ScrollArea className="flex-1 px-4">
        <div className="max-w-4xl mx-auto py-8 space-y-6">
          {messages.map((message) => (
            <MessageContent key={message.id} message={message} />
          ))}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      <div className="bg-background/80 sticky bottom-0">
        <div className="border-t w-[75%] mx-auto p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
            <div className="relative rounded-xl border transition-colors hover:bg-accent/50">
              <div className="flex gap-2 border-b p-2">
                <Button
                  type="button"
                  variant={textFormatting.bold ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleFormatting('bold')}
                >
                  <BoldIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={textFormatting.italic ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleFormatting('italic')}
                >
                  <ItalicIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={textFormatting.link ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleFormatting('link')}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant={textFormatting.list ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleFormatting('list')}
                >
                  <ListIcon className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                ref={textAreaRef}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${e.target.scrollHeight}px`;
                }}
                placeholder="Type here to search anything.."
                className="min-h-[60px] max-h-[200px] pr-24 resize-none text-base bg-transparent border-none shadow-none focus:outline-none focus-visible:ring-0 focus-visible:border-0 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
              />
              <div className="absolute right-3 bottom-3 flex gap-2">
                {isLoading && (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm mr-2">
                    <RefreshCwIcon className="h-4 w-4 animate-spin" />
                    Processing...
                  </div>
                )}
                <Button
                  type="submit"
                  size="icon"
                  className="h-8 w-8 rounded-lg bg-primary hover:bg-primary/90 transition-all duration-200"
                  disabled={isLoading || !newMessage.trim()}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
