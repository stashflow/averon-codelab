import React from "react"
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { FaviconThemeSync } from '@/components/favicon-theme-sync'

import './globals.css'

export const metadata: Metadata = {
  title: 'Averon CodeLab | Professional Coding Education Platform',
  description: 'A professional coding education platform for schools. Teachers create assignments, students solve problems, and everyone learns together.',
  generator: 'v0.app',
  icons: {
    icon: '/icon',
    apple: '/icon',
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
          <FaviconThemeSync />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
