import type { AnimationAction, AnimationActionStatus, CourseWorkbenchAction } from './workbenchTypes'

type CourseActionEditorProps = {
  action: AnimationAction
  dispatch: React.Dispatch<CourseWorkbenchAction>
}

function numberValue(value: number | undefined) {
  return value ?? 0
}

function opacityValue(value: number | undefined) {
  return value ?? 0
}

export function CourseActionEditor({ action, dispatch }: CourseActionEditorProps) {
  return (
    <section className="course-card course-card--editor">
      <div className="course-card__header">
        <p>Action Editor</p>
        <span>{action.id}</span>
      </div>
      <h2>Inspector</h2>
      <div className="editor-grid">
        <label>
          动作名称
          <input
            value={action.name}
            onChange={(event) =>
              dispatch({ type: 'update-action', id: action.id, patch: { name: event.target.value } })
            }
          />
        </label>
        <label>
          动作状态
          <select
            value={action.status}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { status: event.target.value as AnimationActionStatus },
              })
            }
          >
            <option value="draft">draft</option>
            <option value="ready">ready</option>
            <option value="deprecated">deprecated</option>
          </select>
        </label>
        <label className="editor-grid__wide">
          描述
          <textarea
            value={action.description}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { description: event.target.value },
              })
            }
          />
        </label>
        <label>
          标签
          <input
            value={action.params.label ?? action.params.text ?? action.params.title ?? ''}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: {
                  params: {
                    label: event.target.value,
                    text: event.target.value,
                    title: event.target.value,
                  },
                },
              })
            }
          />
        </label>
        <label>
          边框颜色
          <input
            type="color"
            value={action.params.color ?? '#2563eb'}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { color: event.target.value } },
              })
            }
          />
        </label>
        <label>
          边框色值
          <input readOnly value={action.params.color ?? '#2563eb'} />
        </label>
        <label>
          边框圆角
          <input
            type="number"
            min="0"
            max="80"
            value={numberValue(action.params.borderRadius ?? action.params.radius)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { borderRadius: Number(event.target.value), radius: Number(event.target.value) } },
              })
            }
          />
        </label>
        <label>
          背景颜色
          <input
            type="color"
            value={action.params.backgroundColor ?? '#ffffff'}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { backgroundColor: event.target.value } },
              })
            }
          />
        </label>
        <label>
          背景透明度
          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            value={opacityValue(action.params.backgroundOpacity)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { backgroundOpacity: Number(event.target.value) } },
              })
            }
          />
        </label>
        <label>
          X
          <input
            type="number"
            value={numberValue(action.params.x)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { x: Number(event.target.value) } },
              })
            }
          />
        </label>
        <label>
          Y
          <input
            type="number"
            value={numberValue(action.params.y)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { y: Number(event.target.value) } },
              })
            }
          />
        </label>
        <label>
          宽度
          <input
            type="number"
            value={numberValue(action.params.width)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { width: Number(event.target.value) } },
              })
            }
          />
        </label>
        <label>
          高度
          <input
            type="number"
            value={numberValue(action.params.height)}
            onChange={(event) =>
              dispatch({
                type: 'update-action',
                id: action.id,
                patch: { params: { height: Number(event.target.value) } },
              })
            }
          />
        </label>
      </div>
      <div className="editor-actions">
        <button
          className="course-button"
          type="button"
          onClick={() => dispatch({ type: 'duplicate-action', id: action.id })}
        >
          复制动作
        </button>
        <button
          className="course-button course-button--danger"
          type="button"
          onClick={() => dispatch({ type: 'delete-action', id: action.id })}
        >
          删除动作
        </button>
      </div>
    </section>
  )
}
