"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";

export function MCPIntegration() {
  const [copied, setCopied] = useState<string | null>(null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-medium">AI Assistant Integration</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect Urban Manual to Claude Desktop or ChatGPT for AI-powered travel
        recommendations, destination search, and trip planning.
      </p>

      {/* Claude Desktop - OAuth */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
            C
          </div>
          <div>
            <h4 className="font-medium">Claude Desktop</h4>
            <p className="text-xs text-gray-500">Connect with one click using OAuth</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium">Setup Instructions:</p>

          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>Open Claude Desktop settings</li>
            <li>Go to <span className="font-mono text-xs bg-gray-200 dark:bg-gray-800 px-1 rounded">Developer → Edit Config</span></li>
            <li>Add this remote MCP server:</li>
          </ol>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Name:</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700">
                Urban Manual
              </code>
              <button
                onClick={() => copyToClipboard("Urban Manual", "name")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {copied === "name" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-500">Remote MCP Server URL:</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 break-all">
                {siteUrl}/api/mcp
              </code>
              <button
                onClick={() => copyToClipboard(`${siteUrl}/api/mcp`, "url")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                {copied === "url" ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            When you first use Urban Manual tools, Claude will open a browser window
            for you to sign in with Google or Apple. Your session stays active for 7 days.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
          <span className="text-xs text-gray-400">or use config file</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
        </div>

        <details className="group">
          <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-200">
            Manual JSON config (advanced)
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-500">
              Add to <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">~/Library/Application Support/Claude/claude_desktop_config.json</code>:
            </p>
            <div className="relative">
              <pre className="bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2 text-xs font-mono overflow-x-auto">
{`{
  "mcpServers": {
    "urban-manual": {
      "url": "${siteUrl}/api/mcp",
      "transport": "http"
    }
  }
}`}
              </pre>
              <button
                onClick={() => copyToClipboard(`{
  "mcpServers": {
    "urban-manual": {
      "url": "${siteUrl}/api/mcp",
      "transport": "http"
    }
  }
}`, "config")}
                className="absolute top-2 right-2 p-1.5 bg-white dark:bg-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {copied === "config" ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5 text-gray-400" />
                )}
              </button>
            </div>
          </div>
        </details>
      </div>

      {/* ChatGPT */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-bold">
            G
          </div>
          <div>
            <h4 className="font-medium">ChatGPT</h4>
            <p className="text-xs text-gray-500">Create a Custom GPT with Urban Manual</p>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>Open ChatGPT and go to <strong>Explore GPTs → Create</strong></li>
            <li>In the Configure tab, scroll to <strong>Actions</strong></li>
            <li>Click <strong>Create new action</strong></li>
            <li>Click <strong>Import from URL</strong> and paste:</li>
          </ol>

          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white dark:bg-gray-800 rounded px-3 py-2 text-sm font-mono border border-gray-200 dark:border-gray-700 break-all">
              {siteUrl}/api/mcp/openapi
            </code>
            <button
              onClick={() => copyToClipboard(`${siteUrl}/api/mcp/openapi`, "openapi")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              {copied === "openapi" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>

          <ol start={5} className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
            <li>For Authentication, select <strong>OAuth</strong></li>
            <li>Use these OAuth settings:</li>
          </ol>

          <div className="grid gap-2 text-xs">
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500">Client ID:</span>
              <code className="font-mono">chatgpt</code>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500">Authorization URL:</span>
              <code className="font-mono text-xs">{siteUrl}/api/mcp/oauth/authorize</code>
            </div>
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 rounded px-3 py-2 border border-gray-200 dark:border-gray-700">
              <span className="text-gray-500">Token URL:</span>
              <code className="font-mono text-xs">{siteUrl}/api/mcp/oauth/token</code>
            </div>
          </div>
        </div>

        <a
          href="https://chat.openai.com/gpts/editor"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-xl hover:opacity-80 transition-opacity"
        >
          <ExternalLink className="h-4 w-4" />
          Open GPT Builder
        </a>
      </div>

      {/* Available Tools */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <h4 className="font-medium">What you can do</h4>
        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Search destinations
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Get recommendations
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Plan multi-day trips
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Find nearby places
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Check weather forecasts
          </div>
          <div className="flex items-center gap-2">
            <span className="text-green-500">✓</span>
            Save trips to account
          </div>
        </div>
      </div>
    </div>
  );
}
