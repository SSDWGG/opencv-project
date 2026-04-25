export const hairStyles = [
  {
    id: 'mesh-crop',
    name: '3D 空气短卷',
    desc: '程序化 3D 发束，短卷层次和前额空气感',
    glbUrl: '/models/hairstyles/mesh-crop.glb',
    material: {
      base: '#4a2b1d',
      shadow: '#21110c',
      highlight: '#b77845'
    },
    volume: {
      width: 1.42,
      height: 0.92,
      depth: 0.44,
      centerY: -0.28,
      lowerY: 0.1
    },
    strands: {
      count: 96,
      rows: 4,
      length: 0.5,
      spread: 0.82,
      lift: 0.28,
      curl: 0.22,
      sweep: -0.1,
      thickness: 0.016,
      bangs: 22
    },
    preview: {
      shape: 'crop'
    }
  },
  {
    id: 'mesh-sweep',
    name: '3D 侧扫层次',
    desc: '立体发片向右侧扫，随转头产生深度压缩',
    glbUrl: '/models/hairstyles/mesh-sweep.glb',
    material: {
      base: '#20242b',
      shadow: '#090b0f',
      highlight: '#78818e'
    },
    volume: {
      width: 1.5,
      height: 0.76,
      depth: 0.38,
      centerY: -0.24,
      lowerY: 0.08
    },
    strands: {
      count: 82,
      rows: 3,
      length: 0.44,
      spread: 0.9,
      lift: 0.22,
      curl: 0.08,
      sweep: 0.36,
      thickness: 0.014,
      bangs: 28
    },
    preview: {
      shape: 'sweep'
    }
  },
  {
    id: 'mesh-bob',
    name: '3D 齐刘海短发',
    desc: '半球发帽加垂直发束，模拟齐刘海体积',
    glbUrl: '/models/hairstyles/mesh-bob.glb',
    material: {
      base: '#16181d',
      shadow: '#050609',
      highlight: '#5c6472'
    },
    volume: {
      width: 1.34,
      height: 0.82,
      depth: 0.34,
      centerY: -0.2,
      lowerY: 0.16
    },
    strands: {
      count: 88,
      rows: 4,
      length: 0.58,
      spread: 0.72,
      lift: 0.1,
      curl: 0.04,
      sweep: 0.02,
      thickness: 0.014,
      bangs: 34
    },
    preview: {
      shape: 'bob'
    }
  },
  {
    id: 'mesh-long-curls',
    name: '3D 长卷披肩',
    desc: '左右侧长卷发束，保留发梢透视和层次',
    glbUrl: '/models/hairstyles/mesh-long-curls.glb',
    material: {
      base: '#101215',
      shadow: '#030405',
      highlight: '#5f6871'
    },
    volume: {
      width: 1.62,
      height: 1.28,
      depth: 0.48,
      centerY: -0.2,
      lowerY: 0.2
    },
    strands: {
      count: 126,
      rows: 5,
      length: 0.84,
      spread: 0.95,
      lift: 0.18,
      curl: 0.34,
      sweep: 0,
      thickness: 0.013,
      bangs: 18
    },
    preview: {
      shape: 'long'
    }
  }
];
