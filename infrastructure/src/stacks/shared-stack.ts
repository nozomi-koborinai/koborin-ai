import { ArtifactRegistryRepository } from "@cdktf/provider-google/lib/artifact-registry-repository"
import { ComputeBackendService } from "@cdktf/provider-google/lib/compute-backend-service"
import { ComputeGlobalAddress } from "@cdktf/provider-google/lib/compute-global-address"
import { ComputeGlobalForwardingRule } from "@cdktf/provider-google/lib/compute-global-forwarding-rule"
import { ComputeManagedSslCertificate } from "@cdktf/provider-google/lib/compute-managed-ssl-certificate"
import { ComputeRegionNetworkEndpointGroup } from "@cdktf/provider-google/lib/compute-region-network-endpoint-group"
import { ComputeTargetHttpsProxy } from "@cdktf/provider-google/lib/compute-target-https-proxy"
import { ComputeUrlMap } from "@cdktf/provider-google/lib/compute-url-map"
import { IapWebBackendServiceIamBinding } from "@cdktf/provider-google/lib/iap-web-backend-service-iam-binding"
import { ProjectService } from "@cdktf/provider-google/lib/project-service"
import { GoogleProvider } from "@cdktf/provider-google/lib/provider"
import { TerraformStack } from "cdktf"
import { GcsBackend } from "cdktf/lib/backends/gcs-backend"
import { Construct } from "constructs"
import { createSharedStackConfig } from "../config/stack-config"

/**
 * APIs required for Cloud Run, Artifact Registry, Load Balancing, DNS, and IAM.
 */
const REQUIRED_APIS = [
  "run.googleapis.com",
  "compute.googleapis.com",
  "iam.googleapis.com",
  "dns.googleapis.com",
  "cloudresourcemanager.googleapis.com",
  "artifactregistry.googleapis.com",
  "iap.googleapis.com",
  "monitoring.googleapis.com",
  "logging.googleapis.com",
]

/**
 * SharedStack manages resources shared across dev/prod environments:
 * - API enablement
 * - Artifact Registry for container images
 * - Global static IP for HTTPS load balancer
 * - Serverless NEG (dev/prod) pointing to Cloud Run services
 * - Backend Service (dev with IAP, prod without IAP)
 * - Managed SSL Certificate (multi-domain)
 * - URL Map (host-based routing)
 * - Target HTTPS Proxy
 * - Global Forwarding Rule
 *
 * Resources to be added later (via import):
 * - DNS managed zone (koborin-ai)
 * - Workload Identity Pool & Provider
 * - Terraform deployer service account
 */
export class SharedStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id)

    const config = createSharedStackConfig(this)

    // GCS backend for shared state
    new GcsBackend(this, {
      bucket: config.stateBucket,
      prefix: "shared",
    })

    // Google Provider
    new GoogleProvider(this, "google-shared", {
      project: config.projectId,
      region: "asia-northeast1",
    })

    // Enable required APIs
    const apiServices: ProjectService[] = []
    REQUIRED_APIS.forEach((api) => {
      const apiService = new ProjectService(this, `api-${api.replace(/\./g, "-")}`, {
        project: config.projectId,
        service: api,
        disableDependentServices: false,
        disableOnDestroy: false,
      })
      apiServices.push(apiService)
    })

    // Artifact Registry for Next.js container images
    new ArtifactRegistryRepository(this, "artifact-registry", {
      project: config.projectId,
      location: "asia-northeast1",
      repositoryId: "koborin-ai-web",
      description: "Container images for koborin.ai web application (dev/prod)",
      format: "DOCKER",
      dockerConfig: {
        immutableTags: true,
      },
      dependsOn: apiServices,
    })

    // Global static IP for HTTPS load balancer
    const staticIp = new ComputeGlobalAddress(this, "global-ip", {
      project: config.projectId,
      name: "koborin-ai-global-ip",
      addressType: "EXTERNAL",
      ipVersion: "IPV4",
      description: "Static IP for koborin.ai HTTPS load balancer",
      dependsOn: apiServices,
    })

    // ========================================
    // Dev Environment Backend
    // ========================================

    // Serverless NEG for dev Cloud Run
    const devNeg = new ComputeRegionNetworkEndpointGroup(this, "dev-neg", {
      project: config.projectId,
      region: "asia-northeast1",
      name: "koborin-ai-dev-neg",
      networkEndpointType: "SERVERLESS",
      cloudRun: {
        service: "koborin-ai-web-dev",
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: apiServices,
    })

    // Backend Service for dev (with IAP)
    const devBackend = new ComputeBackendService(this, "dev-backend", {
      project: config.projectId,
      name: "koborin-ai-dev-backend",
      protocol: "HTTP",
      loadBalancingScheme: "EXTERNAL_MANAGED",
      timeoutSec: 30,
      customResponseHeaders: ["X-Robots-Tag: noindex, nofollow"],
      backend: [
        {
          group: devNeg.id,
          balancingMode: "UTILIZATION",
          capacityScaler: 1.0,
        },
      ],
      iap: {
        enabled: true,
        oauth2ClientId: config.oauthClientId,
        oauth2ClientSecret: config.oauthClientSecret,
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: [devNeg],
    })

    // IAP access control for dev
    new IapWebBackendServiceIamBinding(this, "dev-iap-access", {
      project: config.projectId,
      webBackendService: devBackend.name,
      role: "roles/iap.httpsResourceAccessor",
      members: [`user:${config.iapUser}`],
      dependsOn: [devBackend],
    })

    // ========================================
    // Prod Environment Backend
    // ========================================

    // Serverless NEG for prod Cloud Run
    const prodNeg = new ComputeRegionNetworkEndpointGroup(this, "prod-neg", {
      project: config.projectId,
      region: "asia-northeast1",
      name: "koborin-ai-prod-neg",
      networkEndpointType: "SERVERLESS",
      cloudRun: {
        service: "koborin-ai-web-prod",
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: apiServices,
    })

    // Backend Service for prod (no IAP)
    const prodBackend = new ComputeBackendService(this, "prod-backend", {
      project: config.projectId,
      name: "koborin-ai-prod-backend",
      protocol: "HTTP",
      loadBalancingScheme: "EXTERNAL_MANAGED",
      timeoutSec: 30,
      backend: [
        {
          group: prodNeg.id,
          balancingMode: "UTILIZATION",
          capacityScaler: 1.0,
        },
      ],
      logConfig: {
        enable: true,
        sampleRate: 1.0,
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: [prodNeg],
    })

    // ========================================
    // HTTPS Load Balancer
    // ========================================

    // Managed SSL Certificate (multi-domain)
    const sslCert = new ComputeManagedSslCertificate(this, "managed-cert", {
      project: config.projectId,
      name: "koborin-ai-cert",
      managed: {
        domains: ["koborin.ai", "dev.koborin.ai"],
      },
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: apiServices,
    })

    // URL Map (host-based routing)
    const urlMap = new ComputeUrlMap(this, "url-map", {
      project: config.projectId,
      name: "koborin-ai-url-map",
      description: "Routes traffic to dev/prod backends based on host header",
      defaultService: prodBackend.id,
      hostRule: [
        { hosts: ["koborin.ai"], pathMatcher: "prod-matcher" },
        { hosts: ["dev.koborin.ai"], pathMatcher: "dev-matcher" },
      ],
      pathMatcher: [
        { name: "prod-matcher", defaultService: prodBackend.id },
        { name: "dev-matcher", defaultService: devBackend.id },
      ],
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: [devBackend, prodBackend],
    })

    // Target HTTPS Proxy
    const httpsProxy = new ComputeTargetHttpsProxy(this, "https-proxy", {
      project: config.projectId,
      name: "koborin-ai-https-proxy",
      urlMap: urlMap.id,
      sslCertificates: [sslCert.id],
      lifecycle: {
        createBeforeDestroy: true,
      },
      dependsOn: [urlMap, sslCert],
    })

    // Global Forwarding Rule
    new ComputeGlobalForwardingRule(this, "forwarding-rule", {
      project: config.projectId,
      name: "koborin-ai-forwarding-rule",
      target: httpsProxy.id,
      portRange: "443",
      ipProtocol: "TCP",
      loadBalancingScheme: "EXTERNAL_MANAGED",
      networkTier: "PREMIUM",
      ipAddress: staticIp.address,
      dependsOn: [httpsProxy, staticIp],
    })

  }
}
