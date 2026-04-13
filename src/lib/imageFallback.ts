const DEFAULT_PLACEHOLDER = "/placeholder.svg";

export function applyImageFallback(
  img: HTMLImageElement,
  fallbackSrc: string = DEFAULT_PLACEHOLDER,
): void {
  if (img.dataset.fallbackApplied === "1") return;
  img.dataset.fallbackApplied = "1";
  img.src = fallbackSrc;
}

