import { circuitJson as arduinoUnoCircuitJson } from "./assets/arduino-uno.kicad_pcb"

const REROUTE_REGION = {
  minX: -10,
  minY: -7,
  maxX: 10,
  maxY: 7,
}

type RectRegion = typeof REROUTE_REGION & { shape?: "rect" }

const toRectRegion = (region: typeof REROUTE_REGION): RectRegion => ({
  shape: "rect",
  minX: region.minX,
  minY: region.minY,
  maxX: region.maxX,
  maxY: region.maxY,
})

const createBasicAutorouter =
  (routeGenerator: (simpleRouteJson: any) => Promise<any[]>) =>
  async (simpleRouteJson: any) => {
    const eventHandlers = {
      complete: [] as Array<(event: any) => void>,
      error: [] as Array<(event: any) => void>,
      progress: [] as Array<(event: any) => void>,
    }

    return {
      input: simpleRouteJson,
      isRouting: false,
      async start() {
        if (this.isRouting) return
        this.isRouting = true

        try {
          const traces = await routeGenerator(this.input)
          for (const handler of eventHandlers.progress) {
            handler({
              type: "progress",
              steps: 1,
              progress: 1,
              phase: "complete",
            })
          }
          setTimeout(() => {
            this.isRouting = false
            for (const handler of eventHandlers.complete) {
              handler({ type: "complete", traces })
            }
          }, 0)
        } catch (error) {
          this.isRouting = false
          for (const handler of eventHandlers.error) {
            handler({
              type: "error",
              error: error instanceof Error ? error : new Error(String(error)),
            })
          }
        }
      },
      stop() {
        this.isRouting = false
      },
      on(event: "complete" | "error" | "progress", callback: any) {
        eventHandlers[event].push(callback)
      },
      solveSync() {
        throw new Error("Sync autorouting is not implemented for this demo")
      },
    }
  }

const routeStraightThroughRegion = async (simpleRouteJson: any) =>
  simpleRouteJson.connections.map((connection: any) => ({
    type: "pcb_trace",
    pcb_trace_id: `${connection.name}_baseline`,
    connection_name: connection.source_trace_id ?? connection.name,
    route: connection.pointsToConnect.map((point: any) => ({
      route_type: "wire",
      x: point.x,
      y: point.y,
      width: connection.nominalTraceWidth ?? 0.2,
      layer: point.layer,
    })),
  }))

const routeAroundRegion = (region: typeof REROUTE_REGION) => async (simpleRouteJson: any) =>
  simpleRouteJson.connections.map((connection: any) => {
    const [start, end] = connection.pointsToConnect
    const traceWidth = connection.nominalTraceWidth ?? 0.2
    const northY = region.maxY + 4
    const exitOffset = 3

    return {
      type: "pcb_trace",
      pcb_trace_id: `${connection.name}_rerouted`,
      connection_name: connection.name,
      route: [
        start,
        { x: region.minX - exitOffset, y: start.y, layer: start.layer },
        { x: region.minX - exitOffset, y: northY, layer: start.layer },
        { x: region.maxX + exitOffset, y: northY, layer: end.layer },
        { x: region.maxX + exitOffset, y: end.y, layer: end.layer },
        end,
      ].map((point: any) => ({
        route_type: "wire",
        x: point.x,
        y: point.y,
        width: traceWidth,
        layer: point.layer,
      })),
    }
  })

const straightThroughAutorouter = createBasicAutorouter(routeStraightThroughRegion)
const createRerouteRegionAutorouter = (region: typeof REROUTE_REGION) =>
  createBasicAutorouter(routeAroundRegion(region))

const DemoTracePair = ({ routingPhaseIndex }: { routingPhaseIndex: number }) => (
  <>
    <testpoint
      name="TP_LEFT"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.4mm"
      pcbX={-26}
      pcbY={0}
    />
    <testpoint
      name="TP_RIGHT"
      footprintVariant="pad"
      padShape="circle"
      padDiameter="1.4mm"
      pcbX={26}
      pcbY={0}
    />
    <trace
      from=".TP_LEFT > .pin1"
      to=".TP_RIGHT > .pin1"
      routingPhaseIndex={routingPhaseIndex}
    />
  </>
)

const ArduinoRerouteDemoBoard = ({
  name,
  includeReroutePhase,
  phaseRegion,
}: {
  name: string
  includeReroutePhase: boolean
  phaseRegion: RectRegion
}) => (
  <board name={name} width="72mm" height="58mm" routingDisabled={false}>
    <subcircuit name="ArduinoUnoImport" circuitJson={arduinoUnoCircuitJson} />

    <silkscreentext
      text={includeReroutePhase ? "Arduino UNO + region reroute" : "Arduino UNO, no reroute"}
      pcbX={0}
      pcbY={25}
      fontSize="2mm"
    />
    <pcbnoterect
      pcbX={(REROUTE_REGION.minX + REROUTE_REGION.maxX) / 2}
      pcbY={(REROUTE_REGION.minY + REROUTE_REGION.maxY) / 2}
      width={`${REROUTE_REGION.maxX - REROUTE_REGION.minX}mm`}
      height={`${REROUTE_REGION.maxY - REROUTE_REGION.minY}mm`}
      strokeWidth="0.25mm"
      color={includeReroutePhase ? "rgba(0, 180, 90, 0.9)" : "rgba(220, 80, 50, 0.9)"}
      isFilled={false}
      isStrokeDashed
    />

    <autoroutingphase
      phaseIndex={0}
      autorouter={{
        local: true,
        groupMode: "subcircuit",
        algorithmFn: straightThroughAutorouter,
      }}
    />
    {includeReroutePhase && (
      <autoroutingphase
        phaseIndex={1}
        reroute={true}
        region={phaseRegion}
        autorouter={{
          local: true,
          groupMode: "subcircuit",
          algorithmFn: createRerouteRegionAutorouter(phaseRegion),
        }}
      />
    )}

    <DemoTracePair routingPhaseIndex={includeReroutePhase ? 1 : 0} />
  </board>
)

export default () => (
  <panel
    name="AutoroutingPhaseDemo"
    width="160mm"
    height="70mm"
    layoutMode="none"
    panelizationMethod="none"
  >
    <subpanel pcbX={-40} pcbY={0}>
      <ArduinoRerouteDemoBoard
        name="NoReroute"
        includeReroutePhase={false}
        phaseRegion={toRectRegion(REROUTE_REGION)}
      />
    </subpanel>
    <subpanel pcbX={40} pcbY={0}>
      <ArduinoRerouteDemoBoard
        name="RegionReroute"
        includeReroutePhase
        phaseRegion={toRectRegion(REROUTE_REGION)}
      />
    </subpanel>
  </panel>
)
