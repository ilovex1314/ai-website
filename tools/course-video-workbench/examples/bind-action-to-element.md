# Bind Action To Element

Given:

```json
{
  "selectedActionId": "highlight-box",
  "selectedElementId": "element-code-sample",
  "selectedSegmentId": "seg-code-demo"
}
```

Add a timeline ref:

```json
{
  "actionId": "highlight-box",
  "elementId": "element-code-sample",
  "from": 54,
  "duration": 72
}
```

The action time ruler should display:

```text
highlight-box -> 代码示例区域
```

Keep `from` relative to the segment start, not absolute project frame.
