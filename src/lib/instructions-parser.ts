export interface ParsedStep {
  number: number;
  text: string;
  isGroupHeader?: boolean;
  groupName?: string;
  duration?: string;
  temperature?: string;
  linkedIngredientIds?: number[];
}

export interface ParsedInstructions {
  steps: ParsedStep[];
  totalDuration?: string;
  notes?: string[];
}

export interface IngredientRef {
  id: number;
  name: string;
}

const DURATION_RE = /⏱\s*([\d.,]+)\s*(min|h(?:ora)?s?)/gi;
const TEMPERATURE_RE = /🔥\s*([\d.,]+)\s*°[CF]/gi;
const ID_REF_RE = /\[ingredient_id:(\d+)\]/g;
const AT_REF_RE = /@([a-zA-Záéíóúñü][a-zA-Záéíóúñü0-9_-]*)/g;

function buildIngredientMap(ingredients: IngredientRef[]): Map<number, string> {
  const m = new Map<number, string>();
  for (const ing of ingredients) {
    m.set(ing.id, ing.name);
  }
  return m;
}

function buildNameLookup(ingredients: IngredientRef[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const ing of ingredients) {
    const lower = ing.name.toLowerCase();
    m.set(lower, ing.id);
    m.set(lower.replace(/\s+/g, "-"), ing.id);
    m.set(lower.replace(/\s+/g, "_"), ing.id);
  }
  return m;
}

function parseReferences(
  text: string,
  idMap: Map<number, string>,
  nameLookup: Map<string, number>,
): number[] {
  const ids = new Map<number, true>();

  let m: RegExpExecArray | null;
  while ((m = ID_REF_RE.exec(text)) !== null) {
    const id = Number(m[1]);
    if (idMap.has(id)) ids.set(id, true);
  }

  while ((m = AT_REF_RE.exec(text)) !== null) {
    const key = m[1].toLowerCase();
    const found = nameLookup.get(key);
    if (found !== undefined) ids.set(found, true);
  }

  return [...ids.keys()];
}

function extractPattern(
  re: RegExp,
  text: string,
): { display: string; inline: string; rest: string } | null {
  re.lastIndex = 0;
  const m = re.exec(text);
  if (!m) return null;
  const full = m[0].trim();
  const inline = m[1] + (m[2] ? " " + m[2] : "");
  const rest = text.replace(re, "").trim();
  return { display: full, inline, rest };
}

export function parseInstructions(
  markdown: string,
  ingredients: IngredientRef[],
): ParsedInstructions {
  const idMap = buildIngredientMap(ingredients);
  const nameLookup = buildNameLookup(ingredients);
  const lines = markdown.split("\n");
  const steps: ParsedStep[] = [];
  const notes: string[] = [];
  let stepCounter = 0;
  let currentGroup: string | undefined;
  let totalDuration: string | undefined;
  let seenNumbered = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const groupMatch = line.match(/^#{2,3}\s+(.+)/);
    if (groupMatch) {
      currentGroup = groupMatch[1].trim();
      steps.push({
        number: 0,
        text: "",
        isGroupHeader: true,
        groupName: currentGroup,
      });
      continue;
    }

    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch) {
      seenNumbered = true;
      stepCounter++;
      let stepText = stepMatch[2].trim();

      const durationMatch = extractPattern(DURATION_RE, stepText);
      const temperatureMatch = extractPattern(TEMPERATURE_RE, stepText);
      if (durationMatch && !totalDuration) totalDuration = durationMatch.inline;
      stepText = durationMatch ? durationMatch.rest : stepText;
      stepText = temperatureMatch ? temperatureMatch.rest : stepText;

      const linked = parseReferences(stepText, idMap, nameLookup);

      steps.push({
        number: stepCounter,
        text: stepText,
        groupName: currentGroup,
        duration: durationMatch ? durationMatch.display : undefined,
        temperature: temperatureMatch ? temperatureMatch.display : undefined,
        linkedIngredientIds: linked.length > 0 ? linked : undefined,
      });
      continue;
    }

    if (!seenNumbered) continue;

    if (/^[-*]\s+(.+)/.test(line)) {
      notes.push("• " + line.replace(/^[-*]\s+/, ""));
    } else if (
      line.startsWith("---") ||
      line.startsWith("***") ||
      line.startsWith("___")
    ) {
      continue;
    } else {
      notes.push(line);
    }
  }

  return {
    steps,
    totalDuration: totalDuration || undefined,
    notes: notes.length > 0 ? notes : undefined,
  };
}

export function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function highlightReferences(
  text: string,
  ingredients: IngredientRef[],
): string {
  const escaped = escapeText(text);
  if (!ingredients.length) return escaped;

  const idMap = buildIngredientMap(ingredients);

  let result = escaped.replace(
    /\[ingredient_id:(\d+)\]/g,
    (_match, idStr: string) => {
      const id = Number(idStr);
      const name = idMap.get(id);
      if (name) {
        return `<span class="linked-ingredient">${escapeText(name)}</span>`;
      }
      return _match;
    },
  );

  result = result.replace(
    /@([a-zA-Záéíóúñü][a-zA-Záéíóúñü0-9_-]*)/g,
    (_match, ref: string) => {
      const key = ref.toLowerCase();
      for (const ing of ingredients) {
        if (
          ing.name.toLowerCase() === key ||
          ing.name.toLowerCase().replace(/\s+/g, "-") === key ||
          ing.name.toLowerCase().replace(/\s+/g, "_") === key
        ) {
          return `<span class="linked-ingredient">${escapeText(ing.name)}</span>`;
        }
      }
      return _match;
    },
  );

  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*(.+?)\*/g, "<em>$1</em>");

  return result;
}

export type TimerInfo = { value: number; unit: string };

export function extractTimersFromHtml(html: string): TimerInfo[] {
  const timers: TimerInfo[] = [];
  const timerRe =
    /<span[^>]*data-type="timer"[^>]*data-value="(\d+)"[^>]*data-unit="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = timerRe.exec(html)) !== null) {
    timers.push({ value: Number(m[1]), unit: m[2] });
  }
  return timers;
}

export function parseHtmlSteps(html: string): string[] {
  const steps: string[] = [];
  const blockRe = /<(div|h2|h3|p|ol|ul|li)[^>]*>[\s\S]*?<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(html)) !== null) {
    const block = m[0].trim();
    if (block) steps.push(block);
  }
  if (steps.length === 0 && html.trim()) steps.push(html);
  return steps;
}

export function markdownToEditorHtml(
  markdown: string,
  ingredients: IngredientRef[],
): string {
  const idMap = buildIngredientMap(ingredients);
  const lines = markdown.split("\n");
  const blocks: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      blocks.push("<br>");
      continue;
    }

    let processed = line;

    const groupMatch = line.match(/^#{2,3}\s+(.+)/);
    if (groupMatch) {
      const title = escapeText(groupMatch[1].trim());
      blocks.push(`<h2>${title}</h2>`);
      continue;
    }

    const stepMatch = line.match(/^(\d+)[.)]\s+(.+)/);
    if (stepMatch) {
      processed = stepMatch[2].trim();
    }

    processed = processed
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");

    processed = processed.replace(/\[ingredient_id:(\d+)\]/g, (_m, idStr) => {
      const id = Number(idStr);
      const name = idMap.get(id);
      if (name) {
        return `<span data-type="ingredient" data-id="${id}" contenteditable="false" class="tag-badge">${escapeText(name)}</span>`;
      }
      return _m;
    });

    processed = processed.replace(
      /@([a-zA-Záéíóúñü][a-zA-Záéíóúñü0-9_-]*)/g,
      (_m, ref) => {
        const key = ref.toLowerCase();
        for (const ing of ingredients) {
          if (
            ing.name.toLowerCase() === key ||
            ing.name.toLowerCase().replace(/\s+/g, "-") === key ||
            ing.name.toLowerCase().replace(/\s+/g, "_") === key
          ) {
            return `<span data-type="ingredient" data-id="${ing.id}" contenteditable="false" class="tag-badge">${escapeText(ing.name)}</span>`;
          }
        }
        return _m;
      },
    );

    processed = processed.replace(
      /⏱\s*(\d+)\s*(seg|min|hr|h(?:ora)?s?)/gi,
      (_m, val: string, unit: string) => {
        const u = unit.toLowerCase().startsWith("h")
          ? "hr"
          : unit.toLowerCase().startsWith("s")
            ? "seg"
            : "min";
        return `<span data-type="timer" data-value="${val}" data-unit="${u}" contenteditable="false" class="timer-badge">⏱ ${val} ${u}</span>`;
      },
    );

    const tag = stepMatch ? "div" : "p";
    blocks.push(`<${tag}>${processed}</${tag}>`);
  }

  return blocks.join("\n");
}

export function renderMarkdownPreview(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  let html = escaped
    .replace(/^###\s+(.+)$/gm, '<h4 class="preview-h4">$1</h4>')
    .replace(/^##\s+(.+)$/gm, '<h3 class="preview-h3">$1</h3>')
    .replace(/^(\d+)[.)]\s+(.+)$/gm, '<div class="preview-step">$1. $2</div>')
    .replace(/^- (.+)$/gm, '<div class="preview-bullet">• $1</div>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /@([a-zA-Záéíóúñü][a-zA-Záéíóúñü0-9_-]*)/g,
      '<span class="preview-badge">$1</span>',
    );

  html = html.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br>");
  html = "<p>" + html + "</p>";

  return html;
}
