import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifestJson = JSON.parse(fs.readFileSync("manifest.json", "utf8"));
const versionsJson = JSON.parse(fs.readFileSync("versions.json", "utf8"));

manifestJson.version = packageJson.version;
versionsJson[packageJson.version] = manifestJson.minAppVersion;

fs.writeFileSync("manifest.json", `${JSON.stringify(manifestJson, null, 2)}\n`);
fs.writeFileSync("versions.json", `${JSON.stringify(versionsJson, null, 2)}\n`);
