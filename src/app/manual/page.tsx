"use client"

import { useState } from 'react'
import { BookOpen, Search, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react'

interface Section {
  id: string
  title: string
  icon: string
  children: {
    id: string
    title: string
    content: string[]
  }[]
}

const sections: Section[] = [
  {
    id: 'getting-started',
    title: '快速入门',
    icon: '🚀',
    children: [
      {
        id: 'installation',
        title: '安装与启动',
        content: [
          '确保已安装 Node.js 18+ 和 npm。',
          '运行 `npm install` 安装所有依赖。',
          '运行 `npx prisma db push` 初始化 SQLite 数据库。',
          '运行 `npx prisma generate` 生成 Prisma 客户端。',
          '运行 `npm run dev` 启动开发服务器。',
          '访问 http://localhost:3000 查看应用。WebSocket 服务自动在端口 3001 启动。',
        ],
      },
      {
        id: 'data-sources',
        title: '数据源配置',
        content: [
          '系统支持 Yahoo Finance（默认）、Finnhub、Polygon 三个数据源。',
          '首次使用会自动降级到内置模拟数据。',
          '如需使用 Finnhub/Polygon，请在项目根目录创建 `.env.local` 文件，添加 `FINNHUB_API_KEY=your_key` 和/或 `POLYGON_API_KEY=your_key`。',
          '数据源支持自动故障转移——当首选源失败时，系统自动切换到备用源。',
        ],
      },
      {
        id: 'learning-mode',
        title: '学习模式',
        content: [
          '点击导航栏右上角的「学习模式」开关。',
          '开启后，鼠标悬停在功能模块上会显示量化概念的详细解释和参数说明。',
          '学习模式不影响功能使用，仅提供上下文教学提示。',
        ],
      },
    ],
  },
  {
    id: 'kline',
    title: 'K线图 / 首页',
    icon: '📊',
    children: [
      {
        id: 'stock-search',
        title: '股票搜索',
        content: [
          '在首页顶部的搜索框输入股票代码（如 AAPL、TSLA），按回车或点击搜索按钮。',
          '支持输入中文名称模糊搜索（如「苹果」「谷歌」）。',
          '搜索结果自动补全，下拉选择即可。',
        ],
      },
      {
        id: 'time-range',
        title: '时间范围切换',
        content: [
          '图表工具栏提供多个时间范围按钮：1天、5天、1月、3月、6月、1年、2年、5年。',
          '点击不同按钮可快速缩放K线图到对应历史区间。',
          '支持鼠标滚轮缩放和拖拽平移。',
        ],
      },
      {
        id: 'indicators',
        title: '技术指标叠加',
        content: [
          '在「指标」下拉菜单中选择要叠加的指标。',
          '支持 MA（移动平均线）、EMA（指数移动平均线）、RSI（相对强弱指数）、MACD、布林带、随机指标（Stochastic）、ATR、OBV、VWAP（成交量加权平均价）等。',
          '可同时叠加多个指标，图表会自动分区显示。',
          '每个指标可独立设置参数（如 MA 的周期：5/10/20/60）。',
          '鼠标悬停在指标线上可查看具体数值。',
        ],
      },
      {
        id: 'chart-features',
        title: '图表交互',
        content: [
          '十字光标：鼠标移到图表上显示精确的日期、价格和指标数值。',
          'K线颜色：绿色代表上涨（收盘价 > 开盘价），红色代表下跌。',
          '支持缩放和平移查看历史细节。',
        ],
      },
    ],
  },
  {
    id: 'quantitative-analysis',
    title: '量化分析',
    icon: '🔬',
    children: [
      {
        id: 'tab-overview',
        title: '五大功能模块',
        content: [
          '「量化分析」页面是一个五Tab的统一入口：因子选股、单股回测、组合回测、实时监控、组合分析。',
          '每个Tab都配有简短的概念说明，开启学习模式后悬停Tab可见详细解释。',
        ],
      },
      {
        id: 'factor-screening',
        title: '因子选股',
        content: [
          '在「因子选股」Tab中，从左侧面板选择要使用的因子。',
          '系统提供四类因子：',
          '  - 价值因子：PE（市盈率）、PB（市净率）、PCF（现金流比率）、PS（销货比）等',
          '  - 动量因子：1月/3月/6月/1年收益率',
          '  - 质量因子：ROE（净资产收益率）、ROA（资产回报率）、毛利率、负债率',
          '  - 技术因子：50日均线位置、RSI、布林带位置',
          '选择因子后设置筛选条件（如 PE < 20），可添加多条规则。',
          '设置权重后点击「执行筛选」，右侧显示符合条件的股票列表。',
          '支持三种评分方法：加权评分（按权重求和）、排名评分（按排名赋分）、阈值法（满足条件为1，否则为0）。',
          '可从右上角快速应用「价值投资」「动量策略」「质量策略」「低波动」4种预设模板。',
        ],
      },
      {
        id: 'factor-effectiveness',
        title: '因子有效性分析',
        content: [
          '在因子选股结果下方，点击「因子有效性」标签切换到分析视图。',
          'IC（信息系数）时序图：显示因子预测能力随时间的变化。',
          'IC_IR 柱状图：展示各因子 IC_IR（IC均值/标准差），衡量稳定性。',
          '分组收益热力图：按因子分5组，展示各组收益率差异，验证因子有效性。',
          'IC 衰减测试：观察因子预测能力在不同预测周期（5天、10天、20天）上的衰减情况。',
          '因子相关性热力图：可视化因子间相关性（避免选择相关性过高的因子导致冗余）。',
        ],
      },
      {
        id: 'single-backtest',
        title: '单股回测',
        content: [
          '在「单股回测」Tab中，输入股票代码（如 AAPL）。',
          '设置回测时间段（开始日期、结束日期）和初始资金。',
          '在策略面板中设置买入/卖出条件（如 MA5 上穿 MA20 买入，下穿卖出）。',
          '配置成本模型：佣金比例、滑点（按比例或固定金额）、印花税（仅卖出收取）。',
          '点击「运行回测」查看结果。',
          '回测结果包含：总收益率、年化收益率、夏普比率、最大回撤、胜率、盈亏比等指标。',
          '资金曲线图显示整个回测期间的资金变化。',
          '交易记录表列出所有买卖操作的时间、价格、数量和盈亏。',
          '可导出 CSV 交易记录或生成可打印的 HTML 报告。',
        ],
      },
      {
        id: 'portfolio-backtest',
        title: '组合回测',
        content: [
          '在「组合回测」Tab中，输入多个股票代码（逗号分隔）。',
          '设置初始资金和资产配置方式：等权重（各股票投入相同资金）或自定义权重。',
          '设置再平衡频率：无再平衡、每周、每月或每季度。',
          '设置策略条件（同单股回测）。',
          '点击「运行回测」生成组合级别的回测报告。',
          '支持 Walk-Forward 分析：在多个时间窗口上重复回测，验证策略稳定性。',
          '支持 Monte Carlo 模拟：基于历史数据随机采样，生成收益分布区间。',
        ],
      },
      {
        id: 'risk-metrics',
        title: '风险指标说明',
        content: [
          '夏普比率 (Sharpe Ratio)：超额收益/波动率，衡量风险调整后收益，越高越好。',
          '最大回撤 (Max Drawdown)：从峰值到谷底的最大跌幅，反映极端风险。',
          '索提诺比率 (Sortino Ratio)：类似夏普，但只考虑下行波动率。',
          'Calmar 比率：年化收益/最大回撤，衡量收益与最大风险的比值。',
          'VaR (Value at Risk)：在给定置信水平下（如95%），组合在特定时间内可能的最大损失。',
          'Omega 比率：收益超过阈值的概率加权之和与未达成的概率加权之比。',
          '偏度 (Skewness)：收益分布的非对称性，正偏度表示更多正向极端收益。',
          '峰度 (Kurtosis)：收益分布的尾部厚度，高峰度表示更多极端收益。',
        ],
      },
      {
        id: 'real-time-alerts',
        title: '实时监控 / 预警',
        content: [
          '在「实时监控」Tab中点击「新建预警」。',
          '设置股票代码、触发条件：价格高于/低于某值、日涨幅超过/低于某百分比、RSI 超买/超卖。',
          '设置通知方式：Web 推送（页面提示）、浏览器原生通知（需授权）、邮件通知（需配置 SMTP）。',
          '预警创建后实时生效，当条件触发时自动通知。',
          '预警列表显示所有已创建的预警规则，可随时编辑或删除。',
          '预警触发日志记录每次触发的历史。',
        ],
      },
      {
        id: 'portfolio-analysis',
        title: '组合分析',
        content: [
          '在「组合分析」Tab中创建投资组合，输入组合名称和描述。',
          '添加持仓：输入股票代码、买入数量、均价。',
          '系统自动计算当前市值、持仓盈亏、总盈亏。',
          '组合健康度从5个维度评分（0-100分）：',
          '  - 集中度：持仓是否过于集中于单一股票（权重分散更健康）',
          '  - 波动率：组合整体波动水平',
          '  - 相关性：持仓间的价格相关性',
          '  - 流动性：各持仓的日均成交量是否支撑变现能力',
          '  - 风险调整收益：夏普比率和最大回撤的综合评估',
        ],
      },
    ],
  },
  {
    id: 'data-management',
    title: '数据管理',
    icon: '💾',
    children: [
      {
        id: 'batch-download',
        title: '批量下载K线数据',
        content: [
          '访问「数据管理」页面（/data-manager）。',
          '输入股票代码（支持多只，用逗号分隔）。',
          '选择时间范围（最近N天或自定义起止日期）。',
          '点击「开始下载」，系统从数据源批量拉取历史数据。',
          '数据自动存入本地 SQLite 缓存，后续查询优先从本地读取，减少 API 调用。',
          '缓存状态可在同一页面查看，包括各标的缓存量和最后更新时间。',
        ],
      },
      {
        id: 'backup',
        title: '数据导入导出',
        content: [
          '访问「设置」→「数据管理」（/settings/data-management）。',
          '点击「导出」，可将所有组合、策略、预警配置打包为 JSON 文件下载。',
          '点击「导入」，选择之前导出的 JSON 文件，可完整恢复所有数据。',
          '此功能用于在不同环境间迁移数据或做定期备份。',
        ],
      },
    ],
  },
  {
    id: 'strategy-editor',
    title: '策略编辑器',
    icon: '🛠️',
    children: [
      {
        id: 'strategy-basics',
        title: '基本概念',
        content: [
          '策略由条件组和动作组成。',
          '条件组：多个条件的组合（AND 关系），条件包括价格、指标值、成交量等。',
          '动作：当条件组满足时执行的买入/卖出/持有操作。',
          '支持多条件组（OR 关系），任何一组满足即可触发动作。',
        ],
      },
      {
        id: 'create-strategy',
        title: '创建自定义策略',
        content: [
          '访问「策略编辑器」页面（/strategy-editor）。',
          '在左侧面板添加条件组，给条件组命名（如「均线金叉」）。',
          '在条件组中添加条件：选择字段（收盘价、RSI等）、操作符（大于、小于、上穿等）、阈值。',
          '添加多个条件时，选择「全部满足」或「任意满足」。',
          '在右侧面板设置动作：买入/卖出/持有，并指定数量或比例。',
          '点击「保存策略」为策略命名并存储。',
          '创建完成后可在回测或实时监控中直接调用。',
        ],
      },
      {
        id: 'strategy-json',
        title: 'JSON 编辑器',
        content: [
          '策略编辑器下方提供原始 JSON 视图，可直接编辑 JSON 格式。',
          '适合有编程经验的用户快速批量修改条件。',
          '切换回可视化视图时，系统会验证 JSON 格式并转换为界面元素。',
        ],
      },
    ],
  },
  {
    id: 'fundamentals',
    title: '基本面数据',
    icon: '📋',
    children: [
      {
        id: 'fundamental-page',
        title: '查看个股基本面',
        content: [
          '在K线图页面点击「查看基本面」按钮，或直接访问 /fundamentals/[股票代码]。',
          '基本面页面分为4个Tab：',
          '  - 估值指标：PE、PB、PCF、PS、EV/EBITDA、PEG 等',
          '  - 盈利指标：ROE、ROA、ROIC、毛利率、净利率、EPS 同比增长率',
          '  - 成长指标：营收增速、利润增速、5年营收CAGR、5年利润CAGR',
          '  - 财务健康：资产负债率、流动比率、现金短债比、利息保障倍数',
          '所有数据从 Yahoo Finance 获取，部分标的可能缺少某些指标。',
        ],
      },
    ],
  },
  {
    id: 'learning-center',
    title: '学习中心',
    icon: '📚',
    children: [
      {
        id: 'vocabulary',
        title: '量化词汇百科',
        content: [
          '访问「词汇百科」页面（/education/vocabulary）。',
          '收录了33个量化交易核心术语，配有中文详细解释和金融背景。',
          '支持关键词搜索，输入「夏普」即可找到相关词条。',
          '支持按类别筛选：风险指标、选股因子、技术指标、策略概念。',
          '在应用各页面中，带下划线的术语悬浮即可显示简要释义。',
        ],
      },
      {
        id: 'backtest-pitfalls',
        title: '回测陷阱演示',
        content: [
          '访问「回测陷阱」页面（/education/backtest-pitfalls）。',
          '交互式演示三大常见回测陷阱：',
          '  - 过拟合：策略在历史数据上拟合过好，但无实战意义',
          '  - 前视偏差：使用了回测时还不存在的数据（如财报公布前的预测值）',
          '  - 生存者偏差：只回测目前存活的公司，忽略了退市股票',
          '每个陷阱都有可调节参数的模拟，直观展示其对回测结果的影响。',
        ],
      },
      {
        id: 'parameter-preview',
        title: '交互式参数预览',
        content: [
          '在回测运行器等交互页面中，调整参数滑块时实时显示信号标注预览。',
          '无需运行完整回测即可直观理解不同参数对策略信号的影响。',
          '学习模式下会额外标注参数的金融含义和常用范围。',
        ],
      },
    ],
  },
  {
    id: 'dashboard',
    title: '自定义仪表盘',
    icon: '📱',
    children: [
      {
        id: 'widget-system',
        title: 'Widget 组件系统',
        content: [
          '访问「仪表盘」页面（/dashboard）。',
          '支持6种可配置 Widget：组合概览、持仓健康度、风险指标、迷你图表、快捷报价、预警列表。',
          '点击右上角「配置面板」进入编辑模式。',
          '可拖拽调整 Widget 顺序，点击眼睛图标显示/隐藏 Widget，点击 X 删除。',
          '布局配置自动保存到浏览器 localStorage，换设备后需重新配置。',
        ],
      },
    ],
  },
  {
    id: 'faq',
    title: '常见问题',
    icon: '❓',
    children: [
      {
        id: 'data-unavailable',
        title: '数据不可用或报错',
        content: [
          '检查是否配置了有效的数据源 API Key（.env.local）。',
          '检查网络连接，数据源可能临时不可用。',
          '如所有外部源均失败，系统自动降级到内置模拟数据（仅供界面预览）。',
          '尝试切换不同的时间范围或股票代码，确认是否为特定标的问题。',
        ],
      },
      {
        id: 'backtest-slow',
        title: '回测运行缓慢',
        content: [
          '减少回测时间范围（如从5年缩短到2年）。',
          '减少技术指标数量，复杂指标计算耗时较长。',
          '使用 Walk-Forward 时，减少时间窗口数量。',
          'Monte Carlo 模拟次数可在设置中调低。',
        ],
      },
      {
        id: 'browser-notification',
        title: '浏览器通知不生效',
        content: [
          '确认浏览器已授权通知权限（首次创建预警时会弹出授权提示）。',
          '检查浏览器设置中是否禁用了通知功能。',
          'Chrome: 设置 → 隐私和安全 → 站点设置 → 通知',
          'Safari: 偏好设置 → 网站 → 通知',
        ],
      },
      {
        id: 'email-notification',
        title: '邮件通知不发送',
        content: [
          '检查 SMTP 配置是否正确（.env.local 中的邮件服务器地址、端口、账号、密码）。',
          '确认发件邮箱开启了 SMTP/POP3 服务（如 Gmail 需要开启「低安全性应用访问」或使用应用专用密码）。',
          '检查垃圾邮件文件夹。',
          '手动在预警页面点击「测试通知」验证配置是否正确。',
        ],
      },
    ],
  },
]

export default function ManualPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({})
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleItem = (id: string) => {
    setExpandedItems((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredSections = sections
    .map((section) => ({
      ...section,
      children: section.children.filter(
        (item) =>
          !searchQuery ||
          item.title.includes(searchQuery) ||
          item.content.some((c) => c.includes(searchQuery)) ||
          section.title.includes(searchQuery)
      ),
    }))
    .filter((section) => !searchQuery || section.children.length > 0)

  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-3xl font-bold">用户使用手册</h1>
          </div>
          <p className="text-muted-foreground">
            FinDec 美股量化分析平台完整功能指南 · {sections.reduce((acc, s) => acc + s.children.length, 0)} 个主题
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索手册内容..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-background text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              清除
            </button>
          )}
        </div>

        <div className="mb-8 p-4 bg-muted/50 rounded-lg border">
          <h3 className="text-sm font-medium mb-3">快捷跳转</h3>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-background rounded-full border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <span>{section.icon}</span>
                <span>{section.title}</span>
              </a>
            ))}
          </div>
        </div>

        {searchQuery && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              找到 {filteredSections.reduce((acc, s) => acc + s.children.length, 0)} 个相关内容
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredSections.map((section) => (
            <div key={section.id} id={section.id} className="rounded-lg border bg-card">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/30 transition-colors rounded-t-lg"
              >
                <span className="text-xl">{section.icon}</span>
                <span className="text-lg font-semibold flex-1">{section.title}</span>
                {expandedSections[section.id] ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expandedSections[section.id] && (
                <div className="border-t">
                  {section.children.map((item) => (
                    <div key={item.id} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleItem(item.id)}
                        className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                      >
                        {expandedItems[item.id] ? (
                          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm font-medium">{item.title}</span>
                      </button>

                      {expandedItems[item.id] && (
                        <div className="px-4 pb-4 pl-9">
                          <ul className="space-y-1.5">
                            {item.content.map((line, idx) => (
                              <li key={idx} className="text-sm text-muted-foreground leading-relaxed">
                                {line.startsWith('  -') || line.startsWith('  - ') ? (
                                  <span className="ml-4">{line.trim()}</span>
                                ) : line.startsWith('-') || line.startsWith('·') ? (
                                  <span className="ml-2">{line}</span>
                                ) : (
                                  line
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground mb-2">
            FinDec 美股量化分析平台 · 学习工具 · 不构成投资建议
          </p>
          <p className="text-xs text-muted-foreground">
            所有回测结果仅供参考，过往业绩不代表未来表现。量化策略存在固有风险，请谨慎使用。
          </p>
        </div>
      </main>
    </div>
  )
}
