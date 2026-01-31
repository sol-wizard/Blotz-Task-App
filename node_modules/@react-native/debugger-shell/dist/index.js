"use strict";

if ("electron" in process.versions) {
  module.exports = require("./electron");
} else {
  module.exports = require("./node");
}
