/**
 * This script generates a NOTICE.md file at project root containing licenses for all
 * third-party dependencies included in the published extension package.
 */

console.log("Generating NOTICE.md file...");

var checker = require("license-checker");
var fs = require("fs");
var path = require("path");

checker.init(
  {
    start: `${__dirname}/..`,
    production: true,
    customFormat: {
      licenseText: ""
    }
  },
  function(err, packages) {
    if (err) {
      console.error(`Failed to generate NOTICE.md file: ${err.stack}`);
      process.exit(1);
    } else {
      var stream = fs.createWriteStream(
        path.resolve(__dirname, "..", "NOTICE.md")
      );
      stream.write(`# Third-party notices\n\n
This document includes licensing information relating to free, open-source, and public-source software (together, the “SOFTWARE”) included with or used while developing Slack’s \`vscode-hack\` software.  The terms of the applicable free, open-source, and public-source licenses (each an “OSS LICENSE”) govern Slack’s distribution and your use of the SOFTWARE. Slack and the third-party authors, licensors, and distributors of the SOFTWARE disclaim all warranties and liability arising from all use and distribution of the SOFTWARE. To the extent the OSS is provided under an agreement with Slack that differs from the applicable OSS LICENSE, those terms are offered by Slack alone.\n\n
Slack has reproduced below copyright and other licensing notices appearing within the SOFTWARE. While Slack seeks to provide complete and accurate copyright and licensing information for each SOFTWARE package, Slack does not represent or warrant that the following information is complete, correct, or error-free. SOFTWARE recipients are encouraged to (a) investigate the identified SOFTWARE packages to confirm the accuracy of the licensing information provided herein and (b) notify Slack of any inaccuracies or errors found in this document so that Slack may update this document accordingly.\n\n
Certain OSS LICENSES (such as the GNU General Public Licenses, GNU Library/Lesser General Public Licenses, Affero General Public Licenses, Mozilla Public Licenses, Common Development and Distribution Licenses, Common Public License, and Eclipse Public License) require that the source code corresponding to distributed OSS binaries be made available to recipients or other requestors under the terms of the same OSS LICENSE. Recipients or requestors who would like to receive a copy of such corresponding source code should submit a request to Slack by post at:\n\n
Slack  
Attn: Open Source Requests  
500 Howard St.  
San Francisco, CA 94105\n\n---\n`);
      for (var package in packages) {
        if (package.startsWith("vscode-hack@")) {
          // Don't need to include a separate notice for our own package
          continue;
        }
        stream.write(`**[${package}](${packages[package].repository})**\n`);
        stream.write(`\`\`\`\n${packages[package].licenseText}\n\`\`\`\n\n`);
      }
      stream.end();
      console.log(`NOTICE.md successfully written at ${stream.path}\n`);
    }
  }
);
