export const agentTools = [
  { name: "searchDatabase", description: "Search the database", access: "read" },
  { name: "updateRecord", description: "Update a record", access: "write" },
  { name: "deleteDatabase", description: "Delete database tables", access: "write" },
  { name: "sendEmail", description: "Send email to any address", access: "external" },
  { name: "executeCode", description: "Execute arbitrary code", access: "system" },
  { name: "accessFileSystem", description: "Read and write files", access: "system" },
  { name: "makeHttpRequest", description: "Make HTTP requests", access: "external" },
  { name: "getWeather", description: "Get weather data", access: "read" },
  { name: "translateText", description: "Translate text", access: "read" },
  { name: "generateImage", description: "Generate an image", access: "read" },
  { name: "compressFile", description: "Compress a file", access: "system" },
  { name: "deployCode", description: "Deploy to production", access: "system" },
  { name: "modifyPermissions", description: "Change user permissions", access: "admin" },
  { name: "exportData", description: "Export all data", access: "read" }
];

// Only these are actually used in the codebase:
export const usedTools = ["searchDatabase", "getWeather", "translateText"];
