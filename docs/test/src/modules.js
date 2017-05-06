// Import the lib/ mmodules via relative paths
import OofA from '../../src/OofA.js'
import DataSet from '../../src/DataSet.js'
import AgentSet from '../../src/AgentSet.js'
import Color from '../../src/Color.js'
import ColorMap from '../../src/ColorMap.js'
import util from '../../src/util.js'

const modules =
  { DataSet, util, OofA, AgentSet, Color, ColorMap }
util.toWindow(modules)
// const { DataSet: ds, util: u, OofA: oofa, AgentSet: aset, Color: color, ColorMap: cmap } = modules
// util.toWindow({ ds, u, oofa, aset, color, cmap })

console.log('DataSet, util, OofA, AgentSet, Color, ColorMap')
console.log('ds, u, oofa, aset, color, cmap')

// const as0 = Object.create(AgentSet) // []
//
// const size = 1e1
// util.repeat(size, (i) => as0.push({id: i}))
// util.repeat(size, (i) => as.push({id: i + 10}))
// const as1 = as.clone()
// const a = as.slice()
//
// // Object.setPrototypeOf(bigArray, AgentSet)
//
// util.toWindow({ as, as0, as1, a })

// const size = 1e6
// const uint8 = new Uint8ClampedArray(size * 4) // 112M
// const array8s = [] // 122M 10M overhead 10B per subarr
// util.step(uint8.length, 4, (i) => array8s.push(uint8.subarray(i, i + 4)))
//
// util.toWindow({ uint8, array8s })
// console.log(uint8, array8s)

// console.log(DataSet, util, OofA, AgentSet, Color, ColorMap)
// console.log(ds, u, oofa, aset, color, cmap)
