
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedCode, ScrapingRequest } from "../types";

const API_KEY = process.env.API_KEY || "";

const GENERATION_CONFIG = {
  responseMimeType: "application/json",
  responseSchema: {
    type: Type.OBJECT,
    properties: {
      code: {
        type: Type.STRING,
        description: '完整的 Python 源代码',
      },
      explanation: {
        type: Type.STRING,
        description: '代码逻辑和 XPath 选择器的详细解释',
      },
      libraries: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: '运行此脚本所需的 pip 库列表',
      },
    },
    required: ["code", "explanation", "libraries"],
  },
  tools: [{ googleSearch: {} }]
};

export const generateScrapingCode = async (params: ScrapingRequest): Promise<GeneratedCode> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    你是一位顶尖的 Python 爬虫专家。
    任务：为用户生成一个极其精准的 XPath 抓取脚本。
    
    【核心目标】
    目标网址: ${params.url}
    用户需求: ${params.requirement}
    
    ${params.htmlContext ? `【重要参考：网页 HTML 片段】\n${params.htmlContext}\n(请务必基于此 HTML 结构生成 XPath)` : `【抓取说明】请通过 Google Search 搜索该网站 (${params.url}) 的最新 DOM 结构、类名 (Class Name) 和 ID。不要仅凭直觉猜测，要寻找该网站真实的 HTML 属性。`}
    
    【技术规范】
    1. 使用 Python 的 requests + lxml。如果网站有明显的反爬或动态加载特征，请改用 Selenium 或 Playwright。
    2. XPath 要求：严禁使用脆弱的绝对路径（如 /html/body/div...）。必须使用具有鲁棒性的相对路径，例如 //div[contains(@class, 'product-price')] 或 //*[@id='main-title']。
    3. 结构：包含 User-Agent 随机化、请求头模拟、完善的 try-except 异常处理。
    4. 输出：必须输出有效的 JSON 格式。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: GENERATION_CONFIG as any,
    });

    const resultText = response.text;
    if (!resultText) throw new Error("AI 模型未返回内容。");
    return JSON.parse(resultText) as GeneratedCode;
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error?.message || "生成失败，请检查网络或 URL 后重试。");
  }
};

export const reGenerateScrapingCode = async (
  params: ScrapingRequest,
  previousCode: string,
  feedback: string
): Promise<GeneratedCode> => {
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  
  const prompt = `
    【错误修复任务】
    用户反馈之前的爬虫脚本无法正常工作。
    
    目标网址: ${params.url}
    原始需求: ${params.requirement}
    ${params.htmlContext ? `已知 HTML 结构参考: ${params.htmlContext}` : ""}
    
    旧代码:
    \`\`\`python
    ${previousCode}
    \`\`\`
    
    用户反馈的错误描述:
    "${feedback}"
    
    请根据反馈精准修正 XPath 或逻辑错误。如果是 XPath 没抓到内容，请利用搜索功能查证该网站当前的真实标签。
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: GENERATION_CONFIG as any,
    });

    const resultText = response.text;
    if (!resultText) throw new Error("AI 模型未返回内容");
    return JSON.parse(resultText) as GeneratedCode;
  } catch (error: any) {
    console.error("Gemini Re-generation Error:", error);
    throw new Error(error?.message || "重新生成失败");
  }
};
