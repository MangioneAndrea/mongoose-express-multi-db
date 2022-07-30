import * as fs from "fs"
import {walk, fileHasMongooseDeclaration} from "../src/util";

const [, , modelsPath, outputFile] = process.argv;


const allImports = walk(modelsPath).filter(fileHasMongooseDeclaration)
    .map(p => p.replace(process.cwd(), "")
        .replace(/\\/g, "/")
        .replace(/^\//, "./")
    ).map(
        (path) => {
            const fileContent = fs.readFileSync(path).toString()
            const rx = /model\(["'](.*?)["']/;
            const res = rx.exec(fileContent) || ["", ""];
            const [, name] = res

            if (path.endsWith(".js")) {
                path = path.replace(".js", "")
                return [name, `import type * as ${name} from "${path}"`]
            } else {
                path = path.replace(".ts", "")
                return [name, `import type ${name} from "${path}"`]
            }
        }
    );


const fileContent = `
${allImports.map(([, path]) => path).join("\n")}

type KnownModels = {
    ${allImports.map(([name]) => `${name}: typeof ${name}`).join(",\n    ")}
}
export default KnownModels
    `

fs.writeFileSync(outputFile, fileContent)