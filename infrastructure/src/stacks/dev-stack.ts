import { CloudRunV2Service } from "@cdktf/provider-google/lib/cloud-run-v2-service"
import { GoogleProvider } from "@cdktf/provider-google/lib/provider"
import { TerraformStack } from "cdktf"
import { GcsBackend } from "cdktf/lib/backends/gcs-backend"
import { Construct } from "constructs"
import { createEnvironmentStackConfig } from "../config/stack-config"

/**
 * DevStack creates Cloud Run service for the development environment.
 * The service is referenced by the Serverless NEG created in shared stack.
 */
export class DevStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const config = createEnvironmentStackConfig(this)

    new GcsBackend(this, {
      bucket: config.stateBucket,
      prefix: "dev",
    })

    new GoogleProvider(this, "google-dev", {
      project: config.projectId,
      region: "asia-northeast1",
    })

    new CloudRunV2Service(this, "web-dev", {
      project: config.projectId,
      location: "asia-northeast1",
      name: "n-koborinai-me-web-dev",
      ingress: "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER",
      template: {
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
        containers: [
          {
            image: config.imageUri,
            env: [
              // NODE_ENV: server-side environment detection (affects Next.js optimizations, logging, etc.)
              { name: "NODE_ENV", value: "development" },
              // NEXT_PUBLIC_ENV: client-side environment detection (exposed to browser, used for GA4, API endpoints, etc.)
              { name: "NEXT_PUBLIC_ENV", value: "dev" },
            ],
          },
        ],
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 1,
        },
      },
      traffic: [
        {
          type: "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST",
          percent: 100,
        },
      ],
      lifecycle: {
        ignoreChanges: ["scaling"],
      },
    })
  }
}

