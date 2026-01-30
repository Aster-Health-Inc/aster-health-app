const { withInfoPlist } = require('expo/config-plugins');

function withBuildNumberSync(config) {
  return withInfoPlist(config, (mod) => {
    const buildNumber = mod?.ios?.buildNumber;

    if (buildNumber) {
      mod.modResults.CFBundleVersion = String(buildNumber);
    }

    return mod;
  });
}

module.exports = withBuildNumberSync;
