import type { Fill, Segment } from "./drawing";

export const QUADRETTO_FORMAT = "quadretto" as const;
export const QUADRETTO_VERSION = 1;
export const QUADRETTO_EXTENSION = ".quadretto";
export const QUADRETTO_FILENAME = "quadretti.quadretto";

export type QuadrettoDocument = {
  format: typeof QUADRETTO_FORMAT;
  version: typeof QUADRETTO_VERSION;
  exportedAt: string;
  segments: Segment[];
  fills: Fill[];
};

export type FileNotice = "imported" | "invalid" | "cancelled";

export class QuadrettoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuadrettoError";
  }
}
