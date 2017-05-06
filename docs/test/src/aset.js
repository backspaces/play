// See https://goo.gl/bLWqUj for conversation on breeds.
import ColorMap from '../../src/ColorMap.js'
import Model from '../../src/Model.js'
import util from '../../src/util.js'

const modules = { ColorMap, Model, util }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

class BreedTest extends Model {
  setup () {
    this.patchBreeds('houses roads')
    this.houses.own('address sqfeet')
    this.roads.own('lanes name')

    this.cmap = ColorMap.Rgb256 // shared version of: rgbColorCube(8, 8, 4)

    for (const p of this.patches) {
      const [absX, absY] = [Math.abs(p.x), Math.abs(p.y)]
      const dxy = Math.abs(absX - absY)
      if (absX === absY) {
        this.roads.setBreed(p)
        p.neighbors.forEach((n) => this.roads.setBreed(n))
      } else if (Math.random() > 0.96 && dxy > 6) {
        this.houses.setBreed(p)
        p.neighbors.forEach((n) => this.houses.setBreed(n))
      }
    }

    const roadColor = this.cmap.rgbClosestColor(0, 0, 0)
    const houseColor = this.cmap.rgbClosestColor(0, 0, 255)
    this.roads.forEach((r) => r.setColor(roadColor))
    this.houses.forEach((r) => r.setColor(houseColor))
  }
  step () {
    for (const p of this.patches) {
    // for (var i = 0; i < this.patches.length; i++) {
    //   const p = this.patches[i]
      if (p.agentSet === this.patches) // let breeds be static color
        p.setColor(this.cmap.randomColor())
    }
    // if (this.anim.ticks === 300) {
    //   console.log(this.anim.toString())
    //   this.stop()
    // }
  }
}

const [size, max, min] = [4, 50, -50]
const opts = {patchSize: size, minX: min, maxX: max, minY: min, maxY: max}
const model = new BreedTest(document.body, opts)
model.start()

// Debugging
const world = model.world
const patches = model.patches
const roads = model.roads
const houses = model.houses
util.toWindow({ model, world, patches, roads, houses })
util.toWindow({ p: patches.oneOf(), h: houses.oneOf(), r: roads.oneOf() })
// util.addToDom(patches.pixels.ctx.canvas)
