
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface CodeDisplayProps {
  code: string;
  explanation: string;
  libraries: string[];
}

const CodeDisplay: React.FC<CodeDisplayProps> = ({ code, explanation, libraries }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-4">
        {/* Explanation Card */}
        <div className="glass-morphism rounded-xl p-6 border-l-4 border-blue-500">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <i className="fas fa-info-circle text-blue-400"></i>
            逻辑说明
          </h3>
          <div className="text-slate-300 leading-relaxed markdown-content">
            <ReactMarkdown>{explanation}</ReactMarkdown>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500 w-full mb-1">依赖库安装提示:</span>
            {libraries.length > 0 ? libraries.map((lib, idx) => (
              <span key={idx} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-mono border border-blue-500/20">
                pip install {lib}
              </span>
            )) : <span className="text-xs text-slate-500 italic">无特殊库依赖</span>}
          </div>
        </div>

        {/* Code Block */}
        <div className="relative group">
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-lg"
            >
              {copied ? (
                <>
                  <i className="fas fa-check text-green-400"></i>
                  已复制
                </>
              ) : (
                <>
                  <i className="fas fa-copy"></i>
                  复制代码
                </>
              )}
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="bg-slate-800 px-4 py-2 border-b border-slate-700 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
              </div>
              <span className="text-xs text-slate-400 font-mono ml-2">scraper.py</span>
            </div>
            <pre className="p-6 text-sm font-mono text-blue-100 overflow-x-auto max-h-[600px] leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeDisplay;
