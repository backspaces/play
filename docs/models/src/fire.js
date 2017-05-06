// Import the lib/ mmodules via page relative paths
import util from '../../src/util.js'
import Color from '../../src/Color.js'
import ColorMap from '../../src/ColorMap.js'
import Model from '../../src/Model.js'

const modules = { Color, ColorMap, Model, util }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

class FireModel extends Model {
  setup () {
    this.patchBreeds('fires embers')
    // this.anim.setRate(60)

    this.fireColorMap = ColorMap.gradientColorMap(6, ['red', [128, 0, 0]])
    this.treeColor = Color.newTypedColor(0, 255, 0)
    this.dirtColor = Color.toTypedColor('yellow')
    this.fireColor = this.fireColorMap[0]
    this.done = false

    this.density = 60 // percent
    for (const p of this.patches) {
      if (p.x === this.world.minX)
        this.ignight(p)
      else if (util.randomInt(100) < this.density)
        p.color = this.treeColor
      else
        p.color = this.dirtColor
    }

    this.burnedTrees = 0
    this.initialTrees =
      this.patches.filter(p => p.color.equals(this.treeColor)).length
  }

  step () {
    if (this.done) return
    if (this.fires.length + this.embers.length === 0) {
      console.log('Done:', this.anim.toString())
      const percentBurned = this.burnedTrees / this.initialTrees * 100
      console.log('Percent burned', percentBurned.toFixed(2))
      // this.stop()
      this.done = true
      return // keep three control running
    }

    for (const p of this.fires) {
      for (const n of p.neighbors4)
        if (this.isTree(n))
          this.ignight(n)
      this.embers.setBreed(p)
    }
    this.fadeEmbers()

    if (this.anim.ticks % 100 === 0)
      console.log(this.anim.toString())
  }

  isTree (p) { return p.color.equals(this.treeColor) }

  ignight (p) {
    p.color = this.fireColor
    this.fires.setBreed(p)
    this.burnedTrees++
  }

  fadeEmbers () {
    for (const p of this.embers) {
      const c = p.color
      const ix = this.fireColorMap.indexOf(c)
      if (ix === this.fireColorMap.length - 1)
        this.patches.setBreed(p) // sorta like die, removes from breed.
      else
        p.color = this.fireColorMap[ix + 1]
    }
  }
}

// Test for container rather than entire window
// const div = document.getElementById('model')
// div.style = 'width:75%; height:500'
const div = document.body
const model = new FireModel(div, {
  patchSize: 2,
  minX: -125,
  maxX: 125,
  minY: -125,
  maxY: 125
}).start()
model.whenReady(() => {
  const {world, patches} = model
  util.toWindow({ world, patches, p: patches.oneOf(), model })
  // util.addToDom(patches.pixels.ctx.canvas)
})
