'use client'

import { useRef, useState } from 'react'

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
  const [pendingInputPrompt, setPendingInputPrompt] = useState<string | null>(null)
  const [pendingInputValue, setPendingInputValue] = useState('')
  const [waitingForInput, setWaitingForInput] = useState(false)
  const pendingResolverRef = useRef<((value: string | null) => void) | null>(null)

  async function runProgram(input: RunProgramInput): Promise<BrowserPythonRunResult | null> {
    setRunning(true)
    setRuntimeError(null)
    setTerminalOutput('')
    setPendingInputPrompt(null)
    setPendingInputValue('')
    setWaitingForInput(false)

    try {
      const result = await runInteractiveBrowserPythonProgram({
        ...input,
        onStdout: (chunk) => {
          setTerminalOutput((current) => current + chunk)
        },
        onStderr: (chunk) => {
          setTerminalOutput((current) => current + chunk)
        },
        onInput: (prompt) =>
          new Promise<string | null>((resolve) => {
            setPendingInputPrompt(prompt || '')
            setPendingInputValue('')
            setWaitingForInput(true)
            pendingResolverRef.current = (value) => {
              setWaitingForInput(false)
              setPendingInputPrompt(null)
              setPendingInputValue('')
              setTerminalOutput((current) => current + `${prompt || ''}${value ?? '[input cancelled]'}\n`)
              resolve(value)
            }
          }),
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
      pendingResolverRef.current = null
      setWaitingForInput(false)
      setRunning(false)
    }
  }

  function submitInput() {
    const resolver = pendingResolverRef.current
    if (!resolver) return
    pendingResolverRef.current = null
    resolver(pendingInputValue)
  }

  function cancelInput() {
    const resolver = pendingResolverRef.current
    if (!resolver) return
    pendingResolverRef.current = null
    resolver(null)
  }

  function clearTerminal() {
    setTerminalOutput('')
    setRuntimeError(null)
    setLastResult(null)
    setPendingInputPrompt(null)
    setPendingInputValue('')
    setWaitingForInput(false)
  }

  return {
    running,
    terminalOutput,
    runtimeError,
    lastResult,
    pendingInputPrompt,
    pendingInputValue,
    waitingForInput,
    runProgram,
    clearTerminal,
    submitInput,
    cancelInput,
    setPendingInputValue,
  }
}
