'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

export default function RouteToast() {
  const params = useSearchParams()

  useEffect(() => {
    const message = params.get('toast')
    if (!message) return

    try {
      toast.success(decodeURIComponent(message))
    } finally {
      const url = new URL(window.location.href)
      url.searchParams.delete('toast')
      window.history.replaceState(null, '', url.toString())
    }
  }, [params])

  return null
}


