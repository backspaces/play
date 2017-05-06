import util from './util.js'
import AgentSet from './AgentSet.js'
// import SpriteSheet from './SpriteSheet.js'
import ColorMap from './ColorMap.js'

// Turtles are the world other agentsets live on. They create a coord system
// from Model's world values: size, minX, maxX, minY, maxY
class Turtles extends AgentSet {
  constructor (model, AgentProto, name, baseSet = null) {
    // AgentSet sets these variables:
    // model, name, baseSet, world: model.world & agentProto: new AgentProto
    super(model, AgentProto, name, baseSet)
    // Skip if an basic Array ctor or a breedSet. See AgentSet comments.
    if (typeof model === 'number' || this.isBreedSet()) return
    // this.world = model.world
    // this.labels = [] // sparse array for labels
    // this.spriteSheet = new SpriteSheet()
    // this.colorMap = ColorMap.Basic16
  }
  create (num = 1, initFcn = (turtle) => {}) {
    return util.repeat(num, (i, a) => {
      const turtle = this.add()
      turtle.theta = util.randomFloat(Math.PI * 2)
      initFcn(turtle)
      if (!turtle.sprite)
        turtle.setSprite('default', ColorMap.Basic16.randomColor().css)
      a.push(turtle)
    })
  }
  // clear () {
  //   while (this.any()) this.last.die() // die a turtle method
  // }

  // Return an array of this breed within the array of patchs
  inPatches (patches) {
    let array = new AgentSet(0) // []
    for (const p of patches) array.push(...p.turtlesHere())
    if (this.isBreedSet()) array = array.filter((a) => a.agentSet === this)
    return array
  }
  // Return an array of turtles/breeds within the patchRect, dx/y integers
  // Note: will return turtle too. Also slightly inaccurate due to being
  // patch based, not turtle based.
  inPatchRect (turtle, dx, dy = dx, meToo = false) {
    // meToo: true for patches, could have several turtles on patch
    const patches = this.model.patches.patchRect(turtle.patch, dx, dy, true)
    const aSet = this.inPatches(patches)
    if (!meToo) util.removeItem(aSet, turtle) // don't use aSet.remove: breeds
    return aSet // this.inPatches(patches)
  }
  // Return the members of this agentset that are within radius distance
  // from me, using a patch rect.
  inRadius (turtle, radius, meToo = false) {
    const aSet = this.inPatchRect(turtle, radius, radius, true)
    return aSet.inRadius(turtle, radius, meToo)
  }
  inCone (turtle, radius, coneAngle, x0, y0, meToo = false) {
    const aSet = this.inPatchRect(turtle, radius, radius, true)
    return aSet.inCone(turtle, radius, coneAngle, turtle.theta, x0, y0, meToo)
  }

  // Circle Layout: position the turtles in the list in an equally
  // spaced circle of the given radius, with the initial turtle
  // at the given start angle (default to pi/2 or "up") and in the
  // +1 or -1 direction (counter clockwise or clockwise)
  // defaulting to -1 (clockwise).
  layoutCircle (
    list, radius, center = [0, 0], startAngle = Math.PI / 2, direction = -1) {
    const dTheta = 2 * Math.PI / list.length
    const [x0, y0] = center
    util.forEach(list, (turtle, i) => {
      turtle.setxy(x0, y0)
      turtle.theta = startAngle + (direction * dTheta * i)
      turtle.forward(radius)
    })
  }

}

export default Turtles
