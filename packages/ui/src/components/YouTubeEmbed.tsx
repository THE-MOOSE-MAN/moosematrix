export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const safeId = encodeURIComponent(videoId);
  const src = `https://www.youtube-nocookie.com/embed/${safeId}?rel=0&modestbranding=1`;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
      <iframe
        className="absolute inset-0 h-full w-full"
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        allow="encrypted-media; picture-in-picture; web-share"
      />
    </div>
  );
}
