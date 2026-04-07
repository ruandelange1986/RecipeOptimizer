import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Ingredient, IngredientKey } from '../../models/recipe.model';

@Component({
  selector: 'app-ingredient-panel',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './ingredient-panel.component.html',
  styleUrl: './ingredient-panel.component.css',
})
export class IngredientPanelComponent {
  ingredients = input.required<Ingredient[]>();
  amounts = input.required<Record<IngredientKey, number>>();
  amountChange = output<{ key: IngredientKey; value: number }>();

  onAmountChange(key: IngredientKey, value: string): void {
    const parsed = parseInt(value, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      this.amountChange.emit({ key, value: parsed });
    }
  }

  increment(key: IngredientKey): void {
    this.amountChange.emit({ key, value: this.amounts()[key] + 1 });
  }

  decrement(key: IngredientKey): void {
    const current = this.amounts()[key];
    if (current > 0) {
      this.amountChange.emit({ key, value: current - 1 });
    }
  }
}
