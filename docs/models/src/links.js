// Import the lib/ mmodules via relative paths
import ColorMap from '../../src/ColorMap.js'
// import Color from '../../src/Color.js'
// import DataSet from '../../src/DataSet.js'
// import Mouse from '../../src/Mouse.js'
import Model from '../../src/Model.js'
import util from '../../src/util.js'

util.toWindow({ ColorMap, Model, util })

class LinksModel extends Model {
  setup () {
    this.turtles.own('speed')
    this.turtles.setDefault('atEdge', 'bounce')
    this.turtles.setDefault('z', 0.1)
    // this.links.setDefault('color', )
    // this.turtles.setDefault('size', 1)
    // this.turtles.setDefault('speed', 0.1)
    this.patchesCmap = ColorMap.grayColorMap(200, 255) // light gray map
    for (const p of this.patches) {
      p.color = this.patchesCmap.randomColor()
    }

    this.turtles.create(1000, (t) => {
      t.size = util.randomFloat2(0.2, 0.5) // + Math.random()
      t.speed = util.randomFloat2(0.01, 0.05) // 0.5 + Math.random()
    })

    this.linksCmap = ColorMap.Basic16 // Basic css named colors
    util.repeat(100, (i, a) => {
      const turtles = this.turtles.nOf(2)
      this.links.create(turtles[0], turtles[1], (link) => {
        link.color = this.linksCmap.randomColor()
      })
    })
  }
  step () {
    // REMIND: Three mouse picking
    util.forEach(this.turtles, (t) => {
      t.theta += util.randomCentered(0.1)
      t.forward(t.speed)
    })
  }
}
// const [div, size, max, min] = ['model', 4, 50, -50]
// const [size, max, min] = [2, 100, -100]
// const opts =
//   {patchSize: size, minX: 2 * min, maxX: 2 * max, minY: min, maxY: max}
const model = new LinksModel(document.body).start()
model.whenReady(() => {
  console.log('patches:', model.patches.length)
  console.log('turtles:', model.turtles.length)
  console.log('links:', model.links.length)

  // debugging
  const {world, patches, turtles, links} = model
  util.toWindow({ world, patches, turtles, links, model })
})
