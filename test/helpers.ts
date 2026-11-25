export const NOW = Date.parse("2026-06-15T12:00:00Z");
export const S = 1000;
export const M = 60 * S;
export const H = 60 * M;
export const D = 24 * H;
/** A date `offset` milliseconds away from the fixed test "now". */
export const at = (offset: number): Date => new Date(NOW + offset);
