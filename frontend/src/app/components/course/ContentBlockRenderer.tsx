import React from "react";
import { AlertCircle, FileText, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import type {
  ContentBlock,
  FlipCardCard,
  FlipCardSide,
} from "../../../features/courses/types";

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  onVideoWatchedToEnd?: (blockId: string | number) => void;
}

const getFileExtension = (url: string): string =>
  url.split("?")[0].split(".").pop()?.toLowerCase() ?? "";

const isVideoFile = (url: string) => {
  const cleanedUrl = url.split("?")[0].toLowerCase();
  const videoExtensions = [".mp4", ".webm", ".ogg", ".mov", ".m4v"];
  return (
    url.startsWith("blob:") ||
    url.startsWith("data:video/") ||
    videoExtensions.some((ext) => cleanedUrl.endsWith(ext)) ||
    cleanedUrl.includes("/media/course_media/") ||
    cleanedUrl.includes("/media/")
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

  const handleSeekBoundary = (
    event: React.SyntheticEvent<HTMLVideoElement>,
  ) => {
    watchStateRef.current.lastTime = event.currentTarget.currentTime;
  };

  const handleEnded = (event: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const state = watchStateRef.current;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const requiredWatchSeconds = duration > 0 ? duration * 0.95 : 0;
    const watchedEnough =
      duration === 0 || state.watchedSeconds >= requiredWatchSeconds;

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

export const FlipCard: React.FC<{
  front: FlipCardSide | string;
  back: FlipCardSide | string;
  isFlipped?: boolean;
  onFlip?: () => void;
  sideLabel?: { front?: string; back?: string };
  hint?: string;
}> = ({
  front,
  back,
  isFlipped: controlledFlipped,
  onFlip,
  sideLabel,
  hint,
}) => {
  const [reducedMotion, setReducedMotion] = React.useState(false);
  const [internalFlipped, setInternalFlipped] = React.useState(false);
  const isFlipped = controlledFlipped ?? internalFlipped;

  const normalizeSide = (
    side: FlipCardSide | string | undefined,
  ): FlipCardSide => {
    if (!side) {
      return { type: "text", text: "" };
    }
    if (typeof side === "string") {
      return { type: "text", text: side };
    }
    return {
      type: side.type || "text",
      text: side.text || "",
      image: side.image,
      imageAlt: side.imageAlt || "",
    };
  };

  // Auto-size text to fit content & available width/height.
  const AutoSizeText: React.FC<{
    children: string;
    minFont: number; // px
    maxFont: number; // px
    maxLines: number;
    className?: string;
    style?: React.CSSProperties;
    isFront?: boolean;
  }> = ({
    children,
    minFont,
    maxFont,
    maxLines,
    className,
    style,
    isFront,
  }) => {
    const ref = React.useRef<HTMLParagraphElement | null>(null);
    const [fontSize, setFontSize] = React.useState<number>(maxFont);

    React.useEffect(() => {
      const el = ref.current;
      if (!el) return;

      let raf = 0;
      const compute = () => {
        if (!el) return;

        // First, try single-line at max font
        el.style.whiteSpace = "nowrap";
        el.style.fontSize = `${maxFont}px`;
        // force measurement
        const fitsOneLine = el.scrollWidth <= el.clientWidth;
        if (fitsOneLine) {
          setFontSize(maxFont);
          el.style.whiteSpace = "";
          return;
        }

        el.style.whiteSpace = "";

        // Try to find the largest font that keeps lines <= maxLines
        for (let fs = maxFont; fs >= minFont; fs--) {
          el.style.fontSize = `${fs}px`;
          // approximate line height from computed style
          const computed = window.getComputedStyle(el);
          let lineH = parseFloat(computed.lineHeight);
          if (!lineH || Number.isNaN(lineH)) {
            lineH = fs * (isFront ? 1.2 : 1.45);
          }
          const lines = Math.max(1, Math.round(el.scrollHeight / lineH));
          if (lines <= maxLines) {
            setFontSize(fs);
            return;
          }
        }

        // If nothing fits, pick minimum and allow vertical growth
        setFontSize(minFont);
      };

      const ro = new ResizeObserver(() => {
        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(compute);
      });
      ro.observe(el);

      // initial compute
      compute();

      return () => {
        cancelAnimationFrame(raf);
        try {
          ro.disconnect();
        } catch {}
      };
    }, [children, minFont, maxFont, maxLines, isFront]);

    return (
      <p
        ref={ref}
        className={className}
        style={{
          fontSize: `${fontSize}px`,
          lineHeight: isFront ? 1.18 : 1.6,
          margin: 0,
          ...style,
        }}
      >
        {children}
      </p>
    );
  };

  const renderFaceContent = (
    side: "front" | "back",
    sideData: FlipCardSide,
  ) => {
    const text = sideData.text?.trim();
    const image = sideData.image?.trim();
    const imageAlt = sideData.imageAlt?.trim() || "Flip card image";
    const isFront = side === "front";
    const hasLongText = !!text && text.length > 140;

    const imageBlock = image ? (
      <div className="w-full overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
          <img
            src={image}
            alt={imageAlt}
            decoding="async"
            loading="lazy"
            className="h-full w-full object-contain"
          />
        </div>
      </div>
    ) : (
      <div className="w-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
        No image selected.
      </div>
    );

    const textBlock = text ? (
      <div className="w-full">
        <AutoSizeText
          minFont={isFront ? 18 : 16}
          maxFont={isFront ? 32 : 22}
          maxLines={isFront ? 2 : 12}
          isFront={isFront}
          className={[
            "whitespace-pre-wrap",
            isFront
              ? "font-semibold tracking-[-0.03em] text-slate-950 dark:text-white"
              : "text-slate-700 dark:text-slate-200",
          ].join(" ")}
          style={{
            textAlign: isFront ? "center" : hasLongText ? "left" : "center",
            maxWidth: isFront ? "min(80%, 72ch)" : "min(85%, 76ch)",
            margin: "0 auto",
            overflowWrap: "break-word",
            wordBreak: "normal",
            hyphens: "auto",
          }}
        >
          {text}
        </AutoSizeText>
      </div>
    ) : (
      <div className="w-full rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/30 dark:text-slate-400">
        No text provided.
      </div>
    );

    switch (sideData.type) {
      case "image":
        return imageBlock;

      case "image_text":
        // Stack text above image for a clean educational layout.
        // Ensure text gets priority for width and image is centered below.
        return (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full max-w-[72ch] px-2">{textBlock}</div>
            <div className="w-full flex items-center justify-center px-2">
              <div className="w-full max-w-[62ch]">
                {/* Image container preserves aspect ratio and scales responsively */}
                <div className="w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-900">
                  <div
                    className="relative w-full"
                    style={{ paddingTop: "56.25%" }}
                  >
                    <img
                      src={sideData.image}
                      alt={sideData.imageAlt || "Flip card image"}
                      decoding="async"
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain"
                      style={{ borderRadius: 12 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div className="w-full px-2 md:px-0">{textBlock}</div>;
    }
  };

  const renderCardFace = (
    side: "front" | "back",
    sideData: FlipCardSide | string,
  ) => {
    const normalizedSide = normalizeSide(sideData);
    const sideTitle =
      side === "front"
        ? sideLabel?.front || "Term"
        : sideLabel?.back || "Answer";
    const flipHintText = hint
      ? hint
      : isFlipped
        ? "Tap again to review the question."
        : "Tap to reveal the answer.";

    return (
      <div
        className="relative flex h-full flex-col"
        style={{ gridArea: "1/1", minHeight: 0 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
              {sideTitle}
            </p>
          </div>

          <button
            aria-label="Flip card"
            title="Flip card"
            onClick={(e) => {
              e.stopPropagation();
              onFlip ? onFlip() : setInternalFlipped((v) => !v);
            }}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition-transform hover:scale-105 hover:border-slate-300 focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <span aria-hidden>↺</span>
          </button>
        </div>

        <div
          className={
            side === "front"
              ? "mt-4 flex min-h-0 flex-1 items-center justify-center px-2"
              : "mt-4 flex min-h-0 flex-1 items-start justify-center px-2"
          }
        >
          <div className="w-full">
            {renderFaceContent(side, normalizedSide)}
          </div>
        </div>

        <div className="mt-4 text-center text-[0.8rem] font-medium text-slate-500 dark:text-slate-400">
          {flipHintText}
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: any) => setReducedMotion(e.matches);
    try {
      (mq as any).addEventListener?.("change", handler);
    } catch {}
    return () => {
      try {
        (mq as any).removeEventListener?.("change", handler);
      } catch {}
    };
  }, []);

  // Measure front/back heights and set a min height so flipping doesn't change size
  const toggleFlip = () => {
    if (onFlip) {
      onFlip();
    } else {
      setInternalFlipped((value) => !value);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleFlip();
    }
  };

  return (
    <div
      className="group w-full h-full focus:outline-none focus-visible:ring focus-visible:ring-indigo-400/30"
      tabIndex={0}
      style={{ perspective: 1200 }}
      role="button"
      aria-pressed={isFlipped}
      aria-label="Flip card"
      data-flipped={isFlipped ? "true" : "false"}
      onClick={toggleFlip}
      onKeyDown={handleKeyDown}
    >
      <div
        className="card-outer relative w-full rounded-[1.75rem] overflow-visible shadow-sm shadow-slate-200/40 bg-transparent"
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          boxSizing: "border-box",
          willChange: "transform",
        }}
      >
        <div
          className="card-inner relative grid"
          style={{
            gridTemplateAreas: '"card"',
            transformStyle: "preserve-3d",
            transition: reducedMotion
              ? "none"
              : "transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          <div
            className="front p-6 rounded-3xl bg-white/95 dark:bg-slate-950/95 shadow-sm shadow-slate-900/5"
            style={{
              gridArea: "card",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderCardFace("front", front)}
          </div>

          <div
            className="back p-6 rounded-3xl bg-slate-50/95 dark:bg-slate-900/95 shadow-sm shadow-slate-900/5"
            style={{
              gridArea: "card",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderCardFace("back", back)}
          </div>
        </div>
      </div>
      <style>{`
        .group[data-flipped="true"] .card-inner {
          transform: rotateY(180deg) !important;
        }

        .group:hover .card-outer,
        .group:focus-within .card-outer,
        .group[data-flipped="true"] .card-outer {
          transform: translateY(-6px) scale(1.01);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 30px 80px -28px rgba(15,23,42,0.55);
        }

        @media (prefers-reduced-motion: reduce) {
          .card-inner { transition: none !important; }
          .card-outer { transition: none !important; }
        }
      `}</style>
    </div>
  );
};

const ExpandableSectionBlock: React.FC<{ block: ContentBlock }> = ({
  block,
}) => {
  const items = Array.isArray(block.items) ? block.items : [];
  const allowMultiple = !!block.settings?.allowMultiple;
  const showNumbering = !!block.settings?.showNumbering;
  const defaultOpenMode = block.settings?.defaultOpen ?? "first-expanded";

  const defaultSingleValue = React.useMemo(() => {
    if (allowMultiple || !items.length) return undefined;
    return defaultOpenMode === "first-expanded"
      ? String(items[0].id)
      : undefined;
  }, [allowMultiple, defaultOpenMode, items]);

  const defaultMultipleValue = React.useMemo(() => {
    if (!allowMultiple || !items.length) return [];
    return defaultOpenMode === "first-expanded" ? [String(items[0].id)] : [];
  }, [allowMultiple, defaultOpenMode, items]);

  const accordionItems =
    items.length > 0 ? (
      items.map((item, index) => (
        <AccordionItem
          key={item.id ?? `${block.id}-item-${index}`}
          value={String(item.id ?? `${block.id}-item-${index}`)}
          className="border-b border-slate-200 last:border-b-0 dark:border-slate-700"
        >
          <AccordionTrigger className="px-4 py-4 text-left text-base font-semibold text-slate-800 hover:no-underline dark:text-slate-100 sm:px-5">
            <span className="flex items-center gap-3 min-w-0">
              {showNumbering && (
                <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-200 px-2 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                  {index + 1}
                </span>
              )}
              <span className="block min-w-0 break-words">
                {item.title || `Section ${index + 1}`}
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 pt-0 text-sm text-slate-700 dark:text-slate-200 sm:px-5">
            <div
              className="prose max-w-none break-words text-sm leading-relaxed text-slate-700 dark:prose-invert dark:text-slate-200 rich-text-content"
              dangerouslySetInnerHTML={{
                __html: item.content || "<p>Empty section content.</p>",
              }}
            />
          </AccordionContent>
        </AccordionItem>
      ))
    ) : (
      <div className="p-5 text-sm text-slate-500 dark:text-slate-400">
        No expandable sections have been added yet.
      </div>
    );

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-950/40 overflow-hidden shadow-sm">
      {allowMultiple ? (
        <Accordion
          type="multiple"
          defaultValue={defaultMultipleValue}
          className="w-full"
        >
          {accordionItems}
        </Accordion>
      ) : (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultSingleValue}
          className="w-full"
        >
          {accordionItems}
        </Accordion>
      )}
    </div>
  );
};

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  blocks,
  onVideoWatchedToEnd,
}) => {
  if (!blocks || !Array.isArray(blocks)) return null;

  return (
    <div className="space-y-8">
      {blocks.map((block) => {
        switch (block.type) {
          case "text":
            return (
              <div
                key={block.id}
                className="prose max-w-none text-foreground dark:prose-invert dark:text-gray-200 leading-relaxed rich-text-content"
                dangerouslySetInnerHTML={{ __html: block.content }}
              />
            );

          case "video":
            return (
              <div
                key={block.id}
                className="rounded-2xl overflow-hidden bg-black aspect-video shadow-2xl border border-gray-800"
              >
                {isVideoFile(block.content) ? (
                  <TrackableVideo
                    block={block}
                    onWatchedToEnd={onVideoWatchedToEnd}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-gray-300">
                    <AlertCircle className="h-8 w-8 text-amber-400" />
                    <p className="max-w-md text-sm">
                      Uploaded video files are required for completion tracking.
                      Ask the instructor to replace this video link with an
                      uploaded video file.
                    </p>
                  </div>
                )}
              </div>
            );

          case "image":
            return (
              <div
                key={block.id}
                className="rounded-2xl overflow-hidden bg-muted dark:bg-gray-900 border border-border dark:border-gray-800 shadow-xl"
              >
                <img
                  src={block.content}
                  alt="Content Image"
                  className="w-full h-auto max-h-[600px] object-contain mx-auto"
                />
              </div>
            );

          case "file":
            const ext = getFileExtension(block.content);
            return (
              <div
                key={block.id}
                className="flex items-center justify-between p-6 bg-card dark:bg-gray-800/50 rounded-2xl border border-border dark:border-gray-700 hover:border-primary/50 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground dark:text-white">
                      Download Resource
                    </p>
                    <p className="text-sm text-muted-foreground dark:text-gray-400 uppercase font-medium tracking-wider">
                      {ext || "File"} Document
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white hover:text-white"
                    onClick={() => window.open(block.content, "_blank")}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            );

          case "expandable_section":
            return <ExpandableSectionBlock key={block.id} block={block} />;

          case "flip_card":
          case "key_concepts": {
            const cards = Array.isArray(block.cards) ? block.cards : [];
            return (
              <div key={block.id} className="space-y-4">
                {cards.length > 0 ? (
                  <div
                    className="grid gap-5 items-start"
                    style={{
                      gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 280px), 1fr))`,
                      width: "100%",
                    }}
                  >
                    {cards.map((card, index) => (
                      <div
                        key={`${block.id}-${index}`}
                        className="min-h-[180px] min-w-0"
                      >
                        <FlipCard
                          front={card.front || ""}
                          back={card.back || ""}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/40 p-6 text-sm text-slate-600 dark:text-slate-300">
                    No flip cards are available for this content item.
                  </div>
                )}
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
