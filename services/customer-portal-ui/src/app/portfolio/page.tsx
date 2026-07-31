import PortfolioSummary from '../../components/PortfolioSummary'
import ConsentManager from '../../components/ConsentManager'

export const metadata = {
  title: 'پرتفوی و رضایت‌ها | بیمه',
}

export default function PortfolioPage() {
  // In a real app, derive from session
  const customerId = 'me'

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">پرتفوی و رضایت‌ها</h1>
      <PortfolioSummary customerId={customerId} />
      <ConsentManager customerId={customerId} />
    </main>
  )
}
