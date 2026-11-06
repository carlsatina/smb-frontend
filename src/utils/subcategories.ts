export type SubcategoryOptions = Record<string, string[]>;

/** Configured subcategories for a category (case-insensitive lookup), in display order. */
export const getSubcategoriesFor = (
    options: SubcategoryOptions | null | undefined,
    category: string | null | undefined
): string[] => {
    if (!options || !category) return [];
    const key = category.trim().toLowerCase();
    const match = Object.keys(options).find((entry) => entry.toLowerCase() === key);
    return match ? options[match] ?? [] : [];
};

/** Copy of `options` with `category`'s list replaced (empty list removes the key). */
export const withSubcategories = (
    options: SubcategoryOptions | null | undefined,
    category: string,
    subcategories: string[]
): SubcategoryOptions => {
    const next: SubcategoryOptions = {};
    const key = category.trim().toLowerCase();
    Object.entries(options ?? {}).forEach(([entry, list]) => {
        if (entry.toLowerCase() !== key) next[entry] = list;
    });
    if (subcategories.length) next[category] = subcategories;
    return next;
};
