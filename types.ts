
export interface ScrapingRequest {
  url: string;
  requirement: string;
  htmlContext?: string; // 用户可选提供的网页 HTML 片段
}

export interface GeneratedCode {
  code: string;
  explanation: string;
  libraries: string[];
}

export interface HistoryItem {
  id: string;
  url: string;
  requirement: string;
  timestamp: number;
}
