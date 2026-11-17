import { describe, expect, it } from 'vitest';
import { STANDARD_COTTON_TEE_GUIDE } from '@/config/washCare';
import { parseWashCareText, washCareToText } from '@/lib/washCareDoc';

describe('wash care document', () => {
  it('round-trips the standard guide', () => {
    const r = parseWashCareText(washCareToText(STANDARD_COTTON_TEE_GUIDE));
    expect(r).toEqual({ ok: true, value: STANDARD_COTTON_TEE_GUIDE });
  });
  it('parses a short custom guide', () => {
    const r = parseWashCareText('Name: Linen Shirt\n\n# Washing\n* Hand wash\n# What to Avoid\n- Bleach\n');
    expect(r.ok && r.value).toEqual({
      id: 'linen-shirt',
      name: 'Linen Shirt',
      fabric: '',
      quickCare: [],
      sections: [{ title: 'Washing', items: ['Hand wash'] }],
      avoid: ['Bleach'],
    });
  });
  it('explains bad documents', () => {
    expect(parseWashCareText('# Washing\n- Hand wash')).toMatchObject({ ok: false, error: expect.stringContaining('Name') });
    expect(parseWashCareText('Name: X\n- Hand wash')).toMatchObject({ ok: false, error: expect.stringContaining('Heading') });
    expect(parseWashCareText('Name: X\n# Washing\nrandom text')).toMatchObject({ ok: false, error: expect.stringContaining('Line 3') });
    expect(parseWashCareText('Name: X\n# Washing\n')).toMatchObject({ ok: false });
  });
});
