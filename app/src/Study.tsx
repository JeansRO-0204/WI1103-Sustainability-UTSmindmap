import Cards from './Cards'
import Progress from './Progress'
import Quiz from './Quiz'
import type { Launch, StudyCtx } from './Setup'
import type { QuizState } from './quizlib'

export type View = 'map' | 'quiz' | 'cards' | 'progress'

export function ModeSeg({ view, setView, className }: { view: View; setView: (v: View) => void; className?: string }) {
  const items: [View, string][] = [['map', 'Map'], ['quiz', 'Quiz'], ['cards', 'Cards'], ['progress', 'Progress']]
  return (
    <div className={'seg modeseg ' + (className ?? '')} role="tablist" aria-label="Study mode">
      {items.map(([v, l]) => <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>{l}</button>)}
    </div>
  )
}

interface Props {
  ctx: StudyCtx | null
  view: View
  setView: (v: View) => void
  launch: Launch | null
  reviewed: string[]
  mergeProgress: (reviewed: string[], quiz: QuizState) => { newReviewed: number; newAttempts: number; itemsTouched: number }
}

/** Overlay on top of the (still mounted) map. Panes stay mounted once opened so a half-finished quiz survives a trip to the map. */
export default function Study({ ctx, view, setView, launch, reviewed, mergeProgress }: Props) {
  const open = view !== 'map'
  return (
    <div className="study" hidden={!open}>
      <div className="study-bar">
        <ModeSeg view={view} setView={setView} />
        <span className="grow" />
        {ctx?.qd.sample && <span className="sample small">SAMPLE QUIZ DATA</span>}
      </div>
      {!ctx ? (
        <div className="study-body"><div className="notice warn">No quiz data found. Run <code>python3 build/quiz_merge.py</code> to create <code>knowledge/quiz/quiz.json</code>.</div></div>
      ) : (
        <>
          <div className="pane" hidden={view !== 'quiz'}><Quiz ctx={ctx} active={view === 'quiz'} launch={launch} /></div>
          <div className="pane" hidden={view !== 'cards'}><Cards ctx={ctx} active={view === 'cards'} launch={launch} /></div>
          <div className="pane" hidden={view !== 'progress'}><Progress ctx={ctx} reviewed={reviewed} mergeProgress={mergeProgress} /></div>
        </>
      )}
    </div>
  )
}
