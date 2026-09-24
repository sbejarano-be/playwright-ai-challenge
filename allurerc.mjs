import { defineConfig } from 'allure';

const KNOWN_DEFECT = /\[UI-\d+\]/;

export default defineConfig({
  name: 'Automation Exercise · Playwright + IA',
  output: './allure-report',
  categories: [
    {
      name: 'Defectos conocidos del producto',
      matchers: (test) => test.status === 'failed' && KNOWN_DEFECT.test(test.message ?? ''),
    },
    {
      name: 'Defectos nuevos del producto',
      matchers: (test) => test.status === 'failed' && !KNOWN_DEFECT.test(test.message ?? ''),
    },
    {
      name: 'Errores de automatización',
      matchers: { statuses: ['broken'] },
    },
  ],
});
