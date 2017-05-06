// Import the lib/ mmodules via relative paths
import ColorMap from '../../src/ColorMap.js'
// import Color from '../../src/Color.js'
// import DataSet from '../../src/DataSet.js'
// import Mouse from '../../src/Mouse.js'
import Model from '../../src/Model.js'
import util from '../../src/util.js'

util.toWindow({ ColorMap, Model, util })

const numTurtles = 10000

class TurtlesModel extends Model {
  setup () {
    this.turtles.own('speed')
    this.turtles.setDefault('atEdge', 'wrap')
    this.turtles.setDefault('z', 0.1)
    // this.turtles.setDefault('size', 1)
    // this.turtles.setDefault('speed', 0.1)
    this.cmap = ColorMap.grayColorMap(200, 255) // this.cmap = ColorMap.Jet
    // const color = Color.toTypedColor('lightgray')
    for (const p of this.patches) {
      p.color = this.cmap.randomColor()
    }

    this.turtles.create(numTurtles, (t) => {
      t.size = util.randomFloat2(0.2, 0.5) // + Math.random()
      t.speed = util.randomFloat2(0.01, 0.05) // 0.5 + Math.random()
    })
  }
  step () {
    // REMIND: Three mouse picking
    // if (this.mouse.down) {
    //   console.log('mouse', this.mouse.x, this.mouse.y)
    //   const {x, y} = this.mouse
    //   const p = this.patches.patch(x, y) // REMIND: x,y out of bounds?
    //   const pRect = this.patches.inRadius(p, 4)
    //   for (const n of pRect) n.ran = 1
    // }
    util.forEach(this.turtles, (t) => {
      t.theta += util.randomCentered(0.1)
      t.forward(t.speed)
    })
    // this.patches.diffuse('ran', 0.05, this.cmap)

    // this.updateTurtleMesh()
    // if (this.anim.ticks === 500) {
    //   console.log(this.anim.toString())
    //   // this.stop() // REMIND: Need stunt to keep controls going
    // }
  }
}
// const [div, size, max, min] = ['model', 4, 50, -50]
// const [size, max, min] = [2, 100, -100]
// const opts =
//   {patchSize: size, minX: 2 * min, maxX: 2 * max, minY: min, maxY: max}
const model = new TurtlesModel(document.body).start()
model.whenReady(() => {
  console.log('patches:', model.patches.length)
  console.log('turtles:', model.turtles.length)

  // debugging
  const {world, patches, turtles, links} = model
  util.toWindow({ world, patches, turtles, links, model })
})
