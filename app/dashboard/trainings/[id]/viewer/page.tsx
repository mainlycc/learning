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

  return (
    <TrainingViewer 
      training={training}
      slides={slides}
      userProgress={userProgress || undefined}
    />
  )
}
