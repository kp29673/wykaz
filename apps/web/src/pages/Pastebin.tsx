import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/Header';
import { useToast } from '@/hooks/use-toast';
import { Copy, Check } from 'lucide-react';

const Pastebin = () => {
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [pasteUrl, setPasteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCreate = () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter some content to create a paste.",
        variant: "destructive",
      });
      return;
    }

    // Generate simple paste ID (in production, this would be server-side)
    const pasteId = Math.random().toString(36).substring(2, 10);
    const url = `${window.location.origin}/paste/${pasteId}`;
    
    // Store in localStorage (in production, use backend)
    localStorage.setItem(`paste_${pasteId}`, JSON.stringify({
      title: title || 'Untitled',
      content,
      created: new Date().toISOString()
    }));

    setPasteUrl(url);
    toast({
      title: "Paste created",
      description: "Your paste has been created successfully.",
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(pasteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Paste URL copied to clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12 max-w-4xl">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Pastebin</h1>
            <p className="text-sm text-muted-foreground">
              Share text snippets easily. Pastes are stored locally in your browser.
            </p>
          </div>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Title (optional)
              </label>
              <Input
                id="title"
                placeholder="My paste title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Content
              </label>
              <Textarea
                id="content"
                placeholder="Paste your content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[300px] font-mono text-sm"
              />
            </div>

            <Button onClick={handleCreate} className="w-full sm:w-auto">
              Create Paste
            </Button>

            {pasteUrl && (
              <div className="flex gap-2 items-center p-3 bg-muted rounded-md">
                <Input
                  value={pasteUrl}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            )}
          </div>

          <div className="bg-muted/50 border rounded-lg p-4 space-y-2 text-sm">
            <h2 className="font-semibold text-base">Legal Disclaimer</h2>
            <div className="space-y-2 text-muted-foreground">
              <p>
                By using this pastebin service, you agree that:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>You are solely responsible for the content you post</li>
                <li>The service operator is not liable for any content posted by users</li>
                <li>Content that violates laws or terms of service may be removed</li>
                <li>You must not post illegal, harmful, or copyrighted content</li>
                <li>Pastes are stored in your browser and may be lost if you clear your data</li>
              </ul>
              <p className="pt-2">
                The service is provided "as is" without warranties of any kind. The operator 
                assumes no responsibility for user-generated content and acts only as a neutral 
                technical platform provider.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pastebin;
