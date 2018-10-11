/**
 * This script generates a NOTICE.md file at project root containing licenses for all
 * third-party dependencies included in the published extension package.
 */

console.log('Generating NOTICE.md file...');

var checker = require('license-checker');
var fs = require('fs');
var path = require("path");

checker.init({
    start: `${__dirname}/..`,
    production: true,
    customFormat: {
        licenseText: ""
    }
}, function (err, packages) {
    if (err) {
        console.error(`Failed to generate NOTICE.md file: ${err.stack}`);
        process.exit(1);
    } else {
        var stream = fs.createWriteStream(path.resolve(__dirname, '..', 'NOTICE.md'));
        stream.once('ready', fd => {
            for (var package in packages) {
                if (package.startsWith('vscode-hack@')) {
                    // Don't need to include a separate notice for our own package
                    continue;
                }
                stream.write(`**[${package}](${packages[package].repository})**\n`);
                stream.write(`\`\`\`\n${packages[package].licenseText}\n\`\`\`\n\n`);
            }
            stream.end();
        });
        console.log(`NOTICE.md successfully written at ${stream.path}\n`);
    }
});
