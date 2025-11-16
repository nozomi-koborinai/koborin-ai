import { describe, it, expect } from "vitest"

describe("main.ts", () => {
  it("should import and execute without errors", async () => {
    // main.ts は app.synth() を実行するエントリポイント
    // 直接 import すると synth が実行されるため、dynamic import で検証
    const mainModule = await import("../src/main")
    expect(mainModule).toBeDefined()
  })
})

