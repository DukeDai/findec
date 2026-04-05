export type VocabCategory = 'indicator' | 'risk' | 'strategy' | 'backtest' | 'factor' | 'general'

export interface VocabEntry {
  id: string
  term: string
  category: VocabCategory
  definition: string
  formula?: string
  example?: string
  relatedTerms?: string[]
}

export const VOCABULARY: Record<string, VocabEntry> = {
  'sharpe-ratio': {
    id: 'sharpe-ratio',
    term: '夏普比率',
    category: 'risk',
    definition: '衡量每承担一单位风险所获得的超额收益。值越大表示策略风险调整后的收益越高。通常大于1为良好，大于2为优秀。',
    formula: 'SR = (Rp - Rf) / σp',
    relatedTerms: ['sortino-ratio', 'calmar-ratio'],
  },
  'max-drawdown': {
    id: 'max-drawdown',
    term: '最大回撤',
    category: 'risk',
    definition: '策略从历史最高点到最低点的最大跌幅。反映策略在最糟糕时期的损失程度，是评估风险的关键指标。',
    formula: 'MDD = (Trough - Peak) / Peak',
    relatedTerms: ['sharpe-ratio', 'volatility'],
  },
  'volatility': {
    id: 'volatility',
    term: '波动率',
    category: 'risk',
    definition: '资产收益率的年化标准差，衡量资产价格变动的剧烈程度。波动率越高，风险越大。',
    formula: 'σ = √(Σ(Ri - R̄)² / n) × √252',
    relatedTerms: ['sharpe-ratio', 'beta'],
  },
  'var': {
    id: 'var',
    term: 'VaR (风险价值)',
    category: 'risk',
    definition: '在给定置信水平下，策略在未来特定时间内可能遭受的最大损失。例如 VaR(95%, 1天) = 2% 表示有95%的把握单日损失不超过2%。',
    formula: 'P(Loss > VaR) = 1 - α',
    relatedTerms: ['cvar', 'max-drawdown'],
  },
  'sortino-ratio': {
    id: 'sortino-ratio',
    term: '索提诺比率',
    category: 'risk',
    definition: '仅考虑下行风险的夏普比率变体。只计算负收益的标准差，忽略正向波动，对追求稳健收益的策略更适用。',
    formula: 'Sortino = (Rp - MAR) / σdown',
    relatedTerms: ['sharpe-ratio', 'max-drawdown'],
  },
  'calmar-ratio': {
    id: 'calmar-ratio',
    term: 'Calmar 比率',
    category: 'risk',
    definition: '年化收益率与最大回撤的比值。衡量每单位最大回撤对应的收益，值越高策略越稳健。',
    formula: 'Calmar = Annual Return / Max Drawdown',
    relatedTerms: ['sharpe-ratio', 'sortino-ratio', 'max-drawdown'],
  },
  'beta': {
    id: 'beta',
    term: 'Beta (贝塔系数)',
    category: 'risk',
    definition: '策略相对于基准指数的敏感度。Beta=1表示与基准同步波动；Beta>1波动更大；Beta<1波动更小；Beta<0反向波动。',
    formula: 'β = Cov(Rp, Rm) / Var(Rm)',
    relatedTerms: ['alpha', 'volatility', 'correlation'],
  },
  'alpha': {
    id: 'alpha',
    term: 'Alpha (阿尔法)',
    category: 'risk',
    definition: '策略相对于基准的超额收益。Alpha=5%表示策略跑赢基准5个百分点，是衡量主动管理能力的核心指标。',
    formula: 'α = Rp - [Rf + β × (Rm - Rf)]',
    relatedTerms: ['beta', 'sharpe-ratio'],
  },
  'moving-average': {
    id: 'moving-average',
    term: '移动平均线 (MA)',
    category: 'indicator',
    definition: '过去n个周期收盘价的平均值。MA20表示20日均线，用于判断趋势方向。价格在上方为多头排列，下方为空头排列。',
    formula: 'MA(n) = (P₁ + P₂ + ... + Pₙ) / n',
    relatedTerms: ['ema', 'macd'],
  },
  'ema': {
    id: 'ema',
    term: '指数移动平均 (EMA)',
    category: 'indicator',
    definition: '对近期价格赋予更大权重的移动平均，比MA更灵敏。短期EMA上穿长期EMA被视为买入信号。',
    formula: 'EMA = α × Pₜ + (1-α) × EMAₜ₋₁, α = 2/(n+1)',
    relatedTerms: ['moving-average', 'macd'],
  },
  'rsi': {
    id: 'rsi',
    term: '相对强弱指标 (RSI)',
    category: 'indicator',
    definition: '衡量价格涨跌动能的指标。0-100之间，RSI>70表示超买可能回落，RSI<30表示超卖可能反弹。',
    formula: 'RSI = 100 - 100/(1 + RS), RS = 平均涨幅 / 平均跌幅',
    relatedTerms: ['moving-average', 'stochastic'],
  },
  'macd': {
    id: 'macd',
    term: 'MACD',
    category: 'indicator',
    definition: '由快线、慢线和柱状图组成。快线上穿慢线为金叉买入信号，下穿为死叉卖出信号。',
    formula: 'MACD = EMA(12) - EMA(26), Signal = EMA(9, MACD)',
    relatedTerms: ['ema', 'moving-average'],
  },
  'bollinger-bands': {
    id: 'bollinger-bands',
    term: '布林带',
    category: 'indicator',
    definition: '由中轨(MA)和上下轨(±2标准差)组成。价格触及上轨可能回落，触及下轨可能反弹；带宽收窄预示突破。',
    formula: 'Upper = MA + 2σ, Lower = MA - 2σ',
    relatedTerms: ['volatility', 'moving-average'],
  },
  'atr': {
    id: 'atr',
    term: '平均真实波幅 (ATR)',
    category: 'indicator',
    definition: '衡量市场波动性的指标。基于最高价、最低价、收盘价的真实波动范围计算。ATR越高表示波动越大。',
    formula: 'ATR = (1/n) × Σ TRₜ, TRₜ = max(Hₜ-Lₜ, |Hₜ-Cₜ₋₁|, |Lₜ-Cₜ₋₁|)',
    relatedTerms: ['volatility'],
  },
  'obv': {
    id: 'obv',
    term: '能量潮 (OBV)',
    category: 'indicator',
    definition: '累计成交量指标。价格涨时加成交量，跌时减成交量。OBV与价格背离预示趋势可能反转。',
    formula: 'OBV = OBVₜ₋₁ + Volumeₜ (上涨时), OBV = OBVₜ₋₁ - Volumeₜ (下跌时)',
    relatedTerms: ['volume'],
  },
  'vwap': {
    id: 'vwap',
    term: '成交量加权平均价 (VWAP)',
    category: 'indicator',
    definition: '当日总成交金额除以总成交量。日内交易中，价格在VWAP上方为偏多，在下方为偏空。',
    formula: 'VWAP = Σ(Price × Volume) / Σ(Volume)',
    relatedTerms: ['volume', 'moving-average'],
  },
  'stochastic': {
    id: 'stochastic',
    term: '随机指标 (KD指标)',
    category: 'indicator',
    definition: 'K值和D值均在0-100之间。K上穿D为金叉买入信号，K下穿D为死叉卖出信号。80以上超买，20以下超卖。',
    formula: 'K = 100 × (C - Lₙ) / (Hₙ - Lₙ), D = MA(K, 3)',
    relatedTerms: ['rsi'],
  },
  'momentum-factor': {
    id: 'momentum-factor',
    term: '动量因子',
    category: 'factor',
    definition: '基于过去收益率排序，选出近期表现最好的股票。假设强者恒强。动量效应的反转周期通常为3-12个月。',
    formula: 'MOM = Rₜ,₋ₙ - Rₜ,₋ₘ (n > m)',
    relatedTerms: ['value-factor', 'quality-factor'],
  },
  'value-factor': {
    id: 'value-factor',
    term: '价值因子',
    category: 'factor',
    definition: '基于估值指标（如PE、PB）选股，低估值股票长期往往跑赢高估值股票。价值投资的核心理念。',
    formula: 'Book-to-Market = Book Value / Market Cap',
    relatedTerms: ['quality-factor', 'momentum-factor'],
  },
  'quality-factor': {
    id: 'quality-factor',
    term: '质量因子',
    category: 'factor',
    definition: '基于公司盈利质量、运营效率选股。高ROE、稳定现金流、低负债的公司长期表现更优。',
    formula: 'ROE = Net Income / Shareholders\' Equity',
    relatedTerms: ['value-factor', 'momentum-factor'],
  },
  'ic': {
    id: 'ic',
    term: '信息系数 (IC)',
    category: 'factor',
    definition: '因子值与下期收益率的Pearson相关系数。IC越高表示因子预测能力越强。IC>0.05为较好，IC>0.1为优秀。',
    formula: 'IC = Corr(Factor, Returnₜ₊₁)',
    relatedTerms: ['ir', 'alpha-factor'],
  },
  'ir': {
    id: 'ir',
    term: '信息比率 (IR)',
    category: 'factor',
    definition: 'IC均值除以IC标准差，衡量因子预测能力的稳定性。IR>0.5为较好，IR>1为优秀。',
    formula: 'IR = Mean(IC) / Std(IC)',
    relatedTerms: ['ic', 'sharpe-ratio'],
  },
  'alpha-factor': {
    id: 'alpha-factor',
    term: 'Alpha 因子',
    category: 'factor',
    definition: '用于预测股票未来超额收益的变量。多因子模型中，因子的有效性通过IC/IR评估。',
    formula: 'r = α + β₁f₁ + β₂f₂ + ... + ε',
    relatedTerms: ['ic', 'ir'],
  },
  'beta-factor': {
    id: 'beta-factor',
    term: 'Beta 因子',
    category: 'factor',
    definition: '衡量股票对市场波动的敏感程度。低Beta股票波动小，高Beta股票波动大。可用于对冲市场风险。',
    formula: 'β = Cov(Ri, Rm) / Var(Rm)',
    relatedTerms: ['alpha', 'beta'],
  },
  'overfitting': {
    id: 'overfitting',
    term: '过拟合',
    category: 'backtest',
    definition: '策略在训练数据上表现优异但在测试数据上表现差的现象。参数过多或样本内优化过度是主要原因。',
    example: '用20个参数在100天数据上回测，可能出现过拟合。',
    relatedTerms: ['walk-forward', 'look-ahead-bias'],
  },
  'look-ahead-bias': {
    id: 'look-ahead-bias',
    term: '前视偏差',
    category: 'backtest',
    definition: '回测中无意中使用了未来数据。会导致回测收益虚高，策略实盘无效。',
    example: '在T日使用T+1的收盘价计算信号。',
    relatedTerms: ['overfitting', 'survivorship-bias'],
  },
  'survivorship-bias': {
    id: 'survivorship-bias',
    term: '生存者偏差',
    category: 'backtest',
    definition: '只使用当前存活股票的历史数据进行回测，忽略了已退市股票，导致回测收益被高估。',
    example: '用当前标普500成分股回测50年，会忽略期间退市的公司。',
    relatedTerms: ['look-ahead-bias', 'overfitting'],
  },
  'walk-forward': {
    id: 'walk-forward',
    term: 'Walk-Forward 分析',
    category: 'backtest',
    definition: '将数据分为训练期和测试期，在训练期优化参数，在测试期验证。将测试期拼接起来得到真实绩效。有效防止过拟合。',
    formula: '训练期 → 优化参数 → 测试期验证 → 滚动窗口',
    relatedTerms: ['overfitting', 'monte-carlo'],
  },
  'monte-carlo': {
    id: 'monte-carlo',
    term: 'Monte Carlo 模拟',
    category: 'backtest',
    definition: '通过随机打乱历史交易顺序，生成大量可能结果分布，评估策略的稳健性和尾部风险。',
    example: '对1000次随机排序的交易序列计算收益分布。',
    relatedTerms: ['var', 'max-drawdown'],
  },
  'slippage': {
    id: 'slippage',
    term: '滑点',
    category: 'general',
    definition: '实际成交价与预期价格的差值。通常因市场流动性不足或价格快速变动导致。回测中必须考虑滑点成本。',
    example: '预期以$100买入，但实际以$100.05成交，滑点为0.05美元。',
    relatedTerms: ['commission', 'position-sizing'],
  },
  'commission': {
    id: 'commission',
    term: '佣金/手续费',
    category: 'general',
    definition: '每次交易支付给券商的费用。佣金会侵蚀频繁交易策略的收益。不同市场佣金结构差异很大。',
    example: '美股券商通常每笔$0-$5，期权每份$0.5-$1。',
    relatedTerms: ['slippage', 'position-sizing'],
  },
  'position-sizing': {
    id: 'position-sizing',
    term: '仓位管理',
    category: 'general',
    definition: '决定每笔交易投入多少资金的方法。常见方法：固定金额、固定比例、波动率调整（ATR/Kelly公式）。',
    formula: '仓位 = 账户风险金额 / (入场价 - 止损价)',
    relatedTerms: ['commission', 'slippage'],
  },
  'rebalancing': {
    id: 'rebalancing',
    term: '再平衡',
    category: 'general',
    definition: '定期调整持仓比例恢复到目标配置。当某资产涨多时减仓，跌多时加仓。平衡收益与风险。',
    example: '目标股债比60/40，每季度检查并调整回该比例。',
    relatedTerms: ['position-sizing'],
  },
  'correlation': {
    id: 'correlation',
    term: '相关性',
    category: 'risk',
    definition: '两个资产收益率之间线性关系的强度，范围-1到1。完全正相关=1，不相关=0，完全负相关=-1。',
    formula: 'ρ = Cov(R₁,R₂) / (σ₁ × σ₂)',
    relatedTerms: ['beta', 'volatility'],
  },
  'win-rate': {
    id: 'win-rate',
    term: '胜率',
    category: 'backtest',
    definition: '盈利交易次数占总交易次数的比例。配合盈亏比才能全面评估策略绩效。',
    formula: '胜率 = 盈利交易数 / 总交易数',
    relatedTerms: ['position-sizing'],
  },
}

export const VOCABULARY_CATEGORIES: { id: VocabCategory; label: string; color: string }[] = [
  { id: 'indicator', label: '技术指标', color: 'text-blue-600' },
  { id: 'risk', label: '风险指标', color: 'text-red-600' },
  { id: 'strategy', label: '策略类型', color: 'text-purple-600' },
  { id: 'backtest', label: '回测概念', color: 'text-amber-600' },
  { id: 'factor', label: '因子模型', color: 'text-green-600' },
  { id: 'general', label: '通用概念', color: 'text-gray-600' },
]

export function getTermsByCategory(category: VocabCategory): VocabEntry[] {
  return Object.values(VOCABULARY).filter(v => v.category === category)
}

export function searchTerms(query: string): VocabEntry[] {
  const q = query.toLowerCase()
  return Object.values(VOCABULARY).filter(
    v => v.term.toLowerCase().includes(q) || v.definition.toLowerCase().includes(q) || v.id.includes(q)
  )
}

export function getTerm(id: string): VocabEntry | undefined {
  return VOCABULARY[id]
}
