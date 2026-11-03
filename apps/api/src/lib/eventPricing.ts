export function resolveIsFree(
  currentIsFree: boolean,
  update: { price?: number; isFree?: boolean }
): boolean {
  if (update.price === undefined && update.isFree === undefined) return currentIsFree;
  return update.price === 0 || update.isFree === true;
}
