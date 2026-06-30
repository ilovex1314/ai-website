export type Topic = {
  slug: string
  title: string
  tool: string
  category: 'charts' | '3d' | 'shader' | 'effects' | 'physics' | 'animation' | 'maps'
  summary: string
  demoGoal: string
  plannedInteractions: string[]
  acceptanceCriteria: string[]
  references: string[]
}

export const topics: Topic[] = [
  {
    slug: 'echarts',
    title: 'ECharts Interactive Charts',
    tool: 'Apache ECharts',
    category: 'charts',
    summary:
      'Use ECharts to build a Futu-style market chart with time-range tabs, hover trading details, trend colors, volume bars, drag panning, and reback.',
    demoGoal:
      'Build an interactive Nasdaq-style price line chart where users can switch time ranges, inspect trading fields on hover, and drag non-intraday windows.',
    plannedInteractions: [
      'Switch between 分时, 5日, 日K, 周K, 月K, 季K, and 年K ranges.',
      'Hover to inspect time, price, change, change percent, volume, and turnover.',
      'Drag non-intraday windows horizontally and restore the previous view with reback.',
    ],
    acceptanceCriteria: [
      'The demo renders a real ECharts instance inside the React page.',
      'Range buttons update the visible data window and clear drag offsets.',
      'The chart remains responsive on desktop and mobile widths.',
    ],
    references: ['https://echarts.apache.org/examples/en/index.html'],
  },
  {
    slug: 'spline',
    title: 'Spline 3D Embed',
    tool: 'Spline',
    category: '3d',
    summary:
      'Use Spline for polished 3D assets that are better sourced from an existing community scene than generated from scratch in code.',
    demoGoal:
      'Create a slide-like page that embeds a Spline scene with surrounding controls and notes for remix, export, and iframe integration.',
    plannedInteractions: [
      'Render a safe placeholder until an embed URL is configured.',
      'Document where the Spline iframe snippet belongs.',
      'Add a presentation frame that can later host a live community remix.',
    ],
    acceptanceCriteria: [
      'The page supports an iframe-based Spline embed path.',
      'The fallback state explains the missing embed without breaking layout.',
      'The embed container uses stable aspect-ratio sizing.',
    ],
    references: ['https://spline.design/', 'https://app.spline.design/community'],
  },
  {
    slug: 'threejs',
    title: 'Three.js Custom 3D Scene',
    tool: 'Three.js',
    category: '3d',
    summary:
      'Use Three.js when the desired 3D behavior is specific enough to code directly, such as camera motion, cursor-driven rotation, shaders, lights, and object state changes.',
    demoGoal:
      'Build a custom metal cube and animated gradient scene that responds to cursor position and can be used as a PPT background.',
    plannedInteractions: [
      'Render a full-bleed WebGL canvas.',
      'Rotate foreground geometry based on pointer movement.',
      'Pause or reduce motion for testing and accessibility.',
    ],
    acceptanceCriteria: [
      'The scene renders nonblank pixels in a canvas.',
      'Pointer movement changes camera or object orientation.',
      'The canvas is correctly framed at mobile and desktop sizes.',
    ],
    references: ['https://threejs.org/'],
  },
  {
    slug: 'shadertoy',
    title: 'Shadertoy Shader Remix',
    tool: 'Shadertoy GLSL',
    category: 'shader',
    summary:
      'Use Shadertoy as a source of mature shader ideas, then port or simplify the GLSL into a React/WebGL surface for controlled demo use.',
    demoGoal:
      'Create a shader background demo with editable uniforms for color, intensity, and speed so prompt-driven visual changes are easy to test.',
    plannedInteractions: [
      'Provide a small shader runtime wrapper.',
      'Expose uniform controls as React state.',
      'Keep a lightweight sample shader before importing heavier community code.',
    ],
    acceptanceCriteria: [
      'The shader renders in a canvas without external runtime errors.',
      'Uniform controls visibly change the output.',
      'The implementation documents porting constraints for Shadertoy tabs/channels.',
    ],
    references: ['https://www.shadertoy.com/browse'],
  },
  {
    slug: 'unicorn',
    title: 'Unicorn Studio Effects Embed',
    tool: 'Unicorn Studio',
    category: 'effects',
    summary:
      'Use Unicorn Studio for no-code WebGL motion assets when the fastest path is to remix an existing interactive effect and embed its HTML snippet.',
    demoGoal:
      'Build an effects showcase page that can host exported Unicorn HTML and compare it with a local fallback motion background.',
    plannedInteractions: [
      'Render a snippet-ready embed container.',
      'Show local fallback motion while the embed is absent.',
      'Track export notes for HTML embed handoff.',
    ],
    acceptanceCriteria: [
      'The embed container is isolated from the rest of the UI.',
      'The fallback demonstrates the target motion direction.',
      'The page records where exported HTML should be pasted.',
    ],
    references: ['https://www.unicorn.studio/'],
  },
  {
    slug: 'matterjs',
    title: 'Matter.js Physics Lab',
    tool: 'Matter.js',
    category: 'physics',
    summary:
      'Use Matter.js for 2D rigid-body physics demos like free fall, collisions, gravity, constraints, and draggable objects in educational slides.',
    demoGoal:
      'Build a physics lesson page with free fall and collision ball experiments, including direct manipulation so users can alter the animation path.',
    plannedInteractions: [
      'Start with a free fall scene.',
      'Add draggable collision bodies.',
      'Expose reset, gravity, and pause controls.',
    ],
    acceptanceCriteria: [
      'The demo runs a Matter.js engine inside React lifecycle boundaries.',
      'Users can drag at least one body and change the simulation outcome.',
      'Reset returns the scene to a deterministic starting state.',
    ],
    references: ['https://brm.io/matter-js/'],
  },
  {
    slug: 'rive',
    title: 'Rive Interactive 2D Animation',
    tool: 'Rive',
    category: 'animation',
    summary:
      'Use Rive for interactive 2D animation assets with state machines, especially where handcrafted SVG/CSS animation would be slower and less expressive.',
    demoGoal:
      'Create a slide panel that loads a Rive asset, starts automatically, and later lets topic state drive animation inputs.',
    plannedInteractions: [
      'Load a local or remote .riv file.',
      'Autoplay the default animation.',
      'Map React controls to state-machine inputs.',
    ],
    acceptanceCriteria: [
      'The page has a clear asset-loading boundary.',
      'The animation can run without blocking the rest of the UI.',
      'Controls are prepared for state-machine inputs.',
    ],
    references: ['https://rive.app/marketplace/'],
  },
  {
    slug: 'mapbox',
    title: 'Mapbox Interactive Map',
    tool: 'Mapbox GL JS',
    category: 'maps',
    summary:
      'Use Mapbox for draggable, zoomable, styled map experiences where geography, routes, regions, or location data need presentation-grade interaction.',
    demoGoal:
      'Build a map slide with a token-aware setup, sample route or region overlays, and controls for light, dark, and satellite-like map modes.',
    plannedInteractions: [
      'Gate the live map behind an environment-token check.',
      'Render sample marker and route data.',
      'Switch map styles from React controls.',
    ],
    acceptanceCriteria: [
      'The page handles a missing Mapbox token gracefully.',
      'A configured token renders an interactive map surface.',
      'Style switching does not remount the whole application shell.',
    ],
    references: ['https://docs.mapbox.com/mapbox-gl-js/guides/'],
  },
]

export function getTopicBySlug(slug: string) {
  return topics.find((topic) => topic.slug === slug)
}
