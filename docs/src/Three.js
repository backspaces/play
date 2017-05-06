import SpriteSheet from './SpriteSheet.js'
import util from './util.js'

// import * as THREE from '../libs/three.min.js'
// import OrbitControls from '../libs/threelibs/OrbitControls.js'
// import Stats from '../libs/stats.min.js'
// import dat from '../libs/dat.gui.min.js'

// util.toWindow({three: THREE}) // REMIND

class Three {
  static defaultOptions () {
    return {
      Renderer: Three,      // include me in options so Model can instanciate me
      orthoView: false,     // 'Perspective', 'Orthographic'
      clearColor: 0x000000, // clear to black
      useAxes: true,        // show x,y,z axes
      useGrid: true,        // show x,y plane
      useStats: true,       // show fps widget
      useControls: true,    // activate navigation. REMIND: name of control?
      useGUI: true          // activate dat.gui UI
    }
  }

  // The Model constructor takes a DOM div and overrides for defaults
  constructor (model, options = {}) {
    this.model = model
    this.spriteSheet = new SpriteSheet()

    // Initialize options
    Object.assign(this, Three.defaultOptions) // install defaults
    Object.assign(this, options) // override defaults
    if (this.Renderer !== Three)
      util.error('Three ctor: Renderer not Three', this.renderer)

    // Initialize Three.js
    this.initThree()
    this.initThreeHelpers()

    this.unitQuad = util.createQuad(0.5, 0)
  }
  // createQuad (r, z = 0) { // r is radius of xy quad: [-r,+r], z is quad z
  //   const vertices = [-r, -r, z, r, -r, z, r, r, z, -r, r, z]
  //   const indices = [0, 1, 2, 0, 2, 3]
  //   return {vertices, indices}
  // }
  // Init Three.js core: scene, camera, renderer
  initThree () {
    const {clientWidth, clientHeight} = this.model.div
    const {orthoView, clearColor} = this
    const {width, height} = this.model.world
    const [halfW, halfH] = [width / 2, height / 2]

    // this.spriteSheet.texture = new THREE.CanvasTexture(this.spriteSheet.ctx)
    // this.spriteSheet.setTexture(THREE.CanvasTexture)

    const scene = new THREE.Scene()
    const camera = orthoView
      ? new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 1000)
      : new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 1, 10000)

    if (orthoView)
      camera.position.set(0, 0, 100 * width)
    else
      camera.position.set(width, -width, width)
    camera.up.set(0, 0, 1)

    const renderer = new THREE.WebGLRenderer()
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(clientWidth, clientHeight)
    renderer.setClearColor(clearColor)
    this.model.div.appendChild(renderer.domElement)

    window.addEventListener('resize', () => {
      const {clientWidth, clientHeight} = this.model.div
      camera.aspect = clientWidth / clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(clientWidth, clientHeight)
    })

    Object.assign(this, {scene, camera, renderer})
  }
  initThreeHelpers () {
    const {scene, renderer, camera} = this
    const {useAxes, useGrid, useControls, useStats, useGUI} = this
    const {width} = this.model.world
    const helpers = {}

    if (useAxes) {
      helpers.axes = new THREE.AxisHelper(1.5 * width / 2)
      scene.add(helpers.axes)
    }
    if (useGrid) {
      // helpers.grid = new THREE.GridHelper(width, width / patchSize)
      helpers.grid = new THREE.GridHelper(1.25 * width, 10)
      helpers.grid.rotation.x = THREE.Math.degToRad(90)
      scene.add(helpers.grid)
    }
    if (useStats) {
      helpers.stats = new Stats()
      document.body.appendChild(helpers.stats.dom)
    }
    if (useControls) {
      // helpers.controls = new OrbitControls(camera, renderer.domElement)
      helpers.controls = new THREE.OrbitControls(camera, renderer.domElement)
    }
    if (useGUI) {
      helpers.gui = new dat.GUI()
    }

    Object.assign(this, helpers)
  }
  disposeThreeMesh (mesh) {
    if (mesh.parent !== this.scene) console.log('mesh parent not scene')
    mesh.parent.remove(mesh)
    mesh.geometry.dispose()
    mesh.material.dispose()
    if (mesh.material.map) mesh.material.map.dispose()
  }
  initPatchesMesh (canvas) {
    if (this.patchesMesh) this.disposeThreeMesh(this.patchesMesh)
    const {width, height, numX, numY} = this.model.world
    // [CanvasTexture args:](https://goo.gl/HkTuHO)
    // canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy
    const texture = new THREE.CanvasTexture(canvas)
    // texture.generateMipmaps = false
    texture.minFilter = THREE.NearestFilter
    texture.magFilter = THREE.NearestFilter
    // texture.premultiplyAlpha = false

    const geometry = new THREE.PlaneGeometry(width, height, numX, numY)
    geometry.name = 'patches'
    const material = new THREE.MeshBasicMaterial({
      map: texture, shading: THREE.FlatShading, side: THREE.DoubleSide
      //, side: THREE.DoubleSide//, wireframe: true
    })
    const mesh = this.patchesMesh = new THREE.Mesh(geometry, material)
    // mesh.rotation.x = -Math.PI / 2
    this.scene.add(mesh)
  }
  updatePatchesMesh (patches) {
    patches.installPixels()
    this.patchesMesh.material.map.needsUpdate = true
  }
  initTurtlesMesh () {
    if (this.turtlesMesh) this.disposeThreeMesh(this.turtlesMesh)

    const texture = new THREE.CanvasTexture(this.spriteSheet.ctx.canvas)
    this.spriteSheet.texture = texture

    const vertices = new Float32Array(0)
    const uvs = new Float32Array(0)
    const indices = new Uint32Array(0)
    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    geometry.setIndex(new THREE.BufferAttribute(indices, 1))
    geometry.name = 'turtles'
    const material = new THREE.MeshBasicMaterial({
      map: texture, alphaTest: 0.5, side: THREE.DoubleSide})

    const mesh = this.turtlesMesh = new THREE.Mesh(geometry, material)
    this.scene.add(mesh)
  }
  updateTurtlesMesh (turtles) {
    // const turtles = this.turtles
    const { vertices, indices } = this.unitQuad
    const patchSize = this.model.world.patchSize
    const mesh = this.turtlesMesh
    const positionAttrib = mesh.geometry.getAttribute('position')
    const uvAttrib = mesh.geometry.getAttribute('uv')
    const indexAttrib = mesh.geometry.getIndex()
    // const positions = []
    const positions = new Float32Array(vertices.length * turtles.length)
    const uvs = []
    const indexes = []

    for (let i = 0; i < turtles.length; i++) {
      const turtle = turtles[i]
      const size = turtle.size // * patchSize
      const theta = turtle.theta
      const cos = Math.cos(theta)
      const sin = Math.sin(theta)
      const offset = i * vertices.length

      for (let j = 0; j < vertices.length; j = j + 3) {
        const x0 = vertices[j]
        const y0 = vertices[j + 1]
        const x = turtle.x // * patchSize
        const y = turtle.y // * patchSize
        positions[j + offset] = (size * (x0 * cos - y0 * sin) + x) * patchSize
        positions[j + offset + 1] = (size * (x0 * sin + y0 * cos) + y) * patchSize
        positions[j + offset + 2] = turtle.z * patchSize
      }
      indexes.push(...indices.map((ix) => ix + (i * 4))) // 4
      uvs.push(...turtle.sprite.uvs)
    }
    // positionAttrib.setArray(new Float32Array(positions))
    positionAttrib.setArray(positions)
    positionAttrib.needsUpdate = true
    uvAttrib.setArray(new Float32Array(uvs))
    uvAttrib.needsUpdate = true
    indexAttrib.setArray(new Uint32Array(indexes))
    indexAttrib.needsUpdate = true
  }
  initLinksMesh () {
    if (this.linksMesh) this.disposeThreeMesh(this.linksMesh)
    const vertices = new Float32Array(0)
    const colors = new Float32Array(0)
    const geometry = new THREE.BufferGeometry()
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.name = 'links'
    const material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors})

    const mesh = this.linksMesh = new THREE.LineSegments(geometry, material)
    this.scene.add(mesh)
  }
  updateLinksMesh (links) {
    const vertices = []
    const colors = []
    for (let i = 0; i < links.length; i++) {
      const {end0, end1, color} = links[i]
      const {x: x0, y: y0, z: z0} = end0
      const {x: x1, y: y1, z: z1} = end1
      const ps = this.model.world.patchSize
      vertices.push(x0 * ps, y0 * ps, z0 * ps, x1 * ps, y1 * ps, z1 * ps)
      colors.push(...color.webgl, ...color.webgl)
    }
    const mesh = this.linksMesh
    const positionAttrib = mesh.geometry.getAttribute('position')
    const colorAttrib = mesh.geometry.getAttribute('color')
    positionAttrib.setArray(new Float32Array(vertices))
    positionAttrib.needsUpdate = true
    colorAttrib.setArray(new Float32Array(colors))
    colorAttrib.needsUpdate = true
  }
}

export default Three
