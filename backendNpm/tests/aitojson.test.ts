import { AIToJSON } from '../src/aitojson/index';

describe('AIToJSON', () => {
  let aiGenerator: AIToJSON;

  beforeAll(() => {
    // Create instance without API key for testing
    aiGenerator = new AIToJSON('test-key');
  });

  test('should instantiate AIToJSON', () => {
    expect(aiGenerator).toBeDefined();
  });

  test('should generate prompt correctly', () => {
    const prompt = (aiGenerator as any).generatePrompt(
      'Pemrograman Web',
      'TIF101',
      3,
      1
    );

    expect(prompt).toContain('Pemrograman Web');
    expect(prompt).toContain('TIF101');
    expect(prompt).toContain('SKS: 3');
    expect(prompt).toContain('Semester: 1');
    expect(prompt).toContain('JSON');
  });

  test('should parse valid JSON response', () => {
    const jsonResponse = JSON.stringify({
      deskripsi: 'Test description',
      cpl: [{ kode: 'CPL1', pernyataan: 'Test CPL' }],
      cpmk: [],
      minggu: [],
      referensi: [],
    });

    const parsed = aiGenerator.parseJsonResponse(jsonResponse);
    expect(parsed.deskripsi).toBe('Test description');
    expect(parsed.cpl).toHaveLength(1);
  });

  test('should handle JSON with markdown code block', () => {
    const jsonResponse = `\`\`\`json
    {
      "deskripsi": "Test",
      "cpl": [],
      "cpmk": [],
      "minggu": [],
      "referensi": []
    }
    \`\`\``;

    const parsed = aiGenerator.parseJsonResponse(jsonResponse);
    expect(parsed.deskripsi).toBe('Test');
  });

  test('should repair truncated JSON', () => {
    const truncatedJson = `{
      "deskripsi": "Test desc",
      "cpl": [
        {"kode": "CPL1", "pernyataan": "Test"}
      ],
      "cpmk": [`;

    const parsed = aiGenerator.parseJsonResponse(truncatedJson);
    // Should repair and return valid object
    expect(parsed).toBeDefined();
  });

  test('should handle JSON with trailing commas', () => {
    const jsonWithCommas = `{
      "deskripsi": "Test",
      "cpl": [],
      "cpmk": [],
    }`;

    const parsed = aiGenerator.parseJsonResponse(jsonWithCommas);
    expect(parsed.deskripsi).toBe('Test');
  });
});
