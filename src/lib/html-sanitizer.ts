import sanitizeHtmlLib from "sanitize-html";

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

const ALLOWED_ATTRS = {
  "*": [
    "data-type",
    "data-id",
    "data-value",
    "data-unit",
    "data-ref",
    "class",
    "contenteditable",
  ],
};

export function sanitizeHtml(html: string): string {
  return sanitizeHtmlLib(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRS,
  });
}

export function looksLikeHtml(text: string): boolean {
  return /^\s*</.test(text);
}
