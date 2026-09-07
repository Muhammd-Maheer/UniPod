export interface ParsedName {
  title: string;
  artist: string | null;
}

// Common junk YouTube-downloader tools tack onto filenames
const NOISE_PATTERNS: RegExp[] = [
  /\(\s*official\s*(music\s*)?video\s*\)/gi,
  /\(\s*official\s*audio\s*\)/gi,
  /\(\s*official\s*\)/gi,
  /\(\s*lyrics?\s*(video)?\s*\)/gi,
  /\(\s*audio\s*\)/gi,
  /\(\s*visualizer\s*\)/gi,
  /\(\s*hd\s*\)/gi,
  /\(\s*4k\s*\)/gi,
  /\[\s*official\s*(music\s*)?video\s*\]/gi,
  /\[\s*official\s*audio\s*\]/gi,
  /\[\s*lyrics?\s*\]/gi,
  /\[\s*hd\s*\]/gi,
  /\[\s*4k\s*\]/gi,
];

const SEPARATORS = [' - ', ' – ', ' — ', ' ~ '];

export const parseFilenameForMetadata = (rawName: string): ParsedName => {
  let cleaned = rawName;
  NOISE_PATTERNS.forEach((pattern) => {
    cleaned = cleaned.replace(pattern, '');
  });
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

  for (const sep of SEPARATORS) {
    if (cleaned.includes(sep)) {
      const [first, ...rest] = cleaned.split(sep);
      const artist = first.trim();
      const title = rest.join(sep).trim();
      if (artist && title) {
        return { artist, title };
      }
    }
  }

  // No recognizable separator — can't guess an artist from this
  return { artist: null, title: cleaned };
};

export const extractArtistName = (raw: string): string => {
  let remainder: string | null = null;

  for (const sep of SEPARATORS) {
    const idx = raw.indexOf(sep);
    if (idx !== -1) {
      remainder = raw.slice(idx + sep.length);
      break;
    }
  }

  if (remainder === null) return '';

  NOISE_PATTERNS.forEach((pattern) => {
    remainder = (remainder as string).replace(pattern, '');
  });

  const trimmed = remainder.trim();
  if (!trimmed) return '';

  const firstWord = trimmed.split(/\s+/)[0];
  return firstWord.replace(/[.,;:()[\]]+$/, '');
};