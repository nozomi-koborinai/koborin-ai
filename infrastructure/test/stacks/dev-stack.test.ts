import { Testing } from "cdktf"
import { describe, it, expect, beforeEach } from "vitest"
import { DevStack } from "../../src/stacks/dev-stack"

describe("DevStack", () => {
  let app: ReturnType<typeof Testing.app>
  let stack: DevStack

  beforeEach(() => {
    app = Testing.app()
    stack = new DevStack(app, "test-dev")
  })

  it("should synthesize without errors", () => {
    const synthesized = Testing.synth(stack)
    expect(synthesized).toBeTruthy()
  })

  it("should create Google Provider with correct project and region", () => {
    const synthesized = Testing.synth(stack)
    const providers = JSON.parse(synthesized).provider.google

    expect(providers).toBeDefined()
    expect(providers[0].region).toBe("asia-northeast1")
  })

  it("should create Cloud Run service with correct name", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].name).toBe("koborin-ai-web-dev")
    expect(cloudRunServices[serviceKey].location).toBe("asia-northeast1")
  })

  it("should configure Cloud Run with GEN2 execution environment", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].template.execution_environment).toBe("EXECUTION_ENVIRONMENT_GEN2")
  })

  it("should set development environment variables", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    const envVars = cloudRunServices[serviceKey].template.containers[0].env

    const nodeEnv = envVars.find((e: { name: string }) => e.name === "NODE_ENV")
    const nextEnv = envVars.find((e: { name: string }) => e.name === "NEXT_PUBLIC_ENV")

    expect(nodeEnv.value).toBe("development")
    expect(nextEnv.value).toBe("dev")
  })

  it("should configure scaling with max 1 instance for dev", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].template.scaling.min_instance_count).toBe(0)
    expect(cloudRunServices[serviceKey].template.scaling.max_instance_count).toBe(1)
  })

  it("should configure traffic to route 100% to latest revision", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    const traffic = cloudRunServices[serviceKey].traffic[0]

    expect(traffic.type).toBe("TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST")
    expect(traffic.percent).toBe(100)
  })

  it("should configure GCS backend with dev prefix", () => {
    const synthesized = Testing.synth(stack)
    const backend = JSON.parse(synthesized).terraform?.backend?.gcs

    expect(backend).toBeDefined()
    expect(backend.prefix).toBe("dev")
  })

  it("should restrict ingress to load balancer only", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].ingress).toBe("INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER")
  })

  it("should grant run.invoker to the IAP service agent", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const iamMembers = resources.google_cloud_run_v2_service_iam_member

    expect(iamMembers).toBeDefined()
    const memberKey = Object.keys(iamMembers)[0]
    expect(iamMembers[memberKey].role).toBe("roles/run.invoker")
    expect(iamMembers[memberKey].member).toContain("serviceAccount:service-")
    expect(iamMembers[memberKey].member).toContain("@gcp-sa-iap.iam.gserviceaccount.com")
  })
})

