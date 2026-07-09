import type { AnimationAction, CourseWorkbenchAction, TimelineSegment } from './workbenchTypes'

type CourseTimelinePanelProps = {
  timeline: TimelineSegment[]
  actions: AnimationAction[]
  selectedSegmentId: string
  dispatch: React.Dispatch<CourseWorkbenchAction>
}

export function CourseTimelinePanel({
  timeline,
  actions,
  selectedSegmentId,
  dispatch,
}: CourseTimelinePanelProps) {
  return (
    <section className="course-card course-card--timeline">
      <div className="course-card__header">
        <p>Timeline</p>
        <span>{timeline.length} segments</span>
      </div>
      <h2>Timeline</h2>
      <div className="timeline-list">
        {timeline.map((segment) => (
          <button
            className="timeline-item"
            key={segment.id}
            type="button"
            aria-pressed={segment.id === selectedSegmentId}
            onClick={() => dispatch({ type: 'select-segment', id: segment.id })}
          >
            <span className="timeline-item__title">{segment.title}</span>
            <span>
              Slide {segment.slide} · {segment.from}-{segment.from + segment.duration}f
            </span>
            <span>{segment.caption}</span>
            <small aria-hidden="true">
              {segment.actionRefs
                .map((ref) => actions.find((action) => action.id === ref.actionId)?.name)
                .filter(Boolean)
                .join(' / ')}
            </small>
          </button>
        ))}
      </div>
    </section>
  )
}
