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
  cancelInvitation,
  type TutorInvitation,
} from '@/lib/actions/invitations'
import { toast } from 'sonner'
import { Mail, Trash2, X, Copy, CheckCircle2, Clock, XCircle } from 'lucide-react'
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

    setIsProcessing(true)
    const result = await resendInvitations(selectedIds)

    if (result.success) {
      toast.success(`Wysłano ponownie ${selectedIds.length} zaproszeń`)
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

  const handleCancelInvitation = async (id: string) => {
    if (!confirm('Czy na pewno chcesz anulować to zaproszenie?')) {
      return
    }

    setIsProcessing(true)
    const result = await cancelInvitation(id)

    if (result.success) {
      toast.success('Zaproszenie zostało anulowane')
      setInvitations(
        invitations.map(inv =>
          inv.id === id ? { ...inv, status: 'expired' as const } : inv
        )
      )
    } else {
      toast.error(result.error || 'Nie udało się anulować zaproszenia')
    }

    setIsProcessing(false)
  }

  const handleCopyLink = (token: string) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const link = `${baseUrl}/register?token=${token}`
    navigator.clipboard.writeText(link)
    toast.success('Link skopiowany do schowka')
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

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending')
  const allSelected = selectedIds.length > 0 && selectedIds.length === pendingInvitations.length

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Zarządzanie zaproszeniami</h1>
          <p className="text-muted-foreground">
            Wysyłaj i zarządzaj zaproszeniami dla nowych tutorów
          </p>
        </div>
        <InvitationDialog />
      </div>

      {selectedIds.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Zaznaczono {selectedIds.length} zaproszeń
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendSelected}
                  disabled={isProcessing}
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
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista zaproszeń</CardTitle>
          <CardDescription>
            Zarządzaj wszystkimi zaproszeniami wysłanymi do tutorów
          </CardDescription>
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
                    />
                  </TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data utworzenia</TableHead>
                  <TableHead>Wygasa</TableHead>
                  <TableHead className="text-right">Akcje</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      {invitation.status === 'pending' && (
                        <Checkbox
                          checked={selectedIds.includes(invitation.id)}
                          onCheckedChange={(checked) =>
                            handleSelectOne(invitation.id, checked as boolean)
                          }
                        />
                      )}
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
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyLink(invitation.token)}
                              title="Kopiuj link"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancelInvitation(invitation.id)}
                              disabled={isProcessing}
                              title="Anuluj"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
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

