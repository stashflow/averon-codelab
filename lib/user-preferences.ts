'use client'

export type UserFeaturePreferences = {
  email_updates: boolean
  class_reminders: boolean
  quick_actions_bar: boolean
  activity_timeline_widgets: boolean
  keyboard_shortcuts: boolean
  saved_filters_and_sort: boolean
  draft_autosave: boolean
}

export const defaultUserFeaturePreferences: UserFeaturePreferences = {
  email_updates: true,
  class_reminders: true,
  quick_actions_bar: true,
  activity_timeline_widgets: true,
  keyboard_shortcuts: true,
  saved_filters_and_sort: false,
  draft_autosave: false,
}

export function getUserPreferencesStorageKey(userId: string) {
  return `acl:preferences:${userId}`
}

export function mergePreferences(raw: unknown): UserFeaturePreferences {
  const source = (raw || {}) as Partial<UserFeaturePreferences>
  return {
    email_updates: source.email_updates ?? defaultUserFeaturePreferences.email_updates,
    class_reminders: source.class_reminders ?? defaultUserFeaturePreferences.class_reminders,
    quick_actions_bar: source.quick_actions_bar ?? defaultUserFeaturePreferences.quick_actions_bar,
    activity_timeline_widgets: source.activity_timeline_widgets ?? defaultUserFeaturePreferences.activity_timeline_widgets,
    keyboard_shortcuts: source.keyboard_shortcuts ?? defaultUserFeaturePreferences.keyboard_shortcuts,
    saved_filters_and_sort: source.saved_filters_and_sort ?? defaultUserFeaturePreferences.saved_filters_and_sort,
    draft_autosave: source.draft_autosave ?? defaultUserFeaturePreferences.draft_autosave,
  }
}
