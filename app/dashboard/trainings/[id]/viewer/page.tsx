import { createClient } from '@/lib/supabase/server'
import { TrainingViewer } from '@/components/training-viewer'
import { notFound } from 'next/navigation'

interface TrainingViewerPageProps {
  params: Promise<{
    id: string
  }>
}

export default async function TrainingViewerPage({ params }: TrainingViewerPageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    notFound()
  }

  // Pobierz szczegóły szkolenia
  const { data: training } = await supabase
    .from('trainings')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (!training) {
    notFound()
  }

  // Pobierz slajdy szkolenia
  const { data: slides } = await supabase
    .from('training_slides')
    .select('*')
    .eq('training_id', id)
    .order('slide_number', { ascending: true })

  if (!slides || slides.length === 0) {
    notFound()
  }

  // Pobierz postęp użytkownika
  const { data: userProgress } = await supabase
    .from('user_training_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('training_id', id)
    .single()

  // Pobierz politykę dostępu
  const { data: accessPolicy } = await supabase
    .from('access_policies')
    .select('*')
    .eq('training_id', id)
    .single()

  // Sprawdź ograniczenia dostępu
  if (accessPolicy) {
    if (accessPolicy.policy_type === 'time_limited' && accessPolicy.time_limit_days) {
      // Sprawdź czy użytkownik ma jeszcze dostęp czasowy
      const firstAccess = userProgress?.created_at || new Date().toISOString()
      const accessExpiry = new Date(new Date(firstAccess).getTime() + (accessPolicy.time_limit_days * 24 * 60 * 60 * 1000))
      
      if (new Date() > accessExpiry) {
        // Dostęp wygasł
        return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Dostęp wygasł
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Twój dostęp do tego szkolenia wygasł. Dostęp był ograniczony do {accessPolicy.time_limit_days} dni od pierwszego otwarcia.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Skontaktuj się z administratorem, aby przedłużyć dostęp.
                </p>
              </div>
            </div>
          </div>
        )
      }
    }
  }

  // Ogranicz slajdy dla trybu preview
  let accessibleSlides = slides
  if (accessPolicy?.policy_type === 'preview') {
    // W trybie preview pokazuj tylko pierwsze 3 slajdy
    accessibleSlides = slides.slice(0, 3)
  }

  return (
    <TrainingViewer 
      training={training}
      slides={accessibleSlides}
      userProgress={userProgress || undefined}
      accessPolicy={accessPolicy}
    />
  )
}
