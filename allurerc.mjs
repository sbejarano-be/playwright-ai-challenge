import { defineConfig } from 'allure';

const KNOWN_DEFECT = /\[UI-\d+\]/;
const ENVIRONMENT = /\[AMBIENTE\]/;

export default defineConfig({
  name: 'Automation Exercise · Playwright + IA',
  output: './allure-report',
  categories: [
    {
      name: 'Problemas de ambiente',
      matchers: (test) => ENVIRONMENT.test(test.message ?? ''),
    },
    {
      name: 'Defectos conocidos del producto',
      matchers: (test) => test.status === 'failed' && KNOWN_DEFECT.test(test.message ?? ''),
    },
    {
      name: 'Defectos nuevos del producto',
      matchers: (test) =>
        test.status === 'failed' && !KNOWN_DEFECT.test(test.message ?? '') && !ENVIRONMENT.test(test.message ?? ''),
    },
    {
      name: 'Errores de automatización',
      matchers: (test) => test.status === 'broken' && !ENVIRONMENT.test(test.message ?? ''),
    },
  ],
});
