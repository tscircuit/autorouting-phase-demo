declare module "*.kicad_pcb" {
  import type { AnyCircuitElement } from "circuit-json"

  export const Board: (props: any) => any
  export const boardContentCircuitJson: AnyCircuitElement[]
  export const circuitJson: AnyCircuitElement[]

  const circuitJsonDefault: AnyCircuitElement[]
  export default circuitJsonDefault
}
