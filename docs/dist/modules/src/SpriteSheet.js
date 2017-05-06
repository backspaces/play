import util from './util.js'

// Sprites are images/drawings within a sprite-sheet.
class SpriteSheet {
  constructor (spriteSize = 64, spritesPerRow = 16, usePowerOf2 = true) {
    Object.assign(this, {spriteSize, cols: spritesPerRow, usePowerOf2})
    this.rows = 1
    this.nextCol = 0
    this.nextRow = 0
    this.sprites = {}
    this.paths = Object.assign({}, paths) // installPaths()
    if (usePowerOf2) this.checkPowerOf2()
    this.ctx = util.createCtx(this.width, this.height)
    this.texture = null // THREE use optional
  }
  // width & height in pixels
  get width () { return this.spriteSize * this.cols }
  get height () { return this.spriteSize * this.rows }
  // next col, row in pixels
  get nextX () { return this.spriteSize * this.nextCol }
  get nextY () { return this.spriteSize * this.nextRow }
  // id = number of sprites
  get id () { return Object.keys(this.sprites).length }

  // Return standard agentscript quad:
  //      3   2
  //      -----
  //      |  /|
  //      | / |
  //      |/  |
  //      -----
  //      0   1
  // I.e. botLeft, botRight, topRight, topLeft
  getUVs (sprite) {
    const {row, col} = sprite
    const {rows, cols} = this
    const x0 = col / cols
    const y0 = row / rows
    const x1 = (col + 1) / cols
    const y1 = (row + 1) / rows
    // return [[x0, y1], [x1, y1], [x1, y0], [x0, y0]]
    return [x0, y1, x1, y1, x1, y0, x0, y0]
  }
  // Return uv's object: {topLeft, topRight, botLeft, botRight}
  // getUVsObj (sprite) { // REMIND
  //   const uvs = this.getUVs
  //   return {
  //     botLeft: uvs[0],
  //     botRight: uvs[1],
  //     topRight: uvs[2],
  //     topLeft: uvs[3]
  //   }
  // }

  checkPowerOf2 () {
    const {width, height} = this
    if (!(util.isPowerOf2(width) && util.isPowerOf2(height)))
      util.error(`SpriteSheet non power of 2: ${width}x${height}`)
  }

  // REMIND: figure out how to have img be a path string & return its sprite
  // spriteName (name, color1 = null, color2 = null) {
  //   name = name.replace(/^.*\//, '')
  //   return name.replace(/\./, 'img')
  // }
  // addImagePromise (url, fcn = (sprite) => {}) {
  //   util.imagePromise(url).then((img) => { fcn(this.addImage(img)) })
  // }
  addImage (img) {
    let name = img.src
    name = name.replace(/^.*\//, '')
    name = name.replace(/\./, 'img')
    if (this.sprites[name]) return this.sprites[name]
    this.checkSheetSize() // Resize ctx if nextRow > rows
    const [x, y, size] = [this.nextX, this.nextY, this.spriteSize]
    this.ctx.drawImage(img, x, y, size, size)
    const id = this.id // Object.keys(this.sprites).length
    const {nextRow: row, nextCol: col} = this
    const sprite = {id, name, x, y, row, col, size, sheet: this}
    sprite.uvs = this.getUVs(sprite)
    this.sprites[name] = sprite
    this.incrementRowCol()
    if (this.texture) this.texture.needsUpdate = true
    return sprite
  }
  addDrawing (drawFcn, fillColor = 'red', strokeColor = 'black', useHelpers = true) {
    const img = this.createImage(drawFcn, fillColor, strokeColor, useHelpers)
    return this.addImage(img) // return sprite
  }
  // getSprite (name) { return this.sprites[name] }
  // Resize ctx if nextRow > rows
  incrementRowCol () {
    this.nextCol += 1
    if (this.nextCol < this.cols) return
    this.nextCol = 0
    this.nextRow += 1
  }
  // Resize ctx if too small for next row/col
  checkSheetSize () {
    if (this.nextRow === this.rows) { // this.nextCol should be 0
      this.rows = (this.usePowerOf2) ? this.rows * 2 : this.rows + 1
      util.resizeCtx(this.ctx, this.width, this.height)
      // Recalculate existing sprite uvs.
      util.forEach(this.sprites, (sprite) => { sprite.uvs = this.getUVs(sprite) })
    }
  }

  // Create a sprite image. See [Drawing shapes with canvas](https://goo.gl/uBwxMq)
  //
  // The drawFcn args: drawFcn(ctx).
  // The ctx fill & stroke styles are pre-filled w/ fillColor, strokeColor.
  //
  // If useHelpers:
  // - Transform to -1 -> +1 coords
  // - drawFcn is surrounded with ctx beginPath & closePath, fill fcns.
  //
  // If not using helpers, ctx.canvas.width/height is the size of drawing,
  // top/left canvas coordinates.
  createImage (drawFcn, fillColor, strokeColor = 'black', useHelpers = true) {
    const ctx = util.createCtx(this.spriteSize, this.spriteSize)
    ctx.fillStyle = fillColor
    ctx.strokeStyle = strokeColor
    if (useHelpers) {
      ctx.scale(this.spriteSize / 2, this.spriteSize / 2)
      ctx.translate(1, 1)
      ctx.beginPath()
    }

    if (util.isString(drawFcn)) {
      this.paths[drawFcn](ctx)
    } else {
      drawFcn(ctx)
    }

    if (useHelpers) {
      ctx.closePath()
      ctx.fill()
    }

    const name = drawFcn.name || drawFcn
    ctx.canvas.src = `${name}${fillColor}`
    return ctx.canvas
  }
  installDrawing (fcn, name = fcn.name) { this.paths[name] = fcn }

}

const paths = {
  poly (ctx, points) {
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt[0], pt[1])
      else ctx.lineTo(pt[0], pt[1])
    })
  },
  default (ctx) { this.dart(ctx) },
  arrow (ctx) {
    this.poly(ctx,
      [[1, 0], [0, 1], [0, 0.4], [-1, 0.4], [-1, -0.4], [0, -0.4], [0, -1]])
  },
  bug (ctx) {
    ctx.lineWidth = 0.1
    this.poly(ctx, [[0.8, 0.45], [0.4, 0], [0.8, -0.45]])
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0.24, 0, 0.26, 0, 2 * Math.PI)
    ctx.arc(-0.1, 0, 0.26, 0, 2 * Math.PI)
    ctx.arc(-0.54, 0, 0.4, 0, 2 * Math.PI)
  },
  circle (ctx) { ctx.arc(0, 0, 1, 0, 2 * Math.PI) },
  dart (ctx) { this.poly(ctx, [[1, 0], [-1, 0.8], [-0.5, 0], [-1, -0.8]]) },
  frame (ctx) {
    const inset = 0.4
    ctx.fillRect(-1, -1, 2, 2)
    ctx.fill()
    ctx.clearRect(-1 + inset, -1 + inset, 2 - (2 * inset), 2 - (2 * inset))
  },
  frame2 (ctx) {
    const inset = 0.4
    ctx.fillRect(-1, -1, 2, 2)
    ctx.fill()
    ctx.fillStyle = ctx.strokeStyle
    ctx.fillRect(-1 + inset, -1 + inset, 2 - (2 * inset), 2 - (2 * inset))
  },
  person (ctx) {
    this.poly(ctx, [ [0.3, -0.4], [0.6, 0], [0.25, 0.2], [0.25, -0.1],
    [0.2, 0.3], [0.5, 1], [0.1, 1], [0, 0.5],
    [-0.1, 1], [-0.5, 1], [-0.2, 0.3], [-0.25, -0.1],
    [-0.25, 0.2], [-0.6, 0], [-0.3, -0.4]])
    ctx.closePath()
    ctx.arc(0, -0.7, 0.3, 0, 2 * Math.PI)
  },
  ring (ctx) { // transparent
    const [rOuter, rInner] = [1, 0.6]
    ctx.arc(0, 0, rOuter, 0, 2 * Math.PI, false)
    ctx.lineTo(rInner, 0)
    ctx.arc(0, 0, rInner, 0, 2 * Math.PI, true)
  },
  ring2 (ctx) { // fileStyle is outer color, strokeStyle inner color
    const [rOuter, rInner] = [1, 0.6]
    ctx.arc(0, 0, rOuter, 0, 2 * Math.PI) // x, y, r, ang0, ang1, cclockwise
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.fillStyle = ctx.strokeStyle
    ctx.arc(0, 0, rInner, 0, 2 * Math.PI) // x, y, r, ang0, ang1, cclockwise
  },
  square (ctx) { ctx.fillRect(-1, -1, 2, 2) },
  triangle (ctx) { this.poly(ctx, [[1, 0], [-1, -0.8], [-1, 0.8]]) }
}

export default SpriteSheet
