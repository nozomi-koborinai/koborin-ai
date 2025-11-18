import { Testing } from "cdktf"
import { describe, it, expect, beforeEach } from "vitest"
import { ProdStack } from "../../src/stacks/prod-stack"

describe("ProdStack", () => {
  let app: ReturnType<typeof Testing.app>
  let stack: ProdStack

  beforeEach(() => {
    app = Testing.app()
    stack = new ProdStack(app, "test-prod")
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
    expect(cloudRunServices[serviceKey].name).toBe("n-koborinai-me-web-prod")
    expect(cloudRunServices[serviceKey].location).toBe("asia-northeast1")
  })

  it("should configure Cloud Run with GEN2 execution environment", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].template.execution_environment).toBe("EXECUTION_ENVIRONMENT_GEN2")
  })

  it("should set production environment variables", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    const envVars = cloudRunServices[serviceKey].template.containers[0].env

    const nodeEnv = envVars.find((e: { name: string }) => e.name === "NODE_ENV")
    const nextEnv = envVars.find((e: { name: string }) => e.name === "NEXT_PUBLIC_ENV")

    expect(nodeEnv.value).toBe("production")
    expect(nextEnv.value).toBe("prod")
  })

  it("should configure scaling with max 10 instances for prod", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].template.scaling.min_instance_count).toBe(0)
    expect(cloudRunServices[serviceKey].template.scaling.max_instance_count).toBe(10)
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

  it("should configure GCS backend with prod prefix", () => {
    const synthesized = Testing.synth(stack)
    const backend = JSON.parse(synthesized).terraform?.backend?.gcs

    expect(backend).toBeDefined()
    expect(backend.prefix).toBe("prod")
  })

  it("should restrict ingress to load balancer only", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const cloudRunServices = resources.google_cloud_run_v2_service

    const serviceKey = Object.keys(cloudRunServices)[0]
    expect(cloudRunServices[serviceKey].ingress).toBe("INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER")
  })

  it("should grant run.invoker to the serverless robot service account", () => {
    const synthesized = Testing.synth(stack)
    const resources = JSON.parse(synthesized).resource
    const iamMembers = resources.google_cloud_run_v2_service_iam_member

    expect(iamMembers).toBeDefined()

    const iamKey = Object.keys(iamMembers)[0]
    const iamConfig = iamMembers[iamKey]

    expect(iamConfig.role).toBe("roles/run.invoker")
    expect(iamConfig.member).toContain("serviceAccount:service-")
    expect(iamConfig.member).toContain("serverless-robot-prod.iam.gserviceaccount.com")
  })
})

