import { test, expect, mockApi, expectNoConsoleErrors } from './fixtures';

/** Fake Web Speech API: records the requested language and returns one final transcript. */
const fakeRecognition = () => {
  class FakeRecognition {
    lang = '';
    interimResults = false;
    continuous = false;
    maxAlternatives = 1;
    onresult: ((event: unknown) => void) | null = null;
    onerror: ((event: unknown) => void) | null = null;
    onend: (() => void) | null = null;
    start() {
      (window as any).__speechLang = this.lang;
      setTimeout(() => {
        this.onresult?.({ resultIndex: 0, results: [Object.assign([{ transcript: 'tour de rafting en Pacuare' }], { isFinal: true })] });
        this.onend?.();
      }, 50);
    }
    stop() { this.onend?.(); }
    abort() {}
  }
  (window as any).SpeechRecognition = FakeRecognition;
  (window as any).webkitSpeechRecognition = FakeRecognition;
};

test('assistant mic dictates into the input with es-CR and never sends automatically', async ({ page, consoleProblems }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await page.addInitScript(fakeRecognition);
  await mockApi(page);
  let conciergeCalls = 0;
  page.on('request', (r) => { if (r.url().includes('/api/gemini/concierge')) conciergeCalls += 1; });
  await page.goto('/ai');
  const mic = page.getByTestId('assistant-mic');
  await expect(mic).toBeVisible();
  await expect(mic).toHaveAttribute('aria-label', 'Dictar por voz');
  await mic.click();
  await expect(page.getByPlaceholder(/Pregunta a/)).toHaveValue('tour de rafting en Pacuare');
  expect(await page.evaluate(() => (window as any).__speechLang)).toBe('es-CR');
  expect(conciergeCalls).toBe(0);
  expectNoConsoleErrors(consoleProblems);
});

test('assistant hides the mic when the browser has no speech recognition', async ({ page }) => {
  await page.addInitScript(() => { if (window === window.top) localStorage.setItem('cookie-consent', 'essential'); });
  await page.addInitScript(() => {
    delete (window as any).SpeechRecognition;
    delete (window as any).webkitSpeechRecognition;
  });
  await mockApi(page);
  await page.goto('/ai');
  await expect(page.getByPlaceholder(/Pregunta a/)).toBeVisible();
  await expect(page.getByTestId('assistant-mic')).toHaveCount(0);
});
