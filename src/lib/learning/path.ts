/**
 * 学习路径数据定义
 * 定义新手用户的引导流程步骤
 */

export interface LearningStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  actionText: string;
}

export const LEARNING_PATH: LearningStep[] = [
  {
    id: "welcome",
    title: "欢迎来到 Findec",
    description: "Findec 是一个专业的股票量化分析平台，帮助您学习量化交易的核心概念。",
    icon: "BookOpen",
    actionText: "开始了解",
  },
  {
    id: "kline",
    title: "K 线图与技术指标",
    description: "查看多周期 K 线图，叠加技术指标如 MA、RSI、MACD，帮助分析股票走势。",
    icon: "TrendingUp",
    actionText: "查看图表",
  },
  {
    id: "factors",
    title: "因子选股",
    description: "使用价值因子、动量因子、质量因子等筛选股票，评估因子有效性。",
    icon: "Filter",
    actionText: "探索因子",
  },
  {
    id: "backtest",
    title: "回测验证",
    description: "在历史数据上验证策略效果，理解过拟合、前视偏差等回测陷阱。",
    icon: "History",
    actionText: "开始回测",
  },
  {
    id: "portfolio",
    title: "组合管理",
    description: "跟踪持仓、分析风险、评估组合健康度，管理您的投资组合。",
    icon: "PieChart",
    actionText: "查看组合",
  },
  {
    id: "ready",
    title: "开始探索",
    description: "您已了解 Findec 的核心功能。点击完成开始使用平台！",
    icon: "Rocket",
    actionText: "完成引导",
  },
];
