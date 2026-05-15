import DOMPurify from "isomorphic-dompurify";

const ALLOWED_TAGS = [
  "div",
  "h2",
  "h3",
  "p",
  "strong",
  "em",
  "u",
  "s",
  "ol",
  "ul",
  "li",
  "br",
  "span",
];

const ALLOWED_ATTRS = [
  "data-type",
  "data-id",
  "data-value",
  "data-unit",
  "data-ref",
  "class",
  "contenteditable",
];

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRS,
    ALLOW_DATA_ATTR: false,
  });
}

export function looksLikeHtml(text: string): boolean {
  return /^\s*</.test(text);
}
