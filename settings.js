const fs = require("fs");
const path = require("path");

const SETTINGS_FILE = path.join(__dirname, "settings.json");

const DEFAULTS = {
  enabled: true,
  instructions: [],
  products: {},
};

function getSettings() {
  try {
    const data = fs.readFileSync(SETTINGS_FILE, "utf8");
    return { ...DEFAULTS, ...JSON.parse(data) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");
}

module.exports = { getSettings, saveSettings };
