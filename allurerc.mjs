import { defineConfig } from 'allure';

const KNOWN_DEFECT = /\[UI-\d+\]/;
const ENVIRONMENT = /\[AMBIENTE\]/;

const REPORT_NAME = 'Automation Exercise · Playwright + IA';

export default defineConfig({
  name: REPORT_NAME,
  output: './allure-report',
  plugins: {
    awesome: {
      options: {
        // Un solo index.html con los datos incluidos: se abre con doble clic, también desde el artefacto del CI.
        singleFile: true,
        reportName: REPORT_NAME,
        reportLanguage: 'es',
      },
    },
  },
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
