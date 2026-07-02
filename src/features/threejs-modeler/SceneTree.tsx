import type { Dispatch } from 'react'
import type { ModelDocument, ModelerAction } from './modelerTypes'

type SceneTreeProps = {
  document: ModelDocument
  dispatch: Dispatch<ModelerAction>
}

export function SceneTree({ document, dispatch }: SceneTreeProps) {
  return (
    <section className="panel-section">
      <h2>对象树</h2>
      <div className="scene-tree" role="list">
        {document.parts.map((part) => (
          <button
            className={document.selectedPartId === part.id ? 'tree-item is-selected' : 'tree-item'}
            key={part.id}
            type="button"
            role="listitem"
            onClick={() => dispatch({ type: 'select-part', id: part.id })}
          >
            <span>{part.name}</span>
            <small>{part.primitive}</small>
          </button>
        ))}
      </div>
    </section>
  )
}
