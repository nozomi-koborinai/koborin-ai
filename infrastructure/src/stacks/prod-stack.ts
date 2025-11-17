import { CloudRunV2Service } from "@cdktf/provider-google/lib/cloud-run-v2-service"
import { GoogleProvider } from "@cdktf/provider-google/lib/provider"
import { TerraformStack } from "cdktf"
import { GcsBackend } from "cdktf/lib/backends/gcs-backend"
import { Construct } from "constructs"
import { createEnvironmentStackConfig } from "../config/stack-config"

/**
 * ProdStack creates Cloud Run service for the production environment.
 * The service is referenced by the Serverless NEG created in shared stack.
 */
export class ProdStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const config = createEnvironmentStackConfig(this)

    new GcsBackend(this, {
      bucket: config.stateBucket,
      prefix: "prod",
    })

    new GoogleProvider(this, "google-prod", {
      project: config.projectId,
      region: "asia-northeast1",
    })

    new CloudRunV2Service(this, "web-prod", {
      project: config.projectId,
      location: "asia-northeast1",
      name: "koborin-ai-web-prod",
      ingress: "INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER",
      template: {
        executionEnvironment: "EXECUTION_ENVIRONMENT_GEN2",
        containers: [
          {
            image: config.imageUri,
            env: [
              // NODE_ENV: server-side environment detection (affects Next.js optimizations, logging, etc.)
              { name: "NODE_ENV", value: "production" },
              // NEXT_PUBLIC_ENV: client-side environment detection (exposed to browser, used for GA4, API endpoints, etc.)
              { name: "NEXT_PUBLIC_ENV", value: "prod" },
            ],
          },
        ],
        scaling: {
          minInstanceCount: 0,
          maxInstanceCount: 10,
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

