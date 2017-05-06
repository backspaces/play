// A colormap is simply an array of typedColors with several utilities such
// as randomColor, closestColor etc.
// This allows the colors to be simple integer indices
// into the Array. They are also designed to be webgl-ready, being a
// GLSL "Uniform" variable TypedArray for colors.

import util from './util.js'
import Color from './Color.js'

const ColorMap = {
// ### Color Array Utilities
  // Several utilities for creating color arrays

// ### Gradients

  // Ask the browser to use the canvas gradient feature
  // to create nColors given the gradient color stops and locs.
  // See Mozilla [Gradient Doc](
  // https://developer.mozilla.org/en-US/docs/Web/CSS/linear-gradient),
  //
  // This is a powerful browser feature, can be
  // used to create all the MatLab colormaps.
  //
  // Stops are css strings or rgba arrays.
  // Locs are floats from 0-1, default is equally spaced.
  gradientImageData (nColors, stops, locs) {
    // Convert the color stops to css strings
    stops = stops.map((c) => Array.isArray(c) ? Color.rgbaString(...c) : c)
    const ctx = util.createCtx(nColors, 1)
    // Install default locs if none provide
    if (!locs) locs = util.aRamp(0, 1, stops.length)
    // Create a new gradient and fill it with the color stops
    const grad = ctx.createLinearGradient(0, 0, nColors, 0)
    util.repeat(stops.length, (i) => grad.addColorStop(locs[i], stops[i]))
    // Draw the gradient, returning the image data TypedArray
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, nColors, 1)
    return util.ctxImageData(ctx).data
  },

// ### Array Conversion Utilities

  // Convert a Uint8Array into Array of 4 element typedColors.
  // Useful for converting ImageData objects like gradients to colormaps.
  // WebGL ready: the array.typedArray is suitable for Uniforms.
  typedArrayToTypedColors (typedArray) {
    const array = []
    util.step(typedArray.length, 4,
      // Note: can't share subarray as color's typed array:
      // it's buffer is for entire array, not just subarray.
      (i) => array.push(Color.newTypedColor(...typedArray.subarray(i, i + 4))))
    array.typedArray = typedArray
    return array
  },
  // Convert an Array of Arrays to an Array of typedColors.
  // Webgl ready as above.
  arraysToColors (array) {
    const typedArray = new Uint8ClampedArray(array.length * 4)
    util.repeat(array.length, (i) => {
      const a = array[i]
      if (a.length === 3) a.push(255)
      typedArray.set(a, i * 4)
    })
    return this.typedArrayToTypedColors(typedArray)
  },

  // Permute the values of 3 arrays. Ex:
  //
  // [1,2],[3],[4,5] -> [ [1,3,4],[1,3,5],[2,3,4],[2,3,5] ]
  permuteArrays (A1, A2 = A1, A3 = A1) {
    const array = []
    for (const a3 of A3) // sorta odd const works with ths, but...
      for (const a2 of A2)
        for (const a1 of A1)
          array.push([a1, a2, a3])
    return array
  },
  // Use permuteArrays to create uniformly spaced color ramp permutation.
  // Ex: if numRs is 3, permuteArrays's A1 would be [0, 127, 255]
  permuteRGBColors (numRs, numGs = numRs, numBs = numRs) {
    const toRamp = (num) => util.aIntRamp(0, 255, num)
    const ramps = [numRs, numGs, numBs].map(toRamp)
    return this.permuteArrays(...ramps)
  },

// ### ColorMaps

  // ColorMaps are Arrays of TypedColors with these additional methods. Webgl
  // ready if made w/ `typedArrayToTypedColors` or `arraysToColors` above.
  // Used to be memory effecent (shared colors), webgl compatible,  and for
  // MatLab-like color-as-data.
  ColorMapProto: {
    // Inherit from Array
    __proto__: Array.prototype,
    // Create a [sparse array](https://goo.gl/lQlq5k) of index[pixel] = pixel.
    // Used by indexOf below for exact match of a color within the colormap.
    createIndex () {
      this.index = []
      util.repeat(this.length, (i) => {
        const px = this[i].getPixel()
        this.index[px] = i
        if (this.cssNames) this.index[this.cssNames[i]] = i
      })
    },
    // Return a random index into the colormap array
    randomIndex () { return util.randomInt(this.length) },
    // Return a random color within the colormap
    randomColor () { return this[this.randomIndex()] },
    // Return the index of a typedColor within the colormap,
    // undefined if no exact match.
    // Use the `closest` methods below for nearest, not exact, match.
    indexOf (color) {
      if (this.index) return this.index[color.getPixel()]
      for (let i = 0; i < this.length; i++)
        if (color.equals(this[i])) return i
      return undefined
    },
    // Return color scaled by number within [min, max].
    // A linear interpolation (util.lerp) in [0, length-1].
    // Used to match data directly to a color as in MatLab.
    //
    // Ex: scaleColor(25, 0, 50) returns the color in the middle of the colormap
    scaleColor (number, min, max) {
      number = util.clamp(number, min, max)
      const scale = util.lerpScale(number, min, max)
      const index = Math.round(util.lerp(0, this.length - 1, scale))
      return this[index]
    },
    // Return the Uint8 array used to create the typedColors,
    // undefined if not webgl ready.
    webglArray () { return this.typedArray },

    // Debugging: Return a string with length and array of colors
    toString () { return `${this.length} ${util.arraysToString(this)}` },

    // Iterate through the colormap colors, returning the index of the
    // min typedColor.rgbDistance value from r, g, b
    rgbClosestIndex (r, g, b) {
      let minDist = Infinity
      let ixMin = 0
      for (var i = 0; i < this.length; i++) {
        const d = this[i].rgbDistance(r, g, b)
        if (d < minDist) {
          minDist = d
          ixMin = i
          if (d === 0) return ixMin
        }
      }
      return ixMin
    },
    // Return the color with the rgbClosestIndex value
    rgbClosestColor (r, g, b) { return this[this.rgbClosestIndex(r, g, b)] },

    // Calculate the closest cube index for the given r, g, b values.
    // Faster than rgbClosestIndex, does direct calculation, not iteration.
    cubeClosestIndex (r, g, b) {
      const cube = this.cube
      const rgbSteps = cube.map(c => 255 / (c - 1))
      const rgbLocs = [r, g, b].map((c, i) => Math.round(c / rgbSteps[i]))
      const [rLoc, gLoc, bLoc] = rgbLocs
      return (rLoc) + (gLoc * cube[0]) + (bLoc * cube[0] * cube[1])
    },
    cubeClosestColor (r, g, b) { return this[this.cubeClosestIndex(r, g, b)] },

    // Choose the appropriate method for finding closest index.
    // Lets the user specify any color, and let the colormap
    // use the best match.
    closestIndex (r, g, b) {
      return this.cube ? // eslint-disable-line
        this.cubeClosestIndex(r, g, b) : this.rgbClosestIndex(r, g, b)
    },
    // Choose the appropriate method for finding closest color
    closestColor (r, g, b) { return this[this.closestIndex(r, g, b)] }
  },

// ### Utilities for constructing ColorMaps

  // Convert an array of rgb(a) Arrays or TypedColors to a webgl-ready colormap.
  basicColorMap (colors) {
    colors = this.arraysToColors(colors)
    Object.setPrototypeOf(colors, this.ColorMapProto)
    return colors
  },
  // Create a gray map (gray: r=g=b)
  // These are typically 256 entries but can be smaller
  // by passing a size parameter and the min/max range.
  grayColorMap (min = 0, max = 255, size = max - min + 1) {
    const ramp = util.aIntRamp(min, max, size)
    return this.basicColorMap(ramp.map((i) => [i, i, i]))
  },

  // Create a colormap by permuted rgb values.
  //
  // numRs, numGs, numBs are numbers, the number of steps beteen 0-255.
  // Ex: numRs = 3, corresponds to 0, 128, 255.
  // NOTE: the defaults: rgbColorCube(6) creates a `6 * 6 * 6` cube.
  rgbColorCube (numRs, numGs = numRs, numBs = numRs) {
    const array = this.permuteRGBColors(numRs, numGs, numBs)
    const map = this.basicColorMap(array)
    // Save the parameters for fast color calculations.
    map.cube = [numRs, numGs, numBs]
    return map
  },
  // Create a colormap by permuting the values of the given arrays.
  // Similar to above but with arrays that may have arbitrary values.
  rgbColorMap (R, G, B) {
    const array = this.permuteArrays(R, G, B)
    return this.basicColorMap(array)
  },

  // Create an hsl map, inputs are arrays to be permutted like rgbColorMap.
  // Convert the HSL values to typedColors, default to bright hue ramp (L=50).
  hslColorMap (H, S = [100], L = [50]) {
    const hslArray = this.permuteArrays(H, S, L)
    const array = hslArray.map(a => Color.toTypedColor(Color.hslString(...a)))
    return this.basicColorMap(array)
  },

  // Use gradient to build an rgba array, then convert to colormap.
  // Stops are css strings or rgba arrays.
  // locs defaults to evenly spaced, probably what you want.
  //
  // This easily creates all the MatLab colormaps like "jet" below.
  gradientColorMap (nColors, stops, locs) {
    const uint8arrays = this.gradientImageData(nColors, stops, locs)
    const typedColors = this.typedArrayToTypedColors(uint8arrays)
    Object.setPrototypeOf(typedColors, this.ColorMapProto)
    return typedColors
  },
  // The most popular MatLab gradient, "jet":
  jetColors: [ [0, 0, 127], [0, 0, 255], [0, 127, 255], [0, 255, 255],
    [127, 255, 127], [255, 255, 0], [255, 127, 0], [255, 0, 0], [127, 0, 0] ],
  // Two other popular MatLab 'ramp' gradients are:
  // * One color: from black/white to color, optionally back to white/black.
  // stops = ['black', 'red'] or ['white', 'orange', 'black']
  // The NetLogo map is a concatenation of 14 of these.
  // * Two colors: stops = ['red', 'orange'] (blends the tow, center is white)

  // The 16 unique [CSS Color Names](https://goo.gl/sxo36X), case insensitive.
  // Aqua == Cyan and Fuchsia == Magenta, 18 total color names.
  // These sorted by hue/saturation/light, hue in 0-300 degrees.
  // See [Mozilla Color Docs](https://goo.gl/tolSnS) for *lots* more!
  basicColorNames: 'white silver gray black red maroon yellow olive lime green cyan teal blue navy magenta purple'.split(' '),
  // Create a named colors colormap
  cssColorMap (cssArray) {
    const array = cssArray.map(str => Color.stringToUint8s(str))
    const map = this.basicColorMap(array)
    map.cssNames = cssArray
    return map
  },

// ### Shared Global ColorMaps

  // The shared global colormaps are lazy evaluated to minimize memory use.
  LazyMap (name, map) {
    Object.defineProperty(this, name, {value: map, enumerable: true})
    return map
  },
  get Gray () { return this.LazyMap('Gray', this.grayColorMap()) },
  get Jet () {
    return this.LazyMap('Jet', this.gradientColorMap(256, this.jetColors))
  },
  get Rgb256 () { return this.LazyMap('Rgb256', this.rgbColorCube(8, 8, 4)) },
  get Rgb () { return this.LazyMap('Rgb', this.rgbColorCube(16)) },
  get Basic16 () {
    return this.LazyMap('Basic16', this.cssColorMap(this.basicColorNames))
  }
}

export default ColorMap
