import { DataDownloadForm } from './components/DataDownloadForm'

export default function DataManagerPage() {
  return (
    <div className="flex flex-col flex-1">
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">数据管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            下载和管理本地历史股票数据，减少实时API依赖
          </p>
        </div>

        <div className="max-w-2xl">
          <DataDownloadForm />
        </div>
      </main>
    </div>
  )
}
