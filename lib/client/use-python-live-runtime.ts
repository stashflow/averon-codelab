'use client'

import { useState } from 'react'

import {
  runInteractiveBrowserPythonProgram,
  type BrowserPythonFile,
  type BrowserPythonRunResult,
} from '@/lib/client/browser-python'

type RunProgramInput = {
  code: string
  entryFilename?: string
  files?: BrowserPythonFile[]
}

export function usePythonLiveRuntime() {
  const [running, setRunning] = useState(false)
  const [terminalOutput, setTerminalOutput] = useState('')
  const [runtimeError, setRuntimeError] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<BrowserPythonRunResult | null>(null)

  async function runProgram(input: RunProgramInput): Promise<BrowserPythonRunResult | null> {
    setRunning(true)
    setRuntimeError(null)
    setTerminalOutput('')

    try {
      const result = await runInteractiveBrowserPythonProgram({
        ...input,
        onStdout: (chunk) => {
          setTerminalOutput((current) => current + chunk)
        },
        onStderr: (chunk) => {
          setTerminalOutput((current) => current + chunk)
        },
        onInput: (prompt) => {
          const message = prompt?.trim() ? prompt : 'Program input'
          const value = window.prompt(message, '')
          if (value === null) {
            setTerminalOutput((current) => current + `${prompt || ''}[input cancelled]\n`)
            return null
          }
          setTerminalOutput((current) => current + `${prompt || ''}${value}\n`)
          return value
        },
      })

      setLastResult(result)
      return result
    } catch (error: any) {
      const message = error?.message || 'Unable to run Python in the browser.'
      setRuntimeError(message)
      setLastResult({
        status: 'error',
        stdout: '',
        stderr: message,
        exitCode: null,
        durationMs: 0,
        runtime: 'browser-python-live',
      })
      return null
    } finally {
      setRunning(false)
    }
  }

  function clearTerminal() {
    setTerminalOutput('')
    setRuntimeError(null)
    setLastResult(null)
  }

  return {
    running,
    terminalOutput,
    runtimeError,
    lastResult,
    runProgram,
    clearTerminal,
  }
}
