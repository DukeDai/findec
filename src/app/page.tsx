import { ChartContainer } from "@/components/chart/ChartContainer";
import { PageHeader } from "@/components/layout/Breadcrumb";

export default function Home() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader />
        
        <div className="bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            AAPL - 苹果公司
          </h2>
          <div className="h-[500px] w-full">
            <ChartContainer symbol="AAPL" />
          </div>
        </div>
      </main>
    </div>
  );
}
