import { getTopicBySlug, topics } from './data/topics'
import './App.css'

function getCurrentTopicSlug(pathname: string) {
  const match = pathname.match(/^\/topics\/([^/]+)$/)
  return match?.[1]
}

function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">Vibe coding research to demos</p>
        <h1>AI Website Demo Lab</h1>
        <p className="lede">
          A React and Vite workspace for turning the Claude Design research into
          focused, testable demos. Each topic starts as a plan page, then becomes
          one interactive proof of capability.
        </p>
      </section>

      <section className="topic-grid" aria-label="Demo roadmap">
        {topics.map((topic, index) => (
          <article className="topic-card" key={topic.slug}>
            <div className="card-meta">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <span>{topic.tool}</span>
            </div>
            <h2>
              <a href={`/topics/${topic.slug}`}>{topic.title}</a>
            </h2>
            <p>{topic.summary}</p>
          </article>
        ))}
      </section>
    </main>
  )
}

function TopicPage({ slug }: { slug: string }) {
  const topic = getTopicBySlug(slug)

  if (!topic) {
    return (
      <main className="shell detail-shell">
        <a className="back-link" href="/">
          Back to roadmap
        </a>
        <section className="detail-panel">
          <p className="eyebrow">Unknown topic</p>
          <h1>Demo plan not found</h1>
          <p className="lede">Pick one of the planned tracks from the roadmap.</p>
        </section>
      </main>
    )
  }

  return (
    <main className="shell detail-shell">
      <a className="back-link" href="/">
        Back to roadmap
      </a>
      <section className="detail-panel">
        <p className="eyebrow">{topic.tool}</p>
        <h1>{topic.title}</h1>
        <p className="lede">{topic.demoGoal}</p>
      </section>

      <section className="detail-grid">
        <div>
          <h2>Planned interactions</h2>
          <ul>
            {topic.plannedInteractions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>Acceptance criteria</h2>
          <ul>
            {topic.acceptanceCriteria.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  )
}

function App() {
  const slug = getCurrentTopicSlug(window.location.pathname)
  return slug ? <TopicPage slug={slug} /> : <HomePage />
}

export default App
