import Link from "next/link";
import { ChartContainer } from "@/components/chart/ChartContainer";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-zinc-50 dark:bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <Breadcrumb items={[{ label: 'K线图' }]} />
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            AAPL - 苹果公司
          </h2>
          <div className="h-[500px] w-full">
            <ChartContainer symbol="AAPL" />
          </div>
        </div>
      </main>

      <footer className="bg-white dark:bg-black border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Findec - 股票分析平台
        </div>
      </footer>
    </div>
  );
}
