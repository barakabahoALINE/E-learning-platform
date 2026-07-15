import { Download, File as FileIcon, Video } from "lucide-react";
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

    const isDirectFile = block.content.startsWith('blob:') || block.content.startsWith('data:video/') || block.content.includes('/media/');

    return (
      <div className="space-y-2">
        {isDirectFile ? (
          <video src={getImageUrl(block.content)} controls className="w-full rounded-xl max-h-52 bg-black" />
        ) : (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <Video className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">Video links are no longer supported.</p>
              {!hideLinkOnVideo && <p className="text-xs text-amber-700 truncate mt-1">{block.content}</p>}
            </div>
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
