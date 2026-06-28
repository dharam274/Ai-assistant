import React, { useState } from "react";
import { Eye, EyeOff, Copy, Check, Download, Play, Terminal } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language?: string;
  onShowToast: (msg: string) => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language = "javascript", onShowToast }) => {
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const cleanCode = code.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    onShowToast("Code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([cleanCode], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `script.${language === "typescript" ? "ts" : language === "html" ? "html" : language === "css" ? "css" : "js"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast("Code downloaded successfully!");
  };

  // Prepares the code for iframe live preview execution
  const getIframeSrcDoc = () => {
    const lowerLang = language.toLowerCase();
    if (lowerLang === "html" || cleanCode.includes("<!DOCTYPE html>") || cleanCode.includes("<html>")) {
      return cleanCode;
    }
    if (lowerLang === "css") {
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <style>${cleanCode}</style>
          </head>
          <body style="background: #111; color: white; font-family: sans-serif; padding: 20px; text-align: center;">
            <p>Applied CSS Style Preview</p>
            <div class="preview-target" style="padding: 15px; border-radius: 8px; border: 1px solid currentColor; display: inline-block;">
              Preview Box
            </div>
          </body>
        </html>
      `;
    }
    // Javascript/Typescript Fallback
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { background: #0f172a; color: #38bdf8; font-family: monospace; padding: 15px; margin: 0; font-size: 13px; }
            .log { border-bottom: 1px solid #334155; padding: 6px 0; word-break: break-all; }
            .header { color: #94a3b8; border-bottom: 2px solid #334155; padding-bottom: 8px; margin-bottom: 8px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">⚡ JS RUNTIME OUTPUT CONSOLE</div>
          <div id="console-output"></div>
          <script>
            const output = document.getElementById('console-output');
            function log(msg) {
              const div = document.createElement('div');
              div.className = 'log';
              div.textContent = typeof msg === 'object' ? JSON.stringify(msg, null, 2) : String(msg);
              output.appendChild(div);
            }
            console.log = log;
            console.error = function(err) {
              const div = document.createElement('div');
              div.className = 'log';
              div.style.color = '#ef4444';
              div.textContent = '❌ Error: ' + err;
              output.appendChild(div);
            };
            try {
              ${cleanCode}
            } catch (e) {
              console.error(e.message);
            }
          </script>
        </body>
      </html>
    `;
  };

  const isRunnable = ["javascript", "typescript", "html", "css", "svg"].includes(language.toLowerCase()) || cleanCode.includes("<html>") || cleanCode.includes("<svg>");

  return (
    <div className="my-3 border border-white/10 rounded-xl overflow-hidden bg-zinc-950/90 shadow-xl w-full max-w-full text-left" id="code-sandbox-block">
      {/* Code block header */}
      <div className="bg-zinc-900 px-4 py-2 flex items-center justify-between border-b border-white/5 text-[11px] font-mono select-none">
        <div className="flex items-center space-x-2 text-white/50">
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span className="uppercase tracking-wider text-cyan-400/80 font-bold">{language}</span>
        </div>

        <div className="flex items-center space-x-1.5">
          {isRunnable && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`p-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                showPreview ? "bg-cyan-500/10 text-cyan-400" : "text-white/40 hover:text-white/80 hover:bg-white/5"
              }`}
              title={showPreview ? "Hide Preview" : "Run & Show Code Preview"}
            >
              {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span className="text-[10px] uppercase font-mono tracking-wider px-0.5">
                {showPreview ? "Close" : "Preview"}
              </span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            title="Copy Code"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-colors"
            title="Download Code File"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Code view */}
      <div className="p-4 overflow-x-auto max-h-[300px] custom-scrollbar bg-black/40">
        <pre className="text-xs font-mono text-cyan-50/95 leading-relaxed selection:bg-cyan-500/25">
          <code>{cleanCode}</code>
        </pre>
      </div>

      {/* Live Preview Container (Run Sandbox iframe) */}
      {showPreview && isRunnable && (
        <div className="border-t border-white/5 bg-[#08080a] p-3 animate-fade-in flex flex-col space-y-2">
          <div className="flex items-center space-x-1.5 text-[9px] font-mono uppercase text-zinc-500 tracking-wider">
            <Play className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500 animate-pulse" />
            <span>Interactive Code Sandbox Execution</span>
          </div>
          <iframe
            srcDoc={getIframeSrcDoc()}
            className="w-full h-[180px] bg-slate-900/60 rounded-lg border border-white/5 shadow-inner"
            title="Live Sandbox Sandbox Code Execution"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
};
