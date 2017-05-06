import SpriteSheet from '../../src/SpriteSheet.js'
import util from '../../src/util.js'

document.body.style.backgroundColor = 'lightgrey'
const ss = new SpriteSheet(64, 16)
// const paths = SpriteSheet.getPaths()

const modules = { SpriteSheet, util, ss }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

document.body.appendChild(ss.ctx.canvas)

const colors = 'white silver gray black red maroon yellow olive lime green cyan teal blue navy magenta purple'.split(' ')
function color2 (i) { return i === 0 ? colors[colors.length - 1] : colors[i - 1] }
util.toWindow({colors, color2})

colors.forEach((c, i) => ss.addDrawing('arrow', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('bug', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('circle', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('default', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('frame', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('ring', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('frame2', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('ring2', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('person', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('square', c, color2(i)))
colors.forEach((c, i) => ss.addDrawing('triangle', c, color2(i)))

function pentagon (ctx) {
  ss.paths.poly(ctx,
    [[0, -0.9], [-0.9, -0.2], [-0.6, 0.9], [0.6, 0.9], [0.9, -0.2]])
}
colors.forEach((c, i) => ss.addDrawing(pentagon, c, color2(i)))

function pyramid (ctx) {
  this.poly(ctx, [[0, -1], [-0.866, 0.5], [0.866, 0.5]])
}
ss.installDrawing(pyramid)
colors.forEach((c, i) => ss.addDrawing('pyramid', c, color2(i)))

// window.redfish = ss.addImage('test/data/redfish.png') // REMIND: try to fix

util.imagePromise('test/data/redfish.png').then((img) => {
  ss.addImage(img)
})
