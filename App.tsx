
import React, { useState, useEffect } from 'react';
import { generateScrapingCode, reGenerateScrapingCode } from './services/geminiService';
import { GeneratedCode, HistoryItem } from './types';
import CodeDisplay from './components/CodeDisplay';

type FeedbackStatus = 'none' | 'success' | 'fixing';

const PROMPT_FRAMEWORKS = [
  {
    id: 'ICIO',
    name: 'ICIO 框架',
    desc: '最通用：指令、背景、输入、输出',
    template: `【指令】: 抓取网页中的 [具体内容]\n【背景】: 这是一个 [电商/新闻/社交] 页面，主要目标是 [获取数据/监控变化]\n【输入】: 定位到包含 [类名/ID] 的元素区域\n【输出】: 以 [列表/JSON/CSV] 格式输出 [字段1, 字段2]`
  },
  {
    id: 'CRISPE',
    name: 'CRISPE 框架',
    desc: '最专业：能力、角色、洞察、陈述、实验',
    template: `【能力与角色】: 你是资深 Python 爬虫工程师\n【上下文洞察】: 该网页结构为 [动态加载/静态渲染]，需要提取 [核心组件]\n【陈述指令】: 请编写使用 [lxml/Selenium] 的脚本，提取 [具体字段]\n【个性/语气】: 代码需简洁且具备极强的容错性\n【实验/改进】: 如果遇到反爬，请使用 [代理/延时策略]`
  },
  {
    id: 'RESCEF',
    name: 'RESCEF 框架',
    desc: '最全面：角色、执行、情境、上下文、期望、反馈',
    template: `【角色】: 数据采集专家\n【执行任务】: 遍历页面并提取 [目标数据]\n【情境描述】: 需要在 [高频采集/单次抓取] 环境下运行\n【上下文】: 页面源码片段已在高级选项中提供 [是/否]\n【期望结果】: 产出 100% 准确的 XPath 并包含错误处理\n【反馈引导】: 如果 XPath 无法唯一确定，请输出备选路径`
  }
];

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [requirement, setRequirement] = useState('');
  const [htmlContext, setHtmlContext] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  // 使用数组存储结果，以便在新的元素块展现重新生成的代码
  const [results, setResults] = useState<GeneratedCode[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  const [feedbackStatus, setFeedbackStatus] = useState<FeedbackStatus>('none');
  const [userFeedback, setUserFeedback] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('scraper_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history");
      }
    }
  }, []);

  const applyFramework = (template: string) => {
    if (requirement && !confirm('使用模板将覆盖当前已输入的内容，确认吗？')) return;
    setRequirement(template);
  };

  const resetForm = () => {
    setUrl('');
    setRequirement('');
    setHtmlContext('');
    setResults([]);
    setError(null);
    setFeedbackStatus('none');
    setUserFeedback('');
    setShowAdvanced(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || !requirement) return;

    setLoading(true);
    setError(null);
    setResults([]); // 开始新任务时清空旧结果
    setFeedbackStatus('none');

    try {
      const data = await generateScrapingCode({ url, requirement, htmlContext });
      setResults([data]);
      
      const newHistory: HistoryItem = {
        id: Date.now().toString(),
        url,
        requirement,
        timestamp: Date.now()
      };
      
      const updatedHistory = [newHistory, ...history.filter(h => h.url !== url)].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem('scraper_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      setError(err.message || '生成代码时发生错误。');
    } finally {
      setLoading(false);
    }
  };

  const handleReGenerate = async () => {
    if (!userFeedback || results.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      // 始终基于最新的代码进行修复
      const data = await reGenerateScrapingCode({ url, requirement, htmlContext }, results[0].code, userFeedback);
      // 将新生成的代码放在数组最前面（最新版）
      setResults([data, ...results]);
      setFeedbackStatus('none');
      setUserFeedback('');
    } catch (err: any) {
      setError(`重新生成失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const useHistoryItem = (item: HistoryItem) => {
    setUrl(item.url);
    setRequirement(item.requirement);
    setError(null);
    setResults([]);
    setFeedbackStatus('none');
    setHtmlContext('');
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sidebar - History */}
      <aside className="w-full md:w-72 bg-slate-900/50 border-r border-slate-800 p-6 flex-shrink-0">
        <div className="sticky top-8">
          <div className="flex items-center gap-3 mb-10 cursor-pointer" onClick={resetForm}>
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fas fa-spider text-white text-sm"></i>
            </div>
            <h1 className="text-xl font-bold gradient-text tracking-tight">XPath Scraper</h1>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-history text-xs"></i>
              最近任务 (5)
            </h3>
            
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-slate-600 text-sm italic py-4">暂无历史记录</p>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => useHistoryItem(item)}
                    className="w-full text-left p-3 rounded-xl bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800 hover:border-blue-500/50 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-medium">
                        {formatTimestamp(item.timestamp)}
                      </span>
                      <i className="fas fa-arrow-right text-[10px] text-slate-600 group-hover:text-blue-400 transition-colors"></i>
                    </div>
                    <div className="text-sm font-semibold text-slate-300 truncate group-hover:text-white transition-colors">
                      {new URL(item.url).hostname}
                    </div>
                    <div className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                      {item.requirement}
                    </div>
                  </button>
                ))
              )}
            </div>
            
            {history.length > 0 && (
              <button 
                onClick={() => {
                  if(confirm('确定要清空所有历史记录吗？')) {
                    setHistory([]);
                    localStorage.removeItem('scraper_history');
                  }
                }}
                className="text-[10px] text-slate-600 hover:text-red-400 uppercase tracking-tighter transition-colors"
              >
                清除所有历史
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto py-8 md:py-12 px-4 sm:px-8">
        {results.length === 0 && (
          <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 leading-tight">
              高精度 XPath <br/><span className="text-blue-400">代码生成器</span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              内置专业提示词框架，助您精准描述抓取需求。
            </p>
          </div>
        )}

        <div className="glass-morphism p-8 rounded-2xl shadow-2xl relative overflow-hidden mb-8">
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2 uppercase tracking-wider">目标网址 URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                    <i className="fas fa-link text-sm"></i>
                  </div>
                  <input
                    type="url"
                    required
                    placeholder="https://example.com/products"
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                  <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">抓取需求描述</label>
                  <div className="flex flex-wrap gap-2">
                    {PROMPT_FRAMEWORKS.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => applyFramework(f.template)}
                        title={f.desc}
                        className="text-[10px] px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-all font-bold"
                      >
                        {f.name}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setRequirement('')}
                      className="text-[10px] px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-white transition-all"
                    >
                      清空
                    </button>
                  </div>
                </div>
                <div className="relative">
                  <textarea
                    required
                    placeholder="请直接输入或从上方选择提示词框架..."
                    rows={6}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-xl py-4 px-4 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-sans text-sm leading-relaxed"
                    value={requirement}
                    onChange={(e) => setRequirement(e.target.value)}
                  />
                </div>
              </div>

              {/* 高级选项 */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-2 mb-2 transition-colors font-medium"
                >
                  <i className={`fas fa-chevron-${showAdvanced ? 'up' : 'down'} text-[10px]`}></i>
                  {showAdvanced ? '隐藏高级选项' : '高级：提供网页 HTML 片段以确保 XPath 100% 准确 (推荐)'}
                </button>
                
                {showAdvanced && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <textarea
                      placeholder="在这里粘贴 <div>...</div> 片段..."
                      rows={4}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 px-4 text-slate-300 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/30 transition-all"
                      value={htmlContext}
                      onChange={(e) => setHtmlContext(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-3 shadow-xl ${
                loading 
                  ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
              }`}
            >
              {loading ? (
                <>
                  <i className="fas fa-circle-notch animate-spin"></i>
                  正在深度分析中...
                </>
              ) : (
                <>{results.length > 0 ? '重新开始生成' : '立即生成精准脚本'}</>
              )}
            </button>
          </form>
        </div>

        {error && (
          <div className="mt-8 p-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3 animate-in shake duration-500">
            <i className="fas fa-circle-exclamation text-xl"></i>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* 结果展示区 - 支持多个结果块 */}
        <div className="space-y-12">
          {results.map((res, index) => (
            <div key={results.length - index} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 bg-blue-600/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/30">
                  {index === 0 ? '最新版本' : `历史版本 ${results.length - index}`}
                </span>
                {index === 0 && results.length > 1 && (
                  <span className="text-slate-500 text-xs italic">已根据您的反馈完成修复</span>
                )}
              </div>
              
              <CodeDisplay
                code={res.code}
                explanation={res.explanation}
                libraries={res.libraries}
              />

              {/* 仅在最新版本下方显示反馈表单 */}
              {index === 0 && (
                <div className="mt-8 glass-morphism rounded-2xl p-8 border border-slate-700 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[80px] rounded-full"></div>
                  
                  {feedbackStatus === 'none' && (
                    <div className="text-center">
                      <h3 className="text-xl font-bold mb-6">生成结果符合预期吗？</h3>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button
                          onClick={() => setFeedbackStatus('success')}
                          className="px-8 py-3 bg-green-600/20 border border-green-500/50 rounded-xl text-green-400 font-bold hover:bg-green-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-check"></i>
                          完美，完全正确
                        </button>
                        <button
                          onClick={() => setFeedbackStatus('fixing')}
                          className="px-8 py-3 bg-red-600/20 border border-red-500/50 rounded-xl text-red-400 font-bold hover:bg-red-600/30 transition-all flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-times"></i>
                          代码有误，重新按新要求生成
                        </button>
                      </div>
                    </div>
                  )}

                  {feedbackStatus === 'success' && (
                    <div className="text-center py-4">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="fas fa-thumbs-up text-green-500"></i>
                      </div>
                      <h3 className="text-2xl font-bold text-green-400 mb-2">感谢反馈！</h3>
                      <p className="text-slate-400 text-sm mb-6">祝您的数据采集工作顺利开展。</p>
                      <button onClick={resetForm} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 transition-colors">
                        开启新任务
                      </button>
                    </div>
                  )}

                  {feedbackStatus === 'fixing' && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <i className="fas fa-edit text-blue-400"></i>
                        描述代码错误或新的修改需求
                      </h3>
                      <textarea
                        placeholder="例如：生成的 XPath 无法抓到内容、需要增加自动翻页、或者请改用 playwright 库编写..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 px-4 text-slate-100 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={userFeedback}
                        onChange={(e) => setUserFeedback(e.target.value)}
                      />
                      <div className="flex gap-3 justify-end">
                        <button onClick={() => setFeedbackStatus('none')} className="px-6 py-2 text-slate-400 hover:text-slate-200">取消</button>
                        <button
                          disabled={!userFeedback || loading}
                          onClick={handleReGenerate}
                          className="px-8 py-2 bg-blue-600 text-white font-bold rounded-xl disabled:bg-slate-700 transition-all shadow-lg shadow-blue-500/20"
                        >
                          {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-magic"></i>}
                          提交并重新生成
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
