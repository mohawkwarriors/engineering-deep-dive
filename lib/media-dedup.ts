export interface ImageCandidate {
  url: string;
  title?: string;
  source?: string;
  score?: number;
  width?: number;
  height?: number;
}

// Known local duplicate file aliases where different paths reference identical image assets
const KNOWN_LOCAL_ALIASES: Record<string, string> = {
  "/images/references/vapor-chamber/exploded-layer-stack.png": "/images/vapor-chamber-exploded-stack.png",
  "images/references/vapor-chamber/exploded-layer-stack.png": "/images/vapor-chamber-exploded-stack.png",
};

/**
 * Normalizes an image URL for strict deduplication comparison.
 * - Trims whitespace
 * - Strips protocol (http:// vs https://)
 * - Resolves known duplicate aliases
 * - Normalizes local and CDN query parameters (e.g. Unsplash w, h, auto, fit, q)
 * - Strips trailing slashes and hash fragments
 */
export function normalizeImageUrl(url: string): string {
  if (!url || typeof url !== "string") return "";

  let cleaned = url.trim();
  if (!cleaned) return "";

  // Check known local alias map
  const normalizedAliasKey = cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
  if (KNOWN_LOCAL_ALIASES[cleaned] || KNOWN_LOCAL_ALIASES[normalizedAliasKey]) {
    cleaned = KNOWN_LOCAL_ALIASES[cleaned] || KNOWN_LOCAL_ALIASES[normalizedAliasKey];
  }

  // Handle local relative paths
  if (cleaned.startsWith("/") || (!cleaned.startsWith("http://") && !cleaned.startsWith("https://") && !cleaned.startsWith("//"))) {
    const withoutHash = cleaned.split("#")[0];
    const [pathPart] = withoutHash.split("?");
    const cleanPath = pathPart.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "").toLowerCase();
    return cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  }

  try {
    const parsed = new URL(cleaned.startsWith("//") ? `https:${cleaned}` : cleaned);
    const host = parsed.hostname.toLowerCase();
    let pathname = parsed.pathname.toLowerCase().replace(/\/+$/, "");

    // For static image files, strip sizing/tracking query params
    const isImageFile = /\.(jpe?g|png|webp|svg|gif|avif)$/i.test(pathname);

    // If Unsplash photo URL, the pathname (photo ID) is the unique image identifier
    if (host.includes("images.unsplash.com") || host.includes("unsplash.com")) {
      return `unsplash:${pathname}`;
    }

    if (isImageFile) {
      return `${host}${pathname}`;
    }

    // Retain non-tracking query parameters sorted for deterministic matching
    const searchParams = new URLSearchParams(parsed.search);
    const trackingKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ref", "fbclid", "gclid", "w", "h", "width", "height", "fit", "crop", "auto", "q", "quality"];
    for (const key of trackingKeys) {
      searchParams.delete(key);
    }
    searchParams.sort();
    const cleanSearch = searchParams.toString();

    return cleanSearch ? `${host}${pathname}?${cleanSearch}` : `${host}${pathname}`;
  } catch {
    // Fallback if URL parsing fails: basic string cleaning
    return cleaned
      .replace(/^https?:\/\//i, "")
      .replace(/[?#].*$/, "")
      .replace(/\/+$/, "")
      .toLowerCase();
  }
}

/**
 * Normalizes an image title for deduplication comparison.
 * Keeps alphanumeric characters, trims, and collapses whitespace.
 */
export function normalizeImageTitle(title?: string): string {
  if (!title || typeof title !== "string") return "";

  const cleaned = title
    .toLowerCase()
    .replace(/[—–_:;,.()[\]{}'"“”‘’/\\|!?#*&^%$@~`+=\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // If title is too short or generic, do not treat as unique collision key
  if (cleaned.length < 5) return "";

  return cleaned;
}

/**
 * Deduplicates an array of ImageCandidate objects.
 * Guarantees:
 * - Preserves first occurrence order
 * - Eliminates duplicate images by normalized URL
 * - Eliminates duplicate images by normalized title
 * - Drops invalid entries lacking a valid URL
 */
export function deduplicateFigureImages(images?: ImageCandidate[] | null): ImageCandidate[] {
  if (!Array.isArray(images) || images.length === 0) {
    return [];
  }

  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const uniqueImages: ImageCandidate[] = [];

  for (const img of images) {
    if (!img || !img.url || typeof img.url !== "string") continue;

    const normUrl = normalizeImageUrl(img.url);
    if (!normUrl || seenUrls.has(normUrl)) {
      continue;
    }

    const normTitle = normalizeImageTitle(img.title);
    if (normTitle && seenTitles.has(normTitle)) {
      continue;
    }

    seenUrls.add(normUrl);
    if (normTitle) {
      seenTitles.add(normTitle);
    }

    uniqueImages.push(img);
  }

  return uniqueImages;
}
