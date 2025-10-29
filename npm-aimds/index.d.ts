/**
 * TypeScript definitions for AIMDS
 */

// Detection Engine types (v0.1.5+)
export interface ThreatDetectionResult {
  threats: Threat[];
  isThreat: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detectionTime: number;
  attackCategories?: Record<string, number>;
  mitigations?: string[];
  timestamp: string;
}

export interface Threat {
  type: string;
  subtype?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  mitigation?: string;
  matched?: boolean;
}

export interface UnifiedDetectionOptions {
  threshold?: number;
  enablePII?: boolean;
  enableJailbreak?: boolean;
  enablePatternMatching?: boolean;
  enableNeuroSymbolic?: boolean;
  enableCrossModal?: boolean;
  enableSymbolicReasoning?: boolean;
  enableEmbeddingAnalysis?: boolean;
}

export interface DetectionMetadata {
  hasMultimodal?: boolean;
  hasImage?: boolean;
  hasAudio?: boolean;
  hasVideo?: boolean;
  imageMetadata?: Record<string, any>;
  imageData?: {
    metadata?: Record<string, any>;
    exif?: Record<string, any>;
  };
  audioData?: Record<string, any>;
  videoData?: Record<string, any>;
  embeddings?: number[];
  text?: string;
  imageDescription?: string;
}

export class DetectionEngine {
  constructor(options?: UnifiedDetectionOptions);
  detect(content: string, options?: DetectionMetadata): Promise<ThreatDetectionResult>;
  getStats(): {
    totalDetections: number;
    averageDetectionTime: number;
    threshold: number;
  };
}

export class NeuroSymbolicDetector {
  constructor(options?: UnifiedDetectionOptions);
  detect(input: string, metadata?: DetectionMetadata): Promise<ThreatDetectionResult>;
  getStats(): {
    totalDetections: number;
    crossModalAttacks: number;
    symbolicAttacks: number;
    embeddingAttacks: number;
  };
}

export class MultimodalDetector {
  constructor(options?: { threshold?: number });
  detectImageAttacks(input: string, imageData?: any): Threat[];
  detectAudioAttacks(input: string, audioData?: any): Threat[];
  detectVideoAttacks(input: string, videoData?: any): Threat[];
  getStats(): {
    imageAttacks: number;
    audioAttacks: number;
    videoAttacks: number;
    steganographyAttacks: number;
  };
}

export class UnifiedDetectionSystem {
  constructor(options?: UnifiedDetectionOptions);
  detectThreats(input: string, metadata?: DetectionMetadata): Promise<ThreatDetectionResult>;
  getStats(): {
    textDetector: any;
    neuroSymbolicDetector: any;
    multimodalDetector: any;
  };
}

// Detection types
export interface DetectionOptions {
  threshold?: number;
  mode?: 'fast' | 'balanced' | 'thorough';
  pii?: boolean;
  deep?: boolean;
  patterns?: string;
}

export interface DetectionResult {
  status: 'safe' | 'suspicious' | 'threat';
  confidence: number;
  findings: Finding[];
  performance: PerformanceMetrics;
}

export interface Finding {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  pattern: string;
  location: Location;
  recommendation: string;
}

export interface Location {
  line: number;
  column_start: number;
  column_end: number;
}

export interface PerformanceMetrics {
  latency_ms: number;
  target_ms: number;
  meets_sla: boolean;
}

// Analysis types
export interface AnalysisOptions {
  baseline?: string;
  sensitivity?: 'low' | 'medium' | 'high';
  window?: string;
  anomaly_threshold?: number;
  learning?: boolean;
}

export interface AnalysisInput {
  text: string;
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface AnalysisResult {
  risk_score: number;
  anomalies: Anomaly[];
  baseline_deviation: number;
  recommendations: string[];
}

export interface Anomaly {
  type: string;
  score: number;
  description: string;
}

export interface Baseline {
  id: string;
  statistics: Record<string, number>;
  created_at: number;
}

// Verification types
export interface VerificationOptions {
  method?: 'ltl' | 'types' | 'proofs';
  timeout?: number;
  parallel?: boolean;
  policies?: string;
}

export interface VerificationResult {
  valid: boolean;
  violations: Violation[];
  proof?: string;
}

export interface Violation {
  policy: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ProofResult {
  proven: boolean;
  theorem: string;
  proof_steps: string[];
}

// Response types
export interface ResponseOptions {
  strategy?: 'conservative' | 'balanced' | 'aggressive';
  auto_respond?: boolean;
  rollback?: boolean;
  learning?: boolean;
}

export interface Threat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  context: Record<string, any>;
}

export interface ResponseResult {
  action: string;
  success: boolean;
  mitigation: string;
  rollback_available: boolean;
}

export interface Feedback {
  response_id: string;
  effective: boolean;
  notes?: string;
}

// Stream types
export interface StreamOptions {
  port?: number;
  protocol?: 'http' | 'websocket' | 'grpc' | 'tcp';
  buffer_size?: number;
  workers?: number;
}

// Config types
export interface Config {
  version: string;
  detection: DetectionOptions;
  analysis: AnalysisOptions;
  verification: VerificationOptions;
  response: ResponseOptions;
  integrations: IntegrationConfig;
  performance: PerformanceConfig;
  logging: LoggingConfig;
}

export interface IntegrationConfig {
  agentdb?: {
    enabled: boolean;
    endpoint: string;
  };
  prometheus?: {
    enabled: boolean;
    port: number;
  };
  lean?: {
    enabled: boolean;
    endpoint: string;
  };
}

export interface PerformanceConfig {
  workers: number | 'auto';
  max_memory_mb: number;
  batch_size: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  file?: string;
  format: 'json' | 'text';
}

// Main classes
export class Detector {
  constructor(options?: DetectionOptions);
  detect(text: string): Promise<DetectionResult>;
  detectStream(stream: NodeJS.ReadableStream): AsyncIterator<DetectionResult>;
}

export class Analyzer {
  constructor(options?: AnalysisOptions);
  analyze(data: AnalysisInput): Promise<AnalysisResult>;
  createBaseline(data: AnalysisInput[]): Promise<Baseline>;
  loadBaseline(id: string): Promise<void>;
}

export class Verifier {
  constructor(options?: VerificationOptions);
  verify(policy: string): Promise<VerificationResult>;
  prove(theorem: string): Promise<ProofResult>;
  loadPolicies(path: string): Promise<void>;
}

export class Responder {
  constructor(options?: ResponseOptions);
  respond(threat: Threat): Promise<ResponseResult>;
  optimize(feedback: Feedback[]): Promise<void>;
  rollback(response_id: string): Promise<boolean>;
}

export class StreamProcessor {
  constructor(options?: StreamOptions);
  start(): Promise<void>;
  stop(): Promise<void>;
  process(data: any): Promise<any>;
}

export class ConfigLoader {
  static load(path: string): Promise<Config>;
  static validate(config: Config): boolean;
  static merge(base: Config, override: Partial<Config>): Config;
}

// Integration classes
export class AgentDBClient {
  constructor(endpoint: string);
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  search(query: string, limit?: number): Promise<any[]>;
  store(data: any): Promise<string>;
}

export class LeanClient {
  constructor(endpoint: string);
  prove(theorem: string): Promise<ProofResult>;
  verify(proof: string): Promise<boolean>;
}

export class PrometheusExporter {
  constructor(port: number);
  start(): Promise<void>;
  stop(): Promise<void>;
  recordMetric(name: string, value: number, labels?: Record<string, string>): void;
}

export class AuditLogger {
  constructor(path: string);
  log(event: string, data: Record<string, any>): Promise<void>;
  query(filter: Record<string, any>): Promise<any[]>;
}

// Utility types and functions
export namespace utils {
  export function hashText(text: string): string;
  export function validateInput(input: any, schema: any): boolean;
  export function parseConfig(path: string): Promise<Config>;
  export function formatOutput(data: any, format: 'json' | 'text'): string;
}

// Version
export const version: string;
