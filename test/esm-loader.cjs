// Helper to allow stubbing properties in ES modules.
require = require("esm")(module, {
  cjs: true,
});
