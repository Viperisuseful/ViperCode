import { describe, expect, it } from "vite-plus/test";

import {
  antigravityBridgeModelForSelection,
  antigravityBridgePathCandidatesFromModuleUrl,
} from "./AntigravityAdapter.ts";

describe("AntigravityAdapter helpers", () => {
  it("prefers app.asar.unpacked bridge paths for packaged desktop builds", () => {
    const candidates = antigravityBridgePathCandidatesFromModuleUrl(
      "file:///C:/Program%20Files/Viper%20Code/resources/app.asar/apps/server/dist/bin.mjs",
    );

    expect(candidates[0]).toContain("app.asar.unpacked");
    expect(candidates[0]).toContain("apps\\server\\dist\\antigravityBridge");
    expect(candidates).toContain(
      "C:\\Program Files\\Viper Code\\resources\\app.asar\\apps\\server\\dist\\antigravityBridge\\vipercode_antigravity_bridge.py",
    );
  });

  it("maps Gemini Pro thinking options to Antigravity backend model ids", () => {
    expect(
      antigravityBridgeModelForSelection({
        model: "gemini-3.1-pro",
        options: [{ id: "thinkingLevel", value: "high" }],
      }),
    ).toBe("gemini-3.1-pro-high");
    expect(
      antigravityBridgeModelForSelection({
        model: "gemini-3.1-pro",
        options: [{ id: "thinkingLevel", value: "low" }],
      }),
    ).toBe("gemini-3.1-pro-low");
    expect(antigravityBridgeModelForSelection({ model: "gemini-3.5-flash" })).toBe(
      "gemini-3.5-flash",
    );
  });
});
