import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { ReactNode } from 'react'

export function AppAlert({ action, children }: { action: ReactNode; children: ReactNode }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{children}</AlertTitle>
      <AlertDescription className="flex justify-end">{action}</AlertDescription>
    </Alert>
  )
}
