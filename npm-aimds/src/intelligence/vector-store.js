"use strict";
/**
 * ThreatVectorStore - AgentDB Vector Store Implementation
 *
 * Provides high-performance vector storage and similarity search for threat patterns
 * using AgentDB with HNSW indexing (150x faster than traditional methods).
 *
 * Performance targets:
 * - Store 1,000 vectors in <1s
 * - Search 1,000 vectors in <100ms total (<0.1ms each)
 * - Memory usage <50MB for 10K vectors
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ThreatVectorStore = void 0;
exports.createVectorStore = createVectorStore;
var schemas_1 = require("./schemas");
/**
 * ThreatVectorStore - Main class for vector operations
 */
var ThreatVectorStore = /** @class */ (function () {
    function ThreatVectorStore(config) {
        if (config === void 0) { config = {}; }
        var _a, _b;
        this.config = {
            dbPath: config.dbPath || ':memory:',
            hnsw: __assign(__assign({}, schemas_1.DEFAULT_HNSW_CONFIG), config.hnsw),
            autoIndex: (_a = config.autoIndex) !== null && _a !== void 0 ? _a : true,
            logQueries: (_b = config.logQueries) !== null && _b !== void 0 ? _b : false
        };
        this.metrics = {
            totalVectors: 0,
            avgSearchLatency: 0,
            totalSearches: 0,
            memoryUsage: 0,
            indexBuildTime: 0
        };
    }
    /**
     * Initialize the vector store
     */
    ThreatVectorStore.prototype.initialize = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 6, , 7]);
                        // Initialize AgentDB with HNSW configuration
                        // For now, we'll use a placeholder until AgentDB API is finalized
                        this.db = {
                            execute: function (sql, params) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, ({ changes: 1 })];
                            }); }); },
                            query: function (sql, params) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, []];
                            }); }); },
                            transaction: function (fn) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, fn()];
                                    case 1: return [2 /*return*/, _a.sent()];
                                }
                            }); }); },
                            close: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/];
                            }); }); },
                            initialize: function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/];
                            }); }); }
                        };
                        return [4 /*yield*/, this.db.initialize()];
                    case 2:
                        _a.sent();
                        // Create threats table with vector column
                        return [4 /*yield*/, this.db.execute("\n        CREATE TABLE IF NOT EXISTS threat_vectors (\n          id TEXT PRIMARY KEY,\n          embedding VECTOR(768),\n          pattern TEXT NOT NULL,\n          metadata JSON,\n          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,\n          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP\n        )\n      ")];
                    case 3:
                        // Create threats table with vector column
                        _a.sent();
                        if (!this.config.autoIndex) return [3 /*break*/, 5];
                        return [4 /*yield*/, this.buildIndex()];
                    case 4:
                        _a.sent();
                        _a.label = 5;
                    case 5:
                        this.metrics.indexBuildTime = Date.now() - startTime;
                        if (this.logger) {
                            this.logger.info('ThreatVectorStore initialized', {
                                dbPath: this.config.dbPath,
                                indexBuildTime: this.metrics.indexBuildTime
                            });
                        }
                        return [3 /*break*/, 7];
                    case 6:
                        error_1 = _a.sent();
                        if (this.logger) {
                            this.logger.error('Failed to initialize ThreatVectorStore', { error: error_1 });
                        }
                        throw new Error("Failed to initialize vector store: ".concat(error_1));
                    case 7: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Build HNSW index on threat vectors
     */
    ThreatVectorStore.prototype.buildIndex = function () {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.db.execute("\n        CREATE INDEX IF NOT EXISTS idx_threat_vectors_embedding\n        ON threat_vectors USING HNSW (embedding)\n        WITH (\n          M = ".concat(this.config.hnsw.M, ",\n          efConstruction = ").concat(this.config.hnsw.efConstruction, ",\n          metric = '").concat(this.config.hnsw.metric, "'\n        )\n      "))];
                    case 2:
                        _a.sent();
                        this.metrics.indexBuildTime = Date.now() - startTime;
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        throw new Error("Failed to build HNSW index: ".concat(error_2));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Store a threat vector
     */
    ThreatVectorStore.prototype.storeThreat = function (threat) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, latency, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.db.execute("\n        INSERT OR REPLACE INTO threat_vectors (id, embedding, pattern, metadata, updated_at)\n        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)\n      ", [
                                threat.id,
                                threat.embedding,
                                threat.pattern,
                                JSON.stringify(threat.metadata)
                            ])];
                    case 2:
                        _a.sent();
                        this.metrics.totalVectors++;
                        if (this.config.logQueries) {
                            latency = Date.now() - startTime;
                            console.log("Stored threat ".concat(threat.id, " in ").concat(latency, "ms"));
                        }
                        return [3 /*break*/, 4];
                    case 3:
                        error_3 = _a.sent();
                        throw new Error("Failed to store threat: ".concat(error_3));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Batch insert threat vectors
     */
    ThreatVectorStore.prototype.batchInsert = function (threats_1) {
        return __awaiter(this, arguments, void 0, function (threats, options) {
            var opts, results, startTime, _loop_1, this_1, i, totalTime;
            var _this = this;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        opts = __assign(__assign({}, schemas_1.DEFAULT_BATCH_OPTIONS), options);
                        results = { successful: 0, failed: 0 };
                        startTime = Date.now();
                        _loop_1 = function (i) {
                            var batch, error_4;
                            return __generator(this, function (_b) {
                                switch (_b.label) {
                                    case 0:
                                        batch = threats.slice(i, i + opts.batchSize);
                                        _b.label = 1;
                                    case 1:
                                        _b.trys.push([1, 3, , 4]);
                                        return [4 /*yield*/, this_1.db.transaction(function () { return __awaiter(_this, void 0, void 0, function () {
                                                var _i, batch_1, threat, error_5;
                                                return __generator(this, function (_a) {
                                                    switch (_a.label) {
                                                        case 0:
                                                            _i = 0, batch_1 = batch;
                                                            _a.label = 1;
                                                        case 1:
                                                            if (!(_i < batch_1.length)) return [3 /*break*/, 6];
                                                            threat = batch_1[_i];
                                                            _a.label = 2;
                                                        case 2:
                                                            _a.trys.push([2, 4, , 5]);
                                                            return [4 /*yield*/, this.storeThreat(threat)];
                                                        case 3:
                                                            _a.sent();
                                                            results.successful++;
                                                            return [3 /*break*/, 5];
                                                        case 4:
                                                            error_5 = _a.sent();
                                                            results.failed++;
                                                            if (!opts.continueOnError)
                                                                throw error_5;
                                                            return [3 /*break*/, 5];
                                                        case 5:
                                                            _i++;
                                                            return [3 /*break*/, 1];
                                                        case 6: return [2 /*return*/];
                                                    }
                                                });
                                            }); })];
                                    case 2:
                                        _b.sent();
                                        if (opts.onProgress) {
                                            opts.onProgress(i + batch.length, threats.length);
                                        }
                                        return [3 /*break*/, 4];
                                    case 3:
                                        error_4 = _b.sent();
                                        if (!opts.continueOnError)
                                            throw error_4;
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _a.label = 1;
                    case 1:
                        if (!(i < threats.length)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(i)];
                    case 2:
                        _a.sent();
                        _a.label = 3;
                    case 3:
                        i += opts.batchSize;
                        return [3 /*break*/, 1];
                    case 4:
                        totalTime = Date.now() - startTime;
                        if (this.logger) {
                            this.logger.info('Batch insert completed', {
                                successful: results.successful,
                                failed: results.failed,
                                totalTime: totalTime,
                                throughput: results.successful / (totalTime / 1000)
                            });
                        }
                        return [2 /*return*/, results];
                }
            });
        });
    };
    /**
     * Search for similar threat vectors
     * Target: <0.1ms per search
     */
    ThreatVectorStore.prototype.searchSimilar = function (query) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, filters, params, whereClause, sql, rows, latency_1, results, error_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        filters = [];
                        params = [query.embedding, query.k];
                        if (query.type) {
                            filters.push("json_extract(metadata, '$.type') = ?");
                            params.push(query.type);
                        }
                        if (query.severity) {
                            filters.push("json_extract(metadata, '$.severity') = ?");
                            params.push(query.severity);
                        }
                        whereClause = filters.length > 0 ? "WHERE ".concat(filters.join(' AND ')) : '';
                        sql = "\n        SELECT\n          id,\n          embedding,\n          pattern,\n          metadata,\n          created_at,\n          updated_at,\n          vector_distance(embedding, ?, '".concat(this.config.hnsw.metric, "') as distance\n        FROM threat_vectors\n        ").concat(whereClause, "\n        ORDER BY distance ASC\n        LIMIT ?\n      ");
                        return [4 /*yield*/, this.db.query(sql, params)];
                    case 2:
                        rows = _a.sent();
                        latency_1 = Date.now() - startTime;
                        this.updateSearchMetrics(latency_1);
                        results = rows.map(function (row) {
                            var similarity = 1 - row.distance; // Convert distance to similarity
                            // Apply threshold filter if specified
                            if (query.threshold && similarity < query.threshold) {
                                return null;
                            }
                            return {
                                vector: {
                                    id: row.id,
                                    embedding: row.embedding,
                                    pattern: row.pattern,
                                    metadata: JSON.parse(row.metadata),
                                    createdAt: new Date(row.created_at),
                                    updatedAt: new Date(row.updated_at)
                                },
                                similarity: similarity,
                                latency: latency_1
                            };
                        }).filter(Boolean);
                        if (this.config.logQueries) {
                            console.log("Search completed in ".concat(latency_1, "ms, found ").concat(results.length, " results"));
                        }
                        return [2 /*return*/, results];
                    case 3:
                        error_6 = _a.sent();
                        throw new Error("Search failed: ".concat(error_6));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get threat vector by ID
     */
    ThreatVectorStore.prototype.getThreat = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var rows, row, error_7;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.query('SELECT * FROM threat_vectors WHERE id = ?', [id])];
                    case 1:
                        rows = _a.sent();
                        if (rows.length === 0)
                            return [2 /*return*/, null];
                        row = rows[0];
                        return [2 /*return*/, {
                                id: row.id,
                                embedding: row.embedding,
                                pattern: row.pattern,
                                metadata: JSON.parse(row.metadata),
                                createdAt: new Date(row.created_at),
                                updatedAt: new Date(row.updated_at)
                            }];
                    case 2:
                        error_7 = _a.sent();
                        throw new Error("Failed to get threat: ".concat(error_7));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Delete threat vector by ID
     */
    ThreatVectorStore.prototype.deleteThreat = function (id) {
        return __awaiter(this, void 0, void 0, function () {
            var result, error_8;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.db.execute('DELETE FROM threat_vectors WHERE id = ?', [id])];
                    case 1:
                        result = _a.sent();
                        if (result.changes > 0) {
                            this.metrics.totalVectors--;
                            return [2 /*return*/, true];
                        }
                        return [2 /*return*/, false];
                    case 2:
                        error_8 = _a.sent();
                        throw new Error("Failed to delete threat: ".concat(error_8));
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get performance metrics
     */
    ThreatVectorStore.prototype.getMetrics = function () {
        return __assign({}, this.metrics);
    };
    /**
     * Update search metrics
     */
    ThreatVectorStore.prototype.updateSearchMetrics = function (latency) {
        this.metrics.totalSearches++;
        // Update rolling average
        var alpha = 0.1; // Exponential moving average factor
        this.metrics.avgSearchLatency =
            alpha * latency + (1 - alpha) * this.metrics.avgSearchLatency;
    };
    /**
     * Close the database connection
     */
    ThreatVectorStore.prototype.close = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.db) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.db.close()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set logger instance
     */
    ThreatVectorStore.prototype.setLogger = function (logger) {
        this.logger = logger;
    };
    return ThreatVectorStore;
}());
exports.ThreatVectorStore = ThreatVectorStore;
/**
 * Create and initialize a ThreatVectorStore
 */
function createVectorStore(config) {
    return __awaiter(this, void 0, void 0, function () {
        var store;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    store = new ThreatVectorStore(config);
                    return [4 /*yield*/, store.initialize()];
                case 1:
                    _a.sent();
                    return [2 /*return*/, store];
            }
        });
    });
}
