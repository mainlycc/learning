import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Settings, Bell, Shield, Palette } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Ustawienia
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Skonfiguruj preferencje i ustawienia systemu
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Bell className="mr-2 h-5 w-5" />
              Powiadomienia
            </CardTitle>
            <CardDescription>
              Zarządzaj powiadomieniami systemowymi
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Powiadomienia email</Label>
                <p className="text-sm text-muted-foreground">
                  Otrzymuj powiadomienia o nowych szkoleniach i postępach
                </p>
              </div>
              <Switch id="email-notifications" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminder-notifications">Przypomnienia</Label>
                <p className="text-sm text-muted-foreground">
                  Przypomnienia o niedokończonych szkoleniach
                </p>
              </div>
              <Switch id="reminder-notifications" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Bezpieczeństwo
            </CardTitle>
            <CardDescription>
              Ustawienia bezpieczeństwa i prywatności
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="two-factor">Dwuskładnikowe uwierzytelnianie</Label>
                <p className="text-sm text-muted-foreground">
                  Dodatkowa warstwa bezpieczeństwa dla Twojego konta
                </p>
              </div>
              <Switch id="two-factor" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="session-timeout">Automatyczne wylogowanie</Label>
                <p className="text-sm text-muted-foreground">
                  Automatyczne wylogowanie po okresie bezczynności
                </p>
              </div>
              <Switch id="session-timeout" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Palette className="mr-2 h-5 w-5" />
              Preferencje wyświetlania
            </CardTitle>
            <CardDescription>
              Dostosuj wygląd interfejsu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dark-mode">Tryb ciemny</Label>
                <p className="text-sm text-muted-foreground">
                  Używaj ciemnego motywu interfejsu
                </p>
              </div>
              <Switch id="dark-mode" />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="compact-mode">Tryb kompaktowy</Label>
                <p className="text-sm text-muted-foreground">
                  Zmniejsz odstępy w interfejsie
                </p>
              </div>
              <Switch id="compact-mode" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Ogólne ustawienia
            </CardTitle>
            <CardDescription>
              Podstawowe ustawienia konta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="outline" className="w-full">
                Zmień hasło
              </Button>
              <Button variant="outline" className="w-full">
                Aktualizuj profil
              </Button>
              <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                Usuń konto
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
