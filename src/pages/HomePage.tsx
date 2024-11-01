import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GithubIcon, SearchIcon, TwitterIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/search-result?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      <header className="border-b hidden">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl">NewEra</h2>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <GithubIcon className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <TwitterIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl space-y-8">
          <div className="text-center space-y-4 pt-4">
            <h1 className="font-display text-6xl md:text-7xl font-black pb-3 bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/50">
              Search Reimagined
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl">
              Experience the future of search with AI-powered insights
            </p>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Ask me anything..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-14 pl-5 pr-14 text-lg rounded-2xl border-2 transition-colors border-black focus:outline-none focus-visible:ring-0 focus-visible:border-2"
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 rounded-xl"
            >
              <SearchIcon className="h-5 w-5" />
            </Button>
          </form>
        </div>
      </main>

      <footer className="border-t">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between text-sm text-muted-foreground">
          <div>© 2024 NewEra Search. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              About
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
