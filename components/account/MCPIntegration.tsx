"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, Sparkles } from "lucide-react";

interface MCPIntegrationProps {
  userToken?: string;
}

export function MCPIntegration({ userToken }: MCPIntegrationProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);
  const [token, setToken] = useState<string | null>(userToken || null);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.urbanmanual.co";

  const claudeConfig = `{
  "mcpServers": {
    "urban-manual": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${siteUrl}/api/mcp"],
      "env": {
        "MCP_AUTH_TOKEN": "${token || "YOUR_TOKEN_HERE"}"
      }
    }
  }
}`;

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const generateToken = async () => {
    setGeneratingToken(true);
    try {
      const res = await fetch("/api/account/api-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "MCP Integration" }),
      });
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        setShowToken(true);
      }
    } catch (error) {
      console.error("Failed to generate token:", error);
    } finally {
      setGeneratingToken(false);
    }
  };

  const openChatGPTBuilder = () => {
    // Open ChatGPT GPT builder with pre-filled action URL
    window.open("https://chat.openai.com/gpts/editor", "_blank");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h3 className="text-lg font-semibold">AI Assistant Integration</h3>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Connect Urban Manual to your favorite AI assistant for personalized travel recommendations,
        destination search, and trip planning.
      </p>

      {/* API Token Section */}
      <div className="rounded-lg border bg-gray-50 dark:bg-gray-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium">Your API Token</span>
          {!token ? (
            <Button
              size="sm"
              onClick={generateToken}
              disabled={generatingToken}
            >
              {generatingToken ? "Generating..." : "Generate Token"}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? "Hide" : "Show"}
            </Button>
          )}
        </div>

        {token && showToken && (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-sm font-mono break-all">
              {token}
            </code>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => copyToClipboard(token, "token")}
            >
              {copied === "token" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {token && showToken && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Keep this token secret! It provides access to your Urban Manual account.
          </p>
        )}
      </div>

      {/* Claude Desktop */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold">
            C
          </div>
          <div>
            <h4 className="font-medium">Claude Desktop</h4>
            <p className="text-sm text-gray-500">Add to your Claude Desktop app</p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            1. Open Claude Desktop config file:
          </p>
          <code className="block bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-xs font-mono">
            ~/Library/Application Support/Claude/claude_desktop_config.json
          </code>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            2. Add this configuration:
          </p>
          <div className="relative">
            <pre className="bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-xs font-mono overflow-x-auto">
              {claudeConfig}
            </pre>
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2"
              onClick={() => copyToClipboard(claudeConfig, "claude")}
            >
              {copied === "claude" ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
            3. Restart Claude Desktop
          </p>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => copyToClipboard(claudeConfig, "claude")}
        >
          {copied === "claude" ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              Copied Configuration
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              Copy Claude Configuration
            </>
          )}
        </Button>
      </div>

      {/* ChatGPT */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green-400 to-teal-600 flex items-center justify-center text-white font-bold">
            G
          </div>
          <div>
            <h4 className="font-medium">ChatGPT</h4>
            <p className="text-sm text-gray-500">Create a Custom GPT with Urban Manual</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>1. Click the button below to open GPT Builder</p>
          <p>2. Go to Configure → Actions → Create new action</p>
          <p>3. Import schema from URL:</p>
          <code className="block bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 text-xs font-mono">
            {siteUrl}/api/mcp/openapi
          </code>
          <p className="mt-2">4. Set Authentication to "API Key" (Bearer) and paste your token</p>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={openChatGPTBuilder}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open GPT Builder
          </Button>
          <Button
            variant="outline"
            onClick={() => copyToClipboard(`${siteUrl}/api/mcp/openapi`, "openapi")}
          >
            {copied === "openapi" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Help Link */}
      <p className="text-sm text-center text-gray-500">
        Need help?{" "}
        <a href="/docs/mcp-user-guide" className="text-blue-500 hover:underline">
          View the full setup guide
        </a>
      </p>
    </div>
  );
}
