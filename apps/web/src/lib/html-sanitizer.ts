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

const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);
const VOID_TAG_SET = new Set(["br"]);

const ALLOWED_ATTR_SET = new Set([
  "data-type",
  "data-id",
  "data-value",
  "data-unit",
  "data-ref",
  "class",
  "contenteditable",
]);

const DANGEROUS_BLOCK_TAGS =
  /<\s*(script|style|iframe|object|embed|template|svg|math)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi;
const DANGEROUS_OPEN_TAGS =
  /<\s*(script|style|iframe|object|embed|template|svg|math)\b[^>]*\/?>/gi;
const HTML_TOKEN = /<\/?[a-zA-Z][^>]*>/g;
const TAG_NAME = /^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>?$/;
const ATTR_TOKEN =
  /([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

export function sanitizeHtml(html: string): string {
  const input = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<!doctype[^>]*>/gi, "")
    .replace(DANGEROUS_BLOCK_TAGS, "")
    .replace(DANGEROUS_OPEN_TAGS, "");

  let output = "";
  let cursor = 0;
  let match: RegExpExecArray | null;

  HTML_TOKEN.lastIndex = 0;
  while ((match = HTML_TOKEN.exec(input)) !== null) {
    output += escapeText(input.slice(cursor, match.index));
    output += sanitizeTag(match[0]);
    cursor = match.index + match[0].length;
  }

  output += escapeText(input.slice(cursor));
  return output;
}

export function looksLikeHtml(text: string): boolean {
  return /^\s*</.test(text);
}

function sanitizeTag(rawTag: string): string {
  const tagMatch = TAG_NAME.exec(rawTag);
  if (!tagMatch) {
    return "";
  }

  const [, closingSlash, rawTagName, rawAttrs] = tagMatch;
  const tagName = rawTagName.toLowerCase();
  if (!ALLOWED_TAG_SET.has(tagName)) {
    return "";
  }

  if (closingSlash) {
    return VOID_TAG_SET.has(tagName) ? "" : `</${tagName}>`;
  }

  if (VOID_TAG_SET.has(tagName)) {
    return `<${tagName}>`;
  }

  const attrs = sanitizeAttrs(rawAttrs);
  return attrs ? `<${tagName} ${attrs}>` : `<${tagName}>`;
}

function sanitizeAttrs(rawAttrs: string): string {
  const attrs: string[] = [];
  let match: RegExpExecArray | null;

  ATTR_TOKEN.lastIndex = 0;
  while ((match = ATTR_TOKEN.exec(rawAttrs)) !== null) {
    const attrName = match[1].toLowerCase();
    if (!ALLOWED_ATTR_SET.has(attrName)) {
      continue;
    }

    const rawValue = match[2] ?? match[3] ?? match[4] ?? "";
    const value = sanitizeAttrValue(attrName, rawValue);
    if (value === null) {
      continue;
    }

    attrs.push(`${attrName}="${escapeAttr(value)}"`);
  }

  return attrs.join(" ");
}

function sanitizeAttrValue(attrName: string, value: string): string | null {
  const normalizedValue = value.replace(/[\u0000-\u001f\u007f]/g, "").trim();

  if (attrName === "class") {
    const className = normalizedValue.replace(/[^a-zA-Z0-9_:\-\s]/g, " ");
    return className.replace(/\s+/g, " ").trim();
  }

  if (attrName === "contenteditable") {
    if (
      !normalizedValue ||
      normalizedValue === "true" ||
      normalizedValue === "false"
    ) {
      return normalizedValue;
    }
    return null;
  }

  return normalizedValue;
}

function escapeText(value: string): string {
  return value
    .replace(/&(?!(?:#\d+|#x[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replace(/"/g, "&quot;");
}
