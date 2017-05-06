// Import the lib/ mmodules via relative paths
import util from '../../src/util.js'
import Model from '../../src/Model.js'

const modules = { Model, util }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

// Switch between startup as generator or startup as promise.
const startupWithPromise = false
const imageUrl = 'test/data/redfish.png'
const dataUrl = 'test/data/test.txt'

class AsyncTest extends Model {
  * generatorStartup () {
    console.log('generatorStartup this', this)
    this.img = yield util.imagePromise(imageUrl)
    this.data = yield util.xhrPromise(dataUrl)
    console.log('startup done', [this.img, this.data])
  }
  promiseStartup () {
    return new Promise((resolve, reject) => {
      console.log('promiseStartup this', this)
      const imgPromise = util.imagePromise(imageUrl)
      const dataPromise = util.xhrPromise(dataUrl)
      Promise.all([imgPromise, dataPromise])
      .then((values) => {
        [this.img, this.data] = values
        console.log('startup done', [this.img, this.data])
        resolve()
      })
    })
  }
  startup () {
    console.log('startupWithPromise', startupWithPromise)
    if (startupWithPromise)
      return this.promiseStartup()
    else
      return this.generatorStartup()
  }
  setup () {
    this.anim.setRate(0.5) // slow
    console.log('setup done', [this.img, this.data])
  }
  step () {
    console.log('step')
    if (this.anim.ticks === 10) { console.log('stopping'); this.stop() }
  }
}
// const model = new AsyncTest('model').start()
const model = new AsyncTest().start()
util.toWindow({model})
// model.start()
