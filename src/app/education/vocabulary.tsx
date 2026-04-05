import { VocabularySearch } from '@/components/learning/VocabularySearch'

export default function VocabularyPage() {
  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 font-medium">
          学习模式
        </span>
        <h1 className="text-2xl font-bold">量化词汇百科</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        鼠标悬停在带下划线的术语上可查看详细解释。支持搜索和分类浏览。
      </p>
      <VocabularySearch />
    </div>
  )
}
