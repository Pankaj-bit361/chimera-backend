/**
 * Escapes a user-supplied string for use inside a Mongo `$regex`.
 *
 * Search boxes fed `q` straight through, so a product called "Urine Strip (10P)"
 * could not be found by typing its own name, and a lone "(" returned a 500 from
 * deep inside the driver.
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
