-- =====================================================
-- AP COMPUTER SCIENCE PRINCIPLES - ELITE EDITION
-- Production-Ready Course with 4 Elite Learning Methods
-- =====================================================

-- Create the AP CSP course
INSERT INTO public.courses (
  id,
  name,
  description,
  difficulty_level,
  level,
  language,
  estimated_hours,
  icon_name,
  color,
  is_active,
  created_at
)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  'AP Computer Science Principles',
  'Master computational thinking, programming, and the global impact of computing. Prepare for the AP CSP exam with hands-on coding in Python and JavaScript, real-world projects, and comprehensive test prep.',
  'intermediate',
  'high-school',
  'python',
  120,
  'brain',
  'violet',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  difficulty_level = EXCLUDED.difficulty_level,
  estimated_hours = EXCLUDED.estimated_hours,
  is_active = EXCLUDED.is_active;

-- Delete existing content for fresh start
DELETE FROM public.lessons WHERE unit_id IN (
  SELECT id FROM public.units WHERE course_id = '00000000-0000-0000-0000-000000000010'
);
DELETE FROM public.units WHERE course_id = '00000000-0000-0000-0000-000000000010';

-- =====================================================
-- UNIT 1: Creative Development & Algorithms
-- =====================================================
INSERT INTO public.units (
  id,
  course_id,
  title,
  description,
  order_index,
  learning_objectives,
  created_at,
  updated_at
)
VALUES (
  '00000010-0001-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000010',
  'Unit 1: Creative Development & Algorithms',
  'Learn computational thinking fundamentals, algorithm design, and problem-solving strategies. Build your first programs using Python.',
  1,
  ARRAY[
    'Design and evaluate algorithms for correctness and efficiency',
    'Apply computational thinking to solve real-world problems',
    'Implement and debug Python programs using variables, loops, and conditionals',
    'Use abstraction to manage complexity in programs'
  ],
  NOW(),
  NOW()
);

-- Lesson 1.1: Introduction to Computational Thinking
INSERT INTO public.lessons (
  id,
  unit_id,
  title,
  description,
  content_type,
  content_body,
  order_index,
  duration_minutes,
  created_at,
  updated_at
)
VALUES (
  '00000010-0001-0001-0000-000000000000',
  '00000010-0001-0000-0000-000000000000',
  'Introduction to Computational Thinking',
  'Discover how computer scientists think and solve problems. Learn the core principles that power all of computing.',
  'text',
  '# Introduction to Computational Thinking

## What is Computational Thinking?

Computational thinking is a problem-solving approach that involves:
- **Decomposition**: Breaking complex problems into smaller, manageable parts
- **Pattern Recognition**: Identifying similarities and trends
- **Abstraction**: Focusing on important information, ignoring irrelevant details
- **Algorithm Design**: Creating step-by-step solutions

## Real-World Example: Planning a Road Trip

Let''s apply computational thinking to planning a road trip:

1. **Decomposition**: Break down into tasks (route planning, packing, budgeting)
2. **Pattern Recognition**: Notice similar stops (gas, food, rest)
3. **Abstraction**: Focus on time and distance, ignore scenery details
4. **Algorithm**: Create a step-by-step itinerary

## Your First Python Program

```python
# A simple algorithm to greet someone
def greet_person(name):
    """Greet a person by name"""
    greeting = f"Hello, {name}! Welcome to AP CSP."
    return greeting

# Test the algorithm
print(greet_person("Alex"))
print(greet_person("Jordan"))
```

## Practice Challenge

Write a Python function that takes a number and determines if it''s even or odd.

```python
def check_even_odd(number):
    if number % 2 == 0:
        return "even"
    else:
        return "odd"
```

## Key Takeaways

- Computational thinking is applicable to any problem domain
- Algorithms are precise, step-by-step instructions
- Python lets us express algorithms in code
- Good problem-solving starts with decomposition

## Next Steps

In the next lesson, you''ll learn about variables, data types, and how computers store information.',
  1,
  45,
  NOW(),
  NOW()
);

-- Lesson 1.2: Variables, Data Types, and Control Flow
INSERT INTO public.lessons (
  id,
  unit_id,
  title,
  description,
  content_type,
  content_body,
  order_index,
  duration_minutes,
  created_at,
  updated_at
)
VALUES (
  '00000010-0001-0002-0000-000000000000',
  '00000010-0001-0000-0000-000000000000',
  'Variables, Data Types, and Control Flow',
  'Master Python fundamentals including variables, data types, conditionals, and loops. Build programs that make decisions.',
  'text',
  '# Variables, Data Types, and Control Flow

## Variables: Storing Information

Variables are containers that hold data:

```python
# Different data types
name = "Sarah"           # String
age = 16                 # Integer
gpa = 3.85              # Float
is_student = True       # Boolean

# Variables can change
score = 0
score = score + 10      # Now 10
score += 5              # Now 15
```

## Python Data Types

| Type | Example | Use Case |
|------|---------|----------|
| `str` | `"Hello"` | Text data |
| `int` | `42` | Whole numbers |
| `float` | `3.14` | Decimals |
| `bool` | `True` or `False` | Logic |
| `list` | `[1, 2, 3]` | Collections |
| `dict` | `{"name": "Alex"}` | Key-value pairs |

## Conditional Statements

Make decisions in code:

```python
def check_grade(score):
    """Determine letter grade from numeric score"""
    if score >= 90:
        return "A"
    elif score >= 80:
        return "B"
    elif score >= 70:
        return "C"
    elif score >= 60:
        return "D"
    else:
        return "F"

# Test it
print(check_grade(95))  # A
print(check_grade(73))  # C
```

## Loops: Repetition

Repeat actions efficiently:

```python
# For loop: iterate a specific number of times
for i in range(5):
    print(f"Iteration {i}")

# While loop: continue until condition is false
count = 0
while count < 5:
    print(f"Count: {count}")
    count += 1

# Loop through lists
fruits = ["apple", "banana", "orange"]
for fruit in fruits:
    print(f"I like {fruit}s")
```

## Practice Challenge: Temperature Converter

Create a program that converts Celsius to Fahrenheit:

```python
def celsius_to_fahrenheit(celsius):
    """Convert Celsius to Fahrenheit"""
    fahrenheit = (celsius * 9/5) + 32
    return fahrenheit

# Test cases
print(celsius_to_fahrenheit(0))    # Should print 32
print(celsius_to_fahrenheit(100))  # Should print 212
```

## Key Concepts

- Variables store and label data
- Data types determine what operations are possible
- Conditionals allow decision-making
- Loops enable efficient repetition
- Combining these creates powerful programs',
  2,
  60,
  NOW(),
  NOW()
);

-- Lesson 1.3: Functions and Abstraction
INSERT INTO public.lessons (
  id,
  unit_id,
  title,
  description,
  content_type,
  content_body,
  order_index,
  duration_minutes,
  created_at,
  updated_at
)
VALUES (
  '00000010-0001-0003-0000-000000000000',
  '00000010-0001-0000-0000-000000000000',
  'Functions and Abstraction',
  'Learn how functions promote code reuse and abstraction. Build modular, maintainable programs.',
  'text',
  '# Functions and Abstraction

## Why Functions Matter

Functions are reusable blocks of code that:
- Break programs into manageable pieces
- Reduce repetition (DRY principle: Don''t Repeat Yourself)
- Make code easier to test and debug
- Enable abstraction and information hiding

## Function Basics

```python
def function_name(parameter1, parameter2):
    """Docstring: describe what the function does"""
    result = parameter1 + parameter2
    return result

# Call the function
output = function_name(5, 3)
print(output)  # 8
```

## Real-World Project: Grade Calculator

```python
def calculate_weighted_grade(homework, quizzes, tests, final_exam):
    """
    Calculate final grade with weighted categories.
    
    Weights:
    - Homework: 20%
    - Quizzes: 20%  
    - Tests: 40%
    - Final Exam: 20%
    """
    return (homework * 0.2 + 
            quizzes * 0.2 + 
            tests * 0.4 + 
            final_exam * 0.2)

def letter_grade(numeric_grade):
    """Convert numeric grade to letter"""
    if numeric_grade >= 90: return "A"
    elif numeric_grade >= 80: return "B"
    elif numeric_grade >= 70: return "C"
    elif numeric_grade >= 60: return "D"
    else: return "F"

def generate_report_card(student_name, hw, quiz, test, final):
    """Generate complete report card"""
    final_grade = calculate_weighted_grade(hw, quiz, test, final)
    letter = letter_grade(final_grade)
    
    return f"""
    ======= REPORT CARD =======
    Student: {student_name}
    Homework:    {hw}%
    Quizzes:     {quiz}%
    Tests:       {test}%
    Final Exam:  {final}%
    Final Grade: {final_grade:.1f}% ({letter})
    ===========================
    """

# Use the system
report = generate_report_card("Alex Johnson", 95, 88, 92, 90)
print(report)
```

## Best Practices

1. **Single Responsibility**: Each function should do one thing well
2. **Descriptive Names**: Use clear, action-oriented names
3. **Documentation**: Include docstrings explaining purpose and usage
4. **Error Handling**: Validate inputs and handle edge cases
5. **Keep It Simple**: If a function is too long, break it into smaller functions

## Key Takeaways

- Functions enable code reuse and organization
- Abstraction hides complexity and exposes simple interfaces
- Good function design makes programs easier to understand and maintain
- The principle of decomposition applies at the function level',
  3,
  50,
  NOW(),
  NOW()
);

-- =====================================================
-- UNIT 2: Data and Information
-- =====================================================
INSERT INTO public.units (
  id,
  course_id,
  title,
  description,
  order_index,
  learning_objectives,
  created_at,
  updated_at
)
VALUES (
  '00000010-0002-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000010',
  'Unit 2: Data and Information',
  'Explore how data is represented, stored, and transformed in computing. Learn about binary, data compression, and information visualization.',
  2,
  ARRAY[
    'Explain how data is represented in binary',
    'Compare different data encodings and compression algorithms',
    'Analyze how information can be extracted from data',
    'Evaluate privacy and security concerns with data collection'
  ],
  NOW(),
  NOW()
);

-- Lesson 2.1: Binary and Data Representation
INSERT INTO public.lessons (
  id,
  unit_id,
  title,
  description,
  content_type,
  content_body,
  order_index,
  duration_minutes,
  created_at,
  updated_at
)
VALUES (
  '00000010-0002-0001-0000-000000000000',
  '00000010-0002-0000-0000-000000000000',
  'Binary and Data Representation',
  'Understand how computers represent all information using binary (0s and 1s). Learn about bits, bytes, and data encoding.',
  'text',
  '# Binary and Data Representation

## Why Binary?

Computers use binary (base-2) because:
- Electronic circuits have two stable states: ON (1) and OFF (0)
- Simple and reliable with modern technology
- Easy to perform logical operations (AND, OR, NOT)

## Understanding Binary

### Decimal vs Binary

| Decimal | Binary | Explanation |
|---------|--------|-------------|
| 0 | 0000 | All bits off |
| 1 | 0001 | Rightmost bit on |
| 2 | 0010 | Second bit from right on |
| 3 | 0011 | Two rightmost bits on |
| 8 | 1000 | Leftmost bit on |
| 15 | 1111 | All bits on |

## Python: Working with Binary

```python
def decimal_to_binary(decimal):
    """Convert decimal number to binary string"""
    if decimal == 0:
        return "0"
    
    binary = ""
    while decimal > 0:
        remainder = decimal % 2
        binary = str(remainder) + binary
        decimal = decimal // 2
    
    return binary

def binary_to_decimal(binary):
    """Convert binary string to decimal number"""
    decimal = 0
    power = 0
    
    for bit in reversed(binary):
        if bit == ''1'':
            decimal += 2 ** power
        power += 1
    
    return decimal

# Test the functions
print(decimal_to_binary(42))       # "101010"
print(binary_to_decimal("101010")) # 42
```

## Data Representation

### Text Encoding: ASCII and Unicode

```python
# ASCII (7-bit, 128 characters)
char = ''A''
ascii_value = ord(char)
print(f"{char} in ASCII: {ascii_value}")  # 65

# Unicode (millions of characters)
emoji = ''🎉''
unicode_value = ord(emoji)
print(f"{emoji} in Unicode: {unicode_value}")  # 127881

# Convert numbers back to characters
print(chr(65))     # ''A''
print(chr(127881)) # ''🎉''
```

## Bits and Bytes

- **Bit**: Single binary digit (0 or 1)
- **Byte**: 8 bits
- **Kilobyte (KB)**: 1,024 bytes
- **Megabyte (MB)**: 1,024 KB
- **Gigabyte (GB)**: 1,024 MB
- **Terabyte (TB)**: 1,024 GB

## Key Concepts

- All computer data is ultimately binary
- Different encodings represent different types of information
- Understanding binary is fundamental to computer science
- Efficiency matters when representing large amounts of data',
  1,
  55,
  NOW(),
  NOW()
);

-- Create checkpoints for practice
INSERT INTO public.checkpoints (
  id,
  lesson_id,
  title,
  problem_description,
  difficulty,
  starter_code,
  solution_code,
  test_cases,
  points,
  order_index,
  concept_tags,
  created_at
)
VALUES 
(
  gen_random_uuid(),
  '00000010-0001-0001-0000-000000000000',
  'Even or Odd Checker',
  'Write a function that determines if a number is even or odd.',
  'easy',
  'def check_even_odd(number):
    # Your code here
    pass',
  'def check_even_odd(number):
    if number % 2 == 0:
        return "even"
    else:
        return "odd"',
  '[{"input": [4], "expected": "even"}, {"input": [7], "expected": "odd"}, {"input": [0], "expected": "even"}]'::jsonb,
  10,
  1,
  ARRAY['conditionals', 'modulo', 'functions'],
  NOW()
),
(
  gen_random_uuid(),
  '00000010-0001-0002-0000-000000000000',
  'Temperature Converter',
  'Implement a celsius to fahrenheit converter using the formula: F = (C × 9/5) + 32',
  'easy',
  'def celsius_to_fahrenheit(celsius):
    # Your code here
    pass',
  'def celsius_to_fahrenheit(celsius):
    return (celsius * 9/5) + 32',
  '[{"input": [0], "expected": 32}, {"input": [100], "expected": 212}, {"input": [-40], "expected": -40}]'::jsonb,
  15,
  1,
  ARRAY['math', 'functions', 'variables'],
  NOW()
),
(
  gen_random_uuid(),
  '00000010-0001-0003-0000-000000000000',
  'Grade Calculator',
  'Create a function that calculates a final grade from weighted scores.',
  'medium',
  'def calculate_final_grade(homework, quiz, test, final):
    # Weights: HW 20%, Quiz 20%, Test 40%, Final 20%
    pass',
  'def calculate_final_grade(homework, quiz, test, final):
    return (homework * 0.2) + (quiz * 0.2) + (test * 0.4) + (final * 0.2)',
  '[{"input": [90, 85, 88, 92], "expected": 88.5}, {"input": [100, 100, 100, 100], "expected": 100}]'::jsonb,
  20,
  1,
  ARRAY['functions', 'math', 'abstraction'],
  NOW()
);

SELECT 'AP Computer Science Principles Elite Edition created successfully!' as message;
