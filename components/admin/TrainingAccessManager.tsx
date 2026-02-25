'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  updateUserTrainingAccess,
  updateGroupTrainingAccess,
} from '@/app/dashboard/trainings/manage/access-actions'
import { Users, User } from 'lucide-react'

type Participant = {
  id: string
  email: string
  full_name: string | null
  function: string | null
}

type Training = {
  id: string
  title: string
  description: string | null
  is_active: boolean
  hasAssignments: boolean
}

type UserGroup = {
  name: string
  display_name: string
}

interface TrainingAccessManagerProps {
  participants: Participant[]
  trainings: Training[]
  groups: UserGroup[]
  currentUserId: string | null
  currentUserTrainingIds: string[]
  initialToast?: string
}

export function TrainingAccessManager({
  participants,
  trainings,
  groups,
  currentUserId,
  currentUserTrainingIds,
  initialToast,
}: TrainingAccessManagerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  // ── Stan trybu indywidualnego ──
  const [selectedUserId, setSelectedUserId] = useState<string | null>(currentUserId)
  const [selectedTrainingIds, setSelectedTrainingIds] = useState<Set<string>>(
    () => new Set(currentUserTrainingIds),
  )
  const [isSaving, setIsSaving] = useState(false)

  // ── Stan trybu grupowego ──
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupTrainingIds, setGroupTrainingIds] = useState<Set<string>>(new Set())
  const [isSavingGroup, setIsSavingGroup] = useState(false)

  const toastMessage = initialToast

  // ── Tryb indywidualny ──
  const handleUserChange = (value: string) => {
    const userId = value || null
    setSelectedUserId(userId)

    const params = new URLSearchParams(searchParams.toString())
    if (userId) {
      params.set('userId', userId)
    } else {
      params.delete('userId')
    }
    params.delete('toast')

    router.push(`${pathname}?${params.toString()}`)
  }

  const handleTrainingToggle = (trainingId: string, checked: boolean) => {
    setSelectedTrainingIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(trainingId)
      } else {
        next.delete(trainingId)
      }
      return next
    })
  }

  const handleSelectAllTrainings = (checked: boolean) => {
    if (checked) {
      setSelectedTrainingIds(new Set(trainings.map((t) => t.id)))
    } else {
      setSelectedTrainingIds(new Set())
    }
  }

  const allSelected =
    trainings.length > 0 && selectedTrainingIds.size === trainings.length
  const someSelected =
    selectedTrainingIds.size > 0 &&
    selectedTrainingIds.size < trainings.length

  const headerChecked: boolean | 'indeterminate' =
    allSelected ? true : someSelected ? 'indeterminate' : false

  const selectedUser = useMemo(
    () => participants.find((p) => p.id === selectedUserId) || null,
    [participants, selectedUserId],
  )

  const userHasAccess = (training: Training) => {
    if (!training.hasAssignments) {
      return true
    }
    return selectedTrainingIds.has(training.id)
  }

  const handleSave = async () => {
    if (!selectedUserId) return

    setIsSaving(true)
    try {
      const formData = new FormData()
      formData.append('userId', selectedUserId)
      Array.from(selectedTrainingIds).forEach((id) => {
        formData.append('trainingIds[]', id)
      })

      await updateUserTrainingAccess(formData)
    } catch (error) {
      console.error('Błąd podczas zapisu dostępu do szkoleń:', error)
      alert('Wystąpił błąd podczas zapisywania dostępu do szkoleń.')
      setIsSaving(false)
    }
  }

  // ── Tryb grupowy ──
  const groupMembers = useMemo(
    () =>
      selectedGroup
        ? participants.filter((p) => p.function === selectedGroup)
        : [],
    [participants, selectedGroup],
  )

  // Zlicz ile użytkowników jest w każdej grupie
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const g of groups) {
      counts[g.name] = participants.filter((p) => p.function === g.name).length
    }
    return counts
  }, [groups, participants])

  const handleGroupChange = (value: string) => {
    setSelectedGroup(value || null)
    // Resetuj zaznaczenia szkoleń przy zmianie grupy
    setGroupTrainingIds(new Set())
  }

  const handleGroupTrainingToggle = (trainingId: string, checked: boolean) => {
    setGroupTrainingIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(trainingId)
      } else {
        next.delete(trainingId)
      }
      return next
    })
  }

  const handleGroupSelectAllTrainings = (checked: boolean) => {
    if (checked) {
      setGroupTrainingIds(new Set(trainings.map((t) => t.id)))
    } else {
      setGroupTrainingIds(new Set())
    }
  }

  const groupAllSelected =
    trainings.length > 0 && groupTrainingIds.size === trainings.length
  const groupSomeSelected =
    groupTrainingIds.size > 0 &&
    groupTrainingIds.size < trainings.length

  const groupHeaderChecked: boolean | 'indeterminate' =
    groupAllSelected ? true : groupSomeSelected ? 'indeterminate' : false

  const handleSaveGroup = async () => {
    if (!selectedGroup) return

    setIsSavingGroup(true)
    try {
      const formData = new FormData()
      formData.append('groupName', selectedGroup)
      Array.from(groupTrainingIds).forEach((id) => {
        formData.append('trainingIds[]', id)
      })

      await updateGroupTrainingAccess(formData)
    } catch (error) {
      console.error('Błąd podczas zbiorczego zapisu dostępu:', error)
      alert('Wystąpił błąd podczas zapisywania dostępu do szkoleń dla grupy.')
      setIsSavingGroup(false)
    }
  }

  // Filtruj grupy – pokaż tylko te, w których jest co najmniej 1 użytkownik
  const availableGroups = groups.filter((g) => groupCounts[g.name] > 0)

  return (
    <div className="space-y-4">
      {toastMessage && (
        <Card className="border-green-200 bg-green-50 text-green-800">
          <CardContent className="py-3 text-sm font-medium">
            {toastMessage}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="user" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-96">
          <TabsTrigger value="user" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Uczestnik
          </TabsTrigger>
          <TabsTrigger value="group" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Grupa
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════ TRYB INDYWIDUALNY ════════════════════ */}
        <TabsContent value="user" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Wybierz uczestnika</p>
                <Select
                  value={selectedUserId ?? undefined}
                  onValueChange={handleUserChange}
                >
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Wybierz uczestnika" />
                  </SelectTrigger>
                  <SelectContent>
                    {participants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.full_name || participant.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {participants.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Brak uczestników z rolą{' '}
                    <span className="font-semibold">user</span>.
                  </p>
                )}
              </div>

              {selectedUser && (
                <p className="text-xs text-muted-foreground">
                  Zarządzasz dostępem dla:{' '}
                  <span className="font-medium">
                    {selectedUser.full_name || selectedUser.email}
                  </span>{' '}
                  ({selectedUser.email})
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lista szkoleń</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Ma dostęp (efektywnie):{' '}
                    {trainings.filter((t) => userHasAccess(t)).length} /{' '}
                    {trainings.length}
                  </Badge>
                </div>
              </div>

              {trainings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak aktywnych szkoleń.
                </p>
              ) : !selectedUserId ? (
                <p className="text-sm text-muted-foreground">
                  Wybierz uczestnika, aby zarządzać dostępem do szkoleń.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={headerChecked}
                            onCheckedChange={(checked) =>
                              handleSelectAllTrainings(checked === true)
                            }
                            aria-label="Zaznacz wszystkie szkolenia"
                          />
                        </TableHead>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Opis</TableHead>
                        <TableHead className="w-32 text-center">
                          Dostęp
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainings.map((training) => {
                        const hasAccess = userHasAccess(training)

                        return (
                          <TableRow key={training.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedTrainingIds.has(training.id)}
                                onCheckedChange={(checked) =>
                                  handleTrainingToggle(
                                    training.id,
                                    checked === true,
                                  )
                                }
                                aria-label={`Przypisanie szkolenia ${training.title}`}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {training.title}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {training.description || 'Brak opisu'}
                            </TableCell>
                            <TableCell className="text-center">
                              {hasAccess ? (
                                <Badge variant="default">Ma dostęp</Badge>
                              ) : (
                                <Badge variant="outline">Brak dostępu</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={!selectedUserId || trainings.length === 0 || isSaving}
                >
                  {isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ════════════════════ TRYB GRUPOWY ════════════════════ */}
        <TabsContent value="group" className="space-y-4 mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Wybierz grupę</p>
                <Select
                  value={selectedGroup ?? undefined}
                  onValueChange={handleGroupChange}
                >
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Wybierz grupę użytkowników" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((group) => (
                      <SelectItem key={group.name} value={group.name}>
                        {group.display_name} ({groupCounts[group.name]}{' '}
                        {groupCounts[group.name] === 1
                          ? 'osoba'
                          : groupCounts[group.name] < 5
                            ? 'osoby'
                            : 'osób'}
                        )
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableGroups.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Brak grup z przypisanymi użytkownikami.
                  </p>
                )}
              </div>

              {selectedGroup && groupMembers.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Zmiana dotyczy <span className="font-medium">{groupMembers.length}</span>{' '}
                    {groupMembers.length === 1
                      ? 'użytkownika'
                      : groupMembers.length < 5
                        ? 'użytkowników'
                        : 'użytkowników'}
                    :
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {groupMembers.map((m) => (
                      <Badge key={m.id} variant="secondary" className="text-xs">
                        {m.full_name || m.email}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Lista szkoleń</p>
                {selectedGroup && (
                  <Badge variant="outline">
                    Zaznaczono: {groupTrainingIds.size} / {trainings.length}
                  </Badge>
                )}
              </div>

              {trainings.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Brak aktywnych szkoleń.
                </p>
              ) : !selectedGroup ? (
                <p className="text-sm text-muted-foreground">
                  Wybierz grupę, aby zarządzać dostępem do szkoleń.
                </p>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={groupHeaderChecked}
                            onCheckedChange={(checked) =>
                              handleGroupSelectAllTrainings(checked === true)
                            }
                            aria-label="Zaznacz wszystkie szkolenia"
                          />
                        </TableHead>
                        <TableHead>Tytuł</TableHead>
                        <TableHead>Opis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {trainings.map((training) => (
                        <TableRow key={training.id}>
                          <TableCell>
                            <Checkbox
                              checked={groupTrainingIds.has(training.id)}
                              onCheckedChange={(checked) =>
                                handleGroupTrainingToggle(
                                  training.id,
                                  checked === true,
                                )
                              }
                              aria-label={`Przypisanie szkolenia ${training.title}`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {training.title}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {training.description || 'Brak opisu'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex items-center justify-between">
                {selectedGroup && groupMembers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ⚠️ Zapis nadpisze obecne przypisania szkoleń dla{' '}
                    <span className="font-semibold">wszystkich</span>{' '}
                    użytkowników w grupie.
                  </p>
                )}
                <div className="ml-auto">
                  <Button
                    onClick={handleSaveGroup}
                    disabled={
                      !selectedGroup ||
                      trainings.length === 0 ||
                      isSavingGroup
                    }
                  >
                    {isSavingGroup
                      ? 'Zapisywanie...'
                      : `Zapisz dla grupy (${groupMembers.length} os.)`}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
