export const CANONICAL_AP_CSP_COURSE_ID = '00000000-0000-0000-0000-000000000010'

type CourseLike = {
  id: string
  name?: string | null
}

function normalizeCourseName(name: string | null | undefined) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function isSeededCourseId(id: string | null | undefined) {
  return /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(String(id || ''))
}

export function isCanonicalApcspCourse(course: CourseLike | null | undefined) {
  return Boolean(course?.id === CANONICAL_AP_CSP_COURSE_ID)
}

export function isApcspCourse(course: CourseLike | null | undefined) {
  return normalizeCourseName(course?.name).includes('ap computer science principles')
}

function preferenceScore(course: CourseLike) {
  let score = 0
  if (course.id === CANONICAL_AP_CSP_COURSE_ID) score += 100
  if (isSeededCourseId(course.id)) score += 10
  return score
}

export function dedupeCoursesByName<T extends CourseLike>(courses: T[]): T[] {
  const bestByName = new Map<string, T>()

  for (const course of courses) {
    const key = normalizeCourseName(course.name)
    if (!key) continue
    const existing = bestByName.get(key)
    if (!existing || preferenceScore(course) > preferenceScore(existing)) {
      bestByName.set(key, course)
    }
  }

  return courses.filter((course) => {
    const key = normalizeCourseName(course.name)
    return key && bestByName.get(key)?.id === course.id
  })
}
