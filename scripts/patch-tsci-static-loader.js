import { readFileSync, writeFileSync } from "node:fs"

const cliMainPath = "node_modules/@tscircuit/cli/dist/cli/main.js"
const marker = 'contents.startsWith("// Generated from")'
const needle =
  'build.onLoad({ filter: staticAssetFilter }, (args) => {\n          const baseDir = baseUrl ? path.resolve(process.cwd(), baseUrl) : process.cwd();'
const replacement =
  'build.onLoad({ filter: staticAssetFilter }, (args) => {\n          if (args.path.endsWith(".kicad_pcb")) {\n            const contents = fs.readFileSync(args.path, "utf-8");\n            if (contents.startsWith("// Generated from")) {\n              return {\n                contents,\n                loader: "js"\n              };\n            }\n          }\n          const baseDir = baseUrl ? path.resolve(process.cwd(), baseUrl) : process.cwd();'

let cliMain = readFileSync(cliMainPath, "utf8")

if (!cliMain.includes(marker)) {
  if (!cliMain.includes(needle)) {
    throw new Error("Could not find @tscircuit/cli static asset loader")
  }

  cliMain = cliMain.replace(needle, replacement)
  writeFileSync(cliMainPath, cliMain)
}
