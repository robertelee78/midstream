"use strict";
/**
 * AI Defence Intelligence Module
 *
 * Week 1: AgentDB Foundation
 * - ThreatVectorStore: High-performance vector storage with HNSW indexing
 * - Embeddings: Multiple embedding providers (hash, OpenAI)
 * - Schemas: TypeScript types and interfaces
 *
 * Performance targets:
 * - 750K req/s throughput
 * - <0.1ms search latency
 * - 150x faster than traditional methods
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEmbeddingProvider = exports.EmbeddingUtils = exports.OpenAIEmbeddingProvider = exports.HashEmbeddingProvider = exports.createVectorStore = exports.ThreatVectorStore = void 0;
// Core exports
__exportStar(require("./schemas"), exports);
__exportStar(require("./vector-store"), exports);
__exportStar(require("./embeddings"), exports);
// Re-export main classes for convenience
var vector_store_1 = require("./vector-store");
Object.defineProperty(exports, "ThreatVectorStore", { enumerable: true, get: function () { return vector_store_1.ThreatVectorStore; } });
Object.defineProperty(exports, "createVectorStore", { enumerable: true, get: function () { return vector_store_1.createVectorStore; } });
var embeddings_1 = require("./embeddings");
Object.defineProperty(exports, "HashEmbeddingProvider", { enumerable: true, get: function () { return embeddings_1.HashEmbeddingProvider; } });
Object.defineProperty(exports, "OpenAIEmbeddingProvider", { enumerable: true, get: function () { return embeddings_1.OpenAIEmbeddingProvider; } });
Object.defineProperty(exports, "EmbeddingUtils", { enumerable: true, get: function () { return embeddings_1.EmbeddingUtils; } });
Object.defineProperty(exports, "createEmbeddingProvider", { enumerable: true, get: function () { return embeddings_1.createEmbeddingProvider; } });
