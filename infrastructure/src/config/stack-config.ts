import { TerraformVariable } from "cdktf"
import { Construct } from "constructs"

export type StackEnvironment = "shared" | "dev" | "prod"

/**
 * Configuration for shared stack.
 * Only environment-specific values are exposed as TerraformVariables.
 * Constants like region, domain names, and service names are hardcoded.
 */
export type SharedStackConfig = {
  projectId: string
  projectNumber: string
  stateBucket: string
  iapUser: string
  oauthClientId: string
  oauthClientSecret: string
}

/**
 * Configuration for dev/prod stacks.
 * Only the container image URI varies per deployment.
 */
export type EnvironmentStackConfig = {
  projectId: string
  stateBucket: string
  imageUri: string
}

/**
 * Creates configuration for shared stack by reading TerraformVariables.
 * Only truly variable values are injected from GitHub Actions.
 */
export function createSharedStackConfig(scope: Construct): SharedStackConfig {
  const projectId = new TerraformVariable(scope, "project_id", {
    type: "string",
    description: "Google Cloud Project ID.",
  }).stringValue

  const projectNumber = new TerraformVariable(scope, "project_number", {
    type: "string",
    description: "Google Cloud Project Number.",
  }).stringValue

  const stateBucket = new TerraformVariable(scope, "bucket_name", {
    type: "string",
    description: "GCS bucket used for Terraform state (shared across stacks).",
  }).stringValue

  const iapUser = new TerraformVariable(scope, "iap_user", {
    type: "string",
    description: "Email address of the user allowed to access dev environment via IAP.",
  }).stringValue

  const oauthClientId = new TerraformVariable(scope, "oauth_client_id", {
    type: "string",
    description: "OAuth 2.0 Client ID for IAP (dev environment).",
  }).stringValue

  const oauthClientSecret = new TerraformVariable(scope, "oauth_client_secret", {
    type: "string",
    description: "OAuth 2.0 Client Secret for IAP (dev environment).",
    sensitive: true,
  }).stringValue

  return {
    projectId,
    projectNumber,
    stateBucket,
    iapUser,
    oauthClientId,
    oauthClientSecret,
  }
}

/**
 * Creates configuration for dev/prod stacks.
 * Only the image URI is injected from GitHub Actions.
 */
export function createEnvironmentStackConfig(scope: Construct): EnvironmentStackConfig {
  const projectId = new TerraformVariable(scope, "project_id", {
    type: "string",
    description: "Google Cloud Project ID.",
  }).stringValue

  const stateBucket = new TerraformVariable(scope, "bucket_name", {
    type: "string",
    description: "GCS bucket used for Terraform state (shared across stacks).",
  }).stringValue

  const imageUri = new TerraformVariable(scope, "image_uri", {
    type: "string",
    description: "Container image URI to deploy to Cloud Run.",
  }).stringValue

  return {
    projectId,
    stateBucket,
    imageUri,
  }
}
