"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.default = void 0;
const { app } = require("electron");
const fs = require("fs");
const path = require("path");
class SettingsStore {
  #defaultValues = {};
  constructor(options = {}) {
    options = {
      name: "config",
      ...options,
    };
    this.#defaultValues = {
      ...this.#defaultValues,
      ...options.defaults,
    };
    this.path = path.resolve(
      app.getPath("userData"),
      `${options.name ?? "config"}.json`,
    );
  }
  get(key, defaultValue) {
    const store = this.store;
    return store[key] !== undefined ? store[key] : defaultValue;
  }
  set(key, value) {
    const { store } = this;
    if (typeof key === "object") {
      for (const [k, v] of Object.entries(key)) {
        store[k] = v;
      }
    } else {
      store[key] = value;
    }
    this.store = store;
  }
  has(key) {
    return key in this.store;
  }
  reset(...keys) {
    for (const key of keys) {
      if (this.#defaultValues[key] != null) {
        this.set(key, this.#defaultValues[key]);
      }
    }
  }
  delete(key) {
    const { store } = this;
    delete store[key];
    this.store = store;
  }
  clear() {
    this.store = {};
    for (const key of Object.keys(this.#defaultValues)) {
      this.reset(key);
    }
  }
  get store() {
    try {
      const data = fs.readFileSync(this.path, "utf8");
      const deserializedData = this._deserialize(data);
      return {
        ...deserializedData,
      };
    } catch (error) {
      if (error?.code === "ENOENT") {
        this._ensureDirectory();
        return {};
      }
      throw error;
    }
  }
  set store(value) {
    this._ensureDirectory();
    this._write(value);
  }
  _deserialize = (value) => JSON.parse(value);
  _serialize = (value) => JSON.stringify(value, undefined, "\t") ?? "";
  _ensureDirectory() {
    fs.mkdirSync(path.dirname(this.path), {
      recursive: true,
    });
  }
  _write(value) {
    const data = this._serialize(value);
    fs.writeFileSync(this.path, data, {
      mode: 0o666,
    });
  }
}
exports.default = SettingsStore;
