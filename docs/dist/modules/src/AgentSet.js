import util from './util.js'

// AgentSets are arrays that are factories for their own agents/objects.
// They are the base for Patches, Turtles and Links.

// Vocab: AgentSets are NetLogo collections: Patches, Turtles, and Links.
// Agent is an object in an AgentSet: Patch, Turtle, Link.

class AgentSet extends Array {
  // Create an empty `AgentSet` and initialize the `ID` counter for add().
  // If baseSet is supplied, the new agentset is a subarray of baseSet.
  // This sub-array feature is how breeds are managed, see class `Model`
  constructor (model, AgentProto, name, baseSet = null) {
    // Because es6 JavaScript Array itself calls the Array ctor
    // (ex: slice() returning a new array), skip if not AgentSet ctor.
    if (model == null) model = 0 // model is null or undefined
    if (typeof model === 'number') {
      super(model) // model is a number, return AgentSet array of that size
    } else {
      super(0) // create empty array
      baseSet = baseSet || this // if not a breed, set baseSet to this
      // AgentSets know their model, name, baseSet, world.
      Object.assign(this, {model, name, baseSet, world: model.world})
      // // Link our agents to us
      // this.agentProto.agentSet = this
      // BaseSets know their breeds and keep the ID global
      if (this.isBaseSet()) {
        this.breeds = {} // will contain breedname: breed entries
        this.ID = 0
      // Breeds add themselves to baseSet.
      } else {
        this.baseSet.breeds[name] = this
      }
      // Keep a list of this set's variables; see `own` below
      this.ownVariables = []
      // Create a proto for our agents by having a defaults and instance layer
      this.agentProto = new AgentProto(this)
    }
  }

  // Is this a baseSet or a derived "breed"
  isBreedSet () { return this.baseSet !== this }
  isBaseSet () { return this.baseSet === this }

  // Abstract method used by subclasses to create and add their instances.
  // create () {}
  // Add an agent to the list.  Only used by agentset factory methods. Adds
  // the `id` property to all agents. Increment `ID`.
  // Returns the object for chaining. The set will be sorted by `id`.
  add (o) {
    o = o || Object.create(this.agentProto)
    if (this.isBreedSet())
      this.baseSet.add(o)
    else
      o.id = this.ID++
    this.push(o)
    return o
  }
  clear () { while (this.any()) this.last().die() } // die() is an agent method
  // Remove an agent from the agentset, returning the agentset for chaining.
  remove (o) {
    // Remove me from my baseSet
    if (this.isBreedSet()) util.removeItem(this.baseSet, o, 'id')
    // Remove me from my set.
    util.removeItem(this, o, 'id')
    return this
  }

  // Get/Set default values for this agentset's agents.
  setDefault (name, value) { this.agentProto[name] = value }
  getDefault (name) { this.agentProto[name] }
  // Declare variables of an agent class.
  // `varnames` is a string of space separated names
  own (varnames) {
    // if (this.isBreedSet())
    //   this.ownVariables = util.clone(this.baseSet.ownVariables)
    for (const name of varnames.split(' ')) {
      this.setDefault(name, null)
      this.ownVariables.push(name)
    }
  }

  // Move an agent from its AgentSet/breed to be in this AgentSet/breed.
  setBreed (a) { // change agent a to be in this breed
    // Return if `a` is already of my breed
    if (a.agentSet === this) return
    // Remove/insert breeds (not baseSets) from their agentsets
    if (a.agentSet.isBreedSet()) util.removeItem(a.agentSet, a, 'id')
    if (this.isBreedSet()) util.insertItem(this, a, 'id')

    // Make list of `a`'s vars and my ownvars.
    const avars = a.agentSet.ownVariables
    // First remove `a`'s vars not in my ownVariables
    for (const avar of avars)
      if (!this.ownVariables.includes(avar))
        delete a[avar]
    // Now add ownVariables to `a`'s vars, default to 0.
    // If ownvar already in avars, it is not modified.
    for (const ownvar of this.ownVariables)
      if (!avars.includes(ownvar))
        a[ownvar] = 0 // NOTE: NL uses 0, maybe we should use null?

    // Give `a` my defaults/statics
    return Object.setPrototypeOf(a, this.agentProto)
  }

  // Method to convert an array to the same AgentSet type as this.
  // asAgentSet (array) {
  //   return Object.setPrototypeOf(array, Object.getPrototypeOf(this))
  // }

// ### General Array of Objects methods

  // Return true if there are no items in this set, false if not empty.
  empty () { return this.length === 0 }
  // Return !empty()
  any () { return this.length !== 0 }
  // Return last item in this array. Returns undefined if empty.
  last () { return this[ this.length - 1 ] }
  // Return true if reporter true for all of this set's objects
  all (reporter) { return this.every(reporter) }
  // Convert an AgentSet to an Array
  toArray () { Object.setPrototypeOf(this, Array.prototype); return this }
  // Return Array of property values for key from this array's objects
  props (key) { return this.map((a) => a[key]).toArray() }
  // Return agentset with reporter(agent) true
  with (reporter) { return this.filter(reporter) }
  // Call fcn(agent) for each agent in AgentSet. Return the AgentSet for chaining.
  // Note: 5x+ faster than this.forEach(fcn) !!
  ask (fcn) { for (let i = 0; i < this.length; i++) fcn(this[i]); return this }
  // Convience fcn for NetLogo's ask-with. Returns the with filtered AgentSet.
  askWith (askFcn, withFcn) { return this.with(withFcn).ask(askFcn) }
  // Return count of agents with reporter(agent) true
  count (reporter) {
    return this.reduce((prev, p) => prev + reporter(p) ? 1 : 0, 0)
  }

  // Replacements for array methods to avoid calling AgentSet ctor

  // Return shallow copy of a protion of this agentset
  // [See Array.slice](https://goo.gl/Ilgsok)
  // Default is to clone entire agentset
  clone (begin = 0, end = this.length) {
    return this.slice(begin, end) // Wow, returns an agentset rather than Array!
  }
  // Randomize the agentset in place. Use clone first if new agentset needed.
  // Return "this" for chaining.
  shuffle () { return util.shuffle(this) }
  // Return this agentset sorted by the reporter in ascending/descending order.
  // If reporter is a string, convert to a fcn returning that property.
  // Use clone if you don't want to mutate this array.
  sortBy (reporter, ascending = true) {
    util.sortObjs(this, reporter, ascending)
    return this
  }

  // Return a random agent. Return undefined if empty.
  oneOf () { return util.oneOf(this) }
  // Return a random agent, not equal to a
  otherOneOf (item) { return util.otherOneOf(this, item) }
  // otherOneOf: nOf good enough?
  // Return the first agent having the min/max of given value of f(agent).
  // If reporter is a string, convert to a fcn returning that property
  minOrMaxOf (min, reporter) {
    if (this.empty()) util.error('min/max OneOf: empty array')
    if (typeof reporter === 'string') reporter = util.propFcn(reporter)
    let o = null
    let val = min ? Infinity : -Infinity
    for (let i = 0; i < this.length; i++) {
      const a = this[i]
      const aval = reporter(a)
      if ((min && (aval < val)) || (!min && (aval > val)))
        [o, val] = [a, aval]
    }
    return o
  }
  // The min version of the above
  minOneOf (reporter) { return this.minOrMaxOf(true, reporter) }
  // The max version of the above
  maxOneOf (reporter) { return this.minOrMaxOf(false, reporter) }

  // Return n random agents as agentset.
  // See [Fisher-Yates-Knuth shuffle](https://goo.gl/fWNFf)
  // for better approach for large n.
  nOf (n) { // I realize this is a bit silly, lets hope random doesn't repeat!
    if (n > this.length) util.error('nOf: n larger than agentset')
    if (n === this.length) return this
    const result = new AgentSet()
    while (result.length < n) {
      const o = this.oneOf()
      if (!(o in result)) result.push(o)
    }
    // return this.asAgentSet(result)
    return result
  }
  // Return a new agentset of the n min/max agents of the value of reporter,
  // in ascending order.
  // If reporter is a string, convert to a fcn returning that property
  // NOTE: we do not manage ties, see NetLogo docs.
  minOrMaxNOf (min, n, reporter) {
    if (n > this.length) util.error('min/max nOf: n larger than agentset')
    const as = this.clone().sortBy(reporter)
    return min ? as.clone(0, n) : as.clone(as.length - n)
  }
  minNOf (n, reporter) { return this.minOrMaxNOf(true, n, reporter) }
  maxNOf (n, reporter) { return this.minOrMaxNOf(false, n, reporter) }

  // Geometry methods for patches, turtles, and other agentsets which have x,y.
  // Return all agents within rect, radius, cone from given agent o.
  // If meToo, include given object, default excludes it
  // Typically the agentset is a subset of larger sets, reducing
  // the size, then uses these inRect, inRadius or inCone methods

  // Return all agents within rectangle from given agent o.
  // dx & dy are (float) half width/height of rect
  inRect (o, dx, dy = dx, meToo = false) {
    const agents = new AgentSet()
    const minX = o.x - dx // ok if max/min off-world, o, a are in-world
    const maxX = o.x + dx
    const minY = o.y - dy
    const maxY = o.y + dy
    for (const a of this) {
      if (minX <= a.x && a.x <= maxX && minY <= a.y && a.y <= maxY) {
        if (meToo || o !== a) agents.push(a)
      }
    }
    return agents
  }

  // Return all agents in agentset within d distance from given object.
  inRadius (o, radius, meToo = false) {
    const agents = new AgentSet()
    // const {x, y} = o
    const d2 = radius * radius
    const sqDistance = util.sqDistance // Local function 2-3x faster, inlined?
    for (const a of this) {
      if (sqDistance(o.x, o.y, a.x, a.y) <= d2)
        if (meToo || o !== a) agents.push(a)
    }
    return agents
  }

  // As above, but also limited to the angle `coneAngle` around
  // a `direction` from object `o`.
  inCone (o, radius, coneAngle, direction, x0, y0, meToo = false) {
    const agents = new AgentSet()
    // const {x, y} = o
    for (const a of this) {
      if (util.inCone(a.x, a.y, radius, coneAngle, direction, o.x, o.y))
        if (meToo || o !== a) agents.push(a)
    }
    return agents
  }
    // x = o.x; y = o.y
    // if @model.patches.isTorus
    //   w = @model.patches.numX; h = @model.patches.numY
    //   @asSet (a for a in @ when \
    //     u.inTorusCone(radius, angle, heading, x, y, a.x, a.y, w, h))
    // else
    //   @asSet (a for a in @ when \
    //     u.inCone(radius, angle, heading, x, y, a.x, a.y))

}

export default AgentSet
