interface SummaryCardsIndexProps {
  summaries: { id: string; icon: string; title: string; count: string; href: string }[] | null; // Updated to include href
}

export default function SummaryCards({ summaries }: SummaryCardsIndexProps) {
  return (
    <div className="flex-1 md:flex overflow-x-auto gap-6 mb-8">
      {
        summaries?.map((summary) => (
          <a href={summary.href} key={summary.id}>
            <article className="bg-white p-6 rounded-lg shadow mb-4 items-center min-w-[300px] flex-col gap-32 hover:shadow-lg transition-shadow">
              <div className="flex p-2 bg-gray-200 w-12 rounded-2xl">
                <img src={summary.icon} alt={summary.title} className="p-2 w-8 h-8"/>
              </div>
              <h3 className="text-lg font-bold">{summary.title}</h3>
              <p className="text-3xl font-bold">{summary.count}</p>
            </article>
          </a>
        ))
      }
    </div>
  )
}