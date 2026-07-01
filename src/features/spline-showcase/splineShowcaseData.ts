export type SplineEmbedMode = 'viewer' | 'react-spline' | 'iframe' | 'local-css-3d'

export type ModelPartKind =
  | 'body'
  | 'lens'
  | 'screen'
  | 'button'
  | 'port'
  | 'mount'
  | 'watermark'

export type ModelPart = {
  id: string
  label: string
  kind: ModelPartKind
  className: string
  material: string
  position: [number, number, number]
  size: [number, number, number]
  rotation?: [number, number, number]
  radius?: number
  text?: string
}

export type ProductHotspot = {
  id: string
  partId: string
  label: string
  description: string
  specs: string[]
}

export type ProductSpec = {
  label: string
  value: string
  note?: string
}

export type ProductShowcase = {
  product: {
    id: string
    name: string
    brand: string
    tagline: string
    description: string
    disclaimer: string
  }
  scene: {
    provider: 'spline'
    embedMode: SplineEmbedMode
    sceneUrl?: string
    localModelUrl: string
    sourceAsset: {
      format: 'glb'
      url: string
      purpose: string
    }
    fallbackPoster?: string
  }
  model: {
    dimensionsMm: {
      width: number
      height: number
      depth: number
    }
    watermark: string
    parts: ModelPart[]
  }
  hotspots: ProductHotspot[]
  specs: ProductSpec[]
  sources: Array<{
    label: string
    url: string
  }>
}

export const actionSixInspiredShowcase: ProductShowcase = {
  product: {
    id: 'action-6-inspired',
    name: 'Action 6 灵感原创模型',
    brand: 'Original demo',
    tagline: '可拖拽旋转的运动相机 3D 产品展示',
    description:
      '以公开规格和官网视觉语言为参考，重新抽象的原创运动相机模型，用来演示 Spline 产品页的数据结构和交互边界。',
    disclaimer:
      '非 DJI 官方 3D 资产；不使用 DJI logo、官方 UI、CAD 或精确工业设计。模型保留原创水印。',
  },
  scene: {
    provider: 'spline',
    embedMode: 'local-css-3d',
    sceneUrl: undefined,
    localModelUrl: '/models/action-6-inspired/local-model.json',
    sourceAsset: {
      format: 'glb',
      url: '/models/action-6-inspired/action-6-inspired-study.glb',
      purpose:
        '导入 Spline 编辑器的原创教学源模型；当前还没有可用的 Action 6 Spline 发布 URL。',
    },
  },
  model: {
    dimensionsMm: {
      width: 72.8,
      height: 47.2,
      depth: 33.1,
    },
    watermark: 'ORIGINAL DEMO MODEL',
    parts: [
      {
        id: 'body',
        label: '镁灰色防护机身',
        kind: 'body',
        className: 'part-body',
        material: '微磨砂深灰复合材质',
        position: [0, 0, 0],
        size: [72.8, 47.2, 33.1],
        radius: 7.4,
      },
      {
        id: 'lens',
        label: '可变光圈镜头模组',
        kind: 'lens',
        className: 'part-lens',
        material: '蓝绿色阳极环 + 深色镀膜玻璃',
        position: [-18, -1, 18],
        size: [28, 28, 10],
        radius: 14,
      },
      {
        id: 'front-screen',
        label: '前置取景屏',
        kind: 'screen',
        className: 'part-front-screen',
        material: '黑色玻璃触摸屏',
        position: [18, 0, 19],
        size: [22, 18, 2],
        text: 'DEMO CAM',
      },
      {
        id: 'top-button',
        label: '顶部录制键',
        kind: 'button',
        className: 'part-top-button',
        material: '高可见橙色软胶按键',
        position: [8, -25, 11],
        size: [22, 4, 8],
      },
      {
        id: 'side-door',
        label: '侧边接口门',
        kind: 'port',
        className: 'part-side-door',
        material: '密封接口盖',
        position: [38, 2, 0],
        size: [4, 24, 18],
      },
      {
        id: 'rear-screen',
        label: '后置触摸屏',
        kind: 'screen',
        className: 'part-rear-screen',
        material: '背面玻璃屏幕',
        position: [2, 0, -18],
        size: [46, 31, 2],
        rotation: [0, 180, 0],
        text: '155 FOV',
      },
      {
        id: 'mount',
        label: '原创快拆底座',
        kind: 'mount',
        className: 'part-mount',
        material: '非官方 V 形导轨底座',
        position: [6, 29, 4],
        size: [32, 10, 18],
      },
      {
        id: 'watermark',
        label: '原创水印',
        kind: 'watermark',
        className: 'part-watermark',
        material: '侵权防护标记',
        position: [19, 18, 20],
        size: [24, 5, 1],
        rotation: [0, 0, -5],
        text: 'ORIGINAL DEMO MODEL',
      },
    ],
  },
  hotspots: [
    {
      id: 'lens-hotspot',
      partId: 'lens',
      label: '可变光圈镜头模组',
      description: '突出广角镜头、保护环和可变光圈卖点，用原创双色环避免复刻官方结构。',
      specs: ['f/2.0-f/4.0 可变光圈', '155° 超广视角', '参考 1/1.1 英寸方形传感器'],
    },
    {
      id: 'front-screen-hotspot',
      partId: 'front-screen',
      label: '前置取景屏',
      description: '用于自拍、vlog 和运动场景的正面构图反馈，UI 文案替换为 DEMO CAM。',
      specs: ['1.46 英寸前置触摸屏', '342 × 342 分辨率参考', '331 ppi 参考规格'],
    },
    {
      id: 'body-hotspot',
      partId: 'body',
      label: '防护机身',
      description: '用厚实倒角、磨砂材质和深色边框表达运动相机的耐用感。',
      specs: [
        '72.8 × 47.2 × 33.1 mm 参考尺寸',
        '149 g 参考重量',
        '20 m 裸机防水 / 60 m 防水壳参考',
      ],
    },
    {
      id: 'mount-hotspot',
      partId: 'mount',
      label: '原创快拆底座',
      description: '表达配件连接能力，但使用原创 V 形导轨，不复刻官方卡扣设计。',
      specs: ['抽象配件接口', '适合头盔、车把、自拍杆等场景表达'],
    },
  ],
  specs: [
    {
      label: '尺寸参考',
      value: '72.8 × 47.2 × 33.1 mm',
      note: '用于控制原创模型比例，不等于 CAD 复刻。',
    },
    {
      label: '影像参考',
      value: '1/1.1" CMOS / 155° FOV',
    },
    {
      label: '光圈参考',
      value: 'f/2.0-f/4.0',
    },
    {
      label: '防护参考',
      value: '20 m / 60 m waterproof',
    },
  ],
  sources: [
    {
      label: 'DJI Osmo Action 6 官方页',
      url: 'https://www.dji.com/osmo-action-6',
    },
    {
      label: 'DJI Osmo Action 6 规格页',
      url: 'https://www.dji.com/osmo-action-6/specs',
    },
    {
      label: 'Spline Viewer 文档',
      url: 'https://docs.spline.design/exporting-your-scene/web/exporting-as-spline-viewer',
    },
    {
      label: 'Spline Code Export 文档',
      url: 'https://docs.spline.design/exporting-your-scene/web/exporting-as-code',
    },
    {
      label: 'React Spline',
      url: 'https://github.com/splinetool/react-spline',
    },
  ],
}
