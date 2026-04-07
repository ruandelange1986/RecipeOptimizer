export type IngredientKey =
  | 'dough'
  | 'meat'
  | 'lettuce'
  | 'tomato'
  | 'cheese'
  | 'cucumber'
  | 'olives';

export interface Ingredient {
  key: IngredientKey;
  label: string;
  emoji: string;
  defaultAmount: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  feedsCount: number;
  color: string;
  requirements: Partial<Record<IngredientKey, number>>;
}

export interface OptimizationResult {
  recipeCounts: Record<string, number>;
  totalPeopleFed: number;
  remainingIngredients: Record<IngredientKey, number>;
  usedIngredients: Record<IngredientKey, number>;
  breakdownByRecipe: RecipeContribution[];
}

export interface RecipeContribution {
  recipe: Recipe;
  count: number;
  peopleFed: number;
}

export const INGREDIENTS: Ingredient[] = [
  { key: 'dough',    label: 'Dough',    emoji: '🫓', defaultAmount: 10 },
  { key: 'meat',     label: 'Meat',     emoji: '🥩', defaultAmount: 6  },
  { key: 'lettuce',  label: 'Lettuce',  emoji: '🥬', defaultAmount: 3  },
  { key: 'tomato',   label: 'Tomato',   emoji: '🍅', defaultAmount: 6  },
  { key: 'cheese',   label: 'Cheese',   emoji: '🧀', defaultAmount: 8  },
  { key: 'cucumber', label: 'Cucumber', emoji: '🥒', defaultAmount: 2  },
  { key: 'olives',   label: 'Olives',   emoji: '🫒', defaultAmount: 2  },
];

export const RECIPES: Recipe[] = [
  {
    id: 'burger',
    name: 'Burger',
    emoji: '🍔',
    feedsCount: 1,
    color: '#e8834a',
    requirements: { meat: 1, lettuce: 1, tomato: 1, cheese: 1, dough: 1 },
  },
  {
    id: 'pie',
    name: 'Pie',
    emoji: '🥧',
    feedsCount: 1,
    color: '#c4a45a',
    requirements: { dough: 2, meat: 2 },
  },
  {
    id: 'sandwich',
    name: 'Sandwich',
    emoji: '🥪',
    feedsCount: 1,
    color: '#a3c45a',
    requirements: { dough: 1, cucumber: 1 },
  },
  {
    id: 'pasta',
    name: 'Pasta',
    emoji: '🍝',
    feedsCount: 2,
    color: '#e8c44a',
    requirements: { dough: 2, tomato: 1, cheese: 2, meat: 1 },
  },
  {
    id: 'salad',
    name: 'Salad',
    emoji: '🥗',
    feedsCount: 3,
    color: '#6ab87a',
    requirements: { lettuce: 2, tomato: 2, cucumber: 1, cheese: 2, olives: 1 },
  },
  {
    id: 'pizza',
    name: 'Pizza',
    emoji: '🍕',
    feedsCount: 4,
    color: '#e86a6a',
    requirements: { dough: 3, tomato: 2, cheese: 3, olives: 1 },
  },
];
