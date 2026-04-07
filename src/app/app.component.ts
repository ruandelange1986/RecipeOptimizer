import { Component, computed, signal, OnInit } from '@angular/core';
import { IngredientPanelComponent } from './components/ingredient-panel/ingredient-panel.component';
import { RecipeCardComponent } from './components/recipe-card/recipe-card.component';
import { ResultsPanelComponent } from './components/results-panel/results-panel.component';
import { INGREDIENTS, RECIPES, IngredientKey, OptimizationResult } from './models/recipe.model';
import { OptimizerService } from './services/optimizer.service';

interface Preset { label: string; value: number; }

const PRESETS: Preset[] = [
  { label: 'Default', value: -1 },
  { label: '100', value: 100 },
  { label: '1 000', value: 1000 },
  { label: '10 000', value: 10000 },
];

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [IngredientPanelComponent, RecipeCardComponent, ResultsPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly ingredients = INGREDIENTS;
  readonly recipes     = RECIPES;
  readonly presets     = PRESETS;

  amounts = signal<Record<IngredientKey, number>>(
    Object.fromEntries(INGREDIENTS.map(i => [i.key, i.defaultAmount])) as Record<IngredientKey, number>
  );

  result = signal<OptimizationResult | null>(null);
  solveMs = signal<number>(0);
  isOptimizing = signal(false);

  optimizedCounts = computed<Record<string, number>>(() => {
    const r = this.result();
    return r ? r.recipeCounts : {};
  });

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private optimizer: OptimizerService) {}

  ngOnInit(): void { this.runOptimization(); }

  onAmountChange(event: { key: IngredientKey; value: number }): void {
    this.amounts.update(prev => ({ ...prev, [event.key]: event.value }));
    this.scheduleOptimize();
  }

  applyPreset(preset: Preset): void {
    if (preset.value === -1) {
      this.resetDefaults();
    } else {
      this.amounts.set(
        Object.fromEntries(INGREDIENTS.map(i => [i.key, preset.value])) as Record<IngredientKey, number>
      );
      this.runOptimization();
    }
  }

  resetDefaults(): void {
    this.amounts.set(
      Object.fromEntries(INGREDIENTS.map(i => [i.key, i.defaultAmount])) as Record<IngredientKey, number>
    );
    this.runOptimization();
  }

  clearAll(): void {
    this.amounts.set(
      Object.fromEntries(INGREDIENTS.map(i => [i.key, 0])) as Record<IngredientKey, number>
    );
    this.runOptimization();
  }

  private scheduleOptimize(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.runOptimization(), 80);
  }

  runOptimization(): void {
    this.isOptimizing.set(true);
    setTimeout(() => {
      const t0 = performance.now();
      const result = this.optimizer.optimize(this.amounts());
      const elapsed = Math.round(performance.now() - t0);
      this.result.set(result);
      this.solveMs.set(elapsed < 1 ? 1 : elapsed);
      this.isOptimizing.set(false);
    }, 16);
  }
}
