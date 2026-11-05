import {
  ModuleData,
  ScheduleItem,
  SyllabusActivityEvent,
  SyllabusAssessment,
  SyllabusAssessmentQuestion
} from '../types';

const inheritanceQuestions: SyllabusAssessmentQuestion[] = [
  {
    question: 'What is the primary purpose of inheritance in object-oriented programming?',
    options: ['Reuse and extend behavior from another class', 'Create a database connection', 'Restrict every attribute to be public', 'Run a function asynchronously'],
    correctOption: 0
  },
  {
    question: 'In Python, which syntax declares Dog as a subclass of Animal?',
    options: ['class Dog(Animal):', 'class Dog extends Animal:', 'subclass Dog = Animal:', 'class Dog -> Animal:'],
    correctOption: 0
  },
  {
    question: 'What does the method resolution order (MRO) determine?',
    options: ['The order Python searches classes for an attribute or method', 'The order object attributes are stored in memory', 'The order constructor arguments are converted', 'The order modules are imported'],
    correctOption: 0
  },
  {
    question: 'Which built-in function can be used to inspect a class MRO?',
    options: ['ClassName.mro()', 'ClassName.resolve()', 'ClassName.parents()', 'ClassName.inherits()'],
    correctOption: 0
  },
  {
    question: 'What is the usual role of super() in an overriding method?',
    options: ['Call the next implementation in the method resolution order', 'Create a new parent class', 'Disable the parent implementation permanently', 'Convert an instance into a class'],
    correctOption: 0
  },
  {
    question: 'Which statement about multiple inheritance in Python is correct?',
    options: ['A class may inherit from more than one base class', 'A class may have only one method', 'Base classes must be abstract', 'It is available only to dataclasses'],
    correctOption: 0
  },
  {
    question: 'When is composition often preferable to inheritance?',
    options: ['When one object should use another without being a specialized form of it', 'Whenever two classes have different names', 'When a child must override every parent method', 'When methods should be stored as global variables'],
    correctOption: 0
  },
  {
    question: 'What does hierarchical inheritance describe?',
    options: ['Multiple subclasses inheriting from one base class', 'One class inheriting from several unrelated classes', 'A class inheriting from itself', 'A sequence of functions calling one another'],
    correctOption: 0
  },
  {
    question: 'What is a common risk of deep inheritance hierarchies?',
    options: ['Behavior and dependencies can become difficult to understand', 'Python stops supporting polymorphism', 'Instances cannot have methods', 'The base class is deleted automatically'],
    correctOption: 0
  },
  {
    question: 'Which is a good inheritance design?',
    options: ['The subclass is a meaningful specialized form of its base class', 'The subclass inherits only to access an unrelated utility', 'Every class inherits from every other class', 'The base class contains application-specific global state'],
    correctOption: 0
  }
];

const questionStems = [
  'Which statement best describes',
  'What is a common use of',
  'Which choice is most closely associated with',
  'When applying',
  'Which is a good practice for',
  'What should a developer verify when using',
  'Which situation is an example of',
  'What is the main benefit of',
  'Which statement about is correct for',
  'Which outcome indicates correct use of'
];

export function createSyllabusAssessmentQuestions(
  topicId: string,
  topicName: string,
  moduleTopics: ModuleData['topics']
): SyllabusAssessmentQuestion[] {
  if (topicId === 'top-2-03') return inheritanceQuestions;

  const distractors = moduleTopics
    .filter((topic) => topic.title !== topicName)
    .slice(0, 3)
    .map((topic) => topic.title);
  const incorrectOptions = [
    distractors[0] || 'an unrelated module feature',
    distractors[1] || 'a database connection',
    distractors[2] || 'a user-interface layout'
  ];

  return questionStems.map((stem) => ({
    question: `${stem} "${topicName}"?`,
    options: [topicName, ...incorrectOptions],
    correctOption: 0
  }));
}

export function getInitialSyllabusAssessments(
  schedules: ScheduleItem[],
  module: ModuleData
): SyllabusAssessment[] {
  const createAssessment = (
    schedule: ScheduleItem,
    topicId: string,
    attempt: number,
    submittedScores: Array<number | null>,
    classAgainStarted = false
  ): SyllabusAssessment | undefined => {
    const topic = module.topics.find((item) => item.id === topicId);
    if (!topic) return undefined;
    const now = new Date().toISOString();
    const students = schedule.students.map((student, index) => {
      const score = submittedScores[index] ?? null;
      return {
        studentId: student.id,
        studentName: student.name,
        score,
        ...(score === null ? {} : { submittedAt: now })
      };
    });
    const submittedCount = students.filter((student) => student.score !== null).length;
    const status = submittedCount === 0
      ? 'Sent'
      : submittedCount === students.length
        ? 'Completed'
        : 'In Progress';

    return {
      id: `sample-${schedule.id}-${topic.id}-${attempt}`,
      batchId: schedule.batchId || schedule.id,
      moduleId: module.id,
      topicId: topic.id,
      topicName: topic.title,
      attempt,
      questions: createSyllabusAssessmentQuestions(topic.id, topic.title, module.topics),
      students,
      status,
      sentAt: now,
      ...(status === 'Completed' ? { completedAt: now } : {}),
      ...(classAgainStarted ? { classAgainStartedAt: now } : {})
    };
  };

  return schedules
    .filter((schedule) => schedule.id === 'batch-mwf' || schedule.id === 'batch-daily')
    .flatMap((schedule) => {
      const failedScores = schedule.students.map((_, index) =>
        index === 2 ? 7 : 8 + (index % 3)
      );
      const passedScores = schedule.students.map((_, index) => 8 + (index % 3));
      const retakeScores = schedule.students.map((_, index) =>
        index === 1 || index === 6 ? 7 : 8 + (index % 3)
      );
      const cases: Array<[string, Array<number | null>, boolean?]> = schedule.id === 'batch-mwf'
        ? [
            ['top-2-03', []],
            ['top-2-04', [8, 9, 7, 10]],
            ['top-2-05', failedScores],
            ['top-2-06', passedScores],
            ['top-2-07', retakeScores, true]
          ]
        : module.topics.map((topic) => [topic.id, passedScores]);
      return cases.map(([topicId, scores, classAgainStarted]) =>
        createAssessment(schedule, topicId, 1, scores, classAgainStarted)
      );
    })
    .filter((assessment): assessment is SyllabusAssessment => assessment !== undefined);
}

export function mergeInitialSyllabusAssessments(
  savedAssessments: SyllabusAssessment[],
  initialAssessments: SyllabusAssessment[]
): SyllabusAssessment[] {
  const sampleDailyAssessments = initialAssessments.filter(
    (assessment) => assessment.batchId === 'batch-daily'
  );
  const sampleDailyIds = new Set(sampleDailyAssessments.map((assessment) => assessment.id));
  const savedById = new Map(
    savedAssessments
      .filter((assessment) => !sampleDailyIds.has(assessment.id))
      .map((assessment) => [assessment.id, assessment])
  );
  initialAssessments.forEach((assessment) => {
    if (assessment.batchId === 'batch-daily' || !savedById.has(assessment.id)) {
      savedById.set(assessment.id, assessment);
    }
  });
  return [...savedById.values()];
}

export function getInitialAssessmentActivityEvents(
  assessments: SyllabusAssessment[],
  module: ModuleData
): SyllabusActivityEvent[] {
  const now = new Date().toISOString();
  return assessments.flatMap((assessment) => {
    const topic = module.topics.find((item) => item.id === assessment.topicId);
    if (!topic) return [];
    const base = {
      timestamp: assessment.completedAt || assessment.sentAt || now,
      displayDate: (assessment.completedAt || assessment.sentAt || now).slice(0, 10),
      batchId: assessment.batchId,
      moduleId: assessment.moduleId,
      moduleName: module.name,
      topicId: topic.id,
      topicName: topic.title,
      topicNumber: topic.number,
      assessmentId: assessment.id,
      savedStatus: 'Saved' as const
    };
    const events: SyllabusActivityEvent[] = [{
      ...base,
      id: `${assessment.id}-sent`,
      timestamp: assessment.sentAt,
      displayDate: assessment.sentAt.slice(0, 10),
      eventType: 'MCQ Assessment Sent',
      details: `${assessment.questions.length} questions sent to ${assessment.students.length} students.`
    }];
    if (assessment.status === 'In Progress') {
      events.push({
        ...base,
        id: `${assessment.id}-progress`,
        eventType: 'MCQ Assessment Sent',
        details: `${assessment.students.filter((student) => student.score !== null).length} students have started submitting responses.`
      });
    }
    if (assessment.status === 'Completed') {
      const failedCount = assessment.students.filter((student) => student.score === null || student.score <= 7).length;
      events.push({
        ...base,
        id: `${assessment.id}-completed`,
        eventType: 'MCQ Assessment Completed',
        details: failedCount === 0 ? 'All students scored above 75%.' : `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below.`
      });
      if (failedCount > 0) {
        events.push({
          ...base,
          id: `${assessment.id}-retake-required`,
          eventType: 'Topic Requires Retake',
          details: `${failedCount} student${failedCount === 1 ? '' : 's'} scored 75% or below.`
        });
      }
    }
    if (assessment.classAgainStartedAt) {
      events.push({
        ...base,
        id: `${assessment.id}-class-again`,
        timestamp: assessment.classAgainStartedAt,
        displayDate: assessment.classAgainStartedAt.slice(0, 10),
        eventType: 'Topic Being Taken Again',
        details: 'Trainer conducting another session for this topic.'
      });
    }
    return events;
  });
}
