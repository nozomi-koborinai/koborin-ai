import { App } from "cdktf"
import { SharedStack } from "./stacks/shared-stack"

const app = new App()

new SharedStack(app, "shared")

app.synth()

