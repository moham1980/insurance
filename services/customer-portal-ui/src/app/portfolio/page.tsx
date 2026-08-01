import PortfolioSummary from '../../components/PortfolioSummary'
import ConsentManager from '../../components/ConsentManager'

export const metadata = {
  title: 'پرتفوی و رضایت‌ها | بیمه',
}

export default function PortfolioPage() {
  // In a real app, derive from session
  const customerId = 'me'

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-lg font-bold text-text-primary">پرتفوی و رضایت‌ها</h1>
      <PortfolioSummary customerId={customerId} />
      <ConsentManager customerId={customerId} />
    </div>
  )
}
