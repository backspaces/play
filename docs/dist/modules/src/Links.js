// import util from './util.js'
import AgentSet from './AgentSet.js'
// import SpriteSheet from './SpriteSheet.js'
// import ColorMap from './ColorMap.js'

// Links are a collection of all the Link objects between turtles.
class Links extends AgentSet {
  constructor (model, AgentProto, name, baseSet = null) {
    // AgentSet sets these variables:
    // model, name, baseSet, world: model.world & agentProto: new AgentProto
    super(model, AgentProto, name, baseSet)
    // Skip if an basic Array ctor or a breedSet. See AgentSet comments.
    if (typeof model === 'number' || this.isBreedSet()) return
    // this.labels = [] // sparse array for labels
  }

  // Factory: Add 1 or more links from the from turtle to the to turtle(s) which
  // can be a single turtle or an array of turtles. The optional init
  // proc is called on the new link after inserting in the agentSet.
  create (from, to, initFcn = (link) => {}) {
    if (!Array.isArray(to)) to = [to]
    return to.map((t) => { // REMIND: skip dups
      const link = this.add()
      link.init(from, t)
      initFcn(link)
      return link
    }) // REMIND: return single link if to not an array?
  }

}

export default Links
