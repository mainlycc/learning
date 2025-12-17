'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EditUserDialog } from './EditUserDialog'
import { deleteUsers } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'
import { Trash2, Search } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'super_admin'
  function:
    | 'ochrona'
    | 'pilot'
    | 'steward'
    | 'instruktor'
    | 'uczestnik'
    | 'gosc'
    | 'pracownik'
    | 'kontraktor'
    | null
  created_at: string
  email_confirmed_at: string | null
}

interface UsersTableProps {
  users: User[]
  currentUserId: string
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isDeleting, setIsDeleting] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredUsers.filter(u => u.id !== currentUserId).map(u => u.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (id === currentUserId) return // Nie można zaznaczyć siebie
    
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Czy na pewno chcesz usunąć ${selectedIds.size} ${selectedIds.size === 1 ? 'użytkownika' : 'użytkowników'}? Tej operacji nie można cofnąć.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await deleteUsers(Array.from(selectedIds))
      
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.message || 'Użytkownicy usunięci')
        setSelectedIds(new Set())
        router.refresh()
      }
    } catch (error) {
      console.error('Błąd podczas usuwania użytkowników:', error)
      toast.error('Wystąpił błąd podczas usuwania użytkowników.')
    } finally {
      setIsDeleting(false)
    }
  }

  const allSelected = filteredUsers.filter(u => u.id !== currentUserId).length > 0 && 
    filteredUsers.filter(u => u.id !== currentUserId).every(u => selectedIds.has(u.id))
  const someSelected = selectedIds.size > 0 && selectedIds.size < filteredUsers.filter(u => u.id !== currentUserId).length

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'default'
      case 'admin':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin'
      case 'admin':
        return 'Admin'
      default:
        return 'Użytkownik'
    }
  }

  const getFunctionLabel = (
    fn:
      | 'ochrona'
      | 'pilot'
      | 'steward'
      | 'instruktor'
      | 'uczestnik'
      | 'gosc'
      | 'pracownik'
      | 'kontraktor'
      | null
  ) => {
    switch (fn) {
      case 'ochrona':
        return 'Ochrona'
      case 'pilot':
        return 'Pilot'
      case 'steward':
        return 'Steward'
      case 'instruktor':
        return 'Instruktor'
      case 'uczestnik':
        return 'Uczestnik'
      case 'gosc':
        return 'Gość'
      case 'pracownik':
        return 'Pracownik'
      case 'kontraktor':
        return 'Kontraktor'
      default:
        return 'Brak'
    }
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Brak użytkowników w systemie</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="h-[60px] flex items-center">
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-4 bg-muted rounded-md w-full">
            <span className="text-sm font-medium">
              Zaznaczono: {selectedIds.size} {selectedIds.size === 1 ? 'użytkownika' : 'użytkowników'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Usuwanie...' : `Usuń zaznaczonych (${selectedIds.size})`}
            </Button>
          </div>
        )}
      </div>

      {/* Filtry */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj po emailu lub imieniu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value: typeof roleFilter) => setRoleFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtruj po roli" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Wszystkie role</SelectItem>
            <SelectItem value="user">Użytkownik</SelectItem>
            <SelectItem value="admin">Administrator</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <div className="rounded-md border">
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
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Funkcja</TableHead>
              <TableHead>Data rejestracji</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Brak użytkowników spełniających kryteria wyszukiwania
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.id !== currentUserId && (
                      <Checkbox
                        checked={selectedIds.has(user.id)}
                        onCheckedChange={(checked) => handleSelectOne(user.id, checked === true)}
                        aria-label={`Zaznacz ${user.email}`}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setEditingUserId(user.id)}
                      className="font-medium text-primary hover:underline cursor-pointer text-left"
                    >
                      {user.email}
                    </button>
                  </TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getFunctionLabel(user.function)}</TableCell>
                  <TableCell>
                    {format(new Date(user.created_at), 'dd.MM.yyyy', { locale: pl })}
                  </TableCell>
                  <TableCell>
                    {user.email_confirmed_at ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Aktywny
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                        Oczekuje na aktywację
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Wyświetlono {filteredUsers.length} z {users.length} użytkowników
      </div>

      {/* Dialog edycji - renderowany poza tabelą */}
      {editingUserId && (() => {
        const userToEdit = filteredUsers.find(u => u.id === editingUserId)
        return userToEdit ? (
          <EditUserDialog 
            user={userToEdit} 
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setEditingUserId(null)
              }
            }}
          />
        ) : null
      })()}
    </div>
  )
}

