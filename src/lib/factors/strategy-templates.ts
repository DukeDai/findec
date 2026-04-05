import { ScreeningStrategy } from './screening-engine'

export interface StrategyTemplate {
  id: string
  name: string
  nameZh: string
  description: string
  marketCondition: '牛市' | '熊市' | '震荡' | '长期持有' | '风险厌恶'
  strategy: ScreeningStrategy
  tags: string[]
}

export const PRESET_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'value-investing',
    name: 'Value Investing',
    nameZh: '价值投资',
    description: '适合熊市和震荡市，关注低估值、高盈利能力',
    marketCondition: '震荡',
    strategy: {
      name: '价值投资',
      scoringMethod: 'weighted_sum',
      rules: [
        { factorId: 'pe_ratio', operator: '<', value: 25, weight: 0.25 },
        { factorId: 'pb_ratio', operator: '<', value: 3, weight: 0.25 },
        { factorId: 'dividend_yield', operator: '>', value: 2, weight: 0.25 },
        { factorId: 'beta', operator: '<', value: 1.2, weight: 0.25 },
      ],
    },
    tags: ['价值', '低估值', '高股息', '防御'],
  },
  {
    id: 'momentum',
    name: 'Momentum Strategy',
    nameZh: '动量策略',
    description: '适合牛市，追踪价格趋势',
    marketCondition: '牛市',
    strategy: {
      name: '动量策略',
      scoringMethod: 'rank_sum',
      rules: [
        { factorId: 'momentum_10d', operator: '>', value: 0, weight: 0.4 },
        { factorId: 'rsi_14', operator: '<', value: 70, weight: 0.3 },
        { factorId: 'macd_signal', operator: '>', value: 0, weight: 0.3 },
      ],
    },
    tags: ['动量', '趋势', '成长'],
  },
  {
    id: 'quality',
    name: 'Quality Strategy',
    nameZh: '质量策略',
    description: '适合长期持有，关注公司质量',
    marketCondition: '长期持有',
    strategy: {
      name: '质量策略',
      scoringMethod: 'weighted_sum',
      rules: [
        { factorId: 'pe_ratio', operator: '<', value: 30, weight: 0.25 },
        { factorId: 'peg_ratio', operator: '<', value: 1.5, weight: 0.25 },
        { factorId: 'beta', operator: '<', value: 1, weight: 0.25 },
        { factorId: 'volatility_20d', operator: '<', value: 25, weight: 0.25 },
      ],
    },
    tags: ['质量', '价值', '长期', '稳健'],
  },
  {
    id: 'low-volatility',
    name: 'Low Volatility',
    nameZh: '低波动策略',
    description: '适合风险厌恶型投资者',
    marketCondition: '风险厌恶',
    strategy: {
      name: '低波动策略',
      scoringMethod: 'rank_sum',
      rules: [
        { factorId: 'volatility_20d', operator: '<', value: 20, weight: 0.4 },
        { factorId: 'beta', operator: '<', value: 1, weight: 0.3 },
        { factorId: 'atr_ratio', operator: '<', value: 3, weight: 0.3 },
      ],
    },
    tags: ['低波动', '防御', '稳健', '保守'],
  },
]

export const conditionColors: Record<StrategyTemplate['marketCondition'], string> = {
  '牛市': 'bg-green-100 text-green-800',
  '熊市': 'bg-red-100 text-red-800',
  '震荡': 'bg-amber-100 text-amber-800',
  '长期持有': 'bg-blue-100 text-blue-800',
  '风险厌恶': 'bg-gray-100 text-gray-800',
}
