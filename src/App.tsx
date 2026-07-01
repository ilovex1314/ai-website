import { getTopicBySlug, topics } from './data/topics'
import { EchartsMarketDemo } from './features/market-chart/EchartsMarketDemo'
import { SplineProductShowcase } from './features/spline-showcase/SplineProductShowcase'
import './App.css'

function getCurrentTopicSlug(pathname: string) {
  const match = pathname.match(/^\/topics\/([^/]+)$/)
  return match?.[1]
}

function HomePage() {
  return (
    <main className="shell">
      <section className="hero">
        <p className="eyebrow">从 Vibe Coding 研究到可运行案例</p>
        <h1>AI 网站案例实验室</h1>
        <p className="lede">
          这是一个基于 React 和 Vite 的实验工作区，用来把 Claude Design
          研究拆成聚焦、可测试的互动案例。每个 topic 先成为计划页，再演进成一个能力证明。
        </p>
      </section>

      <section className="topic-grid" aria-label="案例目录">
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
  if (slug === 'echarts') {
    return <EchartsMarketDemo />
  }

  if (slug === 'spline') {
    return <SplineProductShowcase />
  }

  const topic = getTopicBySlug(slug)

  if (!topic) {
    return (
      <main className="shell detail-shell">
        <a className="back-link" href="/">
          返回目录
        </a>
        <section className="detail-panel">
          <p className="eyebrow">未知 topic</p>
          <h1>未找到案例计划</h1>
          <p className="lede">请从目录中选择一个已规划的方向。</p>
        </section>
      </main>
    )
  }

  return (
    <main className="shell detail-shell">
      <a className="back-link" href="/">
        返回目录
      </a>
      <section className="detail-panel">
        <p className="eyebrow">{topic.tool}</p>
        <h1>{topic.title}</h1>
        <p className="lede">{topic.demoGoal}</p>
      </section>

      <section className="detail-grid">
        <div>
          <h2>计划交互</h2>
          <ul>
            {topic.plannedInteractions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <h2>验收标准</h2>
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
