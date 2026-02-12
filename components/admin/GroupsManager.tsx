'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Users, Check, X, Loader2, Settings, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createGroup, updateGroup, deleteGroup } from '@/app/dashboard/users/actions'
import { Separator } from '@/components/ui/separator'

export interface UserGroup {
  id: string
  name: string
  display_name: string
  description: string | null
  created_at: string
  created_by: string | null
}

interface GroupsManagerProps {
  groups: UserGroup[]
  isSuperAdmin: boolean
}

export function GroupsManager({ groups, isSuperAdmin }: GroupsManagerProps) {
  const router = useRouter()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)
  const [editDisplayName, setEditDisplayName] = useState('')
  const [deletingGroup, setDeletingGroup] = useState<UserGroup | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dodawanie nowej grupy
  const [newGroupName, setNewGroupName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const startEditing = (group: UserGroup) => {
    setEditingGroupId(group.id)
    setEditDisplayName(group.display_name)
  }

  const cancelEditing = () => {
    setEditingGroupId(null)
    setEditDisplayName('')
  }

  const handleEditGroup = async (groupId: string) => {
    if (!editDisplayName.trim()) {
      toast.error('Nazwa grupy nie może być pusta')
      return
    }
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('display_name', editDisplayName.trim())
      const result = await updateGroup(groupId, formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setEditingGroupId(null)
        setEditDisplayName('')
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteGroup = async (groupId: string) => {
    setIsSubmitting(true)
    try {
      const result = await deleteGroup(groupId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setDeletingGroup(null)
        router.refresh()
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Nazwa grupy nie może być pusta')
      return
    }
    setIsAdding(true)
    try {
      const formData = new FormData()
      formData.append('display_name', newGroupName.trim())
      const result = await createGroup(formData)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message)
        setNewGroupName('')
        router.refresh()
      }
    } finally {
      setIsAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, groupId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleEditGroup(groupId)
    } else if (e.key === 'Escape') {
      cancelEditing()
    }
  }

  const handleAddKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddGroup()
    }
  }

  return (
    <>
      {/* Główny dialog zarządzania grupami */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Zarządzaj grupami ({groups.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Zarządzanie grupami
            </DialogTitle>
            <DialogDescription>
              Dodawaj, edytuj i usuwaj grupy użytkowników.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Lista istniejących grup */}
            <div className="space-y-1">
              {groups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Brak grup. Dodaj pierwszą grupę poniżej.
                </p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-1 pr-1">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                    >
                      {editingGroupId === group.id ? (
                        /* Tryb edycji */
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            value={editDisplayName}
                            onChange={(e) => setEditDisplayName(e.target.value)}
                            onKeyDown={(e) => handleKeyDown(e, group.id)}
                            className="h-8"
                            autoFocus
                            disabled={isSubmitting}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleEditGroup(group.id)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={cancelEditing}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        /* Tryb wyświetlania */
                        <>
                          <span className="text-sm font-medium truncate">
                            {group.display_name}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => startEditing(group)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {isSuperAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => setDeletingGroup(group)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Dodawanie nowej grupy */}
            <div className="space-y-2">
              <Label htmlFor="new_group_name" className="text-sm font-medium">
                Dodaj nową grupę
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="new_group_name"
                  placeholder="Nazwa grupy, np. Kierownik"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  onKeyDown={handleAddKeyDown}
                  disabled={isAdding}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={handleAddGroup}
                  disabled={isAdding || !newGroupName.trim()}
                >
                  {isAdding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Zamknij
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog potwierdzenia usunięcia */}
      <Dialog open={!!deletingGroup} onOpenChange={(open) => !open && setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Usunąć grupę?
            </DialogTitle>
            <DialogDescription>
              Czy na pewno chcesz usunąć grupę &quot;{deletingGroup?.display_name}&quot;?
              Tej operacji nie można cofnąć. Grupa może być usunięta tylko jeśli
              żaden użytkownik nie jest do niej przypisany.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingGroup(null)}
              disabled={isSubmitting}
            >
              Anuluj
            </Button>
            <Button
              variant="destructive"
              onClick={() => deletingGroup && handleDeleteGroup(deletingGroup.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Usuwanie...
                </>
              ) : (
                'Usuń'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
