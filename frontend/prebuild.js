const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

try {
  // Read from the root directory
  const yamlPath = path.join(__dirname, '..', 'sources.yaml');
  if (fs.existsSync(yamlPath)) {
    const doc = yaml.load(fs.readFileSync(yamlPath, 'utf8'));
    // Write to src/app/sources.json so Next.js can import it statically
    fs.writeFileSync(path.join(__dirname, 'src', 'app', 'sources.json'), JSON.stringify(doc, null, 2));
    console.log("Successfully converted sources.yaml to sources.json");
  } else {
    console.warn("sources.yaml not found at", yamlPath);
  }
} catch (e) {
  console.error("Error during prebuild yaml conversion:", e);
  process.exit(1);
}
