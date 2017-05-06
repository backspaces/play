import util from './util.js'
// import Color from './Color.js'
// import ColorMap from './ColorMap.js'
// import SpriteSheet from './SpriteSheet'

// Flyweight object creation, see Patch/Patches.

// Class Turtle instances represent the dynamic, behavioral element of modeling.
// Each turtle knows the patch it is on, and interacts with that and other
// patches, as well as other turtles.

// The core default variables needed by a Turtle.
// Use turtles.setDefault(name, val) to change
// Modelers add additional "own variables" as needed.
const turtleVariables = { // Core variables for patches. Not 'own' variables.
  id: null,         // unique id, promoted by agentset's add() method
  defaults: null,   // pointer to defaults/proto object
  agentSet: null,   // my agentset/breed
  model: null,      // my model
  world: null,      // my agent/agentset's world
  turtles: null,    // my baseSet

  x: 0,             // x, y, z in patchSize units.
  y: 0,             // Use turtles.setDefault('z', num) to change default height
  z: 1,
  theta: 0,         // my euclidean direction, radians from x axis, counter-clockwise
  size: 1,          // size in patches, default to one patch

  // patch: null,   // the patch I'm on .. uses getter below
  // links: null,   // the links having me as an end point .. lazy promoted below
  atEdge: 'clamp',  // What to do if I wander off world. Can be 'clamp', 'wrap'
                    // 'bounce', or a function, see handleEdge() method
  sprite: null

  // spriteFcn: 'default',
  // spriteColor: Color.newTypedColor(255, 0, 0),

  // labelOffset: [0, 0],  // text pixel offset from the turtle center
  // labelColor: Color.newTypedColor(0, 0, 0) // the label color
}
class TurtleProto {
  // Initialize a Turtle given its Turtles AgentSet.
  constructor (agentSet) {
    Object.assign(this, turtleVariables)
    this.defaults = this
    this.agentSet = agentSet
    this.model = agentSet.model
    this.world = agentSet.world
    this.turtles = agentSet.baseSet

    // this.sprite = this.turtles.model.spriteSheet.addDrawing('default')
    // this.sprite = this.turtles.spriteSheet.add('default', 'red')
  }
  die () {
    this.agentSet.remove(this) // remove me from my baseSet and breed
    if (this.hasOwnProperty('links')) // don't promote links
      while (this.links.length > 0) this.links[0].die()
    if (this.patch.turtles != null)
      util.removeItem(this.patch.turtles, this)
  }
  // Factory: create num new turtles at this turtle's location. The optional init
  // proc is called on the new turtle after inserting in its agentSet.
  hatch (num = 1, agentSet = this.agentSet, init = () => {}) {
    return agentSet.create(num, (turtle) => {
      turtle.setxy(this.x, this.y)
      // turtle.color = this.color // REMIND: sprite vs color
      // hatched turtle inherits parents' ownVariables
      for (const key of agentSet.ownVariables)
        if (turtle[key] == null) turtle[key] = this[key]
      init(turtle)
    })
  }
  // Getter for links for this turtle. REMIND: use new AgentSet(0)?
  // Uses lazy evaluation to promote links to instance variables.
  get links () { // lazy promote neighbors from getter to instance prop.
    Object.defineProperty(this, 'links', {value: [], enumerable: true})
    return this.links
  }
  // Getter for the patchs and the patch I'm on. Return null if off-world.
  get patch () { return this.model.patches.patch(this.x, this.y) }
  // REMIND: promote to default variable(s) if performance issue
  get patches () { return this.model.patches }

  // Breed get/set mathods.
  setBreed (breed) { breed.setBreed(this) }
  get breed () { return this.agentSet }

  // Heading vs Euclidean Angles
  get heading () { return util.heading(this.theta) }
  set heading (heading) { this.theta = util.angle(heading) }

  // Create my shape via src: sprite, fcn, string, or image/canvas
  setSprite (src, color = 'red', strokeColor = 'black') {
    if (src.sheet) { this.sprite = src; return } // src is a sprite
    const ss = this.model.renderer.spriteSheet
    this.sprite = util.isImageable(src)
      ? ss.addImage(src)
      : ss.addDrawing(src, color, strokeColor)
  }
  // setSize (size) { this.size = size * this.world.patchSize }
  // setDrawSprite (fcn, color, color2) {
  //   this.sprite = this.model.spriteSheet.addDrawing(fcn, color)
  // }

  // Set x, y position. If z given, override default z.
  // Call handleEdge(x, y) if x, y off-world.
  setxy (x, y, z = null) {
    const p0 = this.patch
    if (z) this.z = z
    if (this.world.isOnWorld(x, y)) {
      this.x = x
      this.y = y
    } else {
      this.handleEdge(x, y)
      // const {minXcor, maxXcor, minYcor, maxYcor} = this.world
      // if (this.wrap) {
      //   this.x = util.wrap(x, minXcor, maxXcor)
      //   this.y = util.wrap(y, minYcor, maxYcor)
      // } else {
      //   this.x = util.clamp(x, minXcor, maxXcor)
      //   this.y = util.clamp(y, minYcor, maxYcor)
      // }
    }
    const p = this.patch
    if (p.turtles != null && p !== p0) {
      util.removeItem(p0.turtles, this)
      p.turtles.push(this)
    }
  }
  // Handle turtle if x,y off-world
  handleEdge (x, y) {
    if (util.isString(this.atEdge)) {
      const {minXcor, maxXcor, minYcor, maxYcor} = this.world
      if (this.atEdge === 'wrap') {
        this.x = util.wrap(x, minXcor, maxXcor)
        this.y = util.wrap(y, minYcor, maxYcor)
      } else if (this.atEdge === 'clamp' || this.atEdge === 'bounce') {
        this.x = util.clamp(x, minXcor, maxXcor)
        this.y = util.clamp(y, minYcor, maxYcor)
        if (this.atEdge === 'bounce') {
          if (this.x === minXcor || this.x === maxXcor)
            this.theta = Math.PI - this.theta
          else
            this.theta = -this.theta
        }
      } else {
        util.error(`turtle.handleEdge: bad atEdge: ${this.atEdge}`)
      }
    } else {
      this.atEdge(x, y)
    }
  }
  // Place the turtle at the given patch/turtle location
  moveTo (agent) { this.setxy(agent.x, agent.y) }
  // Move forward (along theta) d units (patch coords),
  forward (d) {
    this.setxy(this.x + d * Math.cos(this.theta), this.y + d * Math.sin(this.theta))
  }
  // Change current direction by rad radians which can be + (left) or - (right).
  rotate (rad) { this.theta = util.mod(this.theta + rad, Math.PI * 2) }
  right (rad) { this.rotate(-rad) }
  left (rad) { this.rotate(rad) }

  // Set my direction towards turtle/patch or x,y.
  // "direction" is euclidean radians.
  face (agent) { this.theta = this.towards(agent) }
  faceXY (x, y) { this.theta = this.towardsXY(x, y) }
  patchAhead (distance) { return this.patchAtAngleAndDistance(this.theta, distance) }
  canMove (distance) { return this.patchAhead(distance) != null } // null / undefined

  // 6 methods in both Patch & Turtle modules
  // Distance from me to x, y. REMIND: No off-world test done
  distanceXY (x, y) { return util.distance(this.x, this.y, x, y) }
  // Return distance from me to object having an x,y pair (turtle, patch, ...)
  // distance (agent) { this.distanceXY(agent.x, agent.y) }
  distance (agent) { return util.distance(this.x, this.y, agent.x, agent.y) }
  // Return angle towards agent/x,y
  // Use util.heading to convert to heading
  towards (agent) { return this.towardsXY(agent.x, agent.y) }
  towardsXY (x, y) { return util.radiansToward(this.x, this.y, x, y) }
  // Return patch w/ given parameters. Return undefined if off-world.
  // Return patch dx, dy from my position.
  patchAt (dx, dy) { return this.patches.patch(this.x + dx, this.y + dy) }
  // Note: angle is absolute, w/o regard to existing angle of turtle.
  // Use Left/Right versions below
  patchAtAngleAndDistance (angle, distance) {
    return this.patches.patchAtAngleAndDistance(this, angle, distance)
  }

  patchLeftAndAhead (angle, distance) {
    return this.patchAtAngleAndDistance(angle + this.theta, distance)
  }
  patchRightAndAhead (angle, distance) {
    return this.patchAtAngleAndDistance(angle - this.theta, distance)
  }
  // Return turtles/breeds within radius from me
  inRadius (radius, meToo = false) {
    return this.agentSet(this, radius, meToo)
  }
  // Return turtles/breeds within cone from me
  inCone (radius, meToo = false) {
    return this.agentSet(this, radius, meToo)
  }

  // Link methods. Note: this.links returns all links linked to me.
  // See links getter above.

  // Return other end of link from me. Link must include me!
  otherEnd (l) { return l.end0 === this ? l.end1 : l.end0 }
  // Return all turtles linked to me
  linkNeighbors () { return this.links.map((l) => this.otherEnd(l)) }

}

export default TurtleProto
