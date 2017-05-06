import Patches from './Patches.js'
import PatchProto from './Patch.js'
import Turtles from './Turtles.js'
import TurtleProto from './Turtle.js'
import Links from './Links.js'
import LinkProto from './Link.js'
// import SpriteSheet from './SpriteSheet.js'
import Animator from './Animator.js'
import Three from './Three.js'
import util from './util.js'

// import * as THREE from '../libs/three.min.js'
// import OrbitControls from '../libs/threelibs/OrbitControls.js'
// import Stats from '../libs/stats.min.js'
// import dat from '../libs/dat.gui.min.js'

// util.toWindow({three: THREE}) // REMIND

// Class Model is the primary interface for modelers, integrating
// all the parts of a model. It also contains NetLogo's `observer` methods.
class Model {
  // Static class methods for default settings.
  static defaultWorld () {
    return {
      patchSize: 13,
      minX: -16,
      maxX: 16,
      minY: -16,
      maxY: 16
      // usePatches: true, // REMIND: Use these. Add Drawing? Labels?
      // useTurtles: true,
      // useLinks: true,
    }
  }
  // static defaultThree () {
  //   return {
  //     orthoView: false, // 'Perspective', 'Orthographic'
  //     clearColor: 0x000000,
  //     useAxes: true,
  //     useGrid: true,
  //     useStats: true,
  //     useControls: true,
  //     useGUI: true
  //   }
  // }

  // The Model constructor takes a DOM div and overrides for defaults
  constructor (div = document.body,
               worldOptions = {},
               rendererOptions = Three.defaultOptions()) {
    // Store and initialize the model's div and contexts.
    this.div = util.isString(div) ? document.getElementById(div) : div
    // this.spriteSheet = new SpriteSheet()

    // Create this model's `world` object
    this.world = Model.defaultWorld()
    Object.assign(this.world, worldOptions)
    this.setWorld()

    // Initialize renderer
    this.renderer = new rendererOptions.Renderer(this, rendererOptions)
    // this.three = Model.defaultThree()
    // Object.assign(this.three, threeOptions)
    // this.initThree()
    // this.initThreeHelpers()

    // Create animator to handle draw/step.
    this.anim = new Animator(this)

    // Initialize model calling `startup`, `reset` .. which calls `setup`.
    this.modelReady = false
    this.startup().then(() => {
      // this.reset(); this.setup(); this.modelReady = true
      this.reset(); this.modelReady = true
    })
  }
  // Call fcn(this) when any async
  whenReady (fcn) {
    // util.waitPromise(() => this.modelReady).then(fcn())
    util.waitOn(() => this.modelReady, () => fcn(this))
  }
  // Add additional world variables derived from constructor's `worldOptions`.
  setWorld () {
    const world = this.world
    // REMIND: change to xPatches, yPatches?
    world.numX = world.maxX - world.minX + 1
    world.numY = world.maxY - world.minY + 1
    world.width = world.numX * world.patchSize
    world.height = world.numY * world.patchSize
    world.minXcor = world.minX - 0.5
    world.maxXcor = world.maxX + 0.5
    world.minYcor = world.minY - 0.5
    world.maxYcor = world.maxY + 0.5
    world.isOnWorld = (x, y) => // No braces, is lambda expression
      (world.minXcor <= x) && (x <= world.maxXcor) &&
      (world.minYcor <= y) && (y <= world.maxYcor)
  }
  // createQuad (r, z = 0) { // r is radius of xy quad: [-r,+r], z is quad z
  //   const vertices = [-r, -r, z, r, -r, z, r, r, z, -r, r, z]
  //   const indices = [0, 1, 2, 0, 2, 3]
  //   return {vertices, indices}
  // }
  // (Re)initialize the model. REMIND: not quite right
  reset (restart = false) {
    this.anim.reset()
    this.setWorld()
    // this.three.unitQuad = util.createQuad(this.world.patchSize / 2, 0)
    // this.three.unitQuad = util.createQuad(0.5, 0)
    this.refreshLinks = this.refreshTurtles = this.refreshPatches = true
    this.patches = new Patches(this, PatchProto, 'patches')
    this.renderer.initPatchesMesh(this.patches.pixels.ctx.canvas)
    this.turtles = new Turtles(this, TurtleProto, 'turtles')
    this.renderer.initTurtlesMesh()
    this.links = new Links(this, LinkProto, 'links')
    this.renderer.initLinksMesh()
    // REMIND: temp
    // this.div.appendChild(this.patches.pixels.ctx.canvas)
    // document.body.appendChild(this.patches.pixels.ctx.canvas)
    this.setup()
    if (restart) this.start()
  }

// ### User Model Creation
  // A user's model is made by subclassing Model and over-riding these
  // three abstract methods. `super` need not be called.

  // Async function to initialize model resources (images, files).
  async startup () {} // called by constructor.
  // Initialize your model variables and defaults here.
  setup () {} // called by constructor (after startup) or by reset()
  // Update/step your model here
  step () {} // called each step of the animation

  // Start/stop the animation. Return model for chaining.
  start () {
    util.waitOn(() => this.modelReady, () => {
      this.anim.start()
    })
    // util.waitPromise(() => this.modelReady)
    // .then(() => { this.anim.start() })
    return this
  }
  stop () { this.anim.stop() }
  // Animate once by `step(); draw()`.
  once () { this.stop(); this.anim.once() } // stop is no-op if already stopped

  // Change the world parameters. Requires a reset.
  // Resets Patches, Turtles, Links & reinitializes canvases.
  // If restart argument is true (default), will restart after resetting.
  // resizeWorld (worldOptions, restart = true) {
  //   Object.assign(this.world, worldOptions)
  //   this.setWorld(this.world)
  //   this.reset(restart)
  // }

  draw (force = this.anim.stopped || this.anim.draws === 1) {
    const {scene, camera} = this.renderer
    if (this.div) {
      if (force || this.refreshPatches) {
        if (this.patches.length > 0)
          this.renderer.updatePatchesMesh(this.patches)
      }
      if (force || this.refreshTurtles) {
        if (this.turtles.length > 0)
          this.renderer.updateTurtlesMesh(this.turtles)
      }
      if (force || this.refreshLinks) {
        if (this.links.length > 0)
          this.renderer.updateLinksMesh(this.links)
      }

      this.renderer.renderer.render(scene, camera)
    }
    if (this.renderer.stats) this.renderer.stats.update()
  }

  // Breeds: create subarrays of Patches, Agentss, Links
  patchBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Patches(this, PatchProto, breedName, this.patches)
    }
  }
  turtleBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Turtles(this, TurtleProto, breedName, this.turtles)
    }
  }
  linkBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Links(this, LinkProto, breedName, this.links)
    }
  }
}

export default Model
