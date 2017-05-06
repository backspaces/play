import SpriteSheet from '../../src/SpriteSheet.js'
import util from '../../src/util.js'

// Create and export a spritesheet as a data image, base64

document.body.style.backgroundColor = 'lightgrey'
const ss = new SpriteSheet(64, 4)

const modules = { SpriteSheet, util, ss }
util.toWindow(modules)
console.log(Object.keys(modules).join(', '))

document.body.appendChild(ss.ctx.canvas)

// 16 basic colors:
// white silver gray black red maroon yellow olive
// lime green cyan teal blue navy magenta purple

// function pentagon (ctx) {
//   ss.paths.poly(ctx,
//     [[0, -0.9], [-0.9, -0.2], [-0.6, 0.9], [0.6, 0.9], [0.9, -0.2]])
// }

// 16 sprites in a 4x4 SpriteSheet
ss.addDrawing('arrow', 'red')
ss.addDrawing('arrow', 'green')
ss.addDrawing('bug', 'yellow', 'red')
ss.addDrawing('bug', 'teal', 'cyan')

ss.addDrawing('default', 'cyan')
ss.addDrawing('default', 'gray')
ss.addDrawing('frame', 'maroon')
ss.addDrawing('frame2', 'teal', 'cyan')

ss.addDrawing('ring', 'black')
ss.addDrawing('ring2', 'maroon', 'red')
ss.addDrawing('person', 'black')
ss.addDrawing('person', 'maroon')

const spriteDir = 'https://threejs.org/examples/textures/'
const spriteNames = ['sprite', 'sprite0', 'sprite1', 'sprite2']
// Import 4 images and create a data image of the sheet when done.
spriteNames.forEach((name) => {
  util.imagePromise(spriteDir + name + '.png').then((img) => {
    ss.addImage(img)
    if (Object.keys(ss.sprites).length === 16) {
      window.sheetDataURL = util.ctxToDataUrl(ss.ctx)
      console.log('see window.sheetDataURL for the sheet data image')
    }
  })
})

// ss.addDrawing(pentagon, 'cyan')
// ss.addDrawing(pentagon, 'maroon')

// ss.addDrawing('frame', 'olive')

// colors.forEach((c, i) => ss.addDrawing('arrow', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('bug', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('circle', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('default', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('frame', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('ring', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('frame2', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('ring2', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('person', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('square', c, color2(i)))
// colors.forEach((c, i) => ss.addDrawing('triangle', c, color2(i)))

// function pentagon (ctx) {
//   ss.paths.poly(ctx,
//     [[0, -0.9], [-0.9, -0.2], [-0.6, 0.9], [0.6, 0.9], [0.9, -0.2]])
// }
// colors.forEach((c, i) => ss.addDrawing(pentagon, c, color2(i)))
//
// function pyramid (ctx) {
//   this.poly(ctx, [[0, -1], [-0.866, 0.5], [0.866, 0.5]])
// }
// ss.installDrawing(pyramid)
// colors.forEach((c, i) => ss.addDrawing('pyramid', c, color2(i)))
//
// // window.redfish = ss.addImage('test/data/redfish.png') // REMIND: try to fix
//
// util.imagePromise('test/data/redfish.png').then((img) => {
//   ss.addImage(img)
// })
