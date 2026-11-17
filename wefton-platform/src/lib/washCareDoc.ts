// ============================================================
// Wefton Copper — wash care document format (WC-Issue-11)
// ============================================================
// Admins download the standard guide as a plain-text document, edit it
// and upload it for a new product. Format:
//
//   Name: Cotton Crew Neck T-shirt
//   Fabric: 100% cotton, knitted jersey
//   Quick care: Machine wash cold | Do not bleach | …
//
//   # Washing
//   - Turn the garment inside out …
//
//   # What to Avoid
//   - Bleach …
//
//   Note: Following this guide …
import { slugify } from '@/lib/utils';
import type { WashCareGuide } from '@/config/washCare';
import type { ParseResult } from '@/lib/sizeChart';

const AVOID_HEADING = 'what to avoid';

export function washCareToText(guide: WashCareGuide): string {
  const out = [
    `Name: ${guide.name}`,
    `Fabric: ${guide.fabric}`,
    `Quick care: ${guide.quickCare.join(' | ')}`,
    '',
  ];
  for (const section of guide.sections) {
    out.push(`# ${section.title}`, ...section.items.map((i) => `- ${i}`), '');
  }
  if (guide.avoid.length) out.push('# What to Avoid', ...guide.avoid.map((i) => `- ${i}`), '');
  if (guide.note) out.push(`Note: ${guide.note}`, '');
  return out.join('\n');
}

export function parseWashCareText(text: string): ParseResult<WashCareGuide> {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  let name = '';
  let fabric = '';
  let quickCare: string[] = [];
  let note = '';
  const sections: WashCareGuide['sections'] = [];
  const avoid: string[] = [];
  let current: { title: string; items: string[] } | null = null;

  for (const [i, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line) continue;
    const field = /^(name|fabric|quick care|note)\s*:\s*(.*)$/i.exec(line);
    if (field && !line.startsWith('-')) {
      const key = field[1].toLowerCase();
      const value = field[2].trim();
      if (key === 'name') name = value;
      else if (key === 'fabric') fabric = value;
      else if (key === 'quick care') quickCare = value.split('|').map((s) => s.trim()).filter(Boolean);
      else note = value;
      continue;
    }
    if (line.startsWith('#')) {
      const title = line.replace(/^#+/, '').trim();
      if (!title) return { ok: false, error: `Line ${i + 1}: the section heading is empty.` };
      current = { title, items: [] };
      if (title.toLowerCase() !== AVOID_HEADING) sections.push(current);
      continue;
    }
    if (/^[-*•]/.test(line)) {
      const item = line.replace(/^[-*•]\s*/, '').trim();
      if (!current) return { ok: false, error: `Line ${i + 1}: put a "# Heading" line before the first instruction.` };
      if (!item) continue;
      if (current.title.toLowerCase() === AVOID_HEADING) avoid.push(item);
      else current.items.push(item);
      continue;
    }
    return {
      ok: false,
      error: `Line ${i + 1}: start the line with "# " for a heading, "- " for an instruction, or Name:, Fabric:, Quick care:, Note:.`,
    };
  }

  if (!name) return { ok: false, error: 'Add a "Name:" line.' };
  const filled = sections.filter((s) => s.items.length);
  if (!filled.length) return { ok: false, error: 'Add at least one section with instructions.' };
  return {
    ok: true,
    value: {
      id: slugify(name) || 'custom',
      name,
      fabric,
      quickCare,
      sections: filled,
      avoid,
      ...(note ? { note } : {}),
    },
  };
}
