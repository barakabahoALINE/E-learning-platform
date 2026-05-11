import { Download, File as FileIcon, Image as ImageIcon, PlayCircle, Video } from "lucide-react";
import type { ContentBlock } from "../../../features/courses/types";

const getImageUrl = (url: string | null) => {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  return `http://localhost:8000${url.startsWith('/') ? '' : '/'}${url}`;
};

export const MediaPreview = ({ block, hideLinkOnVideo = false }: { block: ContentBlock; hideLinkOnVideo?: boolean }) => {
  if (block.type === 'text') {
    const text = block.content || '';
    return text.trim()
      ? (
        <div className="bg-gray-50 rounded-xl p-4 transition-all">
          <div 
            className="text-sm text-gray-700 font-medium leading-relaxed rich-text-content"
            dangerouslySetInnerHTML={{ __html: text }}
          />
        </div>
      )
      : <p className="text-sm text-gray-400 italic bg-gray-50/50 rounded-lg p-3 border border-dashed border-gray-200">No text entered.</p>;
  }

  if (block.type === 'video') {
    if (!block.content) return <p className="text-sm text-gray-400 italic">No video selected.</p>;

    const isDirectFile = block.content.startsWith('blob:') || block.content.startsWith('data:') || block.content.includes('/media/');
    const isYouTube = block.content.includes('youtube.com') || block.content.includes('youtu.be');

    return (
      <div className="space-y-2">
        {isDirectFile ? (
          <video src={getImageUrl(block.content)} controls className="w-full rounded-xl max-h-52 bg-black" />
        ) : isYouTube ? (
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-100">
            <iframe
              src={block.content.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
              className="absolute inset-0 w-full h-full"
              allowFullScreen
            />
          </div>
        ) : !hideLinkOnVideo ? (
          <div className="flex items-center gap-2 bg-purple-50 border border-purple-100 rounded-lg px-4 py-3">
            <Video className="w-4 h-4 text-purple-500 flex-shrink-0" />
            <span className="text-sm text-purple-700 truncate">{block.content}</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
             <PlayCircle className="w-5 h-5 text-purple-500 flex-shrink-0" />
             <span className="text-sm text-purple-700 break-all">{block.content}</span>
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    return block.content ? (
      <div className="space-y-2">
        <img
          src={getImageUrl(block.content)}
          alt="image"
          className="max-h-64 w-auto rounded-xl border border-gray-100 object-cover"
        />
      </div>
    ) : <p className="text-sm text-gray-400 italic">No image uploaded.</p>;
  }

  if (block.type === 'file') {
    return block.content ? (
        <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-3 group/file transition-all">
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
            <FileIcon className="w-5 h-5 text-orange-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {block.content.split('/').pop()}
            </p>
            <p className="text-xs text-gray-400">Resource File</p>
          </div>
          <a
            href={getImageUrl(block.content)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-50 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
    ) : <p className="text-sm text-gray-400 italic">No file uploaded.</p>;
  }

  return null;
};
