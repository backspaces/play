// Import the lib/ mmodules via relative paths
const ColorMap = AS.ColorMap
const DataSet = AS.DataSet
// import Mouse from '../../src/Mouse.js'
const Model = AS.Model
const util = AS.util

util.toWindow({ ColorMap, DataSet, Model, util })

class PatchModel extends Model {
  setup () {
    this.patches.own('ran ds')
    // this.anim.setRate(60)
    this.cmap = ColorMap.Rgb256 // this.cmap = ColorMap.Jet
    // this.mouse = new Mouse(this, true).start()
    for (const p of this.patches) {
      p.ran = util.randomFloat(1.0)
      p.ds = 0
    }
  }
  step () {
    // REMIND: Three mouse picking
    this.patches.diffuse('ran', 0.05, this.cmap)
  }
}
const [size, max, min] = [2, 100, -100]
const opts =
  {patchSize: size, minX: 2 * min, maxX: 2 * max, minY: min, maxY: max}
const model = new PatchModel(document.body, opts).start()
model.whenReady(() => {
  console.log('patches:', model.patches.length)

  // debugging
  const {world, patches, turtles, links} = model
  util.toWindow({ world, patches, turtles, links, model })
})
