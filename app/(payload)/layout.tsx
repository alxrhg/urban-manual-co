/* Payload admin layout */
import '@payloadcms/next/css'
import './custom.scss'

export const dynamic = 'force-dynamic'

export default function PayloadLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
