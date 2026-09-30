import React from "react";
import { AlertCircle, FileText, ExternalLink } from "lucide-react";
import { Button } from "../ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
  onVideoWatchedToEnd?: (blockId: string | number) => void;
}

import type {
  ContentBlock,
  FlipCardCard,
  FlipCardSide,
} from "../../../features/courses/types";

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

const TrackableVideo: React.FC<{
  block: ContentBlock;
  onWatchedToEnd?: (blockId: string | number) => void;
}> = ({ block, onWatchedToEnd }) => {
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
    const video = event.currentTarget as HTMLVideoElement;
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
    const video = event.currentTarget as HTMLVideoElement;
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
  const [cardHeight, setCardHeight] = React.useState<number | null>(null);
  const frontRef = React.useRef<HTMLDivElement | null>(null);
  const backRef = React.useRef<HTMLDivElement | null>(null);
  const cardShellRef = React.useRef<HTMLDivElement | null>(null);
  const frontImageAspect = React.useRef<number | null>(null);
  const backImageAspect = React.useRef<number | null>(null);
  const frontTextRef = React.useRef<HTMLDivElement | null>(null);
  const backTextRef = React.useRef<HTMLDivElement | null>(null);
  const [frontImgMax, setFrontImgMax] = React.useState<number | undefined>();
  const [backImgMax, setBackImgMax] = React.useState<number | undefined>();
  const HEADER_RESERVE = 96;
  const [frontCentered, setFrontCentered] = React.useState(false);
  const [backCentered, setBackCentered] = React.useState(false);
  const internalIsFlipped = controlledFlipped ?? internalFlipped;

  const normalizeSide = (
    side: FlipCardSide | string | undefined,
  ): FlipCardSide => {
    if (!side) return { type: "text", text: "" };
    if (typeof side === "string") return { type: "text", text: side };
    return {
      type: side.type || "text",
      text: side.text || "",
      image: side.image,
      imageAlt: side.imageAlt || "",
    };
  };

  const getLayoutMode = (
    sideData: FlipCardSide,
  ): "text" | "image" | "image_text" => {
    const hasImage = !!sideData.image?.trim();
    const hasText = !!sideData.text?.trim();
    if (hasImage && hasText) return "image_text";
    if (hasImage) return "image";
    return "text";
  };

  const collapseDuplicateSentences = (input?: string) => {
    if (!input) return input || "";
    const parts = input.split(/(?<=[.!?])\s+/g);
    if (parts.length < 2) return input;
    const out: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      const cur = parts[i].trim();
      if (!cur) continue;
      if (out.length === 0) out.push(cur);
      else if (out[out.length - 1] !== cur) out.push(cur);
    }
    return out.join(" ");
  };

  const renderTextBlock = (
    sideData: FlipCardSide,
    side: "front" | "back",
    longText = false,
  ) => {
    const text = sideData.text?.trim();
    if (!text) return null;
    const paragraphs = text.split(/\n{2,}/).filter(Boolean);
    const isShortContent = text.length <= 90 && !text.includes("\n");
    const alignment = side === "front" && isShortContent ? "center" : "left";

    return (
      <div className="w-full min-w-0 max-w-full">
        <div
          className={`space-y-3 ${longText ? "max-h-[260px] pr-2" : ""}`}
          style={{ scrollbarWidth: "thin" }}
        >
          {(paragraphs.length ? paragraphs : [text]).map((paragraph, index) => (
            <p
              key={`${paragraph}-${index}`}
              className="m-0 whitespace-normal text-[1.05rem] sm:text-[1.15rem] md:text-[1.2rem] font-medium leading-[1.6] text-slate-700 dark:text-slate-200"
              style={{
                textAlign: alignment,
                maxWidth: "100%",
                minWidth: 0,
                overflowWrap: "anywhere",
                wordBreak: "break-word",
              }}
            >
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    );
  };

  const ImageBlock: React.FC<{
    sideData: FlipCardSide;
    side?: "front" | "back";
    overlayText?: string | null;
  }> = ({ sideData, side, overlayText = null }) => {
    const image = sideData.image?.trim();
    const imageAlt = sideData.imageAlt?.trim() || "Flip card image";
    const [imgFailed, setImgFailed] = React.useState(false);
    const hasText = !!sideData.text?.trim();
    const isImageOnly = !!image && !hasText;

    React.useEffect(() => setImgFailed(false), [image]);
    if (!image || imgFailed) return null;

    if (isImageOnly) {
      return (
        <div className="relative h-full w-full overflow-hidden rounded-[1.5rem]">
          <img
            src={image}
            alt={imageAlt}
            decoding="async"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
        </div>
      );
    }

    return (
      <div className="mx-auto w-full max-w-[1100px]">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-slate-100/80 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/5 dark:border-slate-700 dark:bg-slate-900 relative">
          <div
            className={`w-full bg-slate-100 dark:bg-slate-900 ${(side === "front" && frontCentered) || (side === "back" && backCentered) ? "flex items-center justify-center" : ""}`}
            style={{
              overflow: "hidden",
              maxHeight: "min(48vh, 620px)",
              minHeight:
                side === "front"
                  ? frontImgMax
                    ? `${frontImgMax}px`
                    : undefined
                  : backImgMax
                    ? `${backImgMax}px`
                    : undefined,
            }}
          >
            <img
              src={image}
              alt={imageAlt}
              decoding="async"
              loading="lazy"
              className="block w-full h-auto object-contain mx-auto flex-shrink-0 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              style={{
                maxHeight:
                  side === "front"
                    ? (frontImgMax ?? undefined)
                    : (backImgMax ?? undefined),
                objectPosition:
                  side === "front"
                    ? frontCentered
                      ? "center"
                      : undefined
                    : backCentered
                      ? "center"
                      : undefined,
              }}
              onError={() => setImgFailed(true)}
              onLoad={(e) => {
                try {
                  const img = e.currentTarget as HTMLImageElement;
                  if (!img.naturalWidth || !img.naturalHeight) return;
                  const ratio = img.naturalHeight / img.naturalWidth;
                  if (side === "front") frontImageAspect.current = ratio;
                  if (side === "back") backImageAspect.current = ratio;
                  window.dispatchEvent(new Event("resize"));
                } catch {}
              }}
            />

            {overlayText ? (
              <div className="pointer-events-none absolute left-1/2 top-1/2 z-30 max-w-[85%] -translate-x-1/2 -translate-y-1/2 transform rounded-lg p-4 backdrop-blur-sm bg-white/60 dark:bg-slate-900/60">
                <div className="text-center">
                  <h3 className="m-0 text-[1.03rem] sm:text-[1.12rem] md:text-[1.18rem] font-semibold text-slate-900 dark:text-white leading-[1.25] line-clamp-4 break-words">
                    {overlayText}
                  </h3>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    );
  };

  const renderFaceContent = (
    side: "front" | "back",
    sideData: FlipCardSide,
  ) => {
    const layout = getLayoutMode(sideData);
    const text = sideData.text?.trim();
    const cleanedText =
      side === "front" ? collapseDuplicateSentences(text) : text;
    const hasImage = !!sideData.image?.trim();

    if (side === "front") {
      if (hasImage && cleanedText) {
        return (
          <div className="flex w-full items-center justify-center">
            <div className="w-full max-w-[1100px] min-w-0 px-2 py-4">
              <ImageBlock
                sideData={sideData}
                side={side}
                overlayText={cleanedText}
              />
            </div>
          </div>
        );
      }

      return (
        <div className="flex w-full items-center justify-center">
          <div className="w-full max-w-[1100px] min-w-0">
            <div className="flex w-full flex-col items-center px-4 py-6">
              {cleanedText ? (
                <h3
                  ref={frontTextRef}
                  className="m-0 text-center font-semibold text-slate-900 dark:text-white text-[1.25rem] sm:text-[1.5rem] md:text-[1.7rem] leading-[1.15]"
                  style={{
                    maxWidth: "100%",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                  }}
                >
                  {cleanedText}
                </h3>
              ) : null}

              {hasImage ? (
                <div className="w-full mt-6">
                  <ImageBlock sideData={sideData} side={side} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      );
    }

    switch (layout) {
      case "image":
        return (
          <div className="relative h-full w-full overflow-hidden rounded-[1.5rem]">
            <ImageBlock sideData={sideData} side={side} />
          </div>
        );

      case "image_text":
        return (
          <div className="flex w-full min-w-0 flex-col gap-3">
            <div ref={backTextRef} className="w-full max-w-full min-w-0">
              <div
                className="text-[1.05rem] sm:text-[1.15rem] md:text-[1.2rem] font-medium leading-[1.6] text-slate-700 dark:text-slate-200 break-words whitespace-normal"
                style={{
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  minWidth: 0,
                  maxWidth: "100%",
                }}
              >
                {renderTextBlock(sideData, side)}
              </div>
            </div>

            <div className="w-full min-w-0">
              <ImageBlock sideData={sideData} side={side} />
            </div>
          </div>
        );

      default:
        const backParagraphs = (text || "").split(/\n{2,}/).filter(Boolean);
        const definition = backParagraphs.length
          ? backParagraphs[0]
          : text || "";
        const example =
          backParagraphs.length > 1 ? backParagraphs.slice(1).join("\n\n") : "";
        const showScrollableBack = (definition + "\n\n" + example).length > 180;

        return (
          <div className="w-full max-w-[820px] min-w-0">
            <div
              className={`${showScrollableBack ? "max-h-[260px] pr-2" : ""}`}
              style={{
                scrollbarWidth: "thin",
                overflowWrap: "anywhere",
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              <div
                className="text-[1.05rem] sm:text-[1.15rem] md:text-[1.2rem] font-medium leading-[1.6] text-slate-700 dark:text-slate-200"
                style={{
                  maxWidth: "100%",
                  minWidth: 0,
                  overflowWrap: "anywhere",
                  wordBreak: "break-word",
                  whiteSpace: "normal",
                }}
              >
                {definition}
              </div>
            </div>

            {example ? (
              <>
                <div className="mt-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Example
                </div>
                <div
                  className={`${example.length > 180 ? "max-h-[220px] pr-2" : ""}`}
                  style={{
                    scrollbarWidth: "thin",
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                  }}
                >
                  <div
                    className="text-[1.05rem] sm:text-[1.15rem] md:text-[1.2rem] font-medium leading-[1.6] text-slate-700 dark:text-slate-200"
                    style={{
                      maxWidth: "100%",
                      minWidth: 0,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                    }}
                  >
                    {example}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        );
    }
  };

  const renderCardFace = (
    side: "front" | "back",
    sideData: FlipCardSide | string,
  ) => {
    const normalizedSide = normalizeSide(sideData as any);
    const sideTitle =
      side === "front"
        ? sideLabel?.front || "Front"
        : sideLabel?.back || "Back";
    const flipButtonLabel =
      side === "front"
        ? internalIsFlipped
          ? "Flip card back"
          : "Flip card"
        : internalIsFlipped
          ? "Flip card"
          : "Flip card back";
    const layoutMode = getLayoutMode(normalizedSide);
    const hasMedia = layoutMode !== "text" && !!normalizedSide.image?.trim();

    if (layoutMode === "image") {
      return (
        <div
          ref={side === "front" ? frontRef : backRef}
          className="relative h-full w-full overflow-hidden rounded-[1.5rem]"
        >
          <ImageBlock sideData={normalizedSide} side={side} />
        </div>
      );
    }

    if (layoutMode === "image_text") {
      const text = normalizedSide.text?.trim();
      return (
        <div
          ref={side === "front" ? frontRef : backRef}
          className="flex w-full min-w-0 flex-col"
        >
          <div
            className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-700/80"
            style={{ position: "relative", zIndex: 10 }}
          >
            <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
              {sideTitle}
            </span>
            <button
              type="button"
              aria-label={flipButtonLabel}
              title={flipButtonLabel}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFlip ? onFlip() : setInternalFlipped((v) => !v);
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/80 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-200 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <span
                aria-hidden="true"
                className="text-base leading-none flip-icon"
              >
                ↻
              </span>
            </button>
          </div>

          <div className="flex w-full min-w-0 flex-col gap-3 px-1">
            {side === "front" ? (
              text ? (
                <ImageBlock
                  sideData={normalizedSide}
                  side={side}
                  overlayText={text}
                />
              ) : null
            ) : (
              <div ref={backTextRef} className="w-full max-w-full min-w-0">
                <div
                  className="text-[1.05rem] sm:text-[1.15rem] md:text-[1.2rem] font-medium leading-[1.6] text-slate-700 dark:text-slate-200 break-words whitespace-normal"
                  style={{
                    overflowWrap: "anywhere",
                    wordBreak: "break-word",
                    minWidth: 0,
                    maxWidth: "100%",
                  }}
                >
                  {renderTextBlock(normalizedSide, side)}
                </div>
              </div>
            )}

            <div className="w-full min-w-0">
              <ImageBlock sideData={normalizedSide} side={side} />
            </div>
          </div>

          {side === "front" ? (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-end justify-center">
              <div className="bg-white/90 dark:bg-slate-900/80 rounded-full px-3 py-1 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-200">
                  Click to reveal
                </span>
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div
        ref={side === "front" ? frontRef : backRef}
        className="flex h-full w-full flex-col"
      >
        <div
          className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-2.5 dark:border-slate-700/80"
          style={{ position: "relative", zIndex: 10 }}
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">
            {sideTitle}
          </span>
          <button
            type="button"
            aria-label={flipButtonLabel}
            title={flipButtonLabel}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onFlip ? onFlip() : setInternalFlipped((v) => !v);
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/50 bg-white/80 text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover;border-slate-200 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:scale-[0.98] dark:border-slate-700/70 dark:bg-slate-900/80 dark:text-slate-100 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <span
              aria-hidden="true"
              className="text-base leading-none flip-icon"
            >
              ↻
            </span>
          </button>
        </div>

        <div
          className={`flex min-h-0 flex-1 flex-col px-1 ${hasMedia ? "pt-4" : "pt-2"}`}
        >
          <div
            className={`${hasMedia ? "pr-1 overflow-auto" : "flex-1 min-h-0 pr-1 overflow-auto"}`}
            style={{ paddingBottom: 24 }}
          >
            {renderFaceContent(side, normalizedSide)}
          </div>
        </div>

        {side === "front" ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex items-end justify-center">
            <div className="bg-white/90 dark:bg-slate-900/80 rounded-full px-3 py-1 shadow-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-600 dark:text-slate-200">
                Click to reveal
              </span>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);
    const handleChange = (event: MediaQueryListEvent) =>
      setReducedMotion(event.matches);
    mediaQuery.addEventListener?.("change", handleChange);
    return () => mediaQuery.removeEventListener?.("change", handleChange);
  }, []);

  React.useEffect(() => {
    const measure = () => {
      const cardWidth = cardShellRef.current?.clientWidth ?? 0;
      const normalizedFront = normalizeSide(front as any);
      const normalizedBack = normalizeSide(back as any);
      let frontDesired = 0;
      if (
        normalizedFront.type === "image" &&
        frontImageAspect.current &&
        cardWidth &&
        getLayoutMode(normalizedFront) === "image"
      ) {
        frontDesired = Math.round(cardWidth * frontImageAspect.current);
      } else frontDesired = frontRef.current?.scrollHeight ?? 0;

      let backDesired = 0;
      if (
        normalizedBack.type === "image" &&
        backImageAspect.current &&
        cardWidth &&
        getLayoutMode(normalizedBack) === "image"
      ) {
        backDesired = Math.round(cardWidth * backImageAspect.current);
      } else backDesired = backRef.current?.scrollHeight ?? 0;

      const maxAllowed =
        typeof window !== "undefined"
          ? Math.round(window.innerHeight * 0.78)
          : Infinity;
      frontDesired = Math.min(frontDesired || 0, maxAllowed);
      backDesired = Math.min(backDesired || 0, maxAllowed);

      const nextHeight = Math.max(frontDesired, backDesired, 420);
      setCardHeight((current) =>
        current === nextHeight ? current : nextHeight,
      );

      const frontTextH = frontTextRef.current?.scrollHeight ?? 0;
      const backTextH = backTextRef.current?.scrollHeight ?? 0;
      const headerReserve =
        typeof window !== "undefined" && window.innerWidth < 640
          ? 72
          : HEADER_RESERVE;
      const frontAvailable = Math.max(
        40,
        nextHeight - headerReserve - frontTextH,
      );
      const backAvailable = Math.max(
        40,
        nextHeight - headerReserve - backTextH,
      );
      setFrontImgMax(frontAvailable);
      setBackImgMax(backAvailable);

      const cardW = cardShellRef.current?.clientWidth ?? 0;
      const frontImgDisplay =
        frontImageAspect.current && cardW
          ? Math.min(cardW * frontImageAspect.current, frontAvailable)
          : null;
      const backImgDisplay =
        backImageAspect.current && cardW
          ? Math.min(cardW * backImageAspect.current, backAvailable)
          : null;
      setFrontCentered(
        Boolean(frontImgDisplay && frontImgDisplay + 8 < frontAvailable),
      );
      setBackCentered(
        Boolean(backImgDisplay && backImgDisplay + 8 < backAvailable),
      );
    };

    measure();
    const nodes = [frontRef.current, backRef.current].filter(
      Boolean,
    ) as HTMLElement[];
    if (!nodes.length) return;
    const observer = new ResizeObserver(() => measure());
    nodes.forEach((n) => observer.observe(n));
    if (cardShellRef.current) observer.observe(cardShellRef.current);
    return () => observer.disconnect();
  }, [front, back, internalIsFlipped]);

  const toggleFlip = () => {
    if (onFlip) return onFlip();
    setInternalFlipped((v) => !v);
  };

  return (
    <div
      className="flip-card group w-full focus:outline-none"
      data-flipped={internalIsFlipped ? "true" : "false"}
      style={{ width: "100%", maxWidth: "960px", marginInline: "auto" }}
      role="button"
      aria-pressed={internalIsFlipped}
      aria-label={internalIsFlipped ? "Flip card back" : "Flip card"}
      tabIndex={0}
      onClick={(e) => {
        const tgt = e.target as EventTarget | null;
        if (!(tgt instanceof Element)) {
          toggleFlip();
          return;
        }
        if (tgt.closest("button, a, input, textarea, select, label, .no-flip"))
          return;
        toggleFlip();
      }}
      onKeyDown={(e) => {
        const tgt = e.target as EventTarget | null;
        if (
          tgt instanceof Element &&
          tgt.closest("button, a, input, textarea, select, label, .no-flip")
        )
          return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleFlip();
        }
      }}
    >
      <div
        ref={cardShellRef}
        className="card-shell relative w-full bg-white transition-all duration-300 ease-out dark:bg-slate-950/95"
        style={{
          perspective: 1200,
          minHeight: cardHeight
            ? `${cardHeight}px`
            : "clamp(320px, 42vw, 520px)",
          height: cardHeight ? `${cardHeight}px` : undefined,
          border: "1px solid rgba(148, 163, 184, 0.28)",
          borderRadius: "1.5rem",
          boxShadow:
            "0 18px 36px rgba(15, 23, 42, 0.08), 0 6px 18px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div
          className="card-stage relative h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            transition: reducedMotion
              ? "none"
              : "transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
            transformOrigin: "center center",
            height: cardHeight ? `${cardHeight}px` : "100%",
          }}
        >
          <div
            className="card-face card-face-front absolute inset-0 flex flex-col overflow-hidden rounded-[22px] bg-white p-6 text-left dark:bg-slate-950/95"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            {renderCardFace("front", front)}
          </div>

          <div
            className="card-face card-face-back absolute inset-0 flex flex-col overflow-hidden rounded-[22px] bg-slate-50 p-6 text-left dark:bg-slate-900/95"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {renderCardFace("back", back)}
          </div>
        </div>
      </div>

      <style>{`
        .flip-card[data-flipped="true"] .card-stage { transform: rotateY(180deg); }
        .flip-card:hover .card-shell, .flip-card:focus-within .card-shell { box-shadow: 0 16px 42px rgba(15, 23, 42, 0.14); }
        .card-face { padding: clamp(1rem, 1.8vw, 1.75rem); }
        .card-face-back { background: rgba(248, 250, 252, 0.96); }
        .flip-card .card-shell { background: #f5f5f4; }
        .flip-icon { display: inline-block; transition: transform 420ms cubic-bezier(0.22, 1, 0.36, 1); }
        .flip-card[data-flipped="true"] .flip-icon { transform: rotate(180deg); }
        @media (max-width: 640px) { .card-face { padding: 1rem; } }
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
    items.length > 0
      ? items.map((item, index) => (
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
                dangerouslySetInnerHTML={{ __html: item.content }}
              />
            </AccordionContent>
          </AccordionItem>
        ))
      : null;

  if (!items.length) return null;
  return (
    <div className="w-full">
      {allowMultiple ? (
        <Accordion
          type="multiple"
          defaultValue={defaultMultipleValue}
          className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 dark:border-slate-700/60"
        >
          {accordionItems}
        </Accordion>
      ) : (
        <Accordion
          type="single"
          collapsible
          defaultValue={defaultSingleValue}
          className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 dark:border-slate-700/60"
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
      <style>{`
        .flip-cards-grid { width: 100%; margin: 0 auto; max-width: 1200px; gap: 1.25rem; }
        @media (max-width: 768px) { .flip-cards-grid { gap: 1rem; } }
      `}</style>

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

          case "file": {
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
                  <div
                    className="w-full overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-start justify-center"
                    style={{ maxHeight: "42vh" }}
                  >
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
          }

          case "expandable_section":
            return <ExpandableSectionBlock key={block.id} block={block} />;

          case "flip_card":
          case "key_concepts": {
            const cards = Array.isArray(block.cards) ? block.cards : [];
            const isSingleCard = cards.length === 1;
            return (
              <div key={block.id} className="space-y-4">
                {cards.length > 0 ? (
                  <div
                    className={
                      isSingleCard
                        ? "grid grid-cols-1 gap-6 flip-cards-grid items-start"
                        : "grid grid-cols-1 md:grid-cols-2 gap-6 flip-cards-grid items-start"
                    }
                  >
                    {cards.map((card, index) => (
                      <div
                        key={`${block.id}-${index}`}
                        className="min-w-0 w-full flip-card-item"
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
