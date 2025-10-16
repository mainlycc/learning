import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, UserPlus, Shield, UserCheck } from 'lucide-react'

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Zarządzanie użytkownikami
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Dodawaj i zarządzaj użytkownikami systemu
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Dodaj użytkownika
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wszyscy użytkownicy
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Zarejestrowanych użytkowników
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Administratorzy
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Użytkowników z uprawnieniami admin
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Aktywni użytkownicy
            </CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Użytkowników aktywnych w tym miesiącu
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista użytkowników</CardTitle>
          <CardDescription>
            Zarządzaj uprawnieniami i danymi użytkowników
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Brak użytkowników w systemie
            </p>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Dodaj pierwszego użytkownika
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
