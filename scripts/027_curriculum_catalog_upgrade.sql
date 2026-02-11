-- Comprehensive curriculum catalog upgrade for Averon CodeLab
-- Scope: ONLY the six courses requested by product direction
-- Idempotent: safe to re-run

BEGIN;

-- Compatibility columns for mixed schema states
ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS unit_number INTEGER,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS lesson_number INTEGER,
  ADD COLUMN IF NOT EXISTS lesson_type TEXT DEFAULT 'coding',
  ADD COLUMN IF NOT EXISTS content_data JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS content_body TEXT,
  ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'interactive';

-- Core catalog courses (do not touch courses outside this list)
INSERT INTO public.courses (
  id, name, description, language, level, difficulty_level, estimated_hours,
  icon_name, color, is_active
)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'Python Fundamentals',
    'Structured introduction to programming and computational reasoning with progressive independence, pattern deduction, and applied Python system design.',
    'python', 'beginner', 'beginner', 30, 'Code', 'cyan', true
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'JavaScript Essentials',
    'Modern browser programming with DOM-driven architecture, event systems, async workflows, and production-style interactive application development.',
    'javascript', 'beginner', 'beginner', 35, 'Code', 'yellow', true
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'Java Programming',
    'Engineering-focused object-oriented Java pathway emphasizing modular design, algorithmic reasoning, maintainable architecture, and refactoring discipline.',
    'java', 'intermediate', 'intermediate', 50, 'Code', 'orange', true
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'C++ Mastery',
    'Advanced systems-aware C++ curriculum with memory semantics, pointer rigor, STL depth, recursion, and performance engineering.',
    'cpp', 'advanced', 'advanced', 60, 'Code', 'blue', true
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    'AP Computer Science A (Java)',
    'College-level AP-aligned Java pathway with exam-style tracing, FRQ simulation, timed reasoning, and written technical justification.',
    'java', 'advanced', 'advanced', 80, 'GraduationCap', 'red', true
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    'Intro to Software & Technology',
    'Applied technology literacy covering hardware, systems, networking, cybersecurity, data, and automation in real institutional contexts.',
    'technology', 'beginner', 'beginner', 40, 'Database', 'green', true
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  level = EXCLUDED.level,
  difficulty_level = EXCLUDED.difficulty_level,
  estimated_hours = EXCLUDED.estimated_hours,
  icon_name = EXCLUDED.icon_name,
  color = EXCLUDED.color,
  is_active = EXCLUDED.is_active;

-- Rebuild only targeted courses
DELETE FROM public.checkpoints
WHERE lesson_id IN (
  SELECT l.id
  FROM public.lessons l
  JOIN public.units u ON u.id = l.unit_id
  WHERE u.course_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006'
  )
);

DELETE FROM public.lessons
WHERE unit_id IN (
  SELECT id FROM public.units
  WHERE course_id IN (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000006'
  )
);

DELETE FROM public.units
WHERE course_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000006'
);

WITH unit_seed_raw(course_id, unit_number, title, description) AS (
  VALUES
  -- Intro to Software & Technology (40h)
  ('00000000-0000-0000-0000-000000000006', 1, 'Computing Systems in Context', 'Foundational systems model, decomposition, and context-aware technology reasoning.'),
  ('00000000-0000-0000-0000-000000000006', 2, 'Hardware Architecture and Performance', 'CPU, memory, storage, throughput, bottlenecks, and evidence-driven device choices.'),
  ('00000000-0000-0000-0000-000000000006', 3, 'Operating Systems and Software Layers', 'Services, process lifecycle, permissions, and reliability-focused troubleshooting.'),
  ('00000000-0000-0000-0000-000000000006', 4, 'Networking and Internet Protocols', 'Packet flow, addressing, DNS, web protocols, and network diagnostics.'),
  ('00000000-0000-0000-0000-000000000006', 5, 'Data Storage and Database Foundations', 'Structured vs unstructured storage, schema design, querying, and integrity.'),
  ('00000000-0000-0000-0000-000000000006', 6, 'Cybersecurity and Risk Mitigation', 'Threat models, controls, authentication, encryption, and incident response basics.'),
  ('00000000-0000-0000-0000-000000000006', 7, 'Automation and Operational Workflows', 'Repeatable workflows, automation logic, and process quality measurement.'),
  ('00000000-0000-0000-0000-000000000006', 8, 'Technology Operations Capstone', 'Integrated real-world system analysis and architecture recommendations.'),

  -- Python Fundamentals (30h)
  ('00000000-0000-0000-0000-000000000001', 1, 'Variables, State, and Program Flow', 'Memory model, data representation, and deterministic execution basics.'),
  ('00000000-0000-0000-0000-000000000001', 2, 'Conditionals and Logical Branching', 'Boolean logic, branch design, and confidence in path-based reasoning.'),
  ('00000000-0000-0000-0000-000000000001', 3, 'Loops, Lists, and Iteration Patterns', 'Repetition patterns, data traversal, and aggregation strategies.'),
  ('00000000-0000-0000-0000-000000000001', 4, 'Functions, Modularity, and Debugging', 'Decomposition, reusable abstractions, and disciplined debugging workflow.'),
  ('00000000-0000-0000-0000-000000000001', 5, 'Applied Python Projects', 'Decision game and data analysis mini-system construction.'),
  ('00000000-0000-0000-0000-000000000001', 6, 'Independent System Design Studio', 'From guided implementation to autonomous architecture choices.'),

  -- JavaScript Essentials (35h)
  ('00000000-0000-0000-0000-000000000002', 1, 'JavaScript Runtime Foundations', 'Values, expressions, control logic, and reliable execution traces.'),
  ('00000000-0000-0000-0000-000000000002', 2, 'DOM Modeling and UI State', 'Structured document updates and predictable UI state transitions.'),
  ('00000000-0000-0000-0000-000000000002', 3, 'Events and Interaction Patterns', 'Event-driven logic, validation flow, and interactive behavior design.'),
  ('00000000-0000-0000-0000-000000000002', 4, 'Arrays, Objects, and Function Scope', 'Data structures, object composition, closures, and modular function patterns.'),
  ('00000000-0000-0000-0000-000000000002', 5, 'Asynchronous JavaScript', 'Promises, async/await, API calls, and resilient error handling.'),
  ('00000000-0000-0000-0000-000000000002', 6, 'Application Architecture', 'Feature decomposition, component contracts, and maintainable front-end structure.'),
  ('00000000-0000-0000-0000-000000000002', 7, 'Interactive Web App Capstone', 'Production-style delivery of a complete browser application.'),

  -- Java Programming (50h)
  ('00000000-0000-0000-0000-000000000003', 1, 'Java Core Syntax and Control Structures', 'Typed programming foundations and deterministic control flow.'),
  ('00000000-0000-0000-0000-000000000003', 2, 'Methods and Program Organization', 'Contract-driven method design and reliable decomposition.'),
  ('00000000-0000-0000-0000-000000000003', 3, 'Classes, Objects, and Encapsulation', 'Object design discipline and class-level invariants.'),
  ('00000000-0000-0000-0000-000000000003', 4, 'Inheritance and Polymorphism', 'Abstraction layering and behavior extension patterns.'),
  ('00000000-0000-0000-0000-000000000003', 5, 'Collections and Structured Data', 'List/Map/Set reasoning and implementation tradeoffs.'),
  ('00000000-0000-0000-0000-000000000003', 6, 'Algorithm Tracing and Efficiency', 'Complexity intuition, tracing rigor, and optimization decisions.'),
  ('00000000-0000-0000-0000-000000000003', 7, 'Refactoring and Maintainability', 'Code quality, testability, and architecture improvement cycles.'),
  ('00000000-0000-0000-0000-000000000003', 8, 'Systems Simulation Capstone', 'Banking/library/student-system simulation with modular architecture.'),

  -- AP Computer Science A (80h)
  ('00000000-0000-0000-0000-000000000005', 1, 'AP Java Foundations and Review', 'Core AP Java syntax, reasoning, and precision refresh.'),
  ('00000000-0000-0000-0000-000000000005', 2, 'Classes and Constructors', 'AP class construction patterns and method contracts.'),
  ('00000000-0000-0000-0000-000000000005', 3, 'Control Structures and Tracing', 'Exam-aligned branch/loop tracing under timed conditions.'),
  ('00000000-0000-0000-0000-000000000005', 4, 'Arrays and ArrayLists', 'AP data structure patterns with algorithmic updates.'),
  ('00000000-0000-0000-0000-000000000005', 5, 'Two-Dimensional Arrays', 'Traversal strategies and matrix reasoning.'),
  ('00000000-0000-0000-0000-000000000005', 6, 'Inheritance and Polymorphism', 'AP object hierarchies and dynamic dispatch clarity.'),
  ('00000000-0000-0000-0000-000000000005', 7, 'Recursion and Recursive Analysis', 'Recursive decomposition, base-case discipline, and trace rigor.'),
  ('00000000-0000-0000-0000-000000000005', 8, 'FRQ Development Studio', 'Structured AP free-response writing and coding performance.'),
  ('00000000-0000-0000-0000-000000000005', 9, 'Timed MCQ and Trace Intensive', 'Exam-speed analysis with error taxonomy and correction cycles.'),
  ('00000000-0000-0000-0000-000000000005', 10, 'Full Exam Simulation and Defense', 'End-to-end AP simulation with written technical explanations.'),

  -- C++ Mastery (60h)
  ('00000000-0000-0000-0000-000000000004', 1, 'C++ Toolchain and Execution Model', 'Compilation pipeline, static typing, and runtime behavior.'),
  ('00000000-0000-0000-0000-000000000004', 2, 'Memory Model: Stack, Heap, Lifetime', 'Allocation semantics, object lifetime, and memory safety.'),
  ('00000000-0000-0000-0000-000000000004', 3, 'Pointers, References, and Ownership', 'Pointer correctness, reference semantics, and safe ownership.'),
  ('00000000-0000-0000-0000-000000000004', 4, 'STL and Generic Algorithm Patterns', 'Containers, iterators, and algorithmic composition.'),
  ('00000000-0000-0000-0000-000000000004', 5, 'Linked Structures and Custom Containers', 'Node-level data structures and custom container design.'),
  ('00000000-0000-0000-0000-000000000004', 6, 'Recursion, Trees, and Backtracking', 'Advanced decomposition strategies and recursive performance.'),
  ('00000000-0000-0000-0000-000000000004', 7, 'Profiling and Performance Engineering', 'Measurement-driven optimization and refactoring tradeoffs.'),
  ('00000000-0000-0000-0000-000000000004', 8, 'Command-Line File Analyzer Capstone', 'Systems-style capstone with robust parsing and performance constraints.')
),
unit_seed AS (
  SELECT
    course_id::uuid AS course_id,
    unit_number,
    title,
    description
  FROM unit_seed_raw
),
insert_units AS (
  INSERT INTO public.units (
    id, course_id, unit_number, title, description, is_published, order_index
  )
  SELECT
    (
      substr(md5(course_id || ':unit:' || unit_number::text), 1, 8) || '-' ||
      substr(md5(course_id || ':unit:' || unit_number::text), 9, 4) || '-' ||
      substr(md5(course_id || ':unit:' || unit_number::text), 13, 4) || '-' ||
      substr(md5(course_id || ':unit:' || unit_number::text), 17, 4) || '-' ||
      substr(md5(course_id || ':unit:' || unit_number::text), 21, 12)
    )::uuid,
    course_id,
    unit_number,
    title,
    description,
    true,
    unit_number
  FROM unit_seed
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    unit_number = EXCLUDED.unit_number,
    is_published = EXCLUDED.is_published,
    order_index = EXCLUDED.order_index
  RETURNING id
),
lesson_seed_raw(course_id, unit_number, lesson_number, title, method, minutes, summary, assessment_focus) AS (
  VALUES
  -- Intro to Software & Technology
  ('00000000-0000-0000-0000-000000000006',1,1,'Progressive Reveal: System Thinking Foundations','progressive_reveal',45,'Compute systems as interacting components with clear boundaries and dependencies.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',1,2,'Output-Only Challenge: Diagnose the Black Box','output_challenge',45,'Infer internal system behavior from constrained input-output traces.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000006',1,3,'Single-Problem Depth: School Device Checkout Workflow','single_problem_depth',50,'Evolve one operational workflow from naive process to robust system design.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000006',2,1,'Progressive Reveal: CPU, RAM, Storage Roles','progressive_reveal',45,'Understand where performance limits emerge and how resource bottlenecks compound.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',2,2,'Minimalist IDE-First Lab: Benchmark Interpretation','minimalist_ide',45,'Read and reason from performance measurements with concise evidence-based claims.','coding_validation'),
  ('00000000-0000-0000-0000-000000000006',2,3,'Output-Only Challenge: Hardware Tradeoff Inference','output_challenge',50,'Choose hardware profiles by interpreting observed workload outputs only.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000006',3,1,'Progressive Reveal: OS Layers and Process Lifecycle','progressive_reveal',45,'Map application, service, and kernel responsibilities with operational clarity.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',3,2,'Single-Problem Depth: App Crash Incident Analysis','single_problem_depth',50,'Iteratively harden a failing deployment using logs and process-level evidence.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000006',3,3,'Minimalist IDE-First Lab: Permission Model Simulation','minimalist_ide',45,'Apply least-privilege reasoning to service and user permission boundaries.','coding_validation'),
  ('00000000-0000-0000-0000-000000000006',4,1,'Progressive Reveal: Packets, Routing, and DNS','progressive_reveal',45,'Build layered understanding of network requests from endpoint to endpoint.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',4,2,'Output-Only Challenge: Network Failure Pattern Deduction','output_challenge',50,'Infer root cause from latency, trace route, and request failure outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000006',4,3,'Single-Problem Depth: Resilient School Network Plan','single_problem_depth',55,'Architect a fault-tolerant network design across staged constraints.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000006',5,1,'Progressive Reveal: Data Models and Schema Quality','progressive_reveal',45,'Develop schema decisions grounded in integrity and query requirements.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',5,2,'Minimalist IDE-First Lab: Query Accuracy Sprint','minimalist_ide',45,'Write concise, correct queries against authentic school data scenarios.','coding_validation'),
  ('00000000-0000-0000-0000-000000000006',5,3,'Output-Only Challenge: Data Integrity Bug Hunt','output_challenge',50,'Infer schema flaws from inconsistent query outputs and anomalies.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000006',6,1,'Progressive Reveal: Threat Models and Controls','progressive_reveal',45,'Model attacker paths and map practical control layers.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',6,2,'Output-Only Challenge: Breach Signature Interpretation','output_challenge',50,'Identify probable threat vectors from forensic output patterns.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000006',6,3,'Single-Problem Depth: Incident Response Playbook','single_problem_depth',55,'Harden response protocol through staged incident escalation scenarios.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000006',7,1,'Minimalist IDE-First Lab: Workflow Automation Rules','minimalist_ide',45,'Implement rule-driven automation with clear triggers and safeguards.','coding_validation'),
  ('00000000-0000-0000-0000-000000000006',7,2,'Progressive Reveal: Reliability Metrics and SLAs','progressive_reveal',45,'Quantify process quality using measurable service objectives.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000006',7,3,'Single-Problem Depth: Attendance Alert Automation','single_problem_depth',55,'Evolve a brittle automation into maintainable institutional workflow.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000006',8,1,'Capstone Stage 1: System Audit and Constraints','progressive_reveal',50,'Analyze full-stack school technology operations and define constraints.','milestone_completion'),
  ('00000000-0000-0000-0000-000000000006',8,2,'Capstone Stage 2: Architecture Proposal and Tradeoffs','single_problem_depth',55,'Produce structured modernization plan with risk and cost tradeoffs.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000006',8,3,'Capstone Stage 3: Technical Defense and Reflection','minimalist_ide',55,'Defend design decisions using data, clarity, and operational realism.','written_explanation'),

  -- Python Fundamentals
  ('00000000-0000-0000-0000-000000000001',1,1,'Progressive Reveal: Variables and Memory Semantics','progressive_reveal',40,'Build precise mental model of variables, assignment, and state mutation.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000001',1,2,'Output-Only Challenge: State Transition Deductions','output_challenge',40,'Infer hidden logic from sequence transformations and outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000001',1,3,'Minimalist IDE-First: Fluency Drill Set A','minimalist_ide',45,'Rapid coding drills for variables, expressions, and console output fluency.','coding_validation'),
  ('00000000-0000-0000-0000-000000000001',2,1,'Progressive Reveal: Conditional Logic Architecture','progressive_reveal',40,'Compose robust branch logic from simple decision primitives.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000001',2,2,'Output-Only Challenge: Branch Path Reconstruction','output_challenge',40,'Deduce branching structure from observed inputs and outputs only.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000001',2,3,'Single-Problem Depth: Eligibility Rules Engine','single_problem_depth',50,'Iteratively extend one conditional system across real policy constraints.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000001',3,1,'Progressive Reveal: Lists and Iteration Strategies','progressive_reveal',40,'Master traversal, filtering, transformation, and accumulation patterns.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000001',3,2,'Minimalist IDE-First: Loop Fluency Sprint','minimalist_ide',45,'High-repetition iteration drills with strict correctness requirements.','coding_validation'),
  ('00000000-0000-0000-0000-000000000001',3,3,'Output-Only Challenge: Pattern Extraction Pipeline','output_challenge',45,'Reverse-engineer list-processing algorithm from result signatures.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000001',4,1,'Progressive Reveal: Function Contracts and Scope','progressive_reveal',40,'Design clear function boundaries with explicit inputs and outputs.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000001',4,2,'Minimalist IDE-First: Debugging Workflow Lab','minimalist_ide',45,'Use disciplined trace-debug-fix cycles to resolve defects efficiently.','coding_validation'),
  ('00000000-0000-0000-0000-000000000001',4,3,'Single-Problem Depth: Script-to-Module Refactor','single_problem_depth',50,'Refactor a monolithic script into cohesive modular architecture.','refactoring_exercise'),
  ('00000000-0000-0000-0000-000000000001',5,1,'Single-Problem Depth: Text Adventure Engine','single_problem_depth',50,'Build staged text decision game with branching, state, and replayability.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000001',5,2,'Minimalist IDE-First: Data Analysis Mini-Lab','minimalist_ide',45,'Implement summary statistics and data insights from small datasets.','coding_validation'),
  ('00000000-0000-0000-0000-000000000001',5,3,'Output-Only Challenge: Pattern Deduction Suite','output_challenge',45,'Infer transformation logic from structured dataset outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000001',6,1,'Capstone Stage 1: Problem Framing and Decomposition','progressive_reveal',45,'Translate open-ended prompt into structured modules and milestones.','milestone_completion'),
  ('00000000-0000-0000-0000-000000000001',6,2,'Capstone Stage 2: Independent Build Sprint','minimalist_ide',50,'Deliver working Python mini-system with reduced scaffolding and tests.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000001',6,3,'Capstone Stage 3: Technical Reflection and Defense','single_problem_depth',45,'Defend architecture, tradeoffs, and debugging decisions in writing.','written_explanation'),

  -- JavaScript Essentials
  ('00000000-0000-0000-0000-000000000002',1,1,'Progressive Reveal: JavaScript Value and Type Model','progressive_reveal',40,'Understand value categories, coercion boundaries, and execution predictability.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',1,2,'Output-Only Challenge: Logic from Runtime Outputs','output_challenge',40,'Infer control flow from printed state transitions and outcomes.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000002',1,3,'Minimalist IDE-First: JS Fluency Drill Set','minimalist_ide',45,'Fast iteration on expressions, branching, and function calls.','coding_validation'),
  ('00000000-0000-0000-0000-000000000002',2,1,'Progressive Reveal: DOM Tree and Rendering Semantics','progressive_reveal',40,'Model DOM as structured state and reason about deterministic updates.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',2,2,'Minimalist IDE-First: DOM Manipulation Sprint','minimalist_ide',45,'Build concise UI update routines with strict behavior checks.','coding_validation'),
  ('00000000-0000-0000-0000-000000000002',2,3,'Single-Problem Depth: Stateful Dashboard Widget','single_problem_depth',50,'Evolve one widget through increasingly complex state transitions.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000002',3,1,'Progressive Reveal: Event Flow and Handler Design','progressive_reveal',40,'Design robust interaction pipelines from user action to state change.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',3,2,'Output-Only Challenge: Event Sequence Reconstruction','output_challenge',45,'Derive hidden event rules from interaction/output traces.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000002',3,3,'Single-Problem Depth: Form Validation Engine','single_problem_depth',50,'Refine validation system across escalating UX and correctness constraints.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000002',4,1,'Progressive Reveal: Arrays, Objects, and Scope','progressive_reveal',40,'Compose reliable data models and scoped behavior modules.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',4,2,'Minimalist IDE-First: Closure and Scope Drills','minimalist_ide',45,'Fluent implementation of function scope and closure patterns.','coding_validation'),
  ('00000000-0000-0000-0000-000000000002',4,3,'Output-Only Challenge: Data Model Inference','output_challenge',45,'Infer object structure from transformation outputs and usage signatures.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000002',5,1,'Progressive Reveal: Async Control Flow','progressive_reveal',40,'Build robust promise and async/await sequencing strategies.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',5,2,'Minimalist IDE-First: API Resilience Lab','minimalist_ide',45,'Implement fetch, retries, and structured async error handling.','coding_validation'),
  ('00000000-0000-0000-0000-000000000002',5,3,'Output-Only Challenge: Async Bug Pattern Diagnosis','output_challenge',45,'Diagnose race and timing issues from logs and output behavior.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000002',6,1,'Single-Problem Depth: Feature Decomposition','single_problem_depth',50,'Evolve one feature from prototype to maintainable module architecture.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000002',6,2,'Progressive Reveal: State, Persistence, and Integrity','progressive_reveal',45,'Integrate local persistence with state consistency constraints.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000002',6,3,'Minimalist IDE-First: Refactor and Stabilize','minimalist_ide',45,'Refactor for readability, testability, and predictable runtime behavior.','refactoring_exercise'),
  ('00000000-0000-0000-0000-000000000002',7,1,'Capstone Stage 1: Product Definition and Milestones','progressive_reveal',45,'Plan and scope task manager, quiz app, or budget tracker build.','milestone_completion'),
  ('00000000-0000-0000-0000-000000000002',7,2,'Capstone Stage 2: Full Interactive Build','single_problem_depth',55,'Ship complete interactive web app with data flow and async behaviors.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000002',7,3,'Capstone Stage 3: Demo and Technical Defense','minimalist_ide',50,'Present architecture, tradeoffs, and independent implementation strategy.','written_explanation'),

  -- Java Programming
  ('00000000-0000-0000-0000-000000000003',1,1,'Progressive Reveal: Java Types and Flow','progressive_reveal',45,'Develop precision with typed logic, operators, and branching semantics.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000003',1,2,'Output-Only Challenge: Trace the Program','output_challenge',45,'Reconstruct control paths from compiled output behavior.','code_tracing'),
  ('00000000-0000-0000-0000-000000000003',1,3,'Minimalist IDE-First: Syntax Fluency Set','minimalist_ide',50,'Fast-paced coding fluency on foundational Java constructs.','coding_validation'),
  ('00000000-0000-0000-0000-000000000003',2,1,'Progressive Reveal: Methods and Contracts','progressive_reveal',45,'Design reusable methods with clear preconditions and postconditions.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000003',2,2,'Minimalist IDE-First: Method Design Lab','minimalist_ide',50,'Build and test method libraries with strict input/output expectations.','coding_validation'),
  ('00000000-0000-0000-0000-000000000003',2,3,'Single-Problem Depth: Service Method Pipeline','single_problem_depth',55,'Evolve one workflow through layered methods and validation branches.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000003',3,1,'Progressive Reveal: Encapsulation Discipline','progressive_reveal',45,'Use private state and public methods to maintain class invariants.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000003',3,2,'Output-Only Challenge: Object State Inference','output_challenge',45,'Infer hidden object transitions from API outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000003',3,3,'Single-Problem Depth: Domain Model Evolution','single_problem_depth',55,'Iteratively harden domain model under changing requirements.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000003',4,1,'Progressive Reveal: Inheritance and Polymorphism','progressive_reveal',45,'Build and reason about abstraction hierarchies and behavior override.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000003',4,2,'Output-Only Challenge: Dynamic Dispatch Tracing','output_challenge',45,'Determine runtime method binding from observed outputs.','code_tracing'),
  ('00000000-0000-0000-0000-000000000003',4,3,'Minimalist IDE-First: Interface Implementation Sprint','minimalist_ide',50,'Implement polymorphic interfaces with clean substitution behavior.','coding_validation'),
  ('00000000-0000-0000-0000-000000000003',5,1,'Progressive Reveal: Collections and Data Access Patterns','progressive_reveal',45,'Use collections intentionally for lookup, ordering, and updates.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000003',5,2,'Minimalist IDE-First: Collection Transformations','minimalist_ide',50,'Implement structured transformations over realistic datasets.','coding_validation'),
  ('00000000-0000-0000-0000-000000000003',5,3,'Output-Only Challenge: Collection Bug Forensics','output_challenge',45,'Infer data-structure misuse from program output anomalies.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000003',6,1,'Progressive Reveal: Complexity and Efficiency','progressive_reveal',45,'Reason about runtime cost and optimization opportunities.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000003',6,2,'Output-Only Challenge: Trace and Optimize','output_challenge',45,'Use traces to identify wasteful loops and operations.','code_tracing'),
  ('00000000-0000-0000-0000-000000000003',6,3,'Single-Problem Depth: Performance-Constrained Feature','single_problem_depth',55,'Improve feature throughput without sacrificing correctness.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000003',7,1,'Minimalist IDE-First: Refactoring Code Smells','minimalist_ide',50,'Apply systematic refactors for readability and extensibility.','refactoring_exercise'),
  ('00000000-0000-0000-0000-000000000003',7,2,'Progressive Reveal: Testability and Verification','progressive_reveal',45,'Design for testability with strong method and class boundaries.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000003',7,3,'Single-Problem Depth: Legacy Module Rehabilitation','single_problem_depth',55,'Rescue a brittle codebase through staged architecture improvements.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000003',8,1,'Capstone Stage 1: Domain Design (Banking/Library/SIS)','progressive_reveal',50,'Define bounded domain model and data flow architecture.','milestone_completion'),
  ('00000000-0000-0000-0000-000000000003',8,2,'Capstone Stage 2: System Build and Validation','single_problem_depth',60,'Implement maintainable system with modular services and validation.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000003',8,3,'Capstone Stage 3: Refactor, Benchmark, Defend','minimalist_ide',55,'Demonstrate maintainability, efficiency, and design rationale.','written_explanation'),

  -- AP Computer Science A
  ('00000000-0000-0000-0000-000000000005',1,1,'Progressive Reveal: AP Java Foundation Refresh','progressive_reveal',50,'Re-establish AP baseline in syntax, methods, and class design patterns.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',1,2,'Output-Only Challenge: AP Trace Reconstruction','output_challenge',50,'Infer algorithm behavior strictly from sample AP-style output.','code_tracing'),
  ('00000000-0000-0000-0000-000000000005',1,3,'Timed Drill: Core AP Fluency','minimalist_ide',55,'Timed coding routines to increase accuracy under exam pressure.','time_based_reasoning'),
  ('00000000-0000-0000-0000-000000000005',2,1,'Progressive Reveal: Constructors and State Integrity','progressive_reveal',50,'Model robust object initialization and invariants.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',2,2,'Single-Problem Depth: AP Class FRQ Build','single_problem_depth',55,'Evolve one AP class-response problem through increasing constraints.','frq_simulation'),
  ('00000000-0000-0000-0000-000000000005',2,3,'Written Justification: Constructor Design','minimalist_ide',45,'Explain object state decisions with AP scoring language.','written_explanation'),
  ('00000000-0000-0000-0000-000000000005',3,1,'Progressive Reveal: Control Structures at AP Depth','progressive_reveal',50,'Formal reasoning over loops, conditionals, and nested flows.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',3,2,'Timed Output-Only Trace: Branch and Loop','output_challenge',50,'Solve AP-style trace sets under strict time constraints.','time_based_reasoning'),
  ('00000000-0000-0000-0000-000000000005',3,3,'FRQ Segment Practice: Control Logic','single_problem_depth',55,'Implement AP FRQ control logic with rubric-based feedback.','frq_simulation'),
  ('00000000-0000-0000-0000-000000000005',4,1,'Progressive Reveal: Arrays and ArrayLists','progressive_reveal',50,'Master indexing, traversal, mutation, and boundary handling.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',4,2,'Output-Only Challenge: Sequence Mutation Inference','output_challenge',50,'Infer list/array algorithm from final-state outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000005',4,3,'Minimalist IDE-First: AP Array Coding Set','minimalist_ide',55,'Write compact, correct AP-style array routines rapidly.','coding_validation'),
  ('00000000-0000-0000-0000-000000000005',5,1,'Progressive Reveal: 2D Array Traversal Patterns','progressive_reveal',50,'Reason through matrix iteration and index strategy selection.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',5,2,'Output-Only Challenge: Matrix Rule Deduction','output_challenge',50,'Infer traversal order and transformation rules from matrix outputs.','code_tracing'),
  ('00000000-0000-0000-0000-000000000005',5,3,'FRQ Simulation: 2D Array Free Response','single_problem_depth',55,'Complete AP-style matrix FRQ with rubric-aligned response quality.','frq_simulation'),
  ('00000000-0000-0000-0000-000000000005',6,1,'Progressive Reveal: Inheritance and Polymorphism','progressive_reveal',50,'Apply AP inheritance patterns with precision in method behavior.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',6,2,'Output-Only Challenge: Polymorphic Dispatch','output_challenge',50,'Determine runtime call behavior from polymorphic outputs.','code_tracing'),
  ('00000000-0000-0000-0000-000000000005',6,3,'Written Explanation: Dynamic Binding','minimalist_ide',45,'Explain polymorphism mechanics in AP scoring language.','written_explanation'),
  ('00000000-0000-0000-0000-000000000005',7,1,'Progressive Reveal: Recursive Problem Decomposition','progressive_reveal',50,'Model recursion with strict base-case and progress guarantees.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000005',7,2,'Timed Trace: Recursive Calls and Stack Behavior','output_challenge',50,'Trace recursion under timed exam conditions.','time_based_reasoning'),
  ('00000000-0000-0000-0000-000000000005',7,3,'FRQ Simulation: Recursive Implementation','single_problem_depth',55,'Deliver AP recursion FRQ with correctness and explanation quality.','frq_simulation'),
  ('00000000-0000-0000-0000-000000000005',8,1,'Minimalist IDE-First: FRQ Method Sprint','minimalist_ide',55,'High-volume FRQ method practice with strict scoring criteria.','frq_simulation'),
  ('00000000-0000-0000-0000-000000000005',8,2,'Single-Problem Depth: Multi-Part FRQ','single_problem_depth',60,'Complete full multi-part FRQ with staged complexity.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000005',8,3,'Written Defense: Scoring-Rubric Alignment','progressive_reveal',45,'Map solution rationale to AP rubric expectations.','written_explanation'),
  ('00000000-0000-0000-0000-000000000005',9,1,'Timed MCQ Set A: Algorithmic Reasoning','output_challenge',50,'MCQ cycle focused on trace speed and reliability.','time_based_reasoning'),
  ('00000000-0000-0000-0000-000000000005',9,2,'Timed MCQ Set B: OOP and Data Structures','output_challenge',50,'Advanced MCQ set emphasizing object behavior and arrays.','time_based_reasoning'),
  ('00000000-0000-0000-0000-000000000005',9,3,'Error Taxonomy and Repair Plan','single_problem_depth',50,'Analyze errors and construct targeted performance improvement plan.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000005',10,1,'Mock Exam I: Full-Length Timed Session','single_problem_depth',80,'Complete full AP simulation with integrated MCQ and FRQ response.','exam_style_practice'),
  ('00000000-0000-0000-0000-000000000005',10,2,'Mock Exam II: Full-Length Timed Session','single_problem_depth',80,'Second simulation emphasizing pacing and consistency under pressure.','exam_style_practice'),
  ('00000000-0000-0000-0000-000000000005',10,3,'Final Written Reflection and Strategy Brief','progressive_reveal',50,'Produce exam strategy narrative with evidence from practice data.','written_explanation'),

  -- C++ Mastery
  ('00000000-0000-0000-0000-000000000004',1,1,'Progressive Reveal: C++ Program Lifecycle','progressive_reveal',50,'Understand compile-link-run pipeline and program memory footprint.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000004',1,2,'Minimalist IDE-First: Type and Flow Drill Set','minimalist_ide',50,'Implement core C++ syntax and flow with precision.','coding_validation'),
  ('00000000-0000-0000-0000-000000000004',1,3,'Output-Only Challenge: Execution Trace Deduction','output_challenge',50,'Infer hidden runtime logic from strict output evidence.','code_tracing'),
  ('00000000-0000-0000-0000-000000000004',2,1,'Progressive Reveal: Stack vs Heap Semantics','progressive_reveal',50,'Model allocation behavior and lifetime scope boundaries.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000004',2,2,'Output-Only Challenge: Lifetime Bug Detection','output_challenge',50,'Identify invalid lifetime assumptions from runtime outputs.','algorithm_reasoning'),
  ('00000000-0000-0000-0000-000000000004',2,3,'Single-Problem Depth: Memory-Safe Refactor','single_problem_depth',60,'Repair unsafe memory workflow through staged architecture updates.','refactoring_exercise'),
  ('00000000-0000-0000-0000-000000000004',3,1,'Progressive Reveal: Pointers and References','progressive_reveal',50,'Build exact reasoning about address semantics and aliasing.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000004',3,2,'Minimalist IDE-First: Pointer Manipulation Lab','minimalist_ide',55,'Apply pointer operations with defensive correctness checks.','coding_validation'),
  ('00000000-0000-0000-0000-000000000004',3,3,'Single-Problem Depth: Ownership Contract Design','single_problem_depth',60,'Evolve ownership model to eliminate leaks and invalid access.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000004',4,1,'Progressive Reveal: STL Containers and Iterators','progressive_reveal',50,'Choose and apply STL abstractions for clarity and performance.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000004',4,2,'Minimalist IDE-First: STL Algorithm Sprint','minimalist_ide',55,'Compose algorithms with iterators and comparator strategies.','coding_validation'),
  ('00000000-0000-0000-0000-000000000004',4,3,'Output-Only Challenge: Container Choice Inference','output_challenge',50,'Infer data-structure decisions from performance and output behavior.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000004',5,1,'Single-Problem Depth: Linked Structure Foundation','single_problem_depth',60,'Design linked structure invariants and node lifecycle management.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000004',5,2,'Single-Problem Depth: Custom Container Operations','single_problem_depth',60,'Extend custom container with insertion, deletion, and traversal APIs.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000004',5,3,'Refactor Lab: Safety and Performance Hardening','minimalist_ide',55,'Refactor container internals for robustness and operational efficiency.','refactoring_exercise'),
  ('00000000-0000-0000-0000-000000000004',6,1,'Progressive Reveal: Recursion and Call Stack Dynamics','progressive_reveal',50,'Model recursive flow and stack growth with formal clarity.','concept_checkpoint'),
  ('00000000-0000-0000-0000-000000000004',6,2,'Output-Only Challenge: Recursive Trace Forensics','output_challenge',50,'Determine recurrence behavior from input-output signatures.','code_tracing'),
  ('00000000-0000-0000-0000-000000000004',6,3,'Single-Problem Depth: Tree Traversal Engine','single_problem_depth',60,'Implement and optimize recursive tree traversal suite.','multi_stage_project'),
  ('00000000-0000-0000-0000-000000000004',7,1,'Minimalist IDE-First: Profiling Workflow','minimalist_ide',55,'Instrument and profile code with evidence-based optimization strategy.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000004',7,2,'Output-Only Challenge: Performance Regression Analysis','output_challenge',50,'Infer performance regressions from metric output deltas.','efficiency_reasoning'),
  ('00000000-0000-0000-0000-000000000004',7,3,'Single-Problem Depth: Optimization Tradeoff Sprint','single_problem_depth',60,'Improve throughput while preserving correctness and maintainability.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000004',8,1,'Capstone Stage 1: Analyzer Architecture','progressive_reveal',55,'Design modular command-line file analyzer architecture.','milestone_completion'),
  ('00000000-0000-0000-0000-000000000004',8,2,'Capstone Stage 2: Parsing + Metrics Engine','single_problem_depth',65,'Implement parser, metrics pipeline, and extensible analysis rules.','structured_evaluation'),
  ('00000000-0000-0000-0000-000000000004',8,3,'Capstone Stage 3: Performance Report and Defense','minimalist_ide',60,'Deliver benchmark report, refactor summary, and technical defense.','written_explanation')
),
lesson_seed AS (
  SELECT
    course_id::uuid AS course_id,
    unit_number,
    lesson_number,
    title,
    method,
    minutes,
    summary,
    assessment_focus
  FROM lesson_seed_raw
),
insert_lessons AS (
  INSERT INTO public.lessons (
    id, unit_id, lesson_number, title, description, lesson_type, content_data,
    estimated_minutes, is_published, order_index, content_body, duration_minutes, content_type
  )
  SELECT
    (
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text || ':lesson:' || ls.lesson_number::text), 1, 8) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text || ':lesson:' || ls.lesson_number::text), 9, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text || ':lesson:' || ls.lesson_number::text), 13, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text || ':lesson:' || ls.lesson_number::text), 17, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text || ':lesson:' || ls.lesson_number::text), 21, 12)
    )::uuid,
    (
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text), 1, 8) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text), 9, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text), 13, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text), 17, 4) || '-' ||
      substr(md5(ls.course_id || ':unit:' || ls.unit_number::text), 21, 12)
    )::uuid,
    ls.lesson_number,
    ls.title,
    ls.summary,
    ls.method,
    jsonb_build_object(
      'method', ls.method,
      'mastery_model', jsonb_build_array('guided', 'supported', 'independent', 'transfer', 'defend'),
      'assessment_focus', ls.assessment_focus,
      'independence_expectation',
        CASE
          WHEN ls.unit_number <= 2 THEN 'high guidance'
          WHEN ls.unit_number <= 5 THEN 'moderate scaffolding'
          ELSE 'increasing autonomy'
        END,
      'editor_emphasis', true,
      'professional_tone', true
    ),
    ls.minutes,
    true,
    ls.lesson_number,
    'Method: ' || ls.method || E'\n\nObjective: ' || ls.summary || E'\n\nMastery Gate: ' || ls.assessment_focus || E'\n\nDeliverable: Submit executable work product and concise technical rationale.',
    ls.minutes,
    'interactive'
  FROM lesson_seed ls
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    lesson_type = EXCLUDED.lesson_type,
    content_data = EXCLUDED.content_data,
    estimated_minutes = EXCLUDED.estimated_minutes,
    is_published = EXCLUDED.is_published,
    order_index = EXCLUDED.order_index,
    content_body = EXCLUDED.content_body,
    duration_minutes = EXCLUDED.duration_minutes,
    content_type = EXCLUDED.content_type
  RETURNING id, lesson_type
)
INSERT INTO public.checkpoints (
  id, lesson_id, title, problem_description, starter_code, solution_code,
  test_cases, order_index, points, difficulty, concept_tags
)
SELECT
  (
    substr(md5(il.id::text || ':checkpoint:1'), 1, 8) || '-' ||
    substr(md5(il.id::text || ':checkpoint:1'), 9, 4) || '-' ||
    substr(md5(il.id::text || ':checkpoint:1'), 13, 4) || '-' ||
    substr(md5(il.id::text || ':checkpoint:1'), 17, 4) || '-' ||
    substr(md5(il.id::text || ':checkpoint:1'), 21, 12)
  )::uuid,
  il.id,
  'Mastery Checkpoint',
  'Implement the required solution for this lesson method. Your submission must satisfy correctness, clarity, and modular reasoning expectations.',
  '/* Implement solution here */',
  '/* Reference implementation maintained in instructor tooling */',
  jsonb_build_array(
    jsonb_build_object('input', 'sample_a', 'expected', 'valid_output_a', 'description', 'core behavior'),
    jsonb_build_object('input', 'sample_b', 'expected', 'valid_output_b', 'description', 'edge behavior')
  ),
  1,
  100,
  CASE
    WHEN il.lesson_type IN ('progressive_reveal', 'minimalist_ide') THEN 'medium'
    ELSE 'hard'
  END,
  ARRAY[il.lesson_type, 'computational_thinking', 'abstraction', 'modularity']
FROM insert_lessons il
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  problem_description = EXCLUDED.problem_description,
  starter_code = EXCLUDED.starter_code,
  solution_code = EXCLUDED.solution_code,
  test_cases = EXCLUDED.test_cases,
  points = EXCLUDED.points,
  difficulty = EXCLUDED.difficulty,
  concept_tags = EXCLUDED.concept_tags;

COMMIT;
