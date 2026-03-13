ALTER TABLE public.student_sandboxes
  ADD COLUMN IF NOT EXISTS project_name text DEFAULT 'Class Sandbox Project';

ALTER TABLE public.student_sandboxes
  ADD COLUMN IF NOT EXISTS active_file text DEFAULT 'main.py';

ALTER TABLE public.student_sandboxes
  ADD COLUMN IF NOT EXISTS workspace_files jsonb DEFAULT jsonb_build_array(
    jsonb_build_object(
      'path', 'main.py',
      'content', $$classroom = "your classroom"

def greet(name: str) -> str:
    return f"Welcome to {classroom}, {name}!"

print(greet("Coder"))$$
    ),
    jsonb_build_object(
      'path', 'helpers.py',
      'content', $$def banner(title: str) -> str:
    return f"== {title} =="$$
    )
  );

UPDATE public.student_sandboxes
SET
  project_name = COALESCE(NULLIF(project_name, ''), 'Class Sandbox Project'),
  active_file = COALESCE(NULLIF(active_file, ''), entry_filename, 'main.py'),
  workspace_files = COALESCE(
    workspace_files,
    jsonb_build_array(
      jsonb_build_object('path', COALESCE(NULLIF(entry_filename, ''), 'main.py'), 'content', COALESCE(code, ''))
    )
  )
WHERE project_name IS NULL OR active_file IS NULL OR workspace_files IS NULL;
