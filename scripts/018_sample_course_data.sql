-- Sample Course Data for Averon CodeLab
-- Creates 4 courses with units and lessons using the new learning methods
-- Methods used: Single-Problem Depth, Output-Only Challenge, Minimalist IDE-First, Progressive Reveal

-- Clean up existing sample data if rerunning
DELETE FROM public.lessons WHERE unit_id IN (SELECT id FROM public.units WHERE course_id IN (SELECT id FROM public.courses WHERE name IN ('AP Computer Science Principles', 'AP Computer Science A', 'Foundational Computer Science', 'Information Systems & Technology')));
DELETE FROM public.units WHERE course_id IN (SELECT id FROM public.courses WHERE name IN ('AP Computer Science Principles', 'AP Computer Science A', 'Foundational Computer Science', 'Information Systems & Technology'));
DELETE FROM public.courses WHERE name IN ('AP Computer Science Principles', 'AP Computer Science A', 'Foundational Computer Science', 'Information Systems & Technology');

-- ============================================
-- COURSE 1: AP Computer Science Principles
-- ============================================
INSERT INTO public.courses (id, name, description, language, difficulty, estimated_hours, is_published)
VALUES (
  'c1111111-1111-1111-1111-111111111111',
  'AP Computer Science Principles',
  'College-level introduction to computer science exploring computing innovations, programming, and societal impacts. Aligned with College Board AP CSP curriculum.',
  'python',
  'intermediate',
  60,
  true
);

-- Unit 1: Computational Thinking
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  1,
  'Computational Thinking Fundamentals',
  'Learn problem decomposition, pattern recognition, and algorithmic thinking',
  true,
  1
);

-- Lesson 1.1: Progressive Reveal Lesson
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l1111111-1111-1111-1111-111111111111',
  'u1111111-1111-1111-1111-111111111111',
  1,
  'What is Computational Thinking?',
  'Unlock concepts step-by-step as you master computational thinking foundations',
  'progressive_reveal',
  '{
    "stages": [
      {
        "id": 1,
        "title": "Decomposition",
        "content_html": "<h2>Breaking Down Problems</h2><p>Decomposition means breaking a complex problem into smaller, manageable parts.</p><p><strong>Real Example:</strong> Making a sandwich:</p><ul><li>Get bread</li><li>Add ingredients</li><li>Close sandwich</li></ul>",
        "checkpoint": {
          "question": "Which is an example of decomposition?",
          "type": "multiple_choice",
          "options": ["Breaking a game into levels, menus, and scoring", "Writing code faster", "Using a computer", "Playing video games"],
          "correct_answer": 0
        }
      },
      {
        "id": 2,
        "title": "Pattern Recognition",
        "content_html": "<h2>Finding Similarities</h2><p>Pattern recognition helps identify common features in problems.</p><p><strong>Example:</strong> All sorting algorithms compare items and swap positions.</p>",
        "checkpoint": {
          "question": "What pattern exists in these: login form, signup form, password reset?",
          "type": "multiple_choice",
          "options": ["All collect user input", "All are different", "None use patterns", "Only one is real"],
          "correct_answer": 0
        }
      },
      {
        "id": 3,
        "title": "Abstraction",
        "content_html": "<h2>Hiding Complexity</h2><p>Abstraction focuses on important details while hiding complex implementation.</p><p><strong>Example:</strong> Driving a car - you use the steering wheel without knowing engine mechanics.</p>",
        "checkpoint": {
          "question": "Complete this analogy: Abstraction is to programming as ___ is to driving",
          "type": "multiple_choice",
          "options": ["Dashboard/controls", "Engine pistons", "Tire rubber", "Gasoline molecules"],
          "correct_answer": 0
        }
      }
    ],
    "completion_summary": "You have mastered the three pillars of computational thinking: decomposition, pattern recognition, and abstraction. These skills form the foundation for all problem-solving in computer science."
  }',
  25,
  true,
  1
);

-- Lesson 1.2: Output-Only Challenge
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l1111112-1111-1111-1111-111111111111',
  'u1111111-1111-1111-1111-111111111111',
  2,
  'Algorithm Pattern Matching',
  'Study input/output examples and write code to match the pattern',
  'output_challenge',
  '{
    "challenge_description": "Write a function that takes a list of numbers and returns only the even numbers.",
    "io_examples": [
      {"input": "[1, 2, 3, 4, 5]", "output": "[2, 4]"},
      {"input": "[10, 15, 20, 25]", "output": "[10, 20]"},
      {"input": "[7, 9, 11]", "output": "[]"},
      {"input": "[]", "output": "[]"}
    ],
    "language": "python",
    "starter_code": "def filter_evens(numbers):\n    # Your code here\n    pass",
    "test_cases": [
      {"input": "[1,2,3,4,5,6]", "expected": "[2,4,6]"},
      {"input": "[11,13,15]", "expected": "[]"},
      {"input": "[0,2,4]", "expected": "[0,2,4]"}
    ],
    "hints": [
      "Use the modulo operator (%) to check if a number is even",
      "A number is even if number % 2 == 0",
      "You can use a list comprehension or a loop"
    ]
  }',
  20,
  true,
  2
);

-- Unit 2: Python Programming Basics
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u1111112-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
  2,
  'Python Programming Foundations',
  'Master variables, conditionals, loops, and functions in Python',
  true,
  2
);

-- Lesson 2.1: Minimalist IDE-First
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l1111121-1111-1111-1111-111111111111',
  'u1111112-1111-1111-1111-111111111111',
  1,
  'Variables and Data Types',
  'Hands-on coding with minimal distractions - editor takes center stage',
  'minimalist_ide',
  '{
    "instructions_panel": {
      "content": "**Task:** Create variables of different types\n\n1. Create a string variable `name` with your name\n2. Create an integer `age` with a number\n3. Create a boolean `is_student` set to True\n4. Print all three variables",
      "hints": ["Strings use quotes", "Booleans are True/False", "Use print() to display"]
    },
    "starter_code": "# Create your variables below\n\n",
    "language": "python",
    "tests": [
      {"description": "name variable exists", "test_type": "variable_exists", "var_name": "name"},
      {"description": "age variable exists", "test_type": "variable_exists", "var_name": "age"},
      {"description": "is_student variable exists", "test_type": "variable_exists", "var_name": "is_student"}
    ],
    "solution_example": "name = \"Alex\"\nage = 16\nis_student = True\nprint(name, age, is_student)"
  }',
  15,
  true,
  1
);

-- ============================================
-- COURSE 2: AP Computer Science A (Java)
-- ============================================
INSERT INTO public.courses (id, name, description, language, difficulty, estimated_hours, is_published)
VALUES (
  'c2222222-2222-2222-2222-222222222222',
  'AP Computer Science A',
  'Rigorous introduction to Java programming covering object-oriented design, data structures, and algorithms. Prepares students for the College Board AP CSA exam.',
  'java',
  'advanced',
  80,
  true
);

-- Unit 1: Java Fundamentals
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u2222221-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  1,
  'Java Syntax and Primitives',
  'Master Java syntax, data types, operators, and control structures',
  true,
  1
);

-- Lesson 1.1: Single-Problem Depth
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l2222111-2222-2222-2222-222222222222',
  'u2222221-2222-2222-2222-222222222222',
  1,
  'The Temperature Converter Challenge',
  'Deep dive into one problem through multiple stages of complexity',
  'single_problem_depth',
  '{
    "problem_overview": "Build a temperature converter that handles multiple scales and edge cases. Each stage adds complexity.",
    "stages": [
      {
        "stage": 1,
        "title": "Basic Celsius to Fahrenheit",
        "description": "Convert a single Celsius value to Fahrenheit using the formula: F = (C × 9/5) + 32",
        "starter_code": "public class TempConverter {\n    public static double celsiusToFahrenheit(double celsius) {\n        // Your code here\n        return 0.0;\n    }\n}",
        "tests": [
          {"input": "0", "expected": "32.0"},
          {"input": "100", "expected": "212.0"},
          {"input": "-40", "expected": "-40.0"}
        ]
      },
      {
        "stage": 2,
        "title": "Bidirectional Conversion",
        "description": "Add a method to convert Fahrenheit back to Celsius: C = (F - 32) × 5/9",
        "starter_code": "public class TempConverter {\n    public static double celsiusToFahrenheit(double celsius) {\n        return (celsius * 9.0/5.0) + 32;\n    }\n    \n    public static double fahrenheitToCelsius(double fahrenheit) {\n        // Your code here\n        return 0.0;\n    }\n}",
        "tests": [
          {"input": "32", "expected": "0.0"},
          {"input": "212", "expected": "100.0"}
        ]
      },
      {
        "stage": 3,
        "title": "Add Kelvin Support",
        "description": "Support Kelvin conversions. K = C + 273.15",
        "starter_code": "public class TempConverter {\n    // Previous methods here\n    \n    public static double celsiusToKelvin(double celsius) {\n        // Your code here\n        return 0.0;\n    }\n}",
        "tests": [
          {"input": "0", "expected": "273.15"},
          {"input": "-273.15", "expected": "0.0"}
        ]
      }
    ],
    "completion_message": "Congratulations! You have built a complete temperature converter handling three scales and multiple conversion paths."
  }',
  35,
  true,
  1
);

-- Lesson 1.2: Minimalist IDE
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l2222112-2222-2222-2222-222222222222',
  'u2222221-2222-2222-2222-222222222222',
  2,
  'Java Loops Practice',
  'Master for and while loops through focused coding',
  'minimalist_ide',
  '{
    "instructions_panel": {
      "content": "**Task:** Print numbers 1 to 10 using a for loop\n\nRequirements:\n- Use a for loop\n- Print each number on a new line\n- Start at 1, end at 10 (inclusive)",
      "hints": ["for(int i = start; i <= end; i++)", "Use System.out.println()"]
    },
    "starter_code": "public class LoopPractice {\n    public static void main(String[] args) {\n        // Write your loop here\n        \n    }\n}",
    "language": "java",
    "tests": [
      {"description": "Prints numbers 1-10", "test_type": "output_match", "expected_output": "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n"}
    ],
    "solution_example": "for(int i = 1; i <= 10; i++) {\n    System.out.println(i);\n}"
  }',
  18,
  true,
  2
);

-- Unit 3: Object-Oriented Programming
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u2222223-2222-2222-2222-222222222222',
  'c2222222-2222-2222-2222-222222222222',
  3,
  'Object-Oriented Design',
  'Learn classes, objects, inheritance, and polymorphism',
  true,
  3
);

-- Lesson 3.1: Progressive Reveal
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l2222231-2222-2222-2222-222222222222',
  'u2222223-2222-2222-2222-222222222222',
  1,
  'Classes and Objects Foundations',
  'Unlock OOP concepts one stage at a time',
  'progressive_reveal',
  '{
    "stages": [
      {
        "id": 1,
        "title": "What is a Class?",
        "content_html": "<h2>Classes: Blueprints for Objects</h2><p>A class is a template that defines the structure and behavior of objects.</p><pre><code>public class Dog {\n    String name;\n    int age;\n}</code></pre><p>Think of it like a cookie cutter - the class is the cutter, objects are the cookies.</p>",
        "checkpoint": {
          "question": "A class is best described as:",
          "type": "multiple_choice",
          "options": ["A blueprint or template", "A specific instance", "A variable", "A loop"],
          "correct_answer": 0
        }
      },
      {
        "id": 2,
        "title": "Creating Objects",
        "content_html": "<h2>Instantiation: Making Objects</h2><p>Use the <code>new</code> keyword to create objects from a class:</p><pre><code>Dog myDog = new Dog();\nmyDog.name = \"Buddy\";\nmyDog.age = 3;</code></pre>",
        "checkpoint": {
          "question": "What keyword creates a new object?",
          "type": "multiple_choice",
          "options": ["new", "create", "make", "object"],
          "correct_answer": 0
        }
      }
    ],
    "completion_summary": "You now understand the foundation of OOP: classes define structure, objects are instances of classes."
  }',
  22,
  true,
  1
);

-- ============================================
-- COURSE 3: Foundational Computer Science
-- ============================================
INSERT INTO public.courses (id, name, description, language, difficulty, estimated_hours, is_published)
VALUES (
  'c3333333-3333-3333-3333-333333333333',
  'Foundational Computer Science',
  'Perfect first course in programming. Learn coding fundamentals, problem-solving, and computational thinking with block-based and text-based programming.',
  'python',
  'beginner',
  40,
  true
);

-- Unit 1: Introduction to Programming
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u3333331-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  1,
  'Your First Programs',
  'Write your first lines of code and see results immediately',
  true,
  1
);

-- Lesson 1.1: Minimalist IDE
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l3333111-3333-3333-3333-333333333333',
  'u3333331-3333-3333-3333-333333333333',
  1,
  'Hello World!',
  'Your first program - make the computer say hello',
  'minimalist_ide',
  '{
    "instructions_panel": {
      "content": "**Welcome to Programming!**\n\nYour first task: Make the computer print \"Hello, World!\"\n\n**Instructions:**\n- Type: `print(\"Hello, World!\")`\n- Click Run to see the magic happen!",
      "hints": ["Make sure to use quotes around the text", "Check your spelling"]
    },
    "starter_code": "# Type your code below\n\n",
    "language": "python",
    "tests": [
      {"description": "Prints Hello, World!", "test_type": "output_contains", "expected_output": "Hello, World!"}
    ],
    "solution_example": "print(\"Hello, World!\")"
  }',
  10,
  true,
  1
);

-- Lesson 1.2: Output-Only Challenge
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l3333112-3333-3333-3333-333333333333',
  'u3333331-3333-3333-3333-333333333333',
  2,
  'Name Greeter Pattern',
  'Figure out the pattern and write the code',
  'output_challenge',
  '{
    "challenge_description": "Write a function that takes a name and returns a greeting message.",
    "io_examples": [
      {"input": "\"Alice\"", "output": "\"Hello, Alice! Welcome!\""},
      {"input": "\"Bob\"", "output": "\"Hello, Bob! Welcome!\""},
      {"input": "\"Charlie\"", "output": "\"Hello, Charlie! Welcome!\""}
    ],
    "language": "python",
    "starter_code": "def greet(name):\n    # Figure out the pattern and write your code\n    pass",
    "test_cases": [
      {"input": "\"Sarah\"", "expected": "\"Hello, Sarah! Welcome!\""},
      {"input": "\"Mike\"", "expected": "\"Hello, Mike! Welcome!\""}
    ],
    "hints": [
      "Look at what changes in each example (the name)",
      "Look at what stays the same (Hello, ... Welcome!)",
      "Use string concatenation or f-strings"
    ]
  }',
  15,
  true,
  2
);

-- Unit 2: Logic and Decisions
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u3333332-3333-3333-3333-333333333333',
  'c3333333-3333-3333-3333-333333333333',
  2,
  'Making Decisions with Code',
  'Learn if statements and conditional logic',
  true,
  2
);

-- Lesson 2.1: Progressive Reveal
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l3333221-3333-3333-3333-333333333333',
  'u3333332-3333-3333-3333-333333333333',
  1,
  'If Statements Unlocked',
  'Learn conditionals step by step',
  'progressive_reveal',
  '{
    "stages": [
      {
        "id": 1,
        "title": "Basic If Statement",
        "content_html": "<h2>Making Decisions in Code</h2><p>An <code>if</code> statement runs code only when a condition is true.</p><pre><code>age = 16\nif age >= 16:\n    print(\"You can drive!\")</code></pre>",
        "checkpoint": {
          "question": "When does code inside an if statement run?",
          "type": "multiple_choice",
          "options": ["When the condition is True", "Always", "Never", "Randomly"],
          "correct_answer": 0
        }
      },
      {
        "id": 2,
        "title": "If-Else",
        "content_html": "<h2>Either This or That</h2><p>Use <code>else</code> to handle the false case:</p><pre><code>if age >= 18:\n    print(\"Adult\")\nelse:\n    print(\"Minor\")</code></pre>",
        "checkpoint": {
          "question": "What does else do?",
          "type": "multiple_choice",
          "options": ["Runs when if condition is False", "Runs first", "Runs always", "Does nothing"],
          "correct_answer": 0
        }
      }
    ],
    "completion_summary": "You can now make decisions in code using if-else statements!"
  }',
  20,
  true,
  1
);

-- ============================================
-- COURSE 4: Information Systems & Technology
-- ============================================
INSERT INTO public.courses (id, name, description, language, difficulty, estimated_hours, is_published)
VALUES (
  'c4444444-4444-4444-4444-444444444444',
  'Information Systems & Technology',
  'Explore how businesses use technology, databases, web development, and information systems to solve real-world problems.',
  'javascript',
  'intermediate',
  50,
  true
);

-- Unit 1: Web Development Basics
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u4444441-4444-4444-4444-444444444444',
  'c4444444-4444-4444-4444-444444444444',
  1,
  'Building Interactive Websites',
  'Learn HTML, CSS, and JavaScript to create web applications',
  true,
  1
);

-- Lesson 1.1: Single-Problem Depth
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l4444111-4444-4444-4444-444444444444',
  'u4444441-4444-4444-4444-444444444444',
  1,
  'Build a Todo List App',
  'Create a complete todo list through progressive stages',
  'single_problem_depth',
  '{
    "problem_overview": "Build a functional todo list application step by step, adding features at each stage.",
    "stages": [
      {
        "stage": 1,
        "title": "Display Static Todos",
        "description": "Create an array of todos and display them on the page using JavaScript.",
        "starter_code": "const todos = [\"Learn JavaScript\", \"Build a project\", \"Get hired\"];\n\n// Display todos in the div with id=\"todo-list\"\n",
        "tests": [
          {"description": "Displays all 3 todos", "test_type": "dom_contains", "expected": "Learn JavaScript"}
        ]
      },
      {
        "stage": 2,
        "title": "Add New Todos",
        "description": "Add functionality to create new todos from user input.",
        "starter_code": "const todos = [];\n\nfunction addTodo(text) {\n    // Add the todo to the array\n    // Update the display\n}\n",
        "tests": [
          {"description": "Can add todos", "test_type": "function_call", "input": "addTodo(\"Test\")", "expected_result": "todos includes Test"}
        ]
      },
      {
        "stage": 3,
        "title": "Delete Todos",
        "description": "Add delete buttons to remove todos from the list.",
        "starter_code": "function deleteTodo(index) {\n    // Remove todo at index\n    // Update display\n}\n",
        "tests": [
          {"description": "Can delete todos", "test_type": "function_call"}
        ]
      }
    ],
    "completion_message": "You have built a complete todo application with add and delete functionality!"
  }',
  40,
  true,
  1
);

-- Lesson 1.2: Output-Only Challenge
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l4444112-4444-4444-4444-444444444444',
  'u4444441-4444-4444-4444-444444444444',
  2,
  'String Manipulation Mystery',
  'Deduce the string transformation pattern',
  'output_challenge',
  '{
    "challenge_description": "Write a function that formats a person object into a full sentence.",
    "io_examples": [
      {"input": "{name: \"Alice\", age: 25, city: \"NYC\"}", "output": "\"Alice is 25 years old and lives in NYC.\""},
      {"input": "{name: \"Bob\", age: 30, city: \"LA\"}", "output": "\"Bob is 30 years old and lives in LA.\""},
      {"input": "{name: \"Charlie\", age: 22, city: \"Chicago\"}", "output": "\"Charlie is 22 years old and lives in Chicago.\""}
    ],
    "language": "javascript",
    "starter_code": "function formatPerson(person) {\n    // Your code here\n    return \"\";\n}",
    "test_cases": [
      {"input": "{name: \"Diana\", age: 28, city: \"Boston\"}", "expected": "\"Diana is 28 years old and lives in Boston.\""}
    ],
    "hints": [
      "Use template literals with ${} syntax",
      "Access object properties with person.name, person.age, etc."
    ]
  }',
  18,
  true,
  2
);

-- Unit 2: Database Fundamentals
INSERT INTO public.units (id, course_id, unit_number, title, description, is_published, order_index)
VALUES (
  'u4444442-4444-4444-4444-444444444444',
  'c4444444-4444-4444-4444-444444444444',
  2,
  'Working with Databases',
  'Learn SQL and database design for information systems',
  true,
  2
);

-- Lesson 2.1: Minimalist IDE
INSERT INTO public.lessons (id, unit_id, lesson_number, title, description, lesson_type, content_data, estimated_minutes, is_published, order_index)
VALUES (
  'l4444221-4444-4444-4444-444444444444',
  'u4444442-4444-4444-4444-444444444444',
  1,
  'Your First SQL Query',
  'Write SELECT statements to retrieve data',
  'minimalist_ide',
  '{
    "instructions_panel": {
      "content": "**Task:** Query the students table\n\nDatabase: `students` table with columns: name, age, grade\n\nWrite a query to:\n1. Select all students\n2. Show only name and grade columns",
      "hints": ["SELECT column1, column2 FROM table", "Use * to select all columns"]
    },
    "starter_code": "-- Write your SQL query below\n\n",
    "language": "sql",
    "tests": [
      {"description": "Selects name and grade", "test_type": "query_columns", "expected": ["name", "grade"]}
    ],
    "solution_example": "SELECT name, grade FROM students;"
  }',
  15,
  true,
  1
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_units_course ON public.units(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_unit ON public.lessons(unit_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published ON public.lessons(is_published) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published) WHERE is_published = true;

-- Grant permissions (align with existing RLS policies)
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read published courses/units/lessons
CREATE POLICY IF NOT EXISTS "Public can view published units" ON public.units
  FOR SELECT USING (is_published = true);

CREATE POLICY IF NOT EXISTS "Public can view published lessons" ON public.lessons
  FOR SELECT USING (is_published = true);

-- Teachers can manage units/lessons for their courses
CREATE POLICY IF NOT EXISTS "Teachers can manage units" ON public.units
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

CREATE POLICY IF NOT EXISTS "Teachers can manage lessons" ON public.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('teacher', 'admin')
    )
  );

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Sample course data created successfully!';
  RAISE NOTICE '  - AP Computer Science Principles (Python)';
  RAISE NOTICE '  - AP Computer Science A (Java)';
  RAISE NOTICE '  - Foundational Computer Science (Python)';
  RAISE NOTICE '  - Information Systems & Technology (JavaScript)';
  RAISE NOTICE 'Total: 4 courses, 9 units, 15 lessons';
END $$;
