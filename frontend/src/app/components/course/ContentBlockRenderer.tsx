import React from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface ContentBlock {
  id: string | number;
  type: 'text' | 'video' | 'image' | 'file';
  content: string;
}

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
}

const getFileExtension = (url: string): string =>
  url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

const getEmbeddableVideoUrl = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    const hostname = url.hostname.replace(/^www\./, "");

    if (hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      let videoId = "";

      if (url.pathname.startsWith("/watch")) {
        videoId = url.searchParams.get("v") || "";
      } else if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        videoId = url.pathname.split("/").filter(Boolean)[1] || "";
      }

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (hostname === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
    }

    if (hostname === "player.vimeo.com") {
      return rawUrl;
    }

    return rawUrl;
  } catch {
    return null;
  }
};

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ blocks }) => {
  if (!blocks || !Array.isArray(blocks)) return null;

  const isVideoFile = (url: string) => {
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
    return videoExtensions.some(ext => url.toLowerCase().endsWith(ext)) || url.toLowerCase().includes('/media/course_media/');
  };

  return (
    <div className="space-y-8">
      {blocks.map((block) => {
        switch (block.type) {
          case 'text':
            return (
              <div
                key={block.id}
                className="prose max-w-none text-foreground dark:prose-invert dark:text-gray-200 leading-relaxed rich-text-content"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            );

          case 'video':
            const embedUrl = getEmbeddableVideoUrl(block.content);
            return (
              <div key={block.id} className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-gray-800">
                {isVideoFile(block.content) ? (
                  <video
                    src={block.content}
                    controls
                    className="w-full h-full"
                    playsInline
                  >
                    Your browser does not support the video tag.
                  </video>
                ) : embedUrl ? (
                  <iframe
                    src={embedUrl}
                    title="Video Content"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-gray-400">
                    This video link cannot be embedded. Please check the video URL.
                  </div>
                )}
              </div>
            );

          case 'image':
            return (
              <div key={block.id} className="rounded-2xl overflow-hidden bg-muted dark:bg-gray-900 border border-border dark:border-gray-800 shadow-xl">
                <img
                  src={block.content}
                  alt="Content Image"
                  className="w-full h-auto max-h-[600px] object-contain mx-auto"
                />
              </div>
            );

          case 'file':
            const ext = getFileExtension(block.content);
            return (
              <div key={block.id} className="flex items-center justify-between p-6 bg-card dark:bg-gray-800/50 rounded-2xl border border-border dark:border-gray-700 hover:border-primary/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground dark:text-white">Download Resource</p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 uppercase font-medium tracking-wider">{ext || 'File'} Document</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white hover:text-white"
                    onClick={() => window.open(block.content, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
};
