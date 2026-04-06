export function Footer() {
  return (
    <footer className="mt-auto py-6 border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          FinDec 美股量化分析平台 · 学习工具 · 不构成投资建议
        </p>
        <p className="text-xs text-muted-foreground">
          所有回测结果仅供参考，过往业绩不代表未来表现。量化策略存在固有风险，请谨慎使用。
        </p>
      </div>
    </footer>
  )
}