import { Component, input } from '@angular/core';
import { Recipe, IngredientKey, INGREDIENTS } from '../../models/recipe.model';

@Component({
  selector: 'app-recipe-card',
  standalone: true,
  imports: [],
  templateUrl: './recipe-card.component.html',
  styleUrl: './recipe-card.component.css',
})
export class RecipeCardComponent {
  recipe = input.required<Recipe>();
  available = input.required<Record<IngredientKey, number>>();
  optimizedCount = input<number>(0);

  get requirementEntries(): { label: string; emoji: string; needed: number; key: IngredientKey }[] {
    return Object.entries(this.recipe().requirements).map(([key, needed]) => {
      const ing = INGREDIENTS.find(i => i.key === key)!;
      return { label: ing.label, emoji: ing.emoji, needed: needed as number, key: key as IngredientKey };
    });
  }

  get maxCanMake(): number {
    const reqs = this.recipe().requirements;
    let max = Infinity;
    for (const [key, needed] of Object.entries(reqs) as [IngredientKey, number][]) {
      const can = Math.floor(this.available()[key] / needed);
      if (can < max) max = can;
    }
    return max === Infinity ? 0 : max;
  }

  get usagePercent(): number {
    const max = this.maxCanMake;
    if (max === 0) return 0;
    return Math.min(100, (this.optimizedCount() / max) * 100);
  }
}
