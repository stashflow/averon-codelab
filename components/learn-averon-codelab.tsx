'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { UserFeaturePreferences } from '@/lib/user-preferences'

type LearnItem = {
  key: keyof UserFeaturePreferences
  title: string
  description: string
  impact: string
}

const learnItems: LearnItem[] = [
  {
    key: 'quick_actions_bar',
    title: 'Quick Actions Bar',
    description: 'Pins common classroom and assignment actions so you can move faster between core tasks.',
    impact: 'Best for daily workflow speed on student and teacher dashboards.',
  },
  {
    key: 'activity_timeline_widgets',
    title: 'Activity Timeline Widgets',
    description: 'Highlights recent progress, milestones, and class events in chronological context.',
    impact: 'Useful for spotting momentum and identifying where to intervene next.',
  },
  {
    key: 'keyboard_shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Enables shortcut hints and keyboard-first interaction patterns in supported screens.',
    impact: 'Improves fluency for power users and high-frequency classroom navigation.',
  },
  {
    key: 'saved_filters_and_sort',
    title: 'Saved Filters and Sort',
    description: 'Stores your preferred filtering and sorting choices for list-heavy pages.',
    impact: 'Cuts repetitive setup when reviewing classes, assignments, and progress data.',
  },
  {
    key: 'draft_autosave',
    title: 'Draft Autosave',
    description: 'Preserves in-progress work in supported editors to protect against accidental loss.',
    impact: 'Recommended for longer responses and coding sessions.',
  },
]

export function LearnAveronCodeLab({
  preferences,
  onPreferenceChange,
}: {
  preferences: UserFeaturePreferences
  onPreferenceChange: (key: keyof UserFeaturePreferences, value: boolean) => void
}) {
  return (
    <Card className="border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-white">Learn Averon Code Lab</CardTitle>
        <CardDescription className="text-slate-300">
          Enable focused productivity features. Some are on by default, while advanced options stay opt-in.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {learnItems.map((item) => {
          const enabled = preferences[item.key]
          return (
            <div key={item.key} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-base">{item.title}</Label>
                    <Badge variant={enabled ? 'default' : 'secondary'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
                  </div>
                  <p className="text-sm text-slate-300">{item.description}</p>
                  <p className="text-xs text-slate-400">{item.impact}</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={(checked) => onPreferenceChange(item.key, checked)}
                />
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
