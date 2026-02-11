import React from "react"
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'

import './globals.css'

export const metadata: Metadata = {
  title: 'Averon CodeLab | Professional Coding Education Platform',
  description: 'A professional coding education platform for schools. Teachers create assignments, students solve problems, and everyone learns together.',
  generator: 'v0.app',
  icons: {
    icon: '/ACL.png',
    apple: '/ACL.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
