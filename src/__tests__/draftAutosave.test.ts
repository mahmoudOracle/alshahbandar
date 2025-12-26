import { saveDraft, loadDraft, clearDraft, debounceSaveDraft } from '../utils/draftAutosave';

describe('draftAutosave util', () => {
  const key = 'test:draft:key';
  afterEach(() => {
    try { localStorage.removeItem(key); } catch (e) {}
  });

  test('save and load draft', () => {
    const data = { foo: 'bar' };
    saveDraft(key, data);
    const loaded = loadDraft(key);
    expect(loaded).toEqual(data);
    clearDraft(key);
    expect(loadDraft(key)).toBeNull();
  });

  test('debounceSaveDraft saves after delay', async () => {
    const data = { a: 1 };
    debounceSaveDraft(key, data, 100);
    // not immediate
    expect(loadDraft(key)).toBeNull();
    await new Promise(res => setTimeout(res, 150));
    expect(loadDraft(key)).toEqual(data);
  });
});
