import RGBDataSet from '../../src/RGBDataSet.js'
import util from '../../src/util.js'
import ColorMap from '../../src/ColorMap.js'
import Model from '../../src/Model.js'

function main () {
  testRGB()
}

function testRGB () {
  const imgurl = 'test/data/7.15.35.png'
  util.imagePromise(imgurl).then((img) => {
    console.log(img)
    var ds = new RGBDataSet(img)
    // put colors onto a model
    model.patches.importDataSet(ds, 'elev', true)
    const cmap = ColorMap.Jet
    const [min, max] = [ds.min(), ds.max()]
    console.log('min:', min, 'max:', max)
    for (const p of model.patches) {
      p.setColor(cmap.scaleColor(p.elev, min, max))
    }
    model.once()
    console.log(ds)
  })
}

const model = new Model(document.body, {
  patchSize: 1,
  minX: -100,
  maxX: 355,
  minY: 0,
  maxY: 255
})

util.toWindow({ model })

main()
