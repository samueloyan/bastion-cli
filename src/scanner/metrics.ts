import { collectSourceFiles, readFileSafe } from '../utils/file-walker';

const ALL_SCAN_EXT = ['ts', 'tsx', 'js', 'jsx', 'py', 'env', 'yml', 'yaml', 'json', 'toml', 'vue'];
const CODE_EXT = ['ts', 'tsx', 'js', 'jsx', 'py'];

const LLM_REGEX =
  /\.chat\.completions\.create\s*\(|\.messages\.create\s*\(|\.completions\.create\s*\(|new\s+OpenAI\s*\(|new\s+Anthropic\s*\(|AzureOpenAI\s*\(|ChatOpenAI\s*\(/g;

const AGENT_REGEX =
  /createReactAgent|AgentExecutor|agentTools\s*=|bindTools\s*\(|createToolCallingAgent/;

export async function computeMetrics(rootDir: string): Promise<{ filesScanned: number; llmCallSites: number; agentConfigs: number }> {
  const allFiles = await collectSourceFiles(rootDir, { extensions: ALL_SCAN_EXT });
  const files = await collectSourceFiles(rootDir, { extensions: CODE_EXT });
  let llmCallSites = 0;
  let agentConfigs = 0;
  for (const file of files) {
    const code = readFileSafe(file);
    if (!code) continue;
    const llmMatches = code.match(LLM_REGEX);
    if (llmMatches) llmCallSites += llmMatches.length;
    if (AGENT_REGEX.test(code)) agentConfigs += 1;
  }
  return { filesScanned: allFiles.length, llmCallSites, agentConfigs };
}

/** Count only text/code files scanned by orchestrator (all scanner extensions union) */
export async function countScannedFiles(rootDir: string, extensions: string[]): Promise<number> {
  const files = await collectSourceFiles(rootDir, { extensions });
  return files.length;
}
