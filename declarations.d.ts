declare module "*.kicad_pcb" {
  import type { AnyCircuitElement } from "circuit-json"

  export const circuitJson: AnyCircuitElement[]

  const src: string
  export default src
}
