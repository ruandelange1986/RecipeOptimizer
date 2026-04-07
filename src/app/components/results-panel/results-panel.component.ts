import { Component, input } from '@angular/core';
import { OptimizationResult } from '../../models/recipe.model';
import { INGREDIENTS } from '../../models/recipe.model';

@Component({
  selector: 'app-results-panel',
  standalone: true,
  imports: [],
  templateUrl: './results-panel.component.html',
  styleUrl: './results-panel.component.css',
})
export class ResultsPanelComponent {
  result    = input.required<OptimizationResult>();
  solveMs   = input<number>(0);

  get ingredientSummary(): { label: string; emoji: string; used: number; remaining: number; total: number }[] {
    return INGREDIENTS.map(ing => ({
      label: ing.label,
      emoji: ing.emoji,
      used:      this.result().usedIngredients[ing.key]    || 0,
      remaining: this.result().remainingIngredients[ing.key] || 0,
      total: (this.result().usedIngredients[ing.key] || 0)
           + (this.result().remainingIngredients[ing.key] || 0),
    })).filter(i => i.total > 0);
  }

  usedPercent(used: number, total: number): number {
    return total === 0 ? 0 : (used / total) * 100;
  }

  fmt(n: number): string {
    return new Intl.NumberFormat().format(n);
  }
}
