'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Bell, Check, AlertCircle, Info, Award, MessageSquare } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
}

const notificationIcons = {
  new_training: Award,
  training_completed: Award,
  test_passed: Award,
  test_failed: AlertCircle,
  admin_message: MessageSquare,
  default: Info
}

const notificationColors = {
  new_training: 'bg-blue-100 text-blue-800',
  training_completed: 'bg-green-100 text-green-800',
  test_passed: 'bg-green-100 text-green-800',
  test_failed: 'bg-red-100 text-red-800',
  admin_message: 'bg-purple-100 text-purple-800',
  default: 'bg-gray-100 text-gray-800'
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  
  const supabase = createClient()

  // Pobierz powiadomienia
  const fetchNotifications = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setNotifications(data || [])
    } catch (error) {
      console.error('Błąd pobierania powiadomień:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  // Oznacz powiadomienie jako przeczytane
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      )
    } catch (error) {
      console.error('Błąd oznaczania powiadomienia:', error)
    }
  }, [supabase])

  // Oznacz wszystkie jako przeczytane
  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
      if (unreadIds.length === 0) return

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .in('id', unreadIds)

      if (error) throw error

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, read: true }))
      )
    } catch (error) {
      console.error('Błąd oznaczania wszystkich powiadomień:', error)
    }
  }, [notifications, supabase])

  // Realtime subscription
  useEffect(() => {
    fetchNotifications()

    // Subskrypcja Realtime
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications(prev => [newNotification, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchNotifications, supabase])

  const unreadCount = notifications.filter(n => !n.read).length
  const hasUnread = unreadCount > 0

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Powiadomienia</CardTitle>
            {hasUnread && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={markAllAsRead}
                className="text-xs"
              >
                <Check className="h-3 w-3 mr-1" />
                Oznacz wszystkie
              </Button>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Ładowanie powiadomień...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Brak powiadomień
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {notifications.map((notification, index) => {
                const IconComponent = notificationIcons[notification.type as keyof typeof notificationIcons] || notificationIcons.default
                const colorClass = notificationColors[notification.type as keyof typeof notificationColors] || notificationColors.default
                
                return (
                  <div key={notification.id}>
                    <DropdownMenuItem 
                      className="p-0 h-auto"
                      onSelect={(e) => {
                        e.preventDefault()
                        if (!notification.read) {
                          markAsRead(notification.id)
                        }
                      }}
                    >
                      <div className={`p-3 w-full ${!notification.read ? 'bg-blue-50' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className={`p-1 rounded-full ${colorClass}`}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <h4 className={`text-sm font-medium ${!notification.read ? 'font-semibold' : ''}`}>
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                              )}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              {formatDistanceToNow(new Date(notification.created_at), { 
                                addSuffix: true, 
                                locale: pl 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    
                    {index < notifications.length - 1 && <DropdownMenuSeparator />}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
