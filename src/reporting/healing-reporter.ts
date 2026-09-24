import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { FullConfig, Reporter, TestCase, TestResult } from '@playwright/test/reporter';

const SELF_HEALED = 'self-healed';
const FRAMEWORK_PROJECT = 'framework';

interface HealedSelector {
  test: string;
  repair: string;
}

/** Reúne las reparaciones de todos los procesos en test-results/healing-report.json: la lista de selectores a actualizar. */
export default class HealingReporter implements Reporter {
  private readonly healed: HealedSelector[] = [];
  private outputDir = 'test-results';

  onBegin(config: FullConfig): void {
    this.outputDir = config.projects[0]?.outputDir ?? this.outputDir;
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    // Las pruebas del propio framework reparan selectores a propósito: no son mantenimiento pendiente.
    if (test.parent.project()?.name === FRAMEWORK_PROJECT) {
      return;
    }
    const repairs = new Set(
      [...test.annotations, ...result.annotations]
        .filter((annotation) => annotation.type === SELF_HEALED)
        .map((annotation) => annotation.description ?? ''),
    );
    repairs.forEach((repair) => this.healed.push({ test: test.titlePath().slice(1).join(' › '), repair }));
  }

  onEnd(): void {
    if (this.healed.length === 0) {
      return;
    }
    mkdirSync(this.outputDir, { recursive: true });
    const file = path.join(this.outputDir, 'healing-report.json');
    writeFileSync(file, JSON.stringify(this.healed, null, 2));
    console.log(`\n${this.healed.length} selector(es) reparados por IA. Actualízalos en el código: ${file}`);
  }

  printsToStdio(): boolean {
    return false;
  }
}
