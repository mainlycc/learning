'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { InvitationDialog } from './invitation-dialog'
import {
  resendInvitations,
  deleteInvitations,
  type TutorInvitation,
} from '@/lib/actions/invitations'
import { toast } from 'sonner'
import { Mail, Trash2, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface InvitationsManagementProps {
  invitations: TutorInvitation[]
}

export function InvitationsManagement({ invitations: initialInvitations }: InvitationsManagementProps) {
  const [invitations, setInvitations] = useState(initialInvitations)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Zaznacz wszystkie zaproszenia (w tym wygasłe)
      setSelectedIds(invitations.map(inv => inv.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds([...selectedIds, id])
    } else {
      setSelectedIds(selectedIds.filter(selectedId => selectedId !== id))
    }
  }

  const handleResendSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Wybierz przynajmniej jedno zaproszenie')
      return
    }

    // Filtruj tylko zaproszenia pending
    const pendingIds = selectedIds.filter(id => {
      const inv = invitations.find(i => i.id === id)
      return inv?.status === 'pending'
    })

    if (pendingIds.length === 0) {
      toast.error('Można wysłać ponownie tylko zaproszenia oczekujące')
      return
    }

    setIsProcessing(true)
    const result = await resendInvitations(pendingIds)

    if (result.success) {
      toast.success(`Wysłano ponownie ${pendingIds.length} zaproszeń`)
      setSelectedIds([])
      // Odśwież stronę
      window.location.reload()
    } else {
      toast.error(result.error || 'Nie udało się wysłać zaproszeń')
    }

    setIsProcessing(false)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('Wybierz przynajmniej jedno zaproszenie')
      return
    }

    if (!confirm(`Czy na pewno chcesz usunąć ${selectedIds.length} zaproszeń?`)) {
      return
    }

    setIsProcessing(true)
    const result = await deleteInvitations(selectedIds)

    if (result.success) {
      toast.success(`Usunięto ${selectedIds.length} zaproszeń`)
      setSelectedIds([])
      setInvitations(invitations.filter(inv => !selectedIds.includes(inv.id)))
    } else {
      toast.error(result.error || 'Nie udało się usunąć zaproszeń')
    }

    setIsProcessing(false)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Oczekujące
          </Badge>
        )
      case 'accepted':
        return (
          <Badge variant="default" className="flex items-center gap-1 bg-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Zaakceptowane
          </Badge>
        )
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Wygasłe
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  // Wszystkie zaproszenia (do zaznaczania wszystkich)
  const allSelected = invitations.length > 0 && selectedIds.length === invitations.length
  const someSelected = selectedIds.length > 0 && selectedIds.length < invitations.length

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold">Zarządzanie zaproszeniami</h1>
        <p className="text-muted-foreground">
          Wysyłaj i zarządzaj zaproszeniami dla nowych tutorów
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Lista zaproszeń</CardTitle>
              <CardDescription>
                Zarządzaj wszystkimi zaproszeniami wysłanymi do tutorów
                {selectedIds.length > 0 && (
                  <span className="ml-2 text-foreground">
                    • Zaznaczono {selectedIds.length} {selectedIds.length === 1 ? 'zaproszenie' : 'zaproszeń'}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex gap-2 items-center">
              {selectedIds.length > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendSelected}
                    disabled={isProcessing || !selectedIds.some(id => {
                      const inv = invitations.find(i => i.id === id)
                      return inv?.status === 'pending'
                    })}
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Wyślij ponownie
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleDeleteSelected}
                    disabled={isProcessing}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Usuń
                  </Button>
                </>
              )}
              <InvitationDialog />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Brak zaproszeń</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Zaznacz wszystkie"
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead>Wygasa</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(invitation.id)}
                        onCheckedChange={(checked) =>
                          handleSelectOne(invitation.id, checked as boolean)
                        }
                        aria-label={`Zaznacz ${invitation.email}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{invitation.email}</TableCell>
                    <TableCell>{getStatusBadge(invitation.status)}</TableCell>
                    <TableCell>
                      {format(new Date(invitation.created_at), 'dd MMM yyyy, HH:mm', {
                        locale: pl,
                      })}
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.expires_at), 'dd MMM yyyy, HH:mm', {
                        locale: pl,
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

