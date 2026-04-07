import { Injectable } from '@angular/core';
import {
  IngredientKey,
  OptimizationResult,
  Recipe,
  RECIPES,
  INGREDIENTS,
  RecipeContribution,
} from '../models/recipe.model';

// ─────────────────────────────────────────────────────────────────────────────
// Simplex LP Solver
//
// Maximises  c · x
// Subject to A·x ≤ b,  x ≥ 0
//
// Tableau dimensions: (m+1) rows × (n+m+1) cols.
// These are fixed by problem structure (6 recipes, 7 ingredients),
// so runtime is O(1) relative to ingredient quantities.
// ─────────────────────────────────────────────────────────────────────────────

interface LPResult {
  feasible: boolean;
  solution: number[];
  value: number;
}

function solveLPRelaxation(c: number[], A: number[][], b: number[]): LPResult {
  const m = A.length;
  const n = c.length;
  const COLS = n + m + 1;
  const EPS = 1e-9;

  // Branch & bound may pass negative RHS values — detect infeasibility early
  for (let i = 0; i < m; i++) {
    if (b[i] < -EPS) return { feasible: false, solution: [], value: 0 };
  }

  // Build tableau  [ A | I_m | b ]
  //                [ -c | 0  | 0 ]  (negated for maximisation)
  const tab: number[][] = [];
  for (let i = 0; i < m; i++) {
    const row = new Array(COLS).fill(0);
    for (let j = 0; j < n; j++) row[j] = A[i][j];
    row[n + i] = 1;           // slack variable for constraint i
    row[COLS - 1] = b[i];
    tab.push(row);
  }
  const obj = new Array(COLS).fill(0);
  for (let j = 0; j < n; j++) obj[j] = -c[j];
  tab.push(obj);

  const basic = Array.from({ length: m }, (_, i) => n + i);

  for (let iter = 0; iter < 2000; iter++) {
    // Pivot column: most negative reduced cost (Dantzig's rule)
    let pivCol = -1, minCost = -EPS;
    for (let j = 0; j < COLS - 1; j++) {
      if (tab[m][j] < minCost) { minCost = tab[m][j]; pivCol = j; }
    }
    if (pivCol === -1) break; // Optimal

    // Pivot row: minimum ratio test
    let pivRow = -1, minRatio = Infinity;
    for (let i = 0; i < m; i++) {
      if (tab[i][pivCol] > EPS) {
        const ratio = tab[i][COLS - 1] / tab[i][pivCol];
        if (ratio < minRatio - EPS) { minRatio = ratio; pivRow = i; }
      }
    }
    if (pivRow === -1) return { feasible: false, solution: [], value: Infinity }; // Unbounded

    // Pivot operation
    const pv = tab[pivRow][pivCol];
    for (let j = 0; j < COLS; j++) tab[pivRow][j] /= pv;
    for (let i = 0; i <= m; i++) {
      if (i !== pivRow && Math.abs(tab[i][pivCol]) > EPS) {
        const f = tab[i][pivCol];
        for (let j = 0; j < COLS; j++) tab[i][j] -= f * tab[pivRow][j];
      }
    }
    basic[pivRow] = pivCol;
  }

  const solution = new Array(n).fill(0);
  for (let i = 0; i < m; i++) {
    if (basic[i] < n) solution[basic[i]] = Math.max(0, tab[i][COLS - 1]);
  }

  return { feasible: true, solution, value: tab[m][COLS - 1] };
}

// ─────────────────────────────────────────────────────────────────────────────
// ILP Solver — Branch & Bound guided by LP upper bounds
//
// The B&B tree stays tiny because:
//  • The LP relaxation for 6 variables / 7 constraints typically has ≤ 1
//    fractional variable at each node.
//  • The LP upper bound prunes infeasible or suboptimal branches immediately.
//  • Branching UP first finds a strong integer solution early, tightening
//    the bound and pruning more of the tree.
// ─────────────────────────────────────────────────────────────────────────────

interface ILPResult {
  solution: number[];
  value: number;
}

function solveILP(c: number[], A: number[][], b: number[]): ILPResult {
  let bestValue = -Infinity;
  let bestSolution: number[] = new Array(c.length).fill(0);
  const EPS = 1e-6;

  function branch(A_node: number[][], b_node: number[]): void {
    // Solve LP relaxation at this node
    const lp = solveLPRelaxation(c, A_node, b_node);
    if (!lp.feasible) return;                          // Infeasible — prune
    if (lp.value <= bestValue + EPS) return;           // Bound  — prune

    // Find the first fractional variable
    let fracIdx = -1;
    for (let i = 0; i < c.length; i++) {
      const frac = lp.solution[i] - Math.floor(lp.solution[i]);
      if (frac > EPS && frac < 1 - EPS) { fracIdx = i; break; }
    }

    // Integer solution found
    if (fracIdx === -1) {
      const intSol = lp.solution.map(v => Math.max(0, Math.round(v)));
      // Floating-point safety: verify all constraints still hold
      for (let i = 0; i < A_node.length; i++) {
        let lhs = 0;
        for (let j = 0; j < c.length; j++) lhs += A_node[i][j] * intSol[j];
        if (lhs > b_node[i] + 1e-4) return;
      }
      const val = intSol.reduce((s, v, i) => s + c[i] * v, 0);
      if (val > bestValue) { bestValue = val; bestSolution = intSol; }
      return;
    }

    const floorVal = Math.floor(lp.solution[fracIdx]);
    const ceilVal  = floorVal + 1;

    // Helper: add one branching constraint row
    const extraRow = (idx: number, sign: 1 | -1): number[] => {
      const row = new Array(c.length).fill(0);
      row[idx] = sign;
      return row;
    };

    // Branch UP first (finds good integer solutions early → tighter pruning)
    // x[fracIdx] >= ceil  →  -x[fracIdx] <= -ceil
    branch([...A_node, extraRow(fracIdx, -1)], [...b_node, -ceilVal]);
    // Branch DOWN: x[fracIdx] <= floor
    branch([...A_node, extraRow(fracIdx,  1)], [...b_node,  floorVal]);
  }

  branch(A, b);
  if (bestValue < 0) bestValue = 0;
  return { solution: bestSolution, value: bestValue };
}

// ─────────────────────────────────────────────────────────────────────────────
// Angular Service
// ─────────────────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class OptimizerService {

  /**
   * Converts ingredient/recipe data into LP matrix form, then invokes the ILP
   * solver.  Runtime is determined entirely by problem structure (6 recipes,
   * 7 ingredients) — NOT by ingredient quantities — so 10, 10 000, or
   * 10 000 000 of each ingredient all compute in the same milliseconds.
   */
  optimize(available: Record<IngredientKey, number>): OptimizationResult {
    const recipes       = RECIPES;
    const ingredientKeys: IngredientKey[] = INGREDIENTS.map(i => i.key);

    // c[i]    = people fed by one serving of recipe i
    const c: number[] = recipes.map(r => r.feedsCount);

    // A[k][i] = units of ingredient k needed by one serving of recipe i
    const A: number[][] = ingredientKeys.map(key =>
      recipes.map(r => r.requirements[key] ?? 0)
    );

    // b[k] = available units of ingredient k
    const b: number[] = ingredientKeys.map(key => available[key] ?? 0);

    const { solution, value } = solveILP(c, A, b);

    // ── Assemble result ──
    const recipeCounts: Record<string, number> = {};
    recipes.forEach((r, i) => { recipeCounts[r.id] = solution[i] ?? 0; });

    const usedIngredients   = this.computeUsed(recipes, solution, ingredientKeys);
    const remainingIngredients = this.computeRemaining(available, usedIngredients, ingredientKeys);

    const breakdownByRecipe: RecipeContribution[] = recipes
      .map((r, i) => ({
        recipe: r,
        count:     solution[i] ?? 0,
        peopleFed: (solution[i] ?? 0) * r.feedsCount,
      }))
      .filter(b => b.count > 0);

    return {
      recipeCounts,
      totalPeopleFed: value,
      remainingIngredients,
      usedIngredients,
      breakdownByRecipe,
    };
  }

  private computeUsed(
    recipes: Recipe[],
    counts: number[],
    keys: IngredientKey[]
  ): Record<IngredientKey, number> {
    const used = Object.fromEntries(keys.map(k => [k, 0])) as Record<IngredientKey, number>;
    recipes.forEach((r, i) => {
      for (const [key, qty] of Object.entries(r.requirements) as [IngredientKey, number][]) {
        used[key] += (qty ?? 0) * (counts[i] ?? 0);
      }
    });
    return used;
  }

  private computeRemaining(
    available: Record<IngredientKey, number>,
    used:      Record<IngredientKey, number>,
    keys:      IngredientKey[]
  ): Record<IngredientKey, number> {
    return Object.fromEntries(
      keys.map(k => [k, (available[k] ?? 0) - (used[k] ?? 0)])
    ) as Record<IngredientKey, number>;
  }
}
