String.prototype.replaceAll = function(search, replacement) {
    let target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

const fs = require("fs");
const path = require("path");

const debug = false;

let folder = "M:/GitHub/Maps/"

let gametypes = ["CTF", "ALL"];

let INT_MAX = 2147483647;

function print(object) {
    console.log(object);
}

// https://stackoverflow.com/a/5827895
function walk(dir, done) {
    let results = [];
    fs.readdir(dir, function(err, list) {
        if (err) return done(err);
        var i = 0;
        (function next() {
            var file = list[i++];
            if (!file) return done(null, results);
            file = path.resolve(dir, file);
            fs.stat(file, function(err, stat) {
                if (stat && stat.isDirectory()) {
                    walk(file, function(err, res) {
                        results = results.concat(res);
                        next();
                    });
                } else {
                    if (file.endsWith("map.json")) {
                        results.push(file);
                    }
                    next();
                }
            });
        })();
    });
};

function filter(maps) {
    let filtered = [];

    for (let i = 0; i < maps.length; i++) {
        let map = maps[i];

        if (gametypes.includes("ALL")) {
            filtered.push(map);
            continue;
        }

        for (let k = 0; k < gametypes.length; k++) {
            let type = gametypes[k];

            if (map.toUpperCase().startsWith(folder.toUpperCase().replaceAll("/", "\\") + type + "\\")) {
                filtered.push(map);
            }
        }
    }

    return filtered;
}

function coordsToString(coordinate, increment) {
    let coordinateStr = String(coordinate).replace(INT_MAX, "oo");

    if (increment === 0 || coordinateStr.includes("oo")) return coordinateStr;

    coordinate += increment;

    return String(coordinate);
}

function serializeRegion(region, type) {
    let serialized = "{";

    let comma = false;

    if ("id" in region) {
        comma = true;
        serialized += `"id": "` + region.id + `"`;
    }

    if ("type" in region) {
        if (comma) serialized += `, `;
        serialized += `"type": "` + region.type + `"`;
    } else if (type) {
        if (comma) serialized += `, `;
        serialized += `"type": "cuboid"`;
    }

    // Cuboid
    if ("min" in region) {
        if (comma) serialized += `, `;
        serialized += `"min": "` + region.min + `"`;
    }

    if ("max" in region) {
        if (comma) serialized += `, `;
        serialized += `"max": "` + region.max + `"`;
    }

    // Cylinder
    if ("base" in region) {
        if (comma) serialized += `, `;
        serialized += `"base": "` + region.base + `"`;
    }

    if ("radius" in region) {
        if (comma) serialized += `, `;
        serialized += `"radius": "` + region.radius + `"`;
    }

    if ("height" in region) {
        if (comma) serialized += `, `;
        serialized += `"height": "` + region.height + `"`;
    }

    // Sphere


    // Hemisphere


    // Meta





    serialized += "}";

    return serialized;
}

function insertFix(fix) {

}

walk(folder, function(err, unfilteredMaps) {
    if (err) throw err;

    let maps = filter(unfilteredMaps);

    print("Found " + maps.length + " map" + (maps.length === 1 ? "" : "s"));
    print("");

    let converted = [];
    let skipped = [];
    let failed = [];

    for (let mapIndex = 0; mapIndex < maps.length; mapIndex++) {
        let map = maps[mapIndex];

        let jsonStr = fs.readFileSync(map).toString();
        let json = JSON.parse(jsonStr);

        let newJsonStr = jsonStr;

        let name = json.name;

        let convertedRegions = 0;

        let skipReason = "";
        
        try {
            if ("regions" in json) {
                let regions = json.regions;

                for (let i = 0; i < regions.length; i++) {
                    let region = regions[i];
                    if ("type" in region &&
                        region.type.toLowerCase() !== "cuboid" &&
                        region.type.toLowerCase() !== "cylinder") {
                        skipReason = "Unsupported region type: " + region.type;
                        break;
                    }

                    let type = "type" in region ? region.type.toLowerCase() : "cuboid";

                    let oldRegionStr = "";
                    let newRegionStr = "";

                    if (type === "cuboid") {
                        let mathMinX, mathMinY, mathMinZ;
                        let mathMaxX, mathMaxY, mathMaxZ;

                        let minX, minY, minZ;
                        let maxX, maxY, maxZ;

                        let minStr = region.min;
                        let maxStr = region.max;

                        let min = minStr.replaceAll(" ", "").replaceAll("oo", INT_MAX).split(",");
                        let max = maxStr.replaceAll(" ", "").replaceAll("oo", INT_MAX).split(",");

                        minX = parseInt(min[0], 10);
                        minY = parseInt(min[1], 10);
                        minZ = parseInt(min[2], 10);

                        maxX = parseInt(max[0], 10);
                        maxY = parseInt(max[1], 10);
                        maxZ = parseInt(max[2], 10);

                        mathMinX = Math.min(minX, maxX);
                        mathMinY = Math.min(minY, maxY);
                        mathMinZ = Math.min(minZ, maxZ);

                        mathMaxX = Math.max(minX, maxX);
                        mathMaxY = Math.max(minY, maxY);
                        mathMaxZ = Math.max(minZ, maxZ);

                        let newMinStr = coordsToString(mathMinX, 0) + ", " + coordsToString(mathMinY, 0) + ", " + coordsToString(mathMinZ, 0);
                        let newMaxStr = coordsToString(mathMaxX, 0) + ", " + coordsToString(mathMaxY, 0) + ", " + coordsToString(mathMaxZ, 0);

                        let adjMinStr = coordsToString(mathMinX, 0) + ", " + coordsToString(mathMinY, 0) + ", " + coordsToString(mathMinZ, 0);
                        let adjMaxStr = coordsToString(mathMaxX, 1) + ", " + coordsToString(mathMaxY, 0) + ", " + coordsToString(mathMaxZ, 1);

                        let newRegion = JSON.parse(JSON.stringify(region));
                        newRegion.min = adjMinStr;
                        newRegion.max = adjMaxStr;


                        oldRegionStr = serializeRegion(region, false);
                        newRegionStr = serializeRegion(newRegion, true);

                        if (debug) {
                            print("old region:");
                            print(serializeRegion(region));

                            print("");

                            /*
                            print("oldMin: " + minStr);
                            print("oldMax: " + maxStr);

                            print("");

                            print("newMin: " + newMinStr);
                            print("newMax: " + newMaxStr);

                            print("");

                            print("adjMin: " + adjMinStr);
                            print("adjMax: " + adjMaxStr);
                            */

                            print("new region:");
                            print(newRegionStr);

                            print("");
                            print("");
                            print("");
                        }
                    } else if (type === "cylinder") {
                        
                    }

                    if (!newJsonStr.includes(oldRegionStr)) {
                        skipReason = "Old region string not found:\nold: " + oldRegionStr + "\nnew: " + newRegionStr;
                        break;
                    }

                    newJsonStr = newJsonStr.replace(oldRegionStr, newRegionStr);
                    convertedRegions++;

                    //if (i == 0) break;
                }
            } else {
                skipReason = "No regions found";
            }

            
        } catch (e) {
            print(e);
            failed[name] = {"error": e};
            skipReason = "Error";
        }

        if (skipReason !== "") {
            skipped[name] = {"reason": skipReason};
            continue;
        }

        converted[name] = {
            "version": json.version,
            "converted-regions": convertedRegions + "/" + ("regions" in json ? json.regions.length : 0)
        };

        // Iterate through lines of map.json string. Manually remove and introduce new region list



        // fs.writeFileSync(map, newJsonStr);
    
    }

    print("Succeded: " + Object.keys(converted).length + "/" + maps.length);
    print("Skipped: " + Object.keys(skipped).length + "/" + maps.length);
    print("Failed: " + Object.keys(failed).length + "/" + maps.length);

    print("");
    print("");

    for (let name in skipped) {
        if ("reason" in skipped[name] && skipped[name].reason !== "No regions found") print("Skipped " + name + ": " + skipped[name].reason);
    }

    print("");

    for (let name in failed) {
        print("Failed " + name + ": " + failed[name].error)
    }

});
