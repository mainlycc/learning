import { createClient } from '@/lib/supabase/server'
import { TrainingViewer } from '@/components/training-viewer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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

  // Sprawdź czy użytkownik jest adminem
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = userProfile?.role === 'admin' || userProfile?.role === 'super_admin'

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

  // RLS policy na trainings już filtruje dostęp - jeśli użytkownik nie ma dostępu,
  // szkolenie nie pojawi się w wynikach zapytania (notFound() wyżej)
  // Nie musimy ręcznie sprawdzać przypisań

  // Pobierz pliki szkolenia z training_files
  const { data: trainingFiles } = await supabase
    .from('training_files')
    .select('*')
    .eq('training_id', id)
    .order('created_at', { ascending: true })

  // Pobierz slajdy szkolenia
  const { data: slidesData } = await supabase
    .from('training_slides')
    .select('*')
    .eq('training_id', id)
    .order('slide_number', { ascending: true })

  let slides = slidesData || []

  // Jeśli nie ma slajdów, ale są pliki w training_files, utwórz slajdy z plików
  if (slides.length === 0 && trainingFiles && trainingFiles.length > 0) {
    slides = trainingFiles.map((file, index) => ({
      id: `${training.id}-file-${file.id}`,
      training_id: training.id,
      slide_number: index + 1,
      image_url: '',
      min_time_seconds: Math.max(30, (training.duration_minutes || 1) * 60 / trainingFiles.length),
    }))
  } else if (slides.length === 0) {
    // Fallback dla starych szkoleń z file_path w trainings
    if ((training.file_type === 'PPTX' || training.file_type === 'PDF' || training.file_type === 'PNG') && training.file_path) {
      slides = [{
        id: `${training.id}-${training.file_type.toLowerCase()}-fallback`,
        training_id: training.id,
        slide_number: 1,
        image_url: '',
        min_time_seconds: Math.max(30, (training.duration_minutes || 1) * 60),
      }]
    } else {
      notFound()
    }
  }

  // Pobierz postęp użytkownika
  const { data: userProgress } = await supabase
    .from('user_training_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('training_id', id)
    .single()

  // Sprawdź czy kurs został zakończony przed czasem - jeśli tak, zablokuj dostęp
  if (userProgress?.status === 'completed' && userProgress?.completed_early === true) {
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
              Kurs został zakończony przed czasem
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ten kurs został zakończony przed upływem wymaganego czasu. Zgodnie z zasadami, nie możesz już do niego wrócić.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Kurs został oznaczony jako ukończony, ale dostęp do materiałów został zablokowany z powodu przedwczesnego zakończenia.
            </p>
            <div className="mt-6">
              <Button asChild>
                <Link href={`/dashboard/trainings/${id}`}>
                  Powrót do szczegółów kursu
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
      trainingFiles={trainingFiles || []}
    />
  )
}
