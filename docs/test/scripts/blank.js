const util = AS.util
const AgentSet = AS.AgentSet
const Animator = AS.Animator
const Color = AS.Color
const ColorMap = AS.ColorMap
const DataSet = AS.DataSet
const DataSetIO = AS.DataSetIO
const Model = AS.Model
const Mouse = AS.Mouse
const OofA = AS.OofA
const Patch = AS.Patch
const Patches = AS.Patches
const RGBDataSet = AS.RGBDataSet
console.log('this', this)
const modules = {
  AgentSet, Animator, Color, ColorMap, DataSet, DataSetIO, Mouse, Model, OofA, Patch, Patches, RGBDataSet, util
}
util.toWindow(modules)

// works, but only as modules. scripts yields as = AS.as, sigh.
// import as from '../../src/AS.js'
// console.log(as)
// modules.util.toWindow(as)
