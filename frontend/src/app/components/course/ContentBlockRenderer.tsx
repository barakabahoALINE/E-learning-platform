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
                className="prose prose-invert max-w-none text-gray-200 leading-relaxed bg-gray-800 border border-gray-700 rounded-xl p-4"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            );
          
          case 'video':
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
                ) : (
                  <iframe
                    src={block.content.includes('youtube.com') ? block.content.replace("watch?v=", "embed/") : block.content}
                    title="Video Content"
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  ></iframe>
                )}
              </div>
            );

          case 'image':
            return (
              <div key={block.id} className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 shadow-xl">
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
              <div key={block.id} className="flex items-center justify-between p-6 bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-primary/50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Download Resource</p>
                    <p className="text-sm text-gray-400 uppercase font-medium tracking-wider">{ext || 'File'} Document</p>
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
