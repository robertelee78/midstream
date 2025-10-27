/**
 * WASM Module Loader
 * Handles loading and initialization of AIMDS WASM modules
 */

const fs = require('fs').promises;
const path = require('path');

class WasmLoader {
  constructor() {
    this.modules = new Map();
    this.initialized = false;
  }

  /**
   * Load WASM module
   * @param {string} moduleName - Name of the module (detection, analysis, etc.)
   * @returns {Promise<WebAssembly.Instance>}
   */
  async loadModule(moduleName) {
    if (this.modules.has(moduleName)) {
      return this.modules.get(moduleName);
    }

    try {
      const wasmPath = this.getWasmPath(moduleName);
      const wasmBuffer = await fs.readFile(wasmPath);
      const wasmModule = await WebAssembly.compile(wasmBuffer);
      const wasmInstance = await WebAssembly.instantiate(wasmModule, this.getImports());

      this.modules.set(moduleName, wasmInstance);
      return wasmInstance;
    } catch (error) {
      throw new Error(`Failed to load WASM module '${moduleName}': ${error.message}`);
    }
  }

  /**
   * Get path to WASM file
   * @param {string} moduleName
   * @returns {string}
   */
  getWasmPath(moduleName) {
    // Try multiple possible locations
    const possiblePaths = [
      path.join(__dirname, '../../wasm', `${moduleName}.wasm`),
      path.join(__dirname, '../../../AIMDS/target/wasm32-unknown-unknown/release', `aimds_${moduleName}.wasm`),
      path.join(__dirname, '../../../AIMDS/dist', `${moduleName}.wasm`),
      path.join(process.cwd(), 'wasm', `${moduleName}.wasm`),
    ];

    for (const wasmPath of possiblePaths) {
      try {
        if (require('fs').existsSync(wasmPath)) {
          return wasmPath;
        }
      } catch (err) {
        // Continue to next path
      }
    }

    throw new Error(`WASM module '${moduleName}' not found. Run 'npm run build:wasm' first.`);
  }

  /**
   * Get WASM imports
   * @returns {object}
   */
  getImports() {
    return {
      env: {
        // Memory management
        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 }),

        // Logging
        log: (ptr, len) => {
          console.log(this.readString(ptr, len));
        },

        // Error handling
        abort: (msg, file, line, col) => {
          console.error(`Abort: ${msg} at ${file}:${line}:${col}`);
        },
      },
    };
  }

  /**
   * Read string from WASM memory
   * @param {number} ptr - Pointer to string
   * @param {number} len - Length of string
   * @returns {string}
   */
  readString(ptr, len) {
    // This would be implemented based on the actual WASM memory layout
    return `[WASM output at ${ptr}, length ${len}]`;
  }

  /**
   * Initialize all modules
   * @returns {Promise<void>}
   */
  async initializeAll() {
    if (this.initialized) return;

    const modules = ['detection', 'analysis', 'verification', 'response'];

    try {
      await Promise.all(modules.map(mod => this.loadModule(mod).catch(() => null)));
      this.initialized = true;
    } catch (error) {
      console.warn('Some WASM modules failed to load:', error.message);
    }
  }

  /**
   * Check if module is loaded
   * @param {string} moduleName
   * @returns {boolean}
   */
  isLoaded(moduleName) {
    return this.modules.has(moduleName);
  }

  /**
   * Unload all modules
   */
  unloadAll() {
    this.modules.clear();
    this.initialized = false;
  }
}

module.exports = new WasmLoader();
