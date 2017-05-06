import util from './util.js'
import Color from './Color.js'
// import ColorMap from './ColorMap.js'
// import SpriteSheet from './SpriteSheet'

// Flyweight object creation, see Patch/Patches.

// Class Link instances form a link between two turtles, forming a graph.

// The core default variables needed by a Link.
// Use links.setDefault(name, val) to change
// Modelers add additional "own variables" as needed.
const linkVariables = { // Core variables for patches. Not 'own' variables.
  id: null,             // unique id, promoted by agentset's add() method
  defaults: null,       // pointer to defaults/proto object
  agentSet: null,       // my agentset/breed
  model: null,      // my model
  world: null,          // my agent/agentset's world
  links: null,          // my baseSet

  end0: 0,              // Turtles: end0 & 1 are turtle ends of the link
  end1: 0,
  color: Color.toTypedColor('yellow'), // Note: links must have A = 255, opaque.
  // z: 1, // possibly a z offset from the turtles?

  // Line width. In Three.js/webgl this is always 1. See
  // [Drawing Lines is Hard!](https://mattdesl.svbtle.com/drawing-lines-is-hard)
  width: 1
}
class LinkProto {
  // Initialize a Link given its Links AgentSet.
  constructor (agentSet) {
    Object.assign(this, linkVariables)
    this.defaults = this
    this.agentSet = agentSet
    this.model = agentSet.model
    this.world = agentSet.world
    this.links = agentSet.baseSet
  }
  init (from, to) {
    this.end0 = from
    this.end1 = to
    from.links.push(this)
    to.links.push(this)
  }
  // Remove this link from its agentset
  die () {
    this.agentSet.remove(this)
    util.removeItem(this.end0.links, this)
    util.removeItem(this.end1.links, this)
  }

  bothEnds () { return [this.end0, this.end1] }
  length () { return this.end0.distance(this.end1) }
  otherEnd (turtle) { return turtle === this.end0 ? this.end1 : this.end0 }

  // Breed get/set mathods.
  setBreed (breed) { breed.setBreed(this) }
  get breed () { return this.agentSet }
}

export default LinkProto
