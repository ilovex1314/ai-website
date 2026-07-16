import { useRef, useState } from 'react'
import type { IntegrationRecipeModel } from './portingModel'

export function IntegrationRecipe({ recipe }: { recipe: IntegrationRecipeModel }) {
  const [feedback, setFeedback] = useState('')
  const textareas = useRef<Record<string, HTMLTextAreaElement | null>>({})

  const copySection = async (id: string, text: string) => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(text)
      setFeedback('已复制到剪贴板')
    } catch {
      const textarea = textareas.current[id]
      textarea?.focus()
      textarea?.select()
      setFeedback('请手动复制已选文本')
    }
  }

  return (
    <section className="shader-recipe">
      <h2>{recipe.title}</h2>
      <p>这份配方只来自当前浏览器已经成功编译的 revision。</p>
      {recipe.sections.map((section) => {
        const content = section.code ?? section.body
        return (
          <article key={section.id}>
            <div className="shader-section-heading">
              <div>
                <h3>{section.title}</h3>
                {section.code ? <p>{section.body}</p> : null}
              </div>
              <button onClick={() => void copySection(section.id, content)}>复制本节</button>
            </div>
            <pre><code>{content}</code></pre>
            <textarea
              className="shader-copy-source"
              aria-label={`${section.title} 可复制文本`}
              ref={(node) => { textareas.current[section.id] = node }}
              readOnly
              value={content}
            />
          </article>
        )
      })}
      <p aria-live="polite">{feedback}</p>
    </section>
  )
}
