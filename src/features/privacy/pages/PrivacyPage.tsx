import { PageHeader } from '@/components/layout/PageHeader'
import { DownloadSection } from '../components/DownloadSection'
import { EraseSection } from '../components/EraseSection'
import { RetentionSection } from '../components/RetentionSection'

export function PrivacyPage() {
  return (
    <>
      <PageHeader title="Privacy and data" subtitle="Answer requests about a person's data, and decide how long logs are kept." />
      <div className="max-w-3xl space-y-6">
        <DownloadSection />
        <EraseSection />
        <RetentionSection />
      </div>
    </>
  )
}
