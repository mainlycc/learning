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
import { DeleteUserDialog } from './DeleteUserDialog'
import { resendInvitation } from '@/app/dashboard/users/actions'
import { toast } from 'sonner'
import { Edit, Trash2, Mail, Search } from 'lucide-react'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'user' | 'admin' | 'super_admin'
  created_at: string
  email_confirmed_at: string | null
}

interface UsersTableProps {
  users: User[]
  currentUserId: string
}

export function UsersTable({ users, currentUserId }: UsersTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'user' | 'admin' | 'super_admin'>('all')

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter

    return matchesSearch && matchesRole
  })

  const handleResendInvitation = async (email: string) => {
    const result = await resendInvitation(email)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(result.message || 'Zaproszenie wysłane ponownie')
    }
  }

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

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Brak użytkowników w systemie</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
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
              <TableHead>Email</TableHead>
              <TableHead>Imię i nazwisko</TableHead>
              <TableHead>Rola</TableHead>
              <TableHead>Data rejestracji</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Akcje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Brak użytkowników spełniających kryteria wyszukiwania
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.email}</TableCell>
                  <TableCell>{user.full_name || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={getRoleBadgeVariant(user.role)}>
                      {getRoleLabel(user.role)}
                    </Badge>
                  </TableCell>
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
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!user.email_confirmed_at && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResendInvitation(user.email)}
                          title="Wyślij ponownie zaproszenie"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <EditUserDialog user={user} />
                      {user.id !== currentUserId && (
                        <DeleteUserDialog userId={user.id} userEmail={user.email} />
                      )}
                    </div>
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
    </div>
  )
}

