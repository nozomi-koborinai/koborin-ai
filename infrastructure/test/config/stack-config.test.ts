import { TerraformStack } from "cdktf"
import { Testing } from "cdktf"
import { describe, it, expect } from "vitest"
import { createSharedStackConfig } from "../../src/config/stack-config"

describe("createSharedStackConfig", () => {
  it("should create config with all required variables", () => {
    const app = Testing.app()
    const stack = new TerraformStack(app, "test-stack")

    const config = createSharedStackConfig(stack)

    expect(config.projectId).toBeDefined()
    expect(config.projectNumber).toBeDefined()
    expect(config.stateBucket).toBeDefined()
    expect(config.iapUser).toBeDefined()
    expect(config.oauthClientId).toBeDefined()
    expect(config.oauthClientSecret).toBeDefined()
  })

  it("should use correct variable names matching GitHub Actions", () => {
    const app = Testing.app()
    const stack = new TerraformStack(app, "test-stack")

    createSharedStackConfig(stack)

    const synthesized = Testing.synth(stack)
    const variables = JSON.parse(synthesized).variable

    expect(variables.project_id).toBeDefined()
    expect(variables.project_number).toBeDefined()
    expect(variables.bucket_name).toBeDefined()
    expect(variables.iap_user).toBeDefined()
    expect(variables.oauth_client_id).toBeDefined()
    expect(variables.oauth_client_secret).toBeDefined()
  })

  it("should mark oauth_client_secret as sensitive", () => {
    const app = Testing.app()
    const stack = new TerraformStack(app, "test-stack")

    createSharedStackConfig(stack)

    const synthesized = Testing.synth(stack)
    const variables = JSON.parse(synthesized).variable

    expect(variables.oauth_client_secret.sensitive).toBe(true)
  })

  it("should have correct descriptions for all variables", () => {
    const app = Testing.app()
    const stack = new TerraformStack(app, "test-stack")

    createSharedStackConfig(stack)

    const synthesized = Testing.synth(stack)
    const variables = JSON.parse(synthesized).variable

    expect(variables.project_id.description).toContain("Google Cloud Project ID")
    expect(variables.project_number.description).toContain("Google Cloud Project Number")
    expect(variables.bucket_name.description).toContain("GCS bucket")
    expect(variables.iap_user.description).toContain("IAP")
    expect(variables.oauth_client_id.description).toContain("OAuth")
    expect(variables.oauth_client_secret.description).toContain("OAuth")
  })
})
