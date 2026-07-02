import React from 'react';
import { AlertCircle, FileText, ExternalLink } from 'lucide-react';
import { Button } from '../ui/button';

interface ContentBlock {
  id: string | number;
  type: 'text' | 'video' | 'image' | 'file';
  content: string;
}

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  onVideoWatchedToEnd?: (blockId: string | number) => void;
}

const getFileExtension = (url: string): string =>
  url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

const isVideoFile = (url: string) => {
  const cleanedUrl = url.split("?")[0].toLowerCase();
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.m4v'];
  return (
    url.startsWith("blob:") ||
    url.startsWith("data:video/") ||
    videoExtensions.some(ext => cleanedUrl.endsWith(ext)) ||
    cleanedUrl.includes('/media/course_media/') ||
    cleanedUrl.includes('/media/')
  );
};

const TrackableVideo = ({
  block,
  onWatchedToEnd,
}: {
  block: ContentBlock;
  onWatchedToEnd?: (blockId: string | number) => void;
}) => {
  const watchStateRef = React.useRef({
    hasPlayed: false,
    hasReported: false,
    lastTime: 0,
    watchedSeconds: 0,
  });

  React.useEffect(() => {
    watchStateRef.current = {
      hasPlayed: false,
      hasReported: false,
      lastTime: 0,
      watchedSeconds: 0,
    };
  }, [block.content]);

  const handlePlay = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    watchStateRef.current.hasPlayed = true;
    watchStateRef.current.lastTime = event.currentTarget.currentTime;
  };

  const handleTimeUpdate = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const state = watchStateRef.current;
    if (!state.hasPlayed || video.paused || video.seeking) {
      state.lastTime = video.currentTime;
      return;
    }

    const elapsed = video.currentTime - state.lastTime;
    if (elapsed > 0 && elapsed <= 2.5) {
      state.watchedSeconds += elapsed;
    }
    state.lastTime = video.currentTime;
  };

  const handleSeekBoundary = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    watchStateRef.current.lastTime = event.currentTarget.currentTime;
  };

  const handleEnded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const state = watchStateRef.current;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const requiredWatchSeconds = duration > 0 ? duration * 0.95 : 0;
    const watchedEnough = duration === 0 || state.watchedSeconds >= requiredWatchSeconds;

    if (state.hasPlayed && watchedEnough && !state.hasReported) {
      state.hasReported = true;
      onWatchedToEnd?.(block.id);
    }
  };

  return (
    <video
      src={block.content}
      controls
      className="w-full h-full"
      playsInline
      onPlay={handlePlay}
      onTimeUpdate={handleTimeUpdate}
      onSeeking={handleSeekBoundary}
      onSeeked={handleSeekBoundary}
      onEnded={handleEnded}
    >
      Your browser does not support the video tag.
    </video>
  );
};

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({ blocks, onVideoWatchedToEnd }) => {
  if (!blocks || !Array.isArray(blocks)) return null;

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
            return (
              <div key={block.id} className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-gray-800">
                {isVideoFile(block.content) ? (
                  <TrackableVideo block={block} onWatchedToEnd={onVideoWatchedToEnd} />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-300">
                    <AlertCircle className="h-8 w-8 text-amber-400" />
                    <p className="max-w-md text-sm">
                      Uploaded video files are required for completion tracking. Ask the instructor to replace this video link with an uploaded video file.
                    </p>
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
