// Import the lib/ mmodules via relative paths
import util from '../../src/util.js'
import Color from '../../src/Color.js'
import ColorMap from '../../src/ColorMap.js'
import Model from '../../src/Model.js'

util.toWindow({ ColorMap, Color, Model, util })

class ConeModel extends Model {
  setup () {
    const population = 25
    const cmap = ColorMap.Rgb256

    this.velocity = 0.5
    this.radius = 10
    this.width = util.radians(135)
    this.useInRadius = false
    // this.useOther = true
    // this.backgroundColor = cmap.closestColor(200, 200, 200)
    this.backgroundColor = Color.toTypedColor('lightgray')
    this.turtleColor = Color.toTypedColor('black')

    this.turtlePatches = this.patches.nOf(population)
    this.coneColors =
      util.repeat(population, (i, a) => { a[i] = cmap.randomColor() }, [])
    this.headings =
      util.repeat(population, (i, a) => { a[i] = util.randomInt(360) }, [])
  }
  step () {
    const {radius, width, patches, headings, turtlePatches} = this
    patches.forEach((p) => { p.color = this.backgroundColor })
    turtlePatches.forEach((t, i) => {
      const heading = headings[i]
      const pset = this.useInRadius
        ? patches.inRadius(t, radius)
        : patches.inCone(t, radius, width, util.angle(headings[i]))
      pset.forEach((p) => { p.color = this.coneColors[i] })
      t.color = this.turtleColor

      let tnext = patches.patchAtAngleAndDistance(t, util.angle(headings[i]), 1.415)
      let hnext = heading
      if (!tnext) {
        tnext = t.neighbors.oneOf()
        hnext += 180
      }
      // turtlePatches[i] = t.neighbors.oneOf()
      // headings[i] += util.randomCentered(45)
      turtlePatches[i] = tnext
      headings[i] = hnext
    })
  }
}
// const [div, size, max, min] = ['model', 2, 100, -100]
const [size, max, min] = [4, 50, -50]
const opts = {patchSize: size, minX: min, maxX: max, minY: min, maxY: max}
const model = new ConeModel(document.body, opts).start()
// const model = new ConeModel('model').start()
model.whenReady(() => {
  const world = model.world
  const patches = model.patches
  util.toWindow({ model, world, patches, p: patches.oneOf() })
  // if (size !== 1) util.addToDom(patches.pixels.ctx.canvas)
})
// debugging
