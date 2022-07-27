import * as fs from "fs"
import * as  path from "path"

export const walk = function (dir: string | Array<string>): Array<string> {

    if (Array.isArray(dir)) return dir.map(walk).flat(1);

    let results: Array<string> = [];
    const paths = fs.readdirSync(dir);
    paths.forEach((filePath) => {
        const file = path.resolve(dir, filePath)
        const status = fs.statSync(file)
        if (status.isDirectory()) {
            results = results.concat(walk(file))
        } else {
            results.push(file)
        }
    })
    return results;
};

export const fileHasMongooseDeclaration = (filePath: string): boolean => {
    const file: string = fs.readFileSync(filePath).toString()
    return ["mongoose", "Schema", "new", "export"].every(str => file.includes(str))
}