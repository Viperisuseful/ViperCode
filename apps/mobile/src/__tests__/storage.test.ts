import { describe, expect, it } from "vite-plus/test";
import { readPublicJson, writePublicJson } from "../storage/publicStorage.ts";

describe("publicStorage", () => {
  it("exports read and write functions", () => {
    expect(typeof readPublicJson).toBe("function");
    expect(typeof writePublicJson).toBe("function");
  });
});
