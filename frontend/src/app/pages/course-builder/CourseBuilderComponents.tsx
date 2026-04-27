import { Award, BookOpen, Download, File as FileIcon, HelpCircle, Image as ImageIcon, PlayCircle, Type, Video } from "lucide-react";
import { useAppSelector } from "../../../hooks/reduxHooks";
import type { ContentBlock, LessonContent } from "../../../features/courses/types";
import { mapContentToBlock } from "./course-builder-utils";

export function LessonSummaryLine({ lessonId, lessonBlocksLength }: { lessonId: number, lessonBlocksLength: number }) {
  const contents = useAppSelector(state => state.lessons.contents[lessonId]);
  const localBlocksLength = contents?.length || lessonBlocksLength;
  
  return (
    <div className="flex items-center gap-2 mt-0.5">
      <span className="text-xs text-gray-400">
        {localBlocksLength} {localBlocksLength === 1 ? 'content block' : 'content blocks'}
      </span>
    </div>
  );
}

export const MediaPreview = ({ block, hideLinkOnVideo = false }: { block: ContentBlock; hideLinkOnVideo?: boolean }) => {
  if (block.type === 'text' || block.type === 'note') {
    const text = block.content || '';
    return text.trim()
      ? (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm transition-all hover:bg-white hover:shadow-md">
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
          <video src={block.content} controls className="w-full rounded-xl max-h-52 bg-black" />
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
        {block.settings?.caption && (
          <p className="text-xs text-gray-400 italic">{block.settings.caption}</p>
        )}
      </div>
    );
  }

  if (block.type === 'image') {
    return block.content ? (
      <div className="space-y-2">
        <img
          src={block.content}
          alt={block.settings?.caption || "image"}
          className="max-h-64 w-auto rounded-xl border border-gray-100 object-cover"
        />
        {block.settings?.caption && (
          <p className="text-xs text-gray-400 italic">{block.settings.caption}</p>
        )}
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
            href={block.content}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-50 hover:bg-orange-600 hover:text-white rounded-lg transition-all"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
    ) : <p className="text-sm text-gray-400 italic">No file uploaded.</p>;
  }

  if (block.type === 'quiz') {
    const questions = block.quiz?.questions || [];
    return (
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">Lesson Quiz</p>
          <p className="text-xs text-blue-700 mt-0.5">{questions.length} Question{questions.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    );
  }

  return null;
};

export function LessonContentsView({ lessonId }: { lessonId: number }) {
  const contents = useAppSelector((state) => state.lessons.contents[lessonId] || []);
  const isLoading = useAppSelector((state) => state.lessons.isLoading);

  if (isLoading && contents.length === 0) {
    return (
      <div className="p-5 border-t border-gray-200 bg-white flex justify-center">
        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-5 border-t border-gray-200 bg-white space-y-5">
      {contents.length === 0 ? (
        <p className="text-sm text-gray-400 italic">No sections in this lesson.</p>
      ) : (
        contents.map((content, index) => {
          const block = mapContentToBlock(content, index);

          return (
            <div key={content.id || `content-${index}`} className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                  {block.type === 'text' && <Type className="w-3 h-3 text-blue-400" />}
                  {block.type === 'video' && <Video className="w-3 h-3 text-purple-400" />}
                  {block.type === 'image' && <ImageIcon className="w-3 h-3 text-green-400" />}
                  {block.type === 'file' && <FileIcon className="w-3 h-3 text-orange-400" />}
                  {block.type} section {index + 1}: {content.title}
                </span>
              </div>
              <MediaPreview block={block} />
            </div>
          );
        })
      )}
    </div>
  );
}
