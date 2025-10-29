"use strict";
/**
 * Embedding Utilities for AgentDB Integration
 *
 * Provides embedding generation and manipulation utilities for threat patterns.
 * Supports both local and API-based embedding generation.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.EmbeddingUtils = exports.OpenAIEmbeddingProvider = exports.HashEmbeddingProvider = void 0;
exports.createEmbeddingProvider = createEmbeddingProvider;
var crypto = __importStar(require("crypto"));
/**
 * Simple hash-based embedding generator (for testing/fallback)
 * Uses deterministic hashing to create 768-dimensional vectors
 */
var HashEmbeddingProvider = /** @class */ (function () {
    function HashEmbeddingProvider() {
        this.dimensions = 768;
    }
    /**
     * Generate embedding from text hash
     */
    HashEmbeddingProvider.prototype.embed = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var hash, embedding, i, byteIndex;
            return __generator(this, function (_a) {
                hash = crypto.createHash('sha512').update(text).digest();
                embedding = new Float32Array(this.dimensions);
                // Fill embedding with normalized hash values
                for (i = 0; i < this.dimensions; i++) {
                    byteIndex = i % hash.length;
                    embedding[i] = (hash[byteIndex] / 255) * 2 - 1; // Normalize to [-1, 1]
                }
                // Normalize to unit vector
                return [2 /*return*/, this.normalize(embedding)];
            });
        });
    };
    /**
     * Generate embeddings for multiple texts
     */
    HashEmbeddingProvider.prototype.embedBatch = function (texts) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, Promise.all(texts.map(function (text) { return _this.embed(text); }))];
            });
        });
    };
    /**
     * Normalize vector to unit length
     */
    HashEmbeddingProvider.prototype.normalize = function (vector) {
        var magnitude = Math.sqrt(Array.from(vector).reduce(function (sum, val) { return sum + val * val; }, 0));
        if (magnitude === 0)
            return vector;
        return Float32Array.from(vector, function (val) { return val / magnitude; });
    };
    return HashEmbeddingProvider;
}());
exports.HashEmbeddingProvider = HashEmbeddingProvider;
/**
 * OpenAI embeddings provider (text-embedding-3-small)
 */
var OpenAIEmbeddingProvider = /** @class */ (function () {
    function OpenAIEmbeddingProvider(apiKey) {
        this.dimensions = 768;
        this.model = 'text-embedding-3-small';
        this.baseURL = 'https://api.openai.com/v1';
        this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
        if (!this.apiKey) {
            console.warn('OpenAI API key not provided, embeddings will not work');
        }
    }
    /**
     * Generate embedding using OpenAI API
     */
    OpenAIEmbeddingProvider.prototype.embed = function (text) {
        return __awaiter(this, void 0, void 0, function () {
            var response, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            throw new Error('OpenAI API key not configured');
                        }
                        return [4 /*yield*/, fetch("".concat(this.baseURL, "/embeddings"), {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer ".concat(this.apiKey),
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: this.model,
                                    input: text,
                                    dimensions: this.dimensions
                                })
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("OpenAI API error: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, new Float32Array(data.data[0].embedding)];
                }
            });
        });
    };
    /**
     * Generate embeddings for multiple texts (batched)
     */
    OpenAIEmbeddingProvider.prototype.embedBatch = function (texts) {
        return __awaiter(this, void 0, void 0, function () {
            var response, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.apiKey) {
                            throw new Error('OpenAI API key not configured');
                        }
                        return [4 /*yield*/, fetch("".concat(this.baseURL, "/embeddings"), {
                                method: 'POST',
                                headers: {
                                    'Authorization': "Bearer ".concat(this.apiKey),
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    model: this.model,
                                    input: texts,
                                    dimensions: this.dimensions
                                })
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("OpenAI API error: ".concat(response.statusText));
                        }
                        return [4 /*yield*/, response.json()];
                    case 2:
                        data = _a.sent();
                        return [2 /*return*/, data.data.map(function (item) { return new Float32Array(item.embedding); })];
                }
            });
        });
    };
    return OpenAIEmbeddingProvider;
}());
exports.OpenAIEmbeddingProvider = OpenAIEmbeddingProvider;
/**
 * Embedding utility functions
 */
var EmbeddingUtils = /** @class */ (function () {
    function EmbeddingUtils() {
    }
    /**
     * Calculate cosine similarity between two embeddings
     */
    EmbeddingUtils.cosineSimilarity = function (a, b) {
        if (a.length !== b.length) {
            throw new Error('Embedding dimensions must match');
        }
        var dotProduct = 0;
        var magnitudeA = 0;
        var magnitudeB = 0;
        for (var i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            magnitudeA += a[i] * a[i];
            magnitudeB += b[i] * b[i];
        }
        magnitudeA = Math.sqrt(magnitudeA);
        magnitudeB = Math.sqrt(magnitudeB);
        if (magnitudeA === 0 || magnitudeB === 0)
            return 0;
        return dotProduct / (magnitudeA * magnitudeB);
    };
    /**
     * Calculate Euclidean distance between two embeddings
     */
    EmbeddingUtils.euclideanDistance = function (a, b) {
        if (a.length !== b.length) {
            throw new Error('Embedding dimensions must match');
        }
        var sum = 0;
        for (var i = 0; i < a.length; i++) {
            var diff = a[i] - b[i];
            sum += diff * diff;
        }
        return Math.sqrt(sum);
    };
    /**
     * Normalize embedding to unit vector
     */
    EmbeddingUtils.normalize = function (embedding) {
        var magnitude = Math.sqrt(Array.from(embedding).reduce(function (sum, val) { return sum + val * val; }, 0));
        if (magnitude === 0)
            return embedding;
        return Float32Array.from(embedding, function (val) { return val / magnitude; });
    };
    /**
     * Average multiple embeddings
     */
    EmbeddingUtils.average = function (embeddings) {
        if (embeddings.length === 0) {
            throw new Error('Cannot average empty array');
        }
        var dimensions = embeddings[0].length;
        var result = new Float32Array(dimensions);
        for (var _i = 0, embeddings_1 = embeddings; _i < embeddings_1.length; _i++) {
            var embedding = embeddings_1[_i];
            if (embedding.length !== dimensions) {
                throw new Error('All embeddings must have same dimensions');
            }
            for (var i = 0; i < dimensions; i++) {
                result[i] += embedding[i];
            }
        }
        for (var i = 0; i < dimensions; i++) {
            result[i] /= embeddings.length;
        }
        return this.normalize(result);
    };
    return EmbeddingUtils;
}());
exports.EmbeddingUtils = EmbeddingUtils;
/**
 * Create embedding provider based on configuration
 */
function createEmbeddingProvider(config) {
    var provider = (config === null || config === void 0 ? void 0 : config.provider) || 'hash';
    switch (provider) {
        case 'openai':
            return new OpenAIEmbeddingProvider(config === null || config === void 0 ? void 0 : config.apiKey);
        case 'hash':
        default:
            return new HashEmbeddingProvider();
    }
}
