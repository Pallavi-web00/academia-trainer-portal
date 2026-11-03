import { ModuleData } from '../types';

/**
 * Configurable Syllabus & Module Data
 * Exclusively configured for "Advanced Python & Database foundation".
 * Contains all 40 planned topics as specified.
 */
export const initialModulesData: ModuleData[] = [
  {
    id: 'mod-2',
    code: 'AI-202',
    name: 'Advanced Python & Database foundation',
    batch: 'Morning & Afternoon Batches',
    level: 'Advanced',
    duration: '2 months',
    totalSessions: 40,
    description: 'Comprehensive curriculum covering advanced Python object-oriented design, async paradigms, relational RDBMS (PostgreSQL/MySQL), and NoSQL persistence.',
    topics: [
      { id: 'top-2-01', number: 1, title: 'Advanced Python refresher - data types, comprehensions, *args/**kwargs', isCompleted: false },
      { id: 'top-2-02', number: 2, title: 'OOP fundamentals - classes, objects, constructors, attributes', isCompleted: false },
      { id: 'top-2-03', number: 3, title: 'OOP - inheritance: single, multiple, multilevel, hierarchical', isCompleted: false },
      { id: 'top-2-04', number: 4, title: 'OOP - Polymorphism and method overriding', isCompleted: false },
      { id: 'top-2-05', number: 5, title: 'OOP - Encapsulation, abstraction and access modifiers', isCompleted: false },
      { id: 'top-2-06', number: 6, title: 'Class methods, static methods, properties and decorators', isCompleted: false },
      { id: 'top-2-07', number: 7, title: 'Magic/dunder methods (__init__, __str__, __repr__, __eq__)', isCompleted: false },
      { id: 'top-2-08', number: 8, title: 'Abstract Base Classes and interfaces', isCompleted: false },
      { id: 'top-2-09', number: 9, title: 'Operator overloading', isCompleted: false },
      { id: 'top-2-10', number: 10, title: 'Mini OOP project — class-based system design (e.g. banking system)', isCompleted: false },
      { id: 'top-2-11', number: 11, title: 'Iterators and generators', isCompleted: false },
      { id: 'top-2-12', number: 12, title: 'Decorators — function and class decorators', isCompleted: false },
      { id: 'top-2-13', number: 13, title: "Context managers and the 'with' statement", isCompleted: false },
      { id: 'top-2-14', number: 14, title: 'Lambda, map, filter, and reduce', isCompleted: false },
      { id: 'top-2-15', number: 15, title: 'Regular expressions (re module)', isCompleted: false },
      { id: 'top-2-16', number: 16, title: 'File handling — reading and writing text files', isCompleted: false },
      { id: 'top-2-17', number: 17, title: 'File handling — CSV, JSON, and XML operations', isCompleted: false },
      { id: 'top-2-18', number: 18, title: 'Serialization with Pickle', isCompleted: false },
      { id: 'top-2-19', number: 19, title: 'Exception handling — try/except/finally, custom exceptions', isCompleted: false },
      { id: 'top-2-20', number: 20, title: 'Logging module and debugging techniques', isCompleted: false },
      { id: 'top-2-21', number: 21, title: 'Modules and packages — creating custom packages', isCompleted: false },
      { id: 'top-2-22', number: 22, title: 'Virtual environments and dependency management (pip, venv)', isCompleted: false },
      { id: 'top-2-23', number: 23, title: 'Unit testing with unittest/pytest', isCompleted: false },
      { id: 'top-2-24', number: 24, title: 'Multithreading and multiprocessing basics', isCompleted: false },
      { id: 'top-2-25', number: 25, title: 'Python project structuring best practices and mini-project review', isCompleted: false },
      { id: 'top-2-26', number: 26, title: 'Introduction to databases — RDBMS vs NoSQL', isCompleted: false },
      { id: 'top-2-27', number: 27, title: 'Database design — tables, keys, relationships, normalization', isCompleted: false },
      { id: 'top-2-28', number: 28, title: 'SQL basics — SELECT, WHERE, ORDER BY, filtering', isCompleted: false },
      { id: 'top-2-29', number: 29, title: 'SQL — aggregate functions, GROUP BY, HAVING', isCompleted: false },
      { id: 'top-2-30', number: 30, title: 'SQL — joins (INNER, LEFT, RIGHT, FULL)', isCompleted: false },
      { id: 'top-2-31', number: 31, title: 'SQL — subqueries and nested queries', isCompleted: false },
      { id: 'top-2-32', number: 32, title: 'SQL — views, indexes, and query optimization', isCompleted: false },
      { id: 'top-2-33', number: 33, title: 'SQL — stored procedures and functions', isCompleted: false },
      { id: 'top-2-34', number: 34, title: 'SQL — transactions and ACID properties', isCompleted: false },
      { id: 'top-2-35', number: 35, title: 'Introduction to NoSQL databases (MongoDB basics)', isCompleted: false },
      { id: 'top-2-36', number: 36, title: 'Python–SQL connectivity using sqlite3 / mysql-connector', isCompleted: false },
      { id: 'top-2-37', number: 37, title: 'Python–MongoDB connectivity using PyMongo', isCompleted: false },
      { id: 'top-2-38', number: 38, title: 'Building CRUD applications with Python and databases', isCompleted: false },
      { id: 'top-2-39', number: 39, title: 'ORM concepts — introduction to SQLAlchemy', isCompleted: false },
      { id: 'top-2-40', number: 40, title: 'Module 2 Capstone — end-to-end Python + Database application, review & assessment', isCompleted: false }
    ]
  }
];
