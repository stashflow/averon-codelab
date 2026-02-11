-- =====================================================
-- AP COMPUTER SCIENCE PRINCIPLES - ELITE EDITION
-- =====================================================
-- This creates a world-class AP CSP course using 4 elite learning methods:
-- 1. Spaced Repetition - Concepts revisited over time
-- 2. Active Recall - Challenge-based learning
-- 3. Interleaving - Mix old and new concepts
-- 4. Deliberate Practice - Focused, progressive skill building

-- Store the course ID
DO $$
DECLARE
  course_id_var uuid;
  unit1_id_var uuid;
  unit2_id_var uuid;
BEGIN

-- First, create or get the course
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

-- Delete existing units and lessons for this course to start fresh
DELETE FROM public.lessons WHERE unit_id IN (
  SELECT id FROM public.units WHERE course_id = 'c1111111-1111-1111-1111-111111111111'
);
DELETE FROM public.units WHERE course_id = 'c1111111-1111-1111-1111-111111111111';

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
  'u1111111-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
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
  'l1111111-1111-1111-1111-111111111111',
  'u1111111-1111-1111-1111-111111111111',
  'Introduction to Computational Thinking',
  'Discover how computer scientists think and solve problems. Learn the core principles that power all of computing.',
  'video',
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
    # Your code here
    pass
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
  'l1111112-1111-1111-1111-111111111111',
  'u1111111-1111-1111-1111-111111111111',
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
    # Formula: F = (C × 9/5) + 32
    fahrenheit = (celsius * 9/5) + 32
    return fahrenheit

# Test cases
print(celsius_to_fahrenheit(0))    # Should print 32
print(celsius_to_fahrenheit(100))  # Should print 212
```

## Real-World Application: Password Strength Checker

```python
def check_password_strength(password):
    """Check if password meets security requirements"""
    length_ok = len(password) >= 8
    has_digit = any(char.isdigit() for char in password)
    has_upper = any(char.isupper() for char in password)
    has_lower = any(char.islower() for char in password)
    
    if length_ok and has_digit and has_upper and has_lower:
        return "Strong password"
    else:
        return "Weak password - needs 8+ chars, digit, uppercase, lowercase"

# Test it
print(check_password_strength("Pass123"))   # Strong
print(check_password_strength("abc"))       # Weak
```

## Key Concepts

- Variables store and label data
- Data types determine what operations are possible
- Conditionals allow decision-making
- Loops enable efficient repetition
- Combining these creates powerful programs

## Practice Exercises

1. Write a function that finds the maximum of three numbers
2. Create a program that prints all even numbers from 1 to 100
3. Build a simple calculator that can add, subtract, multiply, and divide',
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
  'l1111113-1111-1111-1111-111111111111',
  'u1111111-1111-1111-1111-111111111111',
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
    # Function body
    result = parameter1 + parameter2
    return result

# Call the function
output = function_name(5, 3)
print(output)  # 8
```

## Parameters vs Arguments

```python
def greet(name, age):  # name and age are parameters
    return f"{name} is {age} years old"

greet("Alex", 16)  # "Alex" and 16 are arguments
```

## Return Values

Functions can return different types:

```python
def analyze_number(num):
    """Return multiple pieces of information"""
    is_even = num % 2 == 0
    is_positive = num > 0
    absolute = abs(num)
    
    return {
        "even": is_even,
        "positive": is_positive,
        "absolute": absolute
    }

result = analyze_number(-8)
print(result)  # {''even'': True, ''positive'': False, ''absolute'': 8}
```

## Abstraction in Action

Hide complexity behind simple interfaces:

```python
# Low-level detail (users don''t need to see this)
def _calculate_distance(x1, y1, x2, y2):
    """Helper function: calculate 2D distance"""
    return ((x2 - x1)**2 + (y2 - y1)**2)**0.5

def _is_valid_coordinate(x, y):
    """Helper function: validate coordinates"""
    return -1000 <= x <= 1000 and -1000 <= y <= 1000

# High-level interface (users interact with this)
def measure_distance(point1, point2):
    """
    Measure distance between two points.
    
    Args:
        point1: tuple of (x, y) coordinates
        point2: tuple of (x, y) coordinates
    
    Returns:
        float: distance between points
    
    Raises:
        ValueError: if coordinates are invalid
    """
    x1, y1 = point1
    x2, y2 = point2
    
    if not (_is_valid_coordinate(x1, y1) and _is_valid_coordinate(x2, y2)):
        raise ValueError("Coordinates must be between -1000 and 1000")
    
    return _calculate_distance(x1, y1, x2, y2)

# Simple to use!
distance = measure_distance((0, 0), (3, 4))
print(f"Distance: {distance}")  # Distance: 5.0
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
    -------------------
    Homework:    {hw}%
    Quizzes:     {quiz}%
    Tests:       {test}%
    Final Exam:  {final}%
    -------------------
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

## Practice Challenges

1. Create a function that validates email addresses
2. Build a text analyzer that counts words, sentences, and average word length
3. Write a password generator that creates random secure passwords

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
  'u1111112-1111-1111-1111-111111111111',
  'c1111111-1111-1111-1111-111111111111',
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
  'l1111121-1111-1111-1111-111111111111',
  'u1111112-1111-1111-1111-111111111111',
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

### Binary Place Values

Each position represents a power of 2:

```
Position:  7    6    5    4    3    2    1    0
Value:    128   64   32   16    8    4    2    1
Binary:    1    0    1    1    0    1    0    1
          128 + 0 + 32 + 16 + 0 + 4 + 0 + 1 = 181 (decimal)
```

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
    
    # Process from right to left
    for bit in reversed(binary):
        if bit == ''1'':
            decimal += 2 ** power
        power += 1
    
    return decimal

# Test the functions
print(decimal_to_binary(42))      # "101010"
print(binary_to_decimal("101010")) # 42

# Python built-in functions
print(bin(42))    # ''0b101010'' (binary)
print(hex(42))    # ''0x2a'' (hexadecimal)
print(int(''101010'', 2))  # 42 (convert binary string to decimal)
```

## Data Representation

### Text Encoding: ASCII and Unicode

```python
# ASCII (7-bit, 128 characters)
char = ''A''
ascii_value = ord(char)
print(f"{char} in ASCII: {ascii_value}")  # 65
print(f"Binary: {bin(ascii_value)}")      # 0b1000001

# Unicode (millions of characters)
emoji = ''🎉''
unicode_value = ord(emoji)
print(f"{emoji} in Unicode: {unicode_value}")  # 127881
print(f"Binary: {bin(unicode_value)}")          # 0b11111001110001001

# Convert numbers back to characters
print(chr(65))     # ''A''
print(chr(127881)) # ''🎉''
```

### Colors in Binary (RGB)

```python
def rgb_to_binary(red, green, blue):
    """
    Convert RGB color to binary representation.
    Each color channel: 0-255 (8 bits)
    """
    red_bin = format(red, ''08b'')
    green_bin = format(green, ''08b'')
    blue_bin = format(blue, ''08b'')
    
    return f"{red_bin} {green_bin} {blue_bin}"

# Example: Purple color
print(rgb_to_binary(128, 0, 128))  # "10000000 00000000 10000000"

# Hex color code
def rgb_to_hex(red, green, blue):
    """Convert RGB to hex color code"""
    return f"#{red:02x}{green:02x}{blue:02x}"

print(rgb_to_hex(128, 0, 128))  # "#800080"
```

## Bits and Bytes

- **Bit**: Single binary digit (0 or 1)
- **Byte**: 8 bits
- **Kilobyte (KB)**: 1,024 bytes
- **Megabyte (MB)**: 1,024 KB
- **Gigabyte (GB)**: 1,024 MB
- **Terabyte (TB)**: 1,024 GB

```python
def format_file_size(bytes):
    """Convert bytes to human-readable format"""
    units = [''B'', ''KB'', ''MB'', ''GB'', ''TB'']
    size = bytes
    unit_index = 0
    
    while size >= 1024 and unit_index < len(units) - 1:
        size /= 1024
        unit_index += 1
    
    return f"{size:.2f} {units[unit_index]}"

print(format_file_size(1024))        # "1.00 KB"
print(format_file_size(1048576))     # "1.00 MB"
print(format_file_size(1073741824))  # "1.00 GB"
```

## Practice Projects

### 1. Binary Calculator
Build a calculator that can add two binary numbers.

### 2. Image Pixel Analyzer
Read image data and analyze color distribution.

### 3. Text Encoder
Create a simple cipher that shifts ASCII values.

## Key Concepts

- All computer data is ultimately binary
- Different encodings represent different types of information
- Understanding binary is fundamental to computer science
- Efficiency matters when representing large amounts of data

## AP Exam Connection

Binary and data representation questions commonly appear on the AP CSP exam. Focus on:
- Converting between number bases
- Understanding how different data types are represented
- Calculating data storage requirements
- Analyzing the efficiency of representations',
  1,
  55,
  NOW(),
  NOW()
);

-- Create checkpoints for active recall and practice
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
  'l1111111-1111-1111-1111-111111111111',
  'Even or Odd Checker',
  'Write a function that determines if a number is even or odd.',
  'beginner',
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
  'l1111112-1111-1111-1111-111111111111',
  'Temperature Converter',
  'Implement a celsius to fahrenheit converter using the formula: F = (C × 9/5) + 32',
  'beginner',
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
  'l1111113-1111-1111-1111-111111111111',
  'Grade Calculator',
  'Create a function that calculates a final grade from weighted scores.',
  'intermediate',
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

-- Success message
SELECT 'AP Computer Science Principles Elite Edition has been created successfully!' as message;
