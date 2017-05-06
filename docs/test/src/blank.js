import util from '../../src/util.js'
import AgentSet from '../../src/AgentSet.js'
import Animator from '../../src/Animator.js'
import Color from '../../src/Color.js'
import ColorMap from '../../src/ColorMap.js'
import DataSet from '../../src/DataSet.js'
import DataSetIO from '../../src/DataSetIO.js'
import Model from '../../src/Model.js'
import Mouse from '../../src/Mouse.js'
import OofA from '../../src/OofA.js'
import Patch from '../../src/Patch.js'
import Patches from '../../src/Patches.js'
import RGBDataSet from '../../src/RGBDataSet.js'
console.log('this', this)
const modules = {
  AgentSet, Animator, Color, ColorMap, DataSet, DataSetIO, Mouse, Model, OofA, Patch, Patches, RGBDataSet, util
}
util.toWindow(modules)

// works, but only as modules. scripts yields as = AS.as, sigh.
// import as from '../../src/AS.js'
// console.log(as)
// modules.util.toWindow(as)
