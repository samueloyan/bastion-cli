export type Severity = 'critical' | 'high' | 'medium' | 'low';

export type ScoreLabel = 'GOOD' | 'MODERATE' | 'POOR' | 'CRITICAL';

export interface FrameworkRefs {
  owasp: string[];
  nist: string[];
  mitre: string[];
}

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  file: string;
  line: number;
  code: string;
  description: string;
  fix: string;
  frameworks: FrameworkRefs;
  /** Scanner id for grouping / proofs */
  scannerId: string;
  /** Pattern-based vs GPT deep scan */
  source?: 'pattern' | 'ai';
  /** 0–100 when source is AI */
  confidence?: number;
}

export interface LogAnalysisSummary {
  totalMatches: number;
  byType: Record<string, number>;
  filesAnalyzed: number;
}

export interface ScanMetrics {
  filesScanned: number;
  llmCallSites: number;
  agentConfigs: number;
}

export interface ScanResult {
  version: string;
  scanDate: string;
  directory: string;
  findings: Finding[];
  metrics: ScanMetrics;
  score: number;
  scoreLabel: ScoreLabel;
  logAnalysis?: LogAnalysisSummary;
}

export interface JsonControlCompliance {
  id: string;
  name: string;
  passing: boolean;
}

export interface JsonTechniqueCompliance {
  id: string;
  name: string;
  passing: boolean;
}

export interface JsonExport {
  version: string;
  scan_date: string;
  directory: string;
  files_scanned: number;
  llm_call_sites: number;
  agent_configs: number;
  score: number;
  score_label: string;
  findings: JsonFinding[];
  framework_compliance: {
    owasp: {
      total: number;
      failing: number;
      controls: JsonControlCompliance[];
    };
    nist: {
      total: number;
      failing: number;
      controls: JsonControlCompliance[];
    };
    mitre: {
      total: number;
      failing: number;
      techniques: JsonTechniqueCompliance[];
    };
  };
  log_analysis?: LogAnalysisSummary;
}

export interface JsonFinding {
  id: string;
  title: string;
  severity: string;
  file: string;
  line: number;
  code: string;
  description: string;
  fix: string;
  frameworks: FrameworkRefs;
  source?: 'pattern' | 'ai';
  confidence?: number;
}

export interface UploadResponse {
  success: boolean;
  dashboard_url?: string;
  error?: string;
}
