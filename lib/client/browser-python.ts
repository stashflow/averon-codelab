'use client'

export type BrowserPythonFile = {
  path: string
  content: string
}

export type BrowserPythonRunResult = {
  status: 'success' | 'error' | 'timeout'
  stdout: string
  stderr: string
  exitCode: number | null
  durationMs: number
  runtime: string
}

export type BrowserJudgeTestCase = {
  id: string
  name: string
  input: string
  expected: string
  hidden?: boolean
}

export type BrowserJudgeResultCase = {
  id: string
  name: string
  passed: boolean
  expected: string
  actual: string
  error?: string | null
}

export type BrowserJudgeResponse = {
  results: BrowserJudgeResultCase[]
}

export type BrowserPythonInteractiveCallbacks = {
  onStdout?: (chunk: string) => void
  onStderr?: (chunk: string) => void
  onInput?: (prompt: string) => string | null | Promise<string | null>
}

type PyodideInstance = {
  FS: {
    mkdirTree: (path: string) => void
    writeFile: (path: string, content: string) => void
    unlink: (path: string) => void
    rmdir: (path: string) => void
    readdir: (path: string) => string[]
    analyzePath: (path: string) => { exists: boolean; object?: { isFolder?: boolean } }
  }
  globals: {
    get: (name: string) => unknown
    set: (name: string, value: unknown) => void
  }
  runPythonAsync: (code: string) => Promise<unknown>
}

declare global {
  interface Window {
    loadPyodide?: (options: { indexURL: string }) => Promise<PyodideInstance>
    __averonPyodidePromise?: Promise<PyodideInstance>
  }
}

const PYODIDE_SCRIPT_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js'
const PYODIDE_ASSET_BASE_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'
const WORKSPACE_ROOT = '/home/pyodide/averon-workspace'

export function shouldUseBrowserPythonFallback(message: string): boolean {
  const normalizedMessage = String(message || '').toLowerCase()

  return (
    normalizedMessage.includes('sandbox runtime "python3" is not available on this server') ||
    normalizedMessage.includes('sandbox execution is not configured') ||
    normalizedMessage.includes('install python3 for local execution') ||
    normalizedMessage.includes('judge service is not configured') ||
    normalizedMessage.includes('local python judge') ||
    normalizedMessage.includes('python3')
  )
}

export async function runBrowserPythonProgram(input: {
  code: string
  stdin?: string
  files?: BrowserPythonFile[]
  entryFilename?: string
}): Promise<BrowserPythonRunResult> {
  const pyodide = await ensurePyodideLoaded()
  const startedAt = performance.now()
  const entryFilename = normalizeEntryFilename(input.entryFilename)
  const files = normalizeWorkspaceFiles(input.files, input.code, entryFilename)

  resetWorkspace(pyodide)
  writeWorkspaceFiles(pyodide, files)

  pyodide.globals.set('__averon_entry_filename', `${WORKSPACE_ROOT}/${entryFilename}`)
  pyodide.globals.set('__averon_stdin', String(input.stdin || ''))

  await pyodide.runPythonAsync(`
import builtins
import contextlib
import io
import os
import runpy
import sys
import traceback

_stdout_capture = io.StringIO()
_stderr_capture = io.StringIO()
_stdin_lines = __averon_stdin.splitlines()
_stdin_index = 0

def _averon_input(prompt=""):
    global _stdin_index
    if prompt:
        print(prompt, end="", file=_stdout_capture)
    if _stdin_index < len(_stdin_lines):
        value = _stdin_lines[_stdin_index]
        _stdin_index += 1
        return value
    raise EOFError("EOF when reading a line")

_original_cwd = os.getcwd()
_entry_dir = os.path.dirname(__averon_entry_filename)
_status = "success"

builtins.input = _averon_input
sys.path.insert(0, _entry_dir)

try:
    os.chdir(_entry_dir)
    with contextlib.redirect_stdout(_stdout_capture), contextlib.redirect_stderr(_stderr_capture):
        runpy.run_path(__averon_entry_filename, run_name="__main__")
except Exception:
    _status = "error"
    traceback.print_exc(file=_stderr_capture)
finally:
    os.chdir(_original_cwd)

__averon_status = _status
__averon_stdout = _stdout_capture.getvalue()
__averon_stderr = _stderr_capture.getvalue()
  `)

  return {
    status: readPyodideString(pyodide, '__averon_status') === 'success' ? 'success' : 'error',
    stdout: readPyodideString(pyodide, '__averon_stdout'),
    stderr: readPyodideString(pyodide, '__averon_stderr'),
    exitCode: null,
    durationMs: Math.round(performance.now() - startedAt),
    runtime: 'browser-python',
  }
}

export async function runInteractiveBrowserPythonProgram(
  input: {
    code: string
    files?: BrowserPythonFile[]
    entryFilename?: string
  } & BrowserPythonInteractiveCallbacks,
): Promise<BrowserPythonRunResult> {
  const pyodide = await ensurePyodideLoaded()
  const startedAt = performance.now()
  const entryFilename = normalizeEntryFilename(input.entryFilename)
  const files = normalizeWorkspaceFiles(input.files, input.code, entryFilename)
  let stdout = ''
  let stderr = ''

  const stdoutBridge = {
    write(chunk: unknown) {
      const text = String(chunk ?? '')
      if (!text) return
      stdout += text
      input.onStdout?.(text)
    },
  }

  const stderrBridge = {
    write(chunk: unknown) {
      const text = String(chunk ?? '')
      if (!text) return
      stderr += text
      input.onStderr?.(text)
    },
  }

  const inputBridge = async (prompt: unknown) => input.onInput?.(String(prompt ?? '')) ?? ''

  resetWorkspace(pyodide)
  writeWorkspaceFiles(pyodide, files)

  pyodide.globals.set('__averon_entry_filename', `${WORKSPACE_ROOT}/${entryFilename}`)
  pyodide.globals.set('__averon_stdout_bridge', stdoutBridge)
  pyodide.globals.set('__averon_stderr_bridge', stderrBridge)
  pyodide.globals.set('__averon_input_bridge', inputBridge)

  await pyodide.runPythonAsync(`
import builtins
import os
from pyodide.ffi import run_sync
import runpy
import sys
import traceback

class _AveronStream:
    def __init__(self, bridge):
        self.bridge = bridge

    def write(self, chunk):
        text = "" if chunk is None else str(chunk)
        if text:
            self.bridge.write(text)
        return len(text)

    def flush(self):
        return None

async def _averon_input_async(prompt=""):
    response = await __averon_input_bridge(str(prompt or ""))
    if response is None:
        raise EOFError("Input cancelled.")
    return str(response)

def _averon_input(prompt=""):
    return run_sync(_averon_input_async(prompt))

_original_stdout = sys.stdout
_original_stderr = sys.stderr
_original_input = builtins.input
_original_cwd = os.getcwd()
_entry_dir = os.path.dirname(__averon_entry_filename)
_status = "success"

sys.stdout = _AveronStream(__averon_stdout_bridge)
sys.stderr = _AveronStream(__averon_stderr_bridge)
builtins.input = _averon_input
sys.path.insert(0, _entry_dir)

try:
    os.chdir(_entry_dir)
    runpy.run_path(__averon_entry_filename, run_name="__main__")
except Exception:
    _status = "error"
    traceback.print_exc()
finally:
    builtins.input = _original_input
    sys.stdout = _original_stdout
    sys.stderr = _original_stderr
    os.chdir(_original_cwd)

__averon_status = _status
  `)

  return {
    status: readPyodideString(pyodide, '__averon_status') === 'success' ? 'success' : 'error',
    stdout,
    stderr,
    exitCode: null,
    durationMs: Math.round(performance.now() - startedAt),
    runtime: 'browser-python-live',
  }
}

export async function judgeBrowserPythonCode(input: {
  code: string
  tests: BrowserJudgeTestCase[]
  files?: BrowserPythonFile[]
  entryFilename?: string
}): Promise<BrowserJudgeResponse> {
  const pyodide = await ensurePyodideLoaded()
  const entryFilename = normalizeEntryFilename(input.entryFilename)
  const files = normalizeWorkspaceFiles(input.files, input.code, entryFilename)

  resetWorkspace(pyodide)
  writeWorkspaceFiles(pyodide, files)

  pyodide.globals.set('__averon_entry_filename', `${WORKSPACE_ROOT}/${entryFilename}`)
  pyodide.globals.set(
    '__averon_tests',
    input.tests.map((test) => ({
      id: test.id,
      name: test.name,
      input: String(test.input || ''),
      expected: String(test.expected || ''),
    })),
  )

  await pyodide.runPythonAsync(`
import builtins
import contextlib
import io
import json
import os
import runpy
import sys
import traceback
import types

def _parse_literal(raw):
    text = str(raw or "").strip()
    if not text:
        return ""
    try:
        return json.loads(text)
    except Exception:
        pass
    lowered = text.lower()
    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if lowered == "null":
        return None
    try:
        if "." in text:
            return float(text)
        return int(text)
    except Exception:
        return text

def _split_top_level(value):
    parts = []
    current = []
    depth = 0
    quote = None
    escaped = False

    for char in value:
        if escaped:
            current.append(char)
            escaped = False
            continue
        if char == "\\":
            current.append(char)
            escaped = True
            continue
        if quote:
            current.append(char)
            if char == quote:
                quote = None
            continue
        if char in ("'", '"'):
            quote = char
            current.append(char)
            continue
        if char in "[{(":
            depth += 1
            current.append(char)
            continue
        if char in "]})":
            depth = max(0, depth - 1)
            current.append(char)
            continue
        if char == "," and depth == 0:
            parts.append("".join(current).strip())
            current = []
            continue
        current.append(char)

    if "".join(current).strip():
        parts.append("".join(current).strip())
    return parts

def _parse_input_args(raw):
    text = str(raw or "").strip()
    if not text:
        return []
    parts = _split_top_level(text)
    if len(parts) == 1 and text.startswith("[") and text.endswith("]"):
        return [_parse_literal(text)]
    return [_parse_literal(part) for part in parts]

def _stringify_value(value):
    try:
        return json.dumps(value)
    except Exception:
        return str(value)

def _run_program_with_input(entry_filename, raw_input):
    stdout_capture = io.StringIO()
    stderr_capture = io.StringIO()
    stdin_lines = str(raw_input or "").splitlines()
    stdin_index = 0

    def _averon_input(prompt=""):
        nonlocal stdin_index
        if prompt:
            print(prompt, end="", file=stdout_capture)
        if stdin_index < len(stdin_lines):
            value = stdin_lines[stdin_index]
            stdin_index += 1
            return value
        raise EOFError("EOF when reading a line")

    original_input = builtins.input
    original_cwd = os.getcwd()
    entry_dir = os.path.dirname(entry_filename)

    try:
        builtins.input = _averon_input
        sys.path.insert(0, entry_dir)
        os.chdir(entry_dir)
        with contextlib.redirect_stdout(stdout_capture), contextlib.redirect_stderr(stderr_capture):
            runpy.run_path(entry_filename, run_name="__main__")
        return {
            "stdout": stdout_capture.getvalue().strip(),
            "stderr": stderr_capture.getvalue().strip(),
            "error": None,
        }
    except Exception:
        return {
            "stdout": stdout_capture.getvalue().strip(),
            "stderr": stderr_capture.getvalue().strip(),
            "error": traceback.format_exc(),
        }
    finally:
        builtins.input = original_input
        os.chdir(original_cwd)

results = []
namespace = {}
function_error = None
_original_cwd = os.getcwd()
_entry_dir = os.path.dirname(__averon_entry_filename)
try:
    sys.path.insert(0, _entry_dir)
    os.chdir(_entry_dir)
    exec(open(__averon_entry_filename, "r", encoding="utf-8").read(), namespace)
except Exception:
    function_error = traceback.format_exc()
finally:
    os.chdir(_original_cwd)

callable_items = []
if function_error is None:
    callable_items = [
        (name, value) for name, value in namespace.items()
        if isinstance(value, types.FunctionType) and not name.startswith("_")
    ]

for test in __averon_tests:
    if callable_items:
        fn_name, fn = callable_items[0]
        try:
            args = _parse_input_args(test.get("input"))
            expected = _parse_literal(test.get("expected"))
            actual = fn(*args)
            passed = actual == expected
            results.append({
                "id": test.get("id"),
                "name": test.get("name"),
                "passed": bool(passed),
                "expected": _stringify_value(expected),
                "actual": _stringify_value(actual),
                "error": None,
            })
        except Exception:
            results.append({
                "id": test.get("id"),
                "name": test.get("name"),
                "passed": False,
                "expected": str(test.get("expected") or ""),
                "actual": "",
                "error": traceback.format_exc(),
            })
    else:
        run = _run_program_with_input(__averon_entry_filename, test.get("input"))
        expected = str(test.get("expected") or "").strip()
        actual = str(run.get("stdout") or "").strip()
        results.append({
            "id": test.get("id"),
            "name": test.get("name"),
            "passed": run.get("error") is None and actual == expected,
            "expected": expected,
            "actual": actual,
            "error": run.get("error"),
        })

__averon_judge_results = json.dumps({"results": results})
  `)

  const raw = readPyodideString(pyodide, '__averon_judge_results')
  const parsed = JSON.parse(raw) as BrowserJudgeResponse
  return {
    results: Array.isArray(parsed.results) ? parsed.results : [],
  }
}

async function ensurePyodideLoaded(): Promise<PyodideInstance> {
  if (typeof window === 'undefined') {
    throw new Error('Browser Python fallback is only available in the browser.')
  }

  if (!window.__averonPyodidePromise) {
    window.__averonPyodidePromise = (async () => {
      if (!window.loadPyodide) {
        await loadExternalScript(PYODIDE_SCRIPT_URL)
      }

      if (!window.loadPyodide) {
        throw new Error('Unable to load the browser Python runtime.')
      }

      return window.loadPyodide({ indexURL: PYODIDE_ASSET_BASE_URL })
    })()
  }

  try {
    return await window.__averonPyodidePromise
  } catch (error) {
    window.__averonPyodidePromise = undefined
    throw error
  }
}

function normalizeEntryFilename(entryFilename?: string): string {
  const value = String(entryFilename || 'main.py').trim().replace(/^\/+/, '')
  return value || 'main.py'
}

function normalizeWorkspaceFiles(
  files: BrowserPythonFile[] | undefined,
  code: string,
  entryFilename: string,
): BrowserPythonFile[] {
  const validFiles = Array.isArray(files)
    ? files
        .map((file) => ({
          path: normalizeEntryFilename(file.path),
          content: String(file.content || ''),
        }))
        .filter((file) => file.path.endsWith('.py'))
    : []

  if (!validFiles.some((file) => file.path === entryFilename)) {
    validFiles.push({ path: entryFilename, content: code })
  }

  return validFiles
}

function writeWorkspaceFiles(pyodide: PyodideInstance, files: BrowserPythonFile[]) {
  pyodide.FS.mkdirTree(WORKSPACE_ROOT)

  files.forEach((file) => {
    const segments = file.path.split('/').filter(Boolean)
    const dirParts = segments.slice(0, -1)
    let currentPath = WORKSPACE_ROOT

    dirParts.forEach((part) => {
      currentPath = `${currentPath}/${part}`
      pyodide.FS.mkdirTree(currentPath)
    })

    pyodide.FS.writeFile(`${WORKSPACE_ROOT}/${file.path}`, file.content)
  })
}

function resetWorkspace(pyodide: PyodideInstance) {
  const existing = pyodide.FS.analyzePath(WORKSPACE_ROOT)
  if (!existing.exists) return
  removeWorkspaceNode(pyodide, WORKSPACE_ROOT)
}

function removeWorkspaceNode(pyodide: PyodideInstance, path: string) {
  const info = pyodide.FS.analyzePath(path)
  if (!info.exists) return

  if (info.object?.isFolder) {
    for (const child of pyodide.FS.readdir(path)) {
      if (child === '.' || child === '..') continue
      removeWorkspaceNode(pyodide, `${path}/${child}`)
    }
    pyodide.FS.rmdir(path)
    return
  }

  pyodide.FS.unlink(path)
}

async function loadExternalScript(src: string): Promise<void> {
  const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
  if (existingScript) {
    await waitForScript(existingScript)
    return
  }

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Unable to load the browser Python runtime.'))
    document.head.appendChild(script)
  })
}

async function waitForScript(script: HTMLScriptElement): Promise<void> {
  if (script.dataset.loaded === 'true') return

  await new Promise<void>((resolve, reject) => {
    const handleLoad = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    const handleError = () => reject(new Error('Unable to load the browser Python runtime.'))
    script.addEventListener('load', handleLoad, { once: true })
    script.addEventListener('error', handleError, { once: true })
  })
}

function readPyodideString(pyodide: PyodideInstance, key: string): string {
  const value = pyodide.globals.get(key)

  if (typeof value === 'string') {
    return value
  }

  if (value && typeof value === 'object' && 'toString' in value && typeof value.toString === 'function') {
    return value.toString()
  }

  return value == null ? '' : String(value)
}
