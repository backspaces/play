const util = AS.util

window.util = util
util.toWindow({util, pps: util.pps})
// import {pps} from './util.js'

// Case 3: Prototypal Inheritance Stack
// Prototypal Agent Methods

const agentObject = { // agent prototype
  setID (id) { this.id = id },
  setxy (x, y) { this.x = x; this.y = y },
  getColor () { return this.color }
}
// AgentSet Contains these
let ID = 0
// An empty defaults obj w/ agentObject as proto
const defaults = Object.create(agentObject)
function setDefault (key, value) {
  defaults[key] = value
}
// The agent creation function
function createAgent () {
  const obj = Object.create(defaults)
  obj.setID(ID++)
  return obj
}

const a = createAgent()
a.setxy(1, 2); setDefault('color', 'red')
console.log(a.id, a.x, a.y, a.color, a.getColor())
// 0 1 2 "red" "red"
const b = createAgent()
b.setxy(3, 4); b.color = 'green'
console.log(b.id, b.x, b.y, b.color, b.getColor())
// 1 3 4 "green" "green"

util.pps(a, 'a')
util.pps(b, 'b')
// pps(a, 'a')
// pps(b, 'b')

// Destructuring test
/* eslint-disable */
const w = 100, h = 100, d = new Array(w * h), num = 1e5, array = [w, h, d]
const ad = {
  f6 (a) {
    const [width, height, data] = a
  },
  f5 (a) {
    const width = a[0], height = a[1], data = a[2]
  }
}
util.timeit(i => ad.f6(array), num, 'es6 array destructuring')
util.timeit(i => ad.f5(array), num, 'es5 array destructuring')

const obj = {width: w, height: h, data: d}
const od = { // object deconstruction
  f6 (obj) {
    const { width, height, data } = obj
  },
  f5 (obj) {
    const width = obj.width, height = obj.height, data = obj.data
  }
}
util.timeit(i => od.f6(obj), num, 'es6 object destructuring')
util.timeit(i => od.f5(obj), num, 'es5 object destructuring')
