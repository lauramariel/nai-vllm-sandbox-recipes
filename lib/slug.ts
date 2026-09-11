// Slug / filename derivation. See design doc "Slug / filename":
// model name + hardware disambiguator, lowercased, non-alphanumerics
// collapsed to "-", collision-suffixed with -2, -3, ... The design doc's
// own worked example keeps a literal "." (`llama-3.3-70b-instruct-...`)
// which conflicts with its stated rule that all non-alphanumerics collapse
// to "-"; this implementation follows the stated rule, so "3.3" becomes
// "3-3".

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function deriveSlug(
  model: string,
  hardware: { gpu_count: number; gpu_model: string },
): string {
  const modelName = model.split("/")[1] ?? model;
  const disambiguator = `${hardware.gpu_count}x${hardware.gpu_model}`;
  return slugify(`${modelName}-${disambiguator}`);
}

export function resolveSlugCollision(
  baseSlug: string,
  existingSlugs: readonly string[],
): string {
  const existing = new Set(existingSlugs);
  if (!existing.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (existing.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }
  return `${baseSlug}-${suffix}`;
}
