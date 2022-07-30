"use strict";
exports.__esModule = true;
exports.fileHasMongooseDeclaration = exports.walk = void 0;
var fs = require("fs");
var path = require("path");
/** @internal */
var walk = function (dir) {
    if (Array.isArray(dir))
        return dir.map(exports.walk).flat(1);
    var results = [];
    var paths = fs.readdirSync(dir);
    paths.forEach(function (filePath) {
        var file = path.resolve(dir, filePath);
        var status = fs.statSync(file);
        if (status.isDirectory()) {
            results = results.concat((0, exports.walk)(file));
        }
        else {
            results.push(file);
        }
    });
    return results;
};
exports.walk = walk;
/** @internal */
var fileHasMongooseDeclaration = function (filePath) {
    var file = fs.readFileSync(filePath).toString();
    return ["mongoose", "Schema", "new", "export"].every(function (str) { return file.includes(str); });
};
exports.fileHasMongooseDeclaration = fileHasMongooseDeclaration;
