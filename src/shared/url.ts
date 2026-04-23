import type { DirectMediaType } from "./contracts";

const directMediaMatchers: Array<{
  pattern: RegExp;
  mediaType: DirectMediaType;
}> = [
  { pattern: /\.mp4($|\?)/i, mediaType: "mp4" },
  { pattern: /\.webm($|\?)/i, mediaType: "webm" },
  { pattern: /\.m3u8($|\?)/i, mediaType: "m3u8" }
];

export type UrlClassification =
  | {
      kind: "direct-media";
      directMediaType: DirectMediaType;
      domain: string;
    }
  | {
      kind: "webpage";
      directMediaType: null;
      domain: string;
    };

export function classifyUrl(input: string): UrlClassification {
  const url = new URL(input);
  const directMatch = directMediaMatchers.find(({ pattern }) =>
    pattern.test(url.href)
  );

  if (directMatch) {
    return {
      kind: "direct-media",
      directMediaType: directMatch.mediaType,
      domain: url.hostname
    };
  }

  return {
    kind: "webpage",
    directMediaType: null,
    domain: url.hostname
  };
}
