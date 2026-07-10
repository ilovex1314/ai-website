#!/usr/bin/env node
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'

const toolRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const schema = JSON.parse(await readFile(join(toolRoot, 'schema', 'animation-manifest.schema.json'), 'utf8'))

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validateSchema(value, rules, path = 'manifest') {
  const errors = []

  if (Object.hasOwn(rules, 'const') && value !== rules.const) {
    errors.push(path + ' must equal ' + JSON.stringify(rules.const))
    return errors
  }

  if (rules.type === 'object') {
    if (!isObject(value)) {
      return [path + ' must be an object']
    }

    for (const key of rules.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push(path + '.' + key + ' is required')
      }
    }

    if (rules.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(rules.properties ?? {}, key)) {
          errors.push(path + '.' + key + ' is not allowed')
        }
      }
    }

    for (const [key, childRules] of Object.entries(rules.properties ?? {})) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateSchema(value[key], childRules, path + '.' + key))
      }
    }
  }

  if (rules.type === 'array') {
    if (!Array.isArray(value)) {
      return [path + ' must be an array']
    }

    if (rules.minItems !== undefined && value.length < rules.minItems) {
      errors.push(path + ' must contain at least ' + rules.minItems + ' items')
    }

    value.forEach((item, index) => {
      errors.push(...validateSchema(item, rules.items, path + '[' + index + ']'))
    })
  }

  if (rules.type === 'string') {
    if (typeof value !== 'string') {
      return [path + ' must be a string']
    }

    if (rules.minLength !== undefined && value.length < rules.minLength) {
      errors.push(path + ' must not be empty')
    }
  }

  if (rules.type === 'integer') {
    if (!Number.isInteger(value)) {
      return [path + ' must be an integer']
    }

    if (rules.minimum !== undefined && value < rules.minimum) {
      errors.push(path + ' must be at least ' + rules.minimum)
    }
  }

  return errors
}

function duplicateErrors(ids, label) {
  const seen = new Set()
  const duplicates = new Set()

  ids.forEach((id) => {
    if (seen.has(id)) {
      duplicates.add(id)
    } else {
      seen.add(id)
    }
  })

  return [...duplicates].sort().map((id) => 'duplicate ' + label + ': ' + id)
}

function validateReferences(html, manifest) {
  const document = new JSDOM(html).window.document
  const sceneIds = [...document.querySelectorAll('[data-hf-scene-id]')].map((element) =>
    (element.getAttribute('data-hf-scene-id') ?? '').trim(),
  )
  const elementIds = [...document.querySelectorAll('[data-hf-element-id]')].map((element) =>
    (element.getAttribute('data-hf-element-id') ?? '').trim(),
  )
  const errors = []

  if (sceneIds.length === 0) errors.push('HTML must declare at least one data-hf-scene-id')
  if (elementIds.length === 0) errors.push('HTML must declare at least one data-hf-element-id')
  if (sceneIds.some((id) => id.length === 0)) errors.push('HTML data-hf-scene-id values must be non-empty')
  if (elementIds.some((id) => id.length === 0)) errors.push('HTML data-hf-element-id values must be non-empty')
  errors.push(...duplicateErrors(sceneIds, 'scene id'))
  errors.push(...duplicateErrors(elementIds, 'element id'))

  if (!isObject(manifest) || !Array.isArray(manifest.scenes) || !Array.isArray(manifest.animations)) {
    return errors
  }

  const manifestSceneIds = manifest.scenes.map((scene) => scene.id)
  errors.push(...duplicateErrors(manifestSceneIds, 'manifest scene id'))
  errors.push(...duplicateErrors(manifest.animations.map((animation) => animation.id), 'animation id'))

  manifest.scenes.forEach((scene) => {
    if (!sceneIds.includes(scene.id)) errors.push('scene id ' + scene.id + ' is missing from HTML')
    if (scene.fromFrame + scene.durationFrames > manifest.durationInFrames) {
      errors.push('scene ' + scene.id + ' exceeds durationInFrames')
    }
  })

  manifest.animations.forEach((animation) => {
    if (!manifestSceneIds.includes(animation.sceneId)) {
      errors.push('animation ' + animation.id + ' references unknown sceneId ' + animation.sceneId)
    }
    if (!elementIds.includes(animation.targetElementId)) {
      errors.push('animation ' + animation.id + ' targetElementId ' + animation.targetElementId + ' is missing from HTML')
    }
    if (animation.fromFrame + animation.durationFrames > manifest.durationInFrames) {
      errors.push('animation ' + animation.id + ' exceeds durationInFrames')
    }
  })

  return errors
}

const root = process.argv[2]

if (root === undefined) {
  console.error('Usage: node tools/hyperframes-course-source/scripts/validate.mjs <project-folder>')
  process.exitCode = 2
} else {
  try {
    const [html, manifestText] = await Promise.all([
      readFile(join(root, 'index.html'), 'utf8'),
      readFile(join(root, 'animation-manifest.json'), 'utf8'),
    ])
    const manifest = JSON.parse(manifestText)
    const errors = [...validateSchema(manifest, schema), ...validateReferences(html, manifest)]

    if (errors.length > 0) {
      errors.forEach((error) => console.error('INVALID: ' + error))
      process.exitCode = 1
    } else {
      console.log('VALID: ' + root)
    }
  } catch (error) {
    console.error('INVALID: ' + String(error))
    process.exitCode = 1
  }
}
