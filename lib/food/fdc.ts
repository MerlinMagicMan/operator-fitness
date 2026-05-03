/**
 * USDA FoodData Central (FDC) client.
 * Docs: https://fdc.nal.usda.gov/api-guide.html
 *
 * Free key from https://fdc.nal.usda.gov/api-key-signup.html stored as
 * FDC_API_KEY. Calls are server-side only — the key is never exposed to
 * the browser.
 */

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";
const SEARCH_PAGE_SIZE = 5;

export type FdcSearchHit = {
  fdcId: number;
  description: string;
  dataType: string | null;
  brandOwner?: string | null;
  /** Per-100g if available; some hits include serving info instead. */
  foodNutrients?: Array<{
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
};

export type FdcSearchResponse = {
  totalHits: number;
  foods: FdcSearchHit[];
};

export type FdcMacros = {
  fdcId: number;
  description: string;
  /** Macros are always returned per-100g for predictable scaling. */
  per100g: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

class FdcError extends Error {}

function requireKey(): string {
  const key = process.env.FDC_API_KEY;
  if (!key) throw new FdcError("FDC_API_KEY is not configured");
  return key;
}

/**
 * Search USDA FDC for a query string. Returns the top SEARCH_PAGE_SIZE
 * hits. Prefer Foundation/SR Legacy data types — they have the most
 * trustworthy per-100g nutrient data.
 */
export async function searchFood(query: string): Promise<FdcSearchHit[]> {
  const key = requireKey();
  const url =
    `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(key)}` +
    `&query=${encodeURIComponent(query)}` +
    `&pageSize=${SEARCH_PAGE_SIZE}` +
    `&dataType=Foundation,SR%20Legacy,Branded,Survey%20%28FNDDS%29`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FdcError(`FDC search failed: ${res.status} ${res.statusText}`);
  }
  const json = (await res.json()) as FdcSearchResponse;
  return json.foods ?? [];
}

const NUTRIENT_IDS = {
  kcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
} as const;

type FdcDetailFood = {
  fdcId: number;
  description: string;
  foodNutrients: Array<{
    nutrient?: { id?: number; name?: string; unitName?: string };
    nutrientId?: number;
    nutrientName?: string;
    value?: number;
    amount?: number;
  }>;
};

function pickNutrient(food: FdcDetailFood, id: number): number {
  for (const n of food.foodNutrients ?? []) {
    const nid = n.nutrient?.id ?? n.nutrientId;
    if (nid === id) {
      const v = n.value ?? n.amount;
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
  }
  return 0;
}

/**
 * Fetch full nutrient detail for an fdcId and return per-100g macros.
 * USDA returns most foods normalized to 100g already; for ones that
 * aren't we still scale via the energy nutrient as a sanity check.
 */
export async function getFoodMacros(fdcId: number): Promise<FdcMacros> {
  const key = requireKey();
  const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(key)}&format=full`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new FdcError(`FDC detail failed: ${res.status} ${res.statusText}`);
  }
  const food = (await res.json()) as FdcDetailFood;

  return {
    fdcId: food.fdcId,
    description: food.description,
    per100g: {
      kcal: pickNutrient(food, NUTRIENT_IDS.kcal),
      protein_g: pickNutrient(food, NUTRIENT_IDS.protein),
      carbs_g: pickNutrient(food, NUTRIENT_IDS.carbs),
      fat_g: pickNutrient(food, NUTRIENT_IDS.fat),
    },
  };
}

/** Scale per-100g macros to a serving in grams. */
export function scaleMacros(
  per100g: FdcMacros["per100g"],
  grams: number,
): { kcal: number; protein_g: number; carbs_g: number; fat_g: number } {
  const f = grams / 100;
  return {
    kcal: Math.round(per100g.kcal * f),
    protein_g: Math.round(per100g.protein_g * f * 10) / 10,
    carbs_g: Math.round(per100g.carbs_g * f * 10) / 10,
    fat_g: Math.round(per100g.fat_g * f * 10) / 10,
  };
}

export function isFdcConfigured(): boolean {
  return Boolean(process.env.FDC_API_KEY);
}
