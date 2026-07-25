import { useState } from "react";
import { createPortal } from "react-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Helper component for rendering code blocks with a copy button
const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-white/10 bg-[#0d1117]">
      <div className="flex items-center justify-between border-b border-white/10 bg-gray-800/50 px-4 py-2">
        <span className="text-xs font-medium text-gray-400">Code</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded bg-white/5 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10"
        >
          {copied ? "✓ Copied!" : "📋 Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-sm leading-relaxed text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === "user";
  const [isExpanded, setIsExpanded] = useState(false);

  // Reusable Markdown components configuration
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || "");
      const codeText = String(children).replace(/\n$/, "");

      if (!inline && (match || codeText.includes("\n"))) {
        return <CodeBlock code={codeText} />;
      }

      return (
        <code className="rounded bg-gray-700/50 px-1.5 py-0.5 text-xs" {...props}>
          {children}
        </code>
      );
    },
    h1: ({ node, ...props }) => <h1 className="mb-3 text-2xl font-bold text-white" {...props} />,
    h2: ({ node, ...props }) => <h2 className="mb-2 text-xl font-bold text-white" {...props} />,
    h3: ({ node, ...props }) => <h3 className="mb-2 text-lg font-bold text-white" {...props} />,
    p: ({ node, ...props }) => <p className="mb-4 leading-relaxed last:mb-0" {...props} />,
    // Changed ml-5 to ml-6 to push lists away from the left edge
    ul: ({ node, ...props }) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
    ol: ({ node, ...props }) => <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />,
    li: ({ node, ...props }) => <li className="pl-1" {...props} />,
    strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
    a: ({ node, ...props }) => <a className="text-blue-400 underline hover:text-blue-300" target="_blank" rel="noreferrer" {...props} />,
    blockquote: ({ node, ...props }) => <blockquote className="my-3 border-l-2 border-gray-500 pl-4 italic text-gray-400" {...props} />,
    table: ({ node, ...props }) => <table className="my-4 w-full border-collapse text-left" {...props} />,
    th: ({ node, ...props }) => <th className="border border-gray-600 px-3 py-2 font-bold text-white" {...props} />,
    td: ({ node, ...props }) => <td className="border border-gray-600 px-3 py-2" {...props} />,
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`relative flex max-w-[85%] flex-col gap-2 rounded-2xl p-4 text-sm shadow-md md:max-w-[75%] ${isUser
            ? "rounded-br-none bg-blue-600 text-white"
            : "rounded-bl-none bg-gray-800 text-gray-200"
          }`}
      >
        {/* Render Uploaded File (if any) */}
        {message.file && (
          <img
            src={message.file}
            alt="Uploaded content"
            className="max-h-60 w-full rounded-lg object-cover"
          />
        )}

        {/* Render Text & Code Blocks using ReactMarkdown directly */}
        {/* Added px-1 for horizontal padding and space-y-3 for vertical spacing */}
        <div className="space-y-3 px-1 leading-relaxed">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Expand Button for AI replies */}
        {!isUser && message.content && message.content.length > 100 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="mt-2 flex items-center gap-1 self-start text-xs text-blue-400 hover:text-blue-300"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" />
            </svg>
            View Full Screen
          </button>
        )}
      </div>

      {/* Full Screen Modal Portal */}
      {isExpanded && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsExpanded(false)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-gray-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <h3 className="font-semibold text-white">AI Response</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 text-gray-200">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChatMessage;