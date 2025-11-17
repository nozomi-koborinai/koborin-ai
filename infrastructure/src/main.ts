import { App } from "cdktf"
import { DevStack } from "./stacks/dev-stack"
import { ProdStack } from "./stacks/prod-stack"
import { SharedStack } from "./stacks/shared-stack"

const app = new App()

new SharedStack(app, "shared")
new DevStack(app, "dev")
new ProdStack(app, "prod")

app.synth()

