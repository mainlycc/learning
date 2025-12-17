'use client'

import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TrainingForm } from './training-form'
import TestCreator from '@/components/admin/TestCreator'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface User {
  id: string
  email: string
  full_name: string | null
  function: 'ochrona' | 'pilot' | 'steward' | 'instruktor' | 'uczestnik' | 'gosc' | 'pracownik' | 'kontraktor' | null
}

interface TrainingData {
  id: string
  title: string
  description: string | null
  duration_minutes: number
  file_type: 'PDF' | 'PPTX' | 'PNG'
  is_active: boolean
  file_path: string | null
}

interface TrainingTabsProps {
  users: User[]
  trainingData: TrainingData | null
  assignedUserIds: string[]
}

export function TrainingTabs({ users, trainingData, assignedUserIds }: TrainingTabsProps) {
  const [activeTab, setActiveTab] = useState('training')

  // Zawsze pokazuj tabs
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="inline-flex w-auto">
        <TabsTrigger value="training">Szkolenie</TabsTrigger>
        <TabsTrigger value="test" disabled={!trainingData}>
          Test
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value="training" className="mt-6">
        <TrainingForm 
          initialUsers={users} 
          trainingData={trainingData}
          assignedUserIds={assignedUserIds}
        />
      </TabsContent>
      
      <TabsContent value="test" className="mt-6">
        {trainingData ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Test dla szkolenia</CardTitle>
              <CardDescription>
                Zarządzaj testami przypisanymi do tego szkolenia: edytuj ustawienia testu i dodawaj nowe pytania.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestCreator initialTrainingId={trainingData.id} />
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>Test dla szkolenia</CardTitle>
              <CardDescription>
                Najpierw utwórz szkolenie, aby móc zarządzać testami.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Zapisz szkolenie w zakładce &quot;Szkolenie&quot;, a następnie wróć tutaj, aby utworzyć test.
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}

