var AS = (function () {
'use strict';

// A set of useful misc utils which will eventually move to individual files.
// Note we use arrow functions one-liners, more likely to be optimized.
// REMIND: Test optimization, if none, remove arrow one-liners.
const util = {

// ### Types

  // Fixing the javascript [typeof operator](https://goo.gl/Efdzk5)
  typeOf: (obj) => ({}).toString.call(obj).match(/\s(\w+)/)[1].toLowerCase(),
  isOneOf: (obj, array) => array.includes(util.typeOf(obj)),
  // isUintArray: (obj) => util.typeOf(obj).match(/uint.*array/),
  isUintArray: (obj) => /^uint.*array$/.test(util.typeOf(obj)),
  isIntArray: (obj) => /^int.*array$/.test(util.typeOf(obj)),
  isFloatArray: (obj) => /^float.*array$/.test(util.typeOf(obj)),
  isImage: (obj) => util.typeOf(obj) === 'image',
  isImageable: (obj) => util.isOneOf(obj,
    ['image', 'htmlimageelement', 'htmlcanvaselement']),
  // Is obj TypedArray? If obj.buffer not present, works, type is 'undefined'
  isTypedArray: (obj) => util.typeOf(obj.buffer) === 'arraybuffer',
  // Is a number an integer (rather than a float w/ non-zero fractional part)
  isInteger: Number.isInteger || ((num) => Math.floor(num) === num),
  // Is obj a string?
  isString: (obj) => typeof obj === 'string',
  // Check [big/little endian](https://en.wikipedia.org/wiki/Endianness)
  isLittleEndian () {
    const d32 = new Uint32Array([0x01020304]);
    return (new Uint8ClampedArray(d32.buffer))[0] === 4
  },

  // Throw an error with string.
  // Use instead of `throw message` for better debugging
  error: (message) => { throw new Error(message) },

  // Identity fcn, returning its argument unchanged. Used in callbacks
  identity: (o) => o,
  // No-op function, does nothing. Used for default callback.
  noop: () => {},
  // Return function returning an object's property.  Property in fcn closure.
  propFcn: (prop) => (o) => o[prop],

  // Convert Array or TypedArray to given Type (Array or TypedArray).
  // Result same length as array, precision may be lost.
  // * If array already of correct type, return it unmodified.
  // * If Type is Array, call typedArrayToArray(array) below.
  // * Otherwise return `new Type(array)`
  convertArray (array, Type) {
    const Type0 = array.constructor;
    // return array if already same Type
    if (Type0 === Type) return array
    // If Type is Array, convert via typedArrayToArray
    if (Type === Array) return this.typedArrayToArray(array)
    return new Type(array) // Use standard TypedArray constructor
  },
  // Convert a TypedArray (or Array) to an Array with the same length.
  // To convert an Array to a TypedArray use new TypedArray(array)
  typedArrayToArray: (typedArray) => Array.prototype.slice.call(typedArray),
  // Convert to/from new Uint8Array view onto an Array or TypedArray.
  // Arrays converted to ArrayType, default Float64Array.
  // Return will in general be a different length than array
  arrayToBuffer (array, ArrayType = Float64Array) {
    if (array.constructor === Array) array = new ArrayType(array);
    return new Uint8Array(array.buffer)
  },
  bufferToArray (uint8array, Type, ArrayType = Float64Array) {
    if (Type === Array) Type = ArrayType;
    return new Type(uint8array.buffer)
  },

  // Convert between Uint8Array buffer and base64 string.
  // https://coolaj86.com/articles/typedarray-buffer-to-base64-in-javascript/
  bufferToBase64 (uint8Array) {
    const binstr = Array.prototype.map.call(uint8Array, (ch) =>
      String.fromCharCode(ch)
    ).join('');
    return btoa(binstr)
  },
  base64ToBuffer (base64) {
    const binstr = atob(base64);
    const uint8Array = new Uint8Array(binstr.length);
    Array.prototype.forEach.call(binstr, (ch, i) => {
      uint8Array[i] = ch.charCodeAt(0);
    });
    return uint8Array
  },
  // Convert between Uint8Array buffer and utf8 8bit char strings (0-255).
  escapeByteString (byteString) {
    const chars = '\'"\\\0\n\r\v\t\b\f';
    const regex = /['"\\\0\n\r\v\t\b\f]/g;
    const esc =
      ["\\'", '\\"', '\\\\', '\\0', '\\n', '\\r', '\\v', '\\t', '\\b', '\\f'];
    const f = (match) => esc[chars.indexOf(match)];
    return byteString.replace(regex, f)
  },
  bufferToByteString (uint8Array, chunkSize = 32768) { // 2**15
    // See [MDN apply array size limit](https://goo.gl/zBGub)
    // and StackOverflow Buffer to/from String [here](http://goo.gl/vyEkIL)
    // and [here](http://goo.gl/79RlVc)
    let result = '';
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const subArray = uint8Array.subarray(i, i + chunkSize); // subarray clamps
      result += String.fromCharCode.apply(null, subArray);
    }
    return result
  },
  byteStringToBuffer (utf8) {
    const result = new Uint8Array(utf8.length);
    for (let i = 0; i < utf8.length; i++) result[i] = utf8.codePointAt(i);
    return result
  },

// ### Debug

  // Use chrome/ffox/ie console.time()/timeEnd() performance functions
  timeit (f, runs = 1e5, name = 'test') {
    console.time(name);
    for (let i = 0; i < runs; i++) f(i);
    console.timeEnd(name);
  },

  pps (obj, title = '') {
    if (title) console.log(title);   // eslint-disable-line
    let count = 1;
    let str = '';
    while (obj) {
      if (typeof obj === 'function') {
        str = obj.constructor.toString();
      } else {
        const okeys = Object.keys(obj);
        str = okeys.length > 0
          ? `[${okeys.join(', ')}]` : `[${obj.constructor.name}]`;
      }
      console.log(`[${count++}]: ${str}`);
      obj = Object.getPrototypeOf(obj);
    }
  },

  // addToDom: add an element to the doeument body
  addToDom (src, type) {
    if (type) {
      type = document.createElement(type);
      src = type.textContent = src;
    }
    document.body.appendChild(src);
  },

  // Return a string representation of an array of arrays
  arraysToString: (arrays) => arrays.map((a) => `[${a}]`).join(','),

  // Return array of strings of fixed floats to given precision
  fixedStrings (array, digits = 4) {
    array = this.convertArray(array, Array); // Only Array stores strings.
    return array.map((n) => n.toFixed(digits))
  },

  // Merge from's key/val pairs into to the global window namespace
  toWindow (obj) {
    Object.assign(window, obj);
    console.log('toWindow:', Object.keys(obj).join(', '));
  },

// ### HTML, CSS, DOM

  // REST: Parse the query, returning an object of key/val pairs.
  parseQueryString () {
    const results = {};
    const query = document.location.search.substring(1);
    query.split('&').forEach((s) => {
      const param = s.split('=');
      // If just key, no val, set val to true
      results[param[0]] = (param.length === 1) ? true : param[1];
    });
    return results
  },

  // Create dynamic `<script>` tag, appending to `<head>`
  //   <script src="./test/src/three0.js" type="module"></script>
  setScript (path, props = {}) {
    const scriptTag = document.createElement('script');
    scriptTag.src = path;
    this.forEach(props, (val, key) => { scriptTag[key] = val; });
    document.querySelector('head').appendChild(scriptTag);
  },

  // Get element (i.e. canvas) relative x,y position from event/mouse position.
  getEventXY (element, evt) { // http://goo.gl/356S91
    const rect = element.getBoundingClientRect();
    return [ evt.clientX - rect.left, evt.clientY - rect.top ]
  },

  // Set the text font, align and baseline drawing parameters.
  // Obj can be either a canvas context or a DOM element
  // See [reference](http://goo.gl/AvEAq) for details.
  // * font is a HTML/CSS string like: "9px sans-serif"
  // * align is left right center start end
  // * baseline is top hanging middle alphabetic ideographic bottom
  setTextParams (obj, font, align = 'center', baseline = 'middle') {
    obj.font = font; obj.textAlign = align; obj.textBaseline = baseline;
  },

// ### Math

  // Return random int/float in [0,max) or [min,max) or [-r/2,r/2)
  randomInt: (max) => Math.floor(Math.random() * max),
  randomInt2: (min, max) => min + Math.floor(Math.random() * (max - min)),
  randomFloat: (max) => Math.random() * max,
  randomFloat2: (min, max) => min + Math.random() * (max - min),
  randomCentered: (r) => util.randomFloat2(-r / 2, r / 2),
  // min: (a, b) => (a < b) ? a : b, // Math.max/min now faster, yay!
  // max: (a, b) => (a < b) ? b : a,

  // Return float Gaussian normal with given mean, std deviation.
  randomNormal (mean = 0.0, sigma = 1.0) { // Box-Muller
    const [u1, u2] = [1.0 - Math.random(), Math.random()]; // ui in 0,1
    const norm = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return norm * sigma + mean
  },

  // Return whether num is [Power of Two](http://goo.gl/tCfg5). Very clever!
  isPowerOf2: (num) => (num & (num - 1)) === 0, // twgl library

  // Trims decimal digits of float to reduce size.
  fixed (n, digits = 4) {
    const p = Math.pow(10, digits);
    return Math.round(n * p) / p
  },

  // A [modulus](http://mathjs.org/docs/reference/functions/mod.html)
  // function rather than %, the remainder function.
  // [`((v % n) + n) % n`](http://goo.gl/spr24) also works.
  mod: (v, n) => ((v % n) + n) % n, // v - n * Math.floor(v / n),
  // Wrap v around min, max values if v outside min, max
  wrap: (v, min, max) => min + util.mod(v - min, max - min),
  // Clamp a number to be between min/max.
  // Much faster than Math.max(Math.min(v, max), min)
  clamp (v, min, max) {
    if (v < min) return min
    if (v > max) return max
    return v
  },
  // Return true is val in [min, max] enclusive
  between: (val, min, max) => min <= val && val <= max,

  // Return a linear interpolation between lo and hi.
  // Scale is in [0-1], a percentage, and the result is in [lo,hi]
  // If lo>hi, scaling is from hi end of range.
  // [Why the name `lerp`?](http://goo.gl/QrzMc)
  lerp: (lo, hi, scale) =>
    lo <= hi ? lo + (hi - lo) * scale : lo - (lo - hi) * scale,
  // Calculate the lerp scale given lo/hi pair and a number between them.
  lerpScale: (number, lo, hi) => (number - lo) / (hi - lo),

// ### Geometry

  // Degrees & Radians
  // radians: (degrees) => util.mod(degrees * Math.PI / 180, Math.PI * 2),
  // degrees: (radians) => util.mod(radians * 180 / Math.PI, 360),
  radians: (degrees) => degrees * Math.PI / 180,
  degrees: (radians) => radians * 180 / Math.PI,
  // Heading & Angles:
  // * Heading is 0-up (y-axis), clockwise angle measured in degrees.
  // * Angle is euclidean: 0-right (x-axis), counterclockwise in radians
  heading (radians) { // angleToHeading?
    const degrees = this.degrees(radians);
    return this.mod((90 - degrees), 360)
  },
  angle (heading) { // headingToAngle?
    const degrees = this.mod(360 - heading, 360);
    return this.radians(degrees)
  },
  // Return angle (radians) in (-pi,pi] that added to rad0 = rad1
  // See NetLogo's [subtract-headings](http://goo.gl/CjoHuV) for explanation
  subtractRadians (rad1, rad0) {
    let dr = this.mod(rad1 - rad0, 2 * Math.PI);
    if (dr > Math.PI) dr = dr - 2 * Math.PI;
    return dr
  },
  // Above using headings (degrees) returning degrees in (-180, 180]
  subtractHeadings (deg1, deg0) {
    let dAngle = this.mod(deg1 - deg0, 360);
    if (dAngle > 180) dAngle = dAngle - 360;
    return dAngle
  },
  // Return angle in [-pi,pi] radians from (x,y) to (x1,y1)
  // [See: Math.atan2](http://goo.gl/JS8DF)
  radiansToward: (x, y, x1, y1) => Math.atan2(y1 - y, x1 - x),
  // Above using headings (degrees) returning degrees in [-90, 90]
  headingToward (x, y, x1, y1) {
    return this.heading(this.radiansToward(x, y, x1, y1))
  },

  // Return distance between (x, y), (x1, y1)
  distance: (x, y, x1, y1) => Math.sqrt(util.sqDistance(x, y, x1, y1)),
  // Return squared distance .. i.e. avoid Math.sqrt. Faster comparisons
  sqDistance: (x, y, x1, y1) => (x - x1) * (x - x1) + (y - y1) * (y - y1),
  // Return true if x,y is within cone.
  // Cone: origin x0,y0 in given direction, with coneAngle width in radians.
  // All angles in radians
  inCone (x, y, radius, coneAngle, direction, x0, y0) {
    if (this.sqDistance(x0, y0, x, y) > (radius * radius)) return false
    const angle12 = this.radiansToward(x0, y0, x, y); // angle from 1 to 2
    return coneAngle / 2 >= Math.abs(this.subtractRadians(direction, angle12))
  },

// ### Arrays, Objects and Iteration

  // Repeat function f(i, a) n times, i in 0, n-1, a is optional array
  repeat (n, f, a = []) { for (let i = 0; i < n; i++) f(i, a); return a },
  // Repeat function n/step times, incrementing i by step each step.
  step (n, step, f) { for (let i = 0; i < n; i += step) f(i); },
  // Return range [0, length-1]. Note: 6x faster than Array.from!
  range (length) { return this.repeat(length, (i, a) => { a[i] = i; }) },
  // range (length) { return this.repeat(length, (i, a) => { a[i] = i }, []) },

  // Return key for (first) given value in object, null if not found.
  keyForValue (obj, value) {
    for (const key in obj)
      if (obj[key] === value) //  gl problems: && obj.hasOwnProperty(key)
        return key
    return null
  },

  // Execute fcn for all own member of an obj or array (typed OK).
  // Return input arrayOrObj, transformed by fcn.
  // - Unlike forEach, does not skip undefines.
  // - Like map, forEach, etc, fcn = fcn(item, key/index, obj).
  // - Alternatives are: `for..of`, array map, reduce, filter etc
  forEach (arrayOrObj, fcn) {
    if (arrayOrObj.slice) // typed & std arrays
      for (let i = 0, len = arrayOrObj.length; i < len; i++)
        fcn(arrayOrObj[i], i, arrayOrObj);
    else // obj
      Object.keys(arrayOrObj).forEach((k) => fcn(arrayOrObj[k], k, arrayOrObj));
    return arrayOrObj
  },

  // Return a new shallow of array, either Array or TypedArray
  copyArray (array) { return array.slice(0) },

  // Return a new array that is the concatination two arrays.
  // The resulting Type is that of the first array.
  concatArrays (array1, array2) {
    const Type = array1.constructor;
    if (Type === Array)
      return array1.concat(this.convertArray(array2, Array))
    const array = new Type(array1.length + array2.length);
    // NOTE: typedArray.set() allows any Array or TypedArray arg
    array.set(array1); array.set(array2, array1.length);
    return array
  },

  // Return an array with no sub-array elements
  flatten (array) {
    if (!Array.isArray(array[0])) return array
    const result = [];
    array.forEach((a) => result.push(...a));
    return this.flatten(result)
  },

  // Return array's type (Array or TypedArray variant)
  arrayType (array) { return array.constructor },

  // Return a new JavaScript Array of floats/strings to a given precision.
  // Fails for Float32Array due to float64->32 artifiacts, thus Array conversion
  fixedArray (array, digits = 4) {
    array = this.convertArray(array, Array); // 64 bit rounding
    return array.map((n) => this.fixed(n, digits))
  },

  // Shallow clone of obj or array
  clone (obj) {
    if (obj.slice) return obj.slice(0) // ok for TypedArrays
    const result = {};
    Object.keys(obj).forEach((k) => { result[k] = obj[k]; });
    return result
  },

  // [Deep clone](http://goo.gl/MIaTxU) an obj or array. Clever!
  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),
  // Compare Objects or Arrays via JSON string. Note: TypedArrays !== Arrays
  objectsEqual: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  // Use JSON to return printable string of an object, array, other
  objectToString: (obj) => JSON.stringify(obj),

  // Create random array of floats between min/max.
  // Array Type allows conversion to Float32Array or integers (Int32Array etc)
  randomArray (length, min = 0, max = 1, Type = Array) {
    const a = new Type(length);
    for (let i = 0; i < length; i++)
      a[i] = this.randomFloat2(min, max);
    return a
  },

  // Create a histogram, given an array, a bin size, and a
  // min bin defaulting to min of of the array.
  // Return an object with:
  // - min/maxBin: the first/last bin with data
  // - min/maxVal: the min/max values in the array
  // - bins: the number of bins
  // - hist: the array of bins
  histogram (array, bin = 1, min = Math.floor(this.arrayMin(array))) {
    const hist = [];
    let [minBin, maxBin] = [Number.MAX_VALUE, Number.MIN_VALUE];
    let [minVal, maxVal] = [Number.MAX_VALUE, Number.MIN_VALUE];
    for (const a of array) {
      const i = Math.floor(a / bin) - min;
      hist[i] = (hist[i] === undefined) ? 1 : hist[i] + 1;
      minBin = Math.min(minBin, i);
      maxBin = Math.max(maxBin, i);
      minVal = Math.min(minVal, a);
      maxVal = Math.max(maxVal, a);
    }
    for (const i in hist)
      if (hist[i] === undefined) { hist[i] = 0; }
    const bins = maxBin - minBin + 1;
    return { bins, minBin, maxBin, minVal, maxVal, hist }
  },

  // Return scalar max/min/sum/avg of numeric Array or TypedArray.
  arrayMax: (array) => array.reduce((a, b) => Math.max(a, b)),
  arrayMin: (array) => array.reduce((a, b) => Math.min(a, b)),
  arraySum: (array) => array.reduce((a, b) => a + b),
  arrayAvg: (array) => util.arraySum(array) / array.length,
  // Return random one of array items. No array.length tests
  oneOf: (array) => array[util.randomInt(array.length)],
  otherOneOf (array, item) {
    do { var other = this.oneOf(array); } while (item === other) // note var use
    return other
  },
  // Create an array of properties from an array of objects
  arrayProps: (array, propName) => array.map((a) => a[propName]),
  // Random key/val of object
  oneKeyOf: (obj) => util.oneOf(Object.keys(obj)),
  oneValOf: (obj) => obj[util.oneKeyOf(obj)],

  // You'd think this wasn't necessary, but I always forget. Damn.
  // NOTE: this, like sort, sorts in place. Clone array if needed.
  sortNums (array, ascending = true) {
    return array.sort((a, b) => ascending ? a - b : b - a)
  },
  // Sort an array of objects w/ fcn(obj) as compareFunction.
  // If fcn is a string, convert to propFcn.
  sortObjs (array, fcn, ascending = true) {
    if (typeof fcn === 'string') fcn = this.propFcn(fcn);
    const comp = (a, b) => fcn(a) - fcn(b);
    return array.sort((a, b) => ascending ? comp(a, b) : -comp(a, b))
  },
  // Randomize array in-place. Use clone() first if new array needed
  // The array is returned for chaining; same as input array.
  // See [Durstenfeld / Fisher-Yates-Knuth shuffle](https://goo.gl/mfbdPh)
  shuffle (array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array
  },
  // Returns new array (of this type) of unique elements in this *sorted* array.
  // Sort or clone & sort if needed.
  uniq (array, f = this.identity) {
    if (this.isString(f)) f = this.propFcn(f);
    return array.filter((ai, i, a) => (i === 0) || (f(ai) !== f(a[i - 1])))
  },
  // unique = (array) => [...new Set(array)],

  // Binary search:
  // Return array index of item, where array is sorted.
  // If item not found, return index for item for array to remain sorted.
  // f is used to return an integer for sorting, defaults to identity.
  // If f is a string, it is the object property to sort by.
  // Adapted from underscore's _.sortedIndex.
  sortedIndex (array, item, f = this.identity) {
    if (this.isString(f)) f = this.propFcn(f);
    const value = f(item);
    // Why not array.length - 1? Because we can insert 1 after end of array.
    let [low, high] = [0, array.length];
    while (low < high) {
      const mid = (low + high) >>> 1; // floor (low+high)/2
      if (f(array[mid]) < value) { low = mid + 1; } else { high = mid; }
    }
    return low
  },
  // Return index of value in array with given property or -1 if not found.
  // Binary search if property isnt null
  // Property can be string or function.
  // Use property = identity to compare objs directly.
  indexOf (array, item, property) {
    if (!property) return array.indexOf(item)
    const i = this.sortedIndex(array, item, property);
    return array[i] === item ? i : -1
  },
  // True if item is in array. Binary search if f given
  contains (array, item, f) { return this.indexOf(array, item, f) >= 0 },
  // Remove an item from an array. Binary search if f given
  // Array unchanged if item not found.
  removeItem (array, item, f) {
    const i = this.indexOf(array, item, f);
    if (i !== -1) array.splice(i, 1);
  },
  // Insert an item in a sorted array
  insertItem (array, item, f) {
    const i = this.sortedIndex(array, item, f);
    if (array[i] === item) this.error('insertItem: item already in array');
    array.splice(i, 0, item); // copyWithin?
  },

  // Return array composed of f(a1i, a2i) called pairwise on both arrays
  aPairwise: (a1, a2, f) => a1.map((val, i) => f(val, a2[i])),
  arraysAdd: (a1, a2) => util.aPairwise(a1, a2, (a, b) => a + b),
  arraysSub: (a1, a2) => util.aPairwise(a1, a2, (a, b) => a - b),
  arraysMul: (a1, a2) => util.aPairwise(a1, a2, (a, b) => a * b),
  arraysEqual: (a1, a2) => util.arraysSub(a1, a2).every((a) => a === 0),

  // Return a "ramp" (array of uniformly ascending/descending floats)
  // in [start,stop] with numItems (positive integer > 1).
  // OK for start>stop. Will always include start/stop w/in float accuracy.
  aRamp (start, stop, numItems) {
    // NOTE: start + step*i, where step is (stop-start)/(numItems-1),
    // has float accuracy problems, must recalc step each iteration.
    if (numItems <= 1) this.error('aRamp: numItems must be > 1');
    const a = [];
    for (let i = 0; i < numItems; i++)
      a.push(start + (stop - start) * (i / (numItems - 1)));
    return a
  },
  // Integer version of aRamp, start & stop integers, rounding each element.
  // Default numItems yields unit step between start & stop.
  aIntRamp (start, stop, numItems = (Math.abs(stop - start) + 1)) {
    return this.aRamp(start, stop, numItems).map((a) => Math.round(a))
  },

  // Return an array normalized (lerp) between lo/hi values
  normalize (array, lo = 0, hi = 1) {
    const [min, max] = [this.arrayMin(array), this.arrayMax(array)];
    const scale = 1 / (max - min);
    return array.map((n) => this.lerp(lo, hi, scale * ((n) - min)))
  },
  // Return Uint8ClampedArray normalized in 0-255
  normalize8 (array) {
    return new Uint8ClampedArray(this.normalize(array, -0.5, 255.5))
  },
  // Return Array normalized to integers in lo-hi
  normalizeInt (array, lo, hi) {
    return this.normalize(array, lo, hi).map((n) => Math.round(n))
  },

// ### Async

  // Return Promise for getting an image.
  // - use: imagePromise('./path/to/img').then(img => imageFcn(img))
  imagePromise (url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(`Could not load image ${url}`);
      img.src = url;
    })
  },
  // Return Promise for ajax/xhr data.
  // - type: 'arraybuffer', 'blob', 'document', 'json', 'text'.
  // - method: 'GET', 'POST'
  // - use: xhrPromise('./path/to/data').then(data => dataFcn(data))
  xhrPromise (url, type = 'text', method = 'GET') {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url); // POST mainly for security and large files
      xhr.responseType = type;
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(`Could not load ${url}: ${xhr.status}`);
      xhr.send();
    })
  },
  // Return promise for pause of ms.
  timeoutPromise (ms) {
    return new Promise((resolve, reject) => {
      const id = setTimeout(() => { clearTimeout(id); resolve(); }, ms);
    })
  },
  // Wait until done(), then trigger promise.then
  waitPromise (done, ms) {
    return new Promise((resolve, reject) => {
      this.waitOn(done, resolve, ms);
    })
  },

  // Wait (setTimeout) until done() true, then call f()
  waitOn (done, f, ms = 10) {
    if (done())
      f();
    else
      setTimeout(() => { this.waitOn(done, f, ms); }, ms);
  },

  // An [async/await](https://davidwalsh.name/async-generators)
  // implementation using generators returning promises.
  //
  // runGenerator runs a generator which yields promises,
  // returning the promise results when they complete.
  // Amazingly enough, the returned promise result replaces the
  // promise initially yielded by the generator function.
  // The `it` argument can be either a generator function or it's iterator.
  runGenerator (it, callback = (lastVal) => {}) {
    it = this.typeOf(it) === 'generator' ? it : it()
    ;(function iterate (val) { // asynchronously iterate over generator
      const ret = it.next(val);
      if (!ret.done) // wait on promise, `then` calls iterate w/ a value
        if (ret.value.then)
          ret.value.then(iterate); // iterate takes the promise's value
        else // avoid synchronous recursion
          setTimeout(() => iterate(ret.value), 0);
      else
        callback(ret.value);
    }());
  },
  // Promise version of runGenerator.
  // The `it` argument can be either a generator function or it's iterator.
  runGeneratorPromise (it) {
    return new Promise((resolve, reject) => {
      this.runGenerator(it, resolve);
    })
  },
  // Used like this, main() is entirely sync:
  // ```
  // function* main() {
  //   var path = 'http://s3.amazonaws.com/backspaces/'
  //   var val1 = yield util.xhrPromise(path + 'lorem1.txt')
  //   console.log( 'val1', val1 )
  //   var val2 = yield util.xhrPromise(path + 'lorem2.txt')
  //   console.log( 'val2', val2 )
  // }
  // util.runGenerator( main )
  // ```

  // Run a possibly async fcn, calling thenFcn when async fcn is done.
  // The fcn can return a generator or a promise.
  // If neither, run fcn & thenFcn synchronously
  runAsyncFcn (fcn, thenFcn) {
    const startup = fcn();
    if (this.typeOf(startup) === 'generator')
      this.runGenerator(startup, thenFcn);
    else if (this.typeOf(startup) === 'promise')
      startup.then(thenFcn);
    else
      thenFcn();
  },

// ### Canvas/Image

  // Get an image in this page by its ID
  getCanvasByID: (id) => document.getElementById(id),
  // Create a blank canvas of a given width/height
  createCanvas (width, height) {
    const can = document.createElement('canvas');
    Object.assign(can, {width, height});
    return can
  },
  // As above, but returing the context object.
  // NOTE: ctx.canvas is the canvas for the ctx, and can be use as an image.
  createCtx (width, height, type = '2d', glAttributes = {}) {
    const can = this.createCanvas(width, height);
    return this.getContext(can, type, glAttributes)
  },
  getContext (canvas, type = '2d', glAttributes = {}) {
    if (typeof canvas === 'string') canvas = this.getCanvasByID(canvas);
    if (type[0] !== '2') type = 'webgl';
    const ctx = canvas.getContext(type, glAttributes);
    if (!ctx) this.error('getContext error');
    return ctx
  },
  // Duplicate a ctx's image. Returns the new ctx (who's canvas is ctx.caanvas)
  cloneCtx (ctx0) {
    const ctx = this.createCtx(ctx0.canvas.width, ctx0.canvas.height);
    ctx.drawImage(ctx0.canvas, 0, 0);
    return ctx
  },
  // Resize a ctx/canvas and preserve data.
  resizeCtx (ctx, width, height) {
    const copy = this.cloneCtx(ctx);
    ctx.canvas.width = width;
    ctx.canvas.height = height;
    ctx.drawImage(copy.canvas, 0, 0);
  },
  // Return the (complete) ImageData object for this context object
  ctxImageData (ctx) {
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height)
  },
  // Fill this context with the given image. Will scale image to fit ctx size.
  fillCtxWithImage (ctx, img) {
    this.setIdentity(ctx); // set/restore identity
    ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  },
  // Return an image/png base64 [dataUrl](https://goo.gl/fyBPnL)
  // string for this ctx object.
  ctxToDataUrl: (ctx) => ctx.canvas.toDataURL('image/png'),

  // Convert a dataUrl back into am image.
  dataUrlToImage (dataUrl) { // async in some browsers?? http://goo.gl/kIk2U
    const img = new Image();
    img.src = dataUrl;
    return img
  },
  // Return a ctx object for this base64 data url
  dataUrlToCtx (dataUrl) { // async in some browsers?? http://goo.gl/kIk2U
    const img = this.dataUrlToImage(dataUrl);
    const ctx = this.createCtx(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    return ctx
  },

  setCtxSmoothing (ctx, smoothing) {
    // Don'cha love  standards!
    const aliases = ['imageSmoothingEnabled', 'mozImageSmoothingEnabled', 'oImageSmoothingEnabled', 'webkitImageSmoothingEnabled', 'msImageSmoothingEnabled'];
    for (const name of aliases)
      if (ctx[name])
        return (ctx[name] = smoothing) // lets hope the first one works. Sheesh!
  },

  // Install identity transform for this context.
  // Call ctx.restore() to revert to previous transform.
  setIdentity (ctx) {
    ctx.save(); // NOTE: Does not change state, only saves current state.
    ctx.setTransform(1, 0, 0, 1, 0, 0); // or ctx.resetTransform()
  },

// ### Canvas 2D Context Text Drawing

  // Draw string of the given color at the xy location, in ctx pixel coords.
  // Push/pop identity transform.
  ctxDrawText (ctx, string, x, y, cssColor) {
    this.setIdentity(ctx);
    ctx.fillStyle = cssColor;
    ctx.fillText(string, x, y);
    ctx.restore();
  },

  // Convert an image, or part of an image, to a context.
  // img may be another canvas.
  // * x, y are top/left in image, default to 0, 0.
  // * width, height are size of context, default to image's width, height
  // * thus default is entire image
  //
  // NOTE: to convert a ctx to an "image" (drawImage) use ctx.canvas.
  // [See MDN drawImage, third form](https://goo.gl/a5b87N)
  // NOTE: this will distort the origional image, due to browser assumptions.
  // Use imageToBytes for undistorted image content.
  //
  // REMIND: Remove?
  imageToCtx (img, x = 0, y = 0, width = img.width, height = img.height) {
    if ((x + width > img.width) || (y + height > img.height))
      this.error('imageToCtx: parameters outside of image');
    const ctx = this.createCtx(width, height);
    ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
    return ctx
  },

// ### WebGL/Three.js

  createQuad (r, z = 0) { // r is radius of xy quad: [-r,+r], z is quad z
    const vertices = [-r, -r, z, r, -r, z, r, r, z, -r, r, z];
    const indices = [0, 1, 2, 0, 2, 3];
    return {vertices, indices}
  },

  // Use webgl texture to convert img to Uint8Array w/o alpha premultiply
  // or color profile modification.
  // Img can be Image, ImageData, Canvas: [See MDN](https://goo.gl/a3oyRA).
  // `flipY` is used to invert image to upright.
  imageToBytes (img, flipY = false, imgFormat = 'RGBA') {
    // Create the gl context using the image width and height
    const {width, height} = img;
    const gl = this.createCtx(width, height, 'webgl', {
      premultipliedAlpha: false
    });
    const fmt = gl[imgFormat];

    // Create and initialize the texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (flipY) // Mainly used for pictures rather than data
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    // Insure [no color profile applied](https://goo.gl/BzBVJ9):
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
    // Insure no [alpha premultiply](http://goo.gl/mejNCK).
    // False is the default, but lets make sure!
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, fmt, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);

    // Create the framebuffer used for the texture
    const framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    // See if it all worked. Apparently not async.
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (status !== gl.FRAMEBUFFER_COMPLETE)
      this.error(`imageToBytes: status not FRAMEBUFFER_COMPLETE: ${status}`);

    // If all OK, create the pixels buffer and read data.
    const pixSize = imgFormat === 'RGB' ? 3 : 4;
    const pixels = new Uint8Array(pixSize * width * height);
    // gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    gl.readPixels(0, 0, width, height, fmt, gl.UNSIGNED_BYTE, pixels);

    // Unbind the framebuffer and return pixels
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return pixels
  }

};

// AgentSets are arrays that are factories for their own agents/objects.
// They are the base for Patches, Turtles and Links.

// Vocab: AgentSets are NetLogo collections: Patches, Turtles, and Links.
// Agent is an object in an AgentSet: Patch, Turtle, Link.

class AgentSet extends Array {
  // Create an empty `AgentSet` and initialize the `ID` counter for add().
  // If baseSet is supplied, the new agentset is a subarray of baseSet.
  // This sub-array feature is how breeds are managed, see class `Model`
  constructor (model, AgentProto, name, baseSet = null) {
    // Because es6 JavaScript Array itself calls the Array ctor
    // (ex: slice() returning a new array), skip if not AgentSet ctor.
    if (model == null) model = 0; // model is null or undefined
    if (typeof model === 'number') {
      super(model); // model is a number, return AgentSet array of that size
    } else {
      super(0); // create empty array
      baseSet = baseSet || this; // if not a breed, set baseSet to this
      // AgentSets know their model, name, baseSet, world.
      Object.assign(this, {model, name, baseSet, world: model.world});
      // // Link our agents to us
      // this.agentProto.agentSet = this
      // BaseSets know their breeds and keep the ID global
      if (this.isBaseSet()) {
        this.breeds = {}; // will contain breedname: breed entries
        this.ID = 0;
      // Breeds add themselves to baseSet.
      } else {
        this.baseSet.breeds[name] = this;
      }
      // Keep a list of this set's variables; see `own` below
      this.ownVariables = [];
      // Create a proto for our agents by having a defaults and instance layer
      this.agentProto = new AgentProto(this);
    }
  }

  // Is this a baseSet or a derived "breed"
  isBreedSet () { return this.baseSet !== this }
  isBaseSet () { return this.baseSet === this }

  // Abstract method used by subclasses to create and add their instances.
  // create () {}
  // Add an agent to the list.  Only used by agentset factory methods. Adds
  // the `id` property to all agents. Increment `ID`.
  // Returns the object for chaining. The set will be sorted by `id`.
  add (o) {
    o = o || Object.create(this.agentProto);
    if (this.isBreedSet())
      this.baseSet.add(o);
    else
      o.id = this.ID++;
    this.push(o);
    return o
  }
  clear () { while (this.any()) this.last().die(); } // die() is an agent method
  // Remove an agent from the agentset, returning the agentset for chaining.
  remove (o) {
    // Remove me from my baseSet
    if (this.isBreedSet()) util.removeItem(this.baseSet, o, 'id');
    // Remove me from my set.
    util.removeItem(this, o, 'id');
    return this
  }

  // Get/Set default values for this agentset's agents.
  setDefault (name, value) { this.agentProto[name] = value; }
  getDefault (name) { this.agentProto[name]; }
  // Declare variables of an agent class.
  // `varnames` is a string of space separated names
  own (varnames) {
    // if (this.isBreedSet())
    //   this.ownVariables = util.clone(this.baseSet.ownVariables)
    for (const name of varnames.split(' ')) {
      this.setDefault(name, null);
      this.ownVariables.push(name);
    }
  }

  // Move an agent from its AgentSet/breed to be in this AgentSet/breed.
  setBreed (a) { // change agent a to be in this breed
    // Return if `a` is already of my breed
    if (a.agentSet === this) return
    // Remove/insert breeds (not baseSets) from their agentsets
    if (a.agentSet.isBreedSet()) util.removeItem(a.agentSet, a, 'id');
    if (this.isBreedSet()) util.insertItem(this, a, 'id');

    // Make list of `a`'s vars and my ownvars.
    const avars = a.agentSet.ownVariables;
    // First remove `a`'s vars not in my ownVariables
    for (const avar of avars)
      if (!this.ownVariables.includes(avar))
        delete a[avar];
    // Now add ownVariables to `a`'s vars, default to 0.
    // If ownvar already in avars, it is not modified.
    for (const ownvar of this.ownVariables)
      if (!avars.includes(ownvar))
        a[ownvar] = 0; // NOTE: NL uses 0, maybe we should use null?

    // Give `a` my defaults/statics
    return Object.setPrototypeOf(a, this.agentProto)
  }

  // Method to convert an array to the same AgentSet type as this.
  // asAgentSet (array) {
  //   return Object.setPrototypeOf(array, Object.getPrototypeOf(this))
  // }

// ### General Array of Objects methods

  // Return true if there are no items in this set, false if not empty.
  empty () { return this.length === 0 }
  // Return !empty()
  any () { return this.length !== 0 }
  // Return last item in this array. Returns undefined if empty.
  last () { return this[ this.length - 1 ] }
  // Return true if reporter true for all of this set's objects
  all (reporter) { return this.every(reporter) }
  // Convert an AgentSet to an Array
  toArray () { Object.setPrototypeOf(this, Array.prototype); return this }
  // Return Array of property values for key from this array's objects
  props (key) { return this.map((a) => a[key]).toArray() }
  // Return agentset with reporter(agent) true
  with (reporter) { return this.filter(reporter) }
  // Call fcn(agent) for each agent in AgentSet. Return the AgentSet for chaining.
  // Note: 5x+ faster than this.forEach(fcn) !!
  ask (fcn) { for (let i = 0; i < this.length; i++) fcn(this[i]); return this }
  // Convience fcn for NetLogo's ask-with. Returns the with filtered AgentSet.
  askWith (askFcn, withFcn) { return this.with(withFcn).ask(askFcn) }
  // Return count of agents with reporter(agent) true
  count (reporter) {
    return this.reduce((prev, p) => prev + reporter(p) ? 1 : 0, 0)
  }

  // Replacements for array methods to avoid calling AgentSet ctor

  // Return shallow copy of a protion of this agentset
  // [See Array.slice](https://goo.gl/Ilgsok)
  // Default is to clone entire agentset
  clone (begin = 0, end = this.length) {
    return this.slice(begin, end) // Wow, returns an agentset rather than Array!
  }
  // Randomize the agentset in place. Use clone first if new agentset needed.
  // Return "this" for chaining.
  shuffle () { return util.shuffle(this) }
  // Return this agentset sorted by the reporter in ascending/descending order.
  // If reporter is a string, convert to a fcn returning that property.
  // Use clone if you don't want to mutate this array.
  sortBy (reporter, ascending = true) {
    util.sortObjs(this, reporter, ascending);
    return this
  }

  // Return a random agent. Return undefined if empty.
  oneOf () { return util.oneOf(this) }
  // Return a random agent, not equal to a
  otherOneOf (item) { return util.otherOneOf(this, item) }
  // otherOneOf: nOf good enough?
  // Return the first agent having the min/max of given value of f(agent).
  // If reporter is a string, convert to a fcn returning that property
  minOrMaxOf (min, reporter) {
    if (this.empty()) util.error('min/max OneOf: empty array');
    if (typeof reporter === 'string') reporter = util.propFcn(reporter);
    let o = null;
    let val = min ? Infinity : -Infinity;
    for (let i = 0; i < this.length; i++) {
      const a = this[i];
      const aval = reporter(a);
      if ((min && (aval < val)) || (!min && (aval > val)))
        [o, val] = [a, aval];
    }
    return o
  }
  // The min version of the above
  minOneOf (reporter) { return this.minOrMaxOf(true, reporter) }
  // The max version of the above
  maxOneOf (reporter) { return this.minOrMaxOf(false, reporter) }

  // Return n random agents as agentset.
  // See [Fisher-Yates-Knuth shuffle](https://goo.gl/fWNFf)
  // for better approach for large n.
  nOf (n) { // I realize this is a bit silly, lets hope random doesn't repeat!
    if (n > this.length) util.error('nOf: n larger than agentset');
    if (n === this.length) return this
    const result = new AgentSet();
    while (result.length < n) {
      const o = this.oneOf();
      if (!(o in result)) result.push(o);
    }
    // return this.asAgentSet(result)
    return result
  }
  // Return a new agentset of the n min/max agents of the value of reporter,
  // in ascending order.
  // If reporter is a string, convert to a fcn returning that property
  // NOTE: we do not manage ties, see NetLogo docs.
  minOrMaxNOf (min, n, reporter) {
    if (n > this.length) util.error('min/max nOf: n larger than agentset');
    const as = this.clone().sortBy(reporter);
    return min ? as.clone(0, n) : as.clone(as.length - n)
  }
  minNOf (n, reporter) { return this.minOrMaxNOf(true, n, reporter) }
  maxNOf (n, reporter) { return this.minOrMaxNOf(false, n, reporter) }

  // Geometry methods for patches, turtles, and other agentsets which have x,y.
  // Return all agents within rect, radius, cone from given agent o.
  // If meToo, include given object, default excludes it
  // Typically the agentset is a subset of larger sets, reducing
  // the size, then uses these inRect, inRadius or inCone methods

  // Return all agents within rectangle from given agent o.
  // dx & dy are (float) half width/height of rect
  inRect (o, dx, dy = dx, meToo = false) {
    const agents = new AgentSet();
    const minX = o.x - dx; // ok if max/min off-world, o, a are in-world
    const maxX = o.x + dx;
    const minY = o.y - dy;
    const maxY = o.y + dy;
    for (const a of this) {
      if (minX <= a.x && a.x <= maxX && minY <= a.y && a.y <= maxY) {
        if (meToo || o !== a) agents.push(a);
      }
    }
    return agents
  }

  // Return all agents in agentset within d distance from given object.
  inRadius (o, radius, meToo = false) {
    const agents = new AgentSet();
    // const {x, y} = o
    const d2 = radius * radius;
    const sqDistance = util.sqDistance; // Local function 2-3x faster, inlined?
    for (const a of this) {
      if (sqDistance(o.x, o.y, a.x, a.y) <= d2)
        if (meToo || o !== a) agents.push(a);
    }
    return agents
  }

  // As above, but also limited to the angle `coneAngle` around
  // a `direction` from object `o`.
  inCone (o, radius, coneAngle, direction, x0, y0, meToo = false) {
    const agents = new AgentSet();
    // const {x, y} = o
    for (const a of this) {
      if (util.inCone(a.x, a.y, radius, coneAngle, direction, o.x, o.y))
        if (meToo || o !== a) agents.push(a);
    }
    return agents
  }
    // x = o.x; y = o.y
    // if @model.patches.isTorus
    //   w = @model.patches.numX; h = @model.patches.numY
    //   @asSet (a for a in @ when \
    //     u.inTorusCone(radius, angle, heading, x, y, a.x, a.y, w, h))
    // else
    //   @asSet (a for a in @ when \
    //     u.inCone(radius, angle, heading, x, y, a.x, a.y))

}

// The Animator runs the Model's step() and draw() methods.

// Because not all models have the same animator requirements, we build a class
// for customization by the programmer.  See these URLs for more info:
// * [JavaScript timers docs](
//    https://developer.mozilla.org/en-US/docs/JavaScript/Timers)
// * [Using timers & requestAnimationFrame together](http://goo.gl/ymEEX)

class Animator {
  // Create initial animator for the model, specifying rate (fps) and
  // multiStep. Called by Model during initialization, use setRate to modify.
  // If multiStep, run the draw() and step() methods separately by
  // draw() using requestAnimationFrame and step() using setTimeout.
  constructor (model, rate = 60, multiStep = false) {
    Object.assign(this, {model, rate, multiStep});
    this.reset();
  }
  // Adjust animator. Call before model.start()
  // in setup() to change default settings
  setRate (rate, multiStep = false) {
    Object.assign(this, {rate, multiStep});
    this.resetTimes();
  }
  // start/stop model, called by Model.
  // Often used for debugging and resetting model.
  start () {
    if (!this.stopped) return // avoid multiple starts
    this.resetTimes();
    this.stopped = false;
    this.animate();
  }
  stop () {
    this.stopped = true;
    if (this.animHandle) cancelAnimationFrame(this.animHandle);
    if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    this.animHandle = this.timeoutHandle = null;
  }
  // Internal utility: reset time instance variables
  resetTimes () {
    this.startMS = this.now();
    this.startTick = this.ticks;
    this.startDraw = this.draws;
  }
  // Reset used by model.reset when resetting model.
  reset () { this.stop(); this.ticks = this.draws = 0; }
  // Two handlers used by animation loop
  step () { this.ticks++; this.model.step(); }
  draw () { this.draws++; this.model.draw(); }
  // step and draw the model once
  once () { this.step(); this.draw(); }
  // Get current time, with high resolution timer if available
  now () { return performance.now() }
  // Time in ms since starting animator
  ms () { return this.now() - this.startMS }
  // Get ticks/draws per second. They will differ if multiStep.
  ticksPerSec () {
    const dt = this.ticks - this.startTick;
    return dt === 0 ? 0 : Math.round(dt * 1000 / this.ms()) // avoid divide by 0
  }
  drawsPerSec () {
    const dt = this.draws - this.startDraw;
    return dt === 0 ? 0 : Math.round(dt * 1000 / this.ms())
  }
  // Return a status string for debugging and logging performance
  toString () {
    return `ticks: ${this.ticks}, draws: ${this.draws}, rate: ${this.rate} tps/dps: ${this.ticksPerSec()}/${this.drawsPerSec()}`
  }
  // Animation via setTimeout and requestAnimationFrame.
  // Arrow functions are required for callbacks for lexical scope.
  animateSteps () {
    this.step();
    if (!this.stopped)
      this.timeoutHandle = setTimeout(() => this.animateSteps(), 10);
  }
  animateDraws () {
    if (this.drawsPerSec() < this.rate) { // throttle drawing to @rate
      if (!this.multiStep) this.step();
      this.draw();
    }
    if (!this.stopped)
      this.animHandle = requestAnimationFrame(() => this.animateDraws());
  }
  // Called once by start() to get animateSteps & animateDraws iterating.
  animate () {
    if (this.multiStep) this.animateSteps();
    this.animateDraws();
  }
}

// A **DataSet** is an object with width/height and an array
// whose length = width * height
//
// The data array can be a TypedArray or a javascript Array
// Notice that it is very much like an ImageData object!

class DataSet {
  // **Static methods:** called via DataSet.foo(), similar to Math.foo().
  // Generally useful utilities for use with TypedArrays & JS Arrays

  // Return an empty dataset of given width, height, datatype
  static emptyDataSet (width, height, Type) {
    return new DataSet(width, height, new Type(width * height))
  }

  // The **DataSet Class** constructor and methods

  // constructor: Stores the three DataSet components.
  // Checks data is right size, throws an error if not.
  constructor (width, height, data) {
    if (data.length !== width * height)
      util.error(`new DataSet length: ${data.length} !== ${width} * ${height}`);
    else
      [this.width, this.height, this.data] = [width, height, data];
  }

  // Get/Set name, useful for storage key.
  setName (string) { this.name = string; return this }
  getName () { return this.name ? this.name : this.makeName() }
  makeName () {
    const {width, height} = this;
    const sum = util.arraySum(this.data).toFixed(2);
    return `${this.datatype().name}-${width}-${height}-${sum}`
  }

  // Checks x,y are within DataSet. Throw error if not.
  checkXY (x, y) {
    if (!this.inBounds(x, y))
      util.error(`DataSet.checkXY: x,y out of range: ${x}, ${y}`);
  }
  // true if x,y in dataset bounds
  inBounds (x, y) {
    return (util.between(x, 0, this.width - 1) && util.between(y, 0, this.height - 1))
  }

  datatype () { return this.data.constructor }
  type () { return this.constructor }

  // Given x,y in data space, return index into data
  toIndex (x, y) { return x + (y * this.width) }

  // Given index into data, return dataset [x, y] position
  toXY (i) { return [i % this.width, Math.floor(i / this.width)] }

  // Get dataset value at x,y, assuming that x,y valididated previously
  // getXY (x, y) { return this.data[this.toIndex(Math.floor(x), Math.floor(y))] }
  getXY (x, y) { return this.data[this.toIndex(x, y)] }

  // Set the data value at x,y to num. assume x,y valid
  // setxy (x, y, num) { this.data[this.toIndex(Math.floor(x), Math.floor(y))] = num }
  setxy (x, y, num) { this.data[this.toIndex(x, y)] = num; }

  // Wrapper for sampling, defaults to "nearest". Checks x,y valid as well.
  // Use this for individual sampling.
  sample (x, y, useNearest = true) {
    this.checkXY(x, y);
    return useNearest ? this.nearest(x, y) : this.bilinear(x, y)
  }

  // Nearest neighbor sampling, w/o x,y validity check, i.e. our inner loops
  nearest (x, y) {
    return this.getXY(Math.round(x), Math.round(y))
  }

  // Billinear sampling w/o x,y validity check, i.e. our inner loops
  bilinear (x, y) {
    // Billinear sampling works by making two linear interpolations (lerps)
    // in the x direction, and a third in the y direction, between the
    // two x results. See wikipedia:
    // [bilinear sampling](http://en.wikipedia.org/wiki/Bilinear_interpolation)
    // The diagram shows the three lerps

    // const [x0, y0] = [Math.floor(x), Math.floor(y)] // replaced by next line for speed
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const i = this.toIndex(x0, y0);
    const w = this.width;
    // const [dx, dy] = [(x - x0), (y - y0)] // dx, dy = 0 if x, y on boundary. commented out for speed
    // const [dx1, dy1] = [1 - dx, 1 - dy] // dx1, dy1 = 1 if x, y on boundary
    const dx = x - x0, dy = y - y0;
    const dx1 = 1 - dx, dy1 = 1 - dy;
    const f00 = this.data[i];
    // Edge case: fij is 0 if beyond data array; undefined -> 0.
    // This cancels the given component's factor in the result.
    const f10 = this.data[i + 1] || 0; // 0 at bottom right corner
    const f01 = this.data[i + w] || 0; // 0 at all bottom row
    const f11 = this.data[i + 1 + w] || 0; // 0 at end of next to bottom row
    // This is a bit involved but:
    // ```
    // If dx = 0; dx1 = 1, dy != 0
    // -> vertical linear interpolation
    // fxy = f00(1-dy) + f01(dy) i.e. y-lerp
    //
    // If dx != 0; dy = 0, dx !=0
    // -> horizontal linear interpolation
    // fxy = f00(1-dx) + f10(dx) i.e. x-lerp
    // ```
    return (f00 * dx1 * dy1) + (f10 * dx * dy1) +
           (f01 * dx1 * dy) + (f11 * dx * dy)
  }

  // Return a copy of this, with new data array
  copy () {
    return new DataSet(this.width, this.height, util.copyArray(this.data))
  }

  // Return new (empty) dataset, defaulting to this type
  emptyDataSet (width, height, type = this.datatype()) {
    return DataSet.emptyDataSet(width, height, type) // see static above
  }

  // Return new (empty) array of this type
  emptyArray (length) {
    const Type = this.type();
    return new Type(length)
  }

  // Create new dataset of size width/height/type by resampling each point.
  // Type is not this.type() due to integer/float differences. Default Array.
  // If same size, return a copy of this.
  resample (width, height, useNearest = true, Type = Array) {
    if (width === this.width && height === this.height) return this.copy()
    const ds = DataSet.emptyDataSet(width, height, Type);
    const xScale = (this.width - 1) / (width - 1);
    const yScale = (this.height - 1) / (height - 1);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        ds.setxy(x, y, this.sample(x * xScale, y * yScale, useNearest));
    return ds
  }

  // Return a rectangular subset of the dataset.
  // Returned dataset is of same array type as this.
  subset (x, y, width, height) {
    if ((x + width) > this.width || (y + height) > this.height)
      util.error('DataSet.subSet: params out of range');
    const ds = this.emptyDataSet(width, height);
    for (let i = 0; i < width; i++)
      for (let j = 0; j < height; j++)
        ds.setxy(i, j, this.getXY(i + x, j + y));
    return ds
  }

  // Return maped dataset by applying f to each dataset element
  map (f) {
    return new DataSet(this.width, this.height, this.data.map(f))
  }

  // Return the column of data at position x as this array's type
  col (x) {
    const [w, h, data] = [this.width, this.height, this.data];
    if (x >= w)
      util.error(`col: x out of range width: ${w} x: ${x}`);
    const colData = this.emptyArray(h);
    for (let i = 0; i < h; i++)
      colData[i] = data[x + i * w];
    return colData
  }

  // Return the row of data at position y as this array's type
  row (y) {
    const [w, h] = [this.width, this.height];
    if (y >= h)
      util.error(`row: y out of range height: ${h} x: ${y}`);
    return this.data.slice(y * w, (y + 1) * w)
  }

  // Convert this dataset's data to new type. Precision may be lost.
  // Does nothing if current data is already of this Type.
  convertType (type) {
    this.data = util.convertArray(this.data, type);
  }

  // Concatinate a dataset of equal height to my right to my east.
  // New DataSet is of same type as this.
  //
  // NOTE: concatWest is dataset.concatEast(this)
  concatEast (ds) {
    const [w, h] = [this.width, this.height];
    const [w1, h1] = [ds.width, ds.height];
    if (h !== h1)
      util.error(`concatEast: heights not equal ${h}, ${h1}`);
    const ds1 = this.emptyDataSet((w + w1), h);
    for (let x = 0; x < h; x++) // copy this into new dataset
      for (let y = 0; y < w; y++)
        ds1.setxy(x, y, this.getXY(x, y));
    for (let x = 0; x < h1; x++) // copy ds to the left side
      for (let y = 0; y < w1; y++)
        ds1.setxy(x + w, y, ds.getXY(x, y));
    return ds1
  }

  // Concatinate a dataset of equal width to my south, returning new DataSet.
  // New DataSet is of same type as this.
  //
  // NOTE: concatNorth is dataset.concatSouth(this)
  concatSouth (dataset) {
    const [w, h, data] = [this.width, this.height, this.data];
    if (w !== dataset.width)
      util.error(`concatSouth: widths not equal ${w}, ${dataset.width}`);
    const data1 = util.concatArrays(data, dataset.data);
    return new DataSet(w, h + dataset.height, data1)
  }

  // return dataset x,y given x,y in a euclidean space defined by tlx, tly, w, h
  // x,y is in topleft-bottomright box: [tlx,tly,tlx+w,tly-h], y positive util.
  // Ex: NetLogo's coords: x, y, minXcor, maxYcor, numX, numY
  transformCoords (x, y, tlx, tly, w, h) {
    const xs = (x - tlx) * (this.width - 1) / w;
    const ys = (tly - y) * (this.height - 1) / h;
    return [xs, ys]
  }

  // get a sample using a transformed euclidean coord system; see above
  coordSample (x, y, tlx, tly, w, h, useNearest = true) {
    const [xs, ys] = this.transformCoords(x, y, tlx, tly, w, h);
    return this.sample(xs, ys, useNearest)
  }

  // Return Array 3x3 neighbor values of the given x,y of the dataset.
  // Off-edge neighbors revert to nearest edge value.
  neighborhood (x, y, array = []) {
    array.length = 0;  // in case user supplied an array to reduce GC
    const clampNeeded = (x === 0) || (x === this.width - 1) ||
                        (y === 0) || (y === this.height - 1);
    for (let dy = -1; dy <= +1; dy++) {
      for (let dx = -1; dx <= +1; dx++) {
        let x0 = x + dx;
        let y0 = y + dy;
        if (clampNeeded) {
          x0 = util.clamp(x0, 0, this.width - 1);
          y0 = util.clamp(y0, 0, this.height - 1);
        }
        array.push(this.data[this.toIndex(x0, y0)]);
      }
    }
    return array
  }

  // Return a new dataset of this array type convolved with the
  // given kernel 3x3 matrix. See [Convolution article](https://goo.gl/gCfXmU)
  //
  // If cropped, do not convolve the edges, returning a smaller dataset.
  // If not, convolve the edges by extending edge values, returning
  // dataset of same size.
  convolve (kernel, factor = 1, crop = false) {
    const [x0, y0, h, w] = crop // optimization not needed, only called once
     ? [1, 1, this.height - 1, this.width - 1]
     : [0, 0, this.height, this.width];
    const newDS = this.emptyDataSet(w, h);
    const newData = newDS.data;
    let i = 0;
    for (let y = y0; y < h; y++) {
      for (let x = x0; x < w; x++) {
        const nei = this.neighborhood(x, y);
        let sum2 = 0;
        for (let i2 = 0; i2 < kernel.length; i2++) {
          // sum2 += kernel[i2] * nei[i2] // Chrome can't optimize compound let
          sum2 = sum2 + kernel[i2] * nei[i2];
        }
        newData[i++] = sum2 * factor; // newDS.data[newDS.toIndex(x, y)] = sum2 * factor
      }
    }
    return newDS
  }

  // A few common convolutions.  dzdx/y are also called horiz/vert Sobel
  dzdx (n = 2, factor = 1 / 8) {
    return this.convolve([-1, 0, 1, -n, 0, n, -1, 0, 1], factor)
  }
  dzdy (n = 2, factor = 1 / 8) {
    return this.convolve([1, n, 1, 0, 0, 0, -1, -n, -1], factor)
  }
  laplace8 () {
    return this.convolve([-1, -1, -1, -1, 8, -1, -1, -1, -1])
  }
  laplace4 () {
    return this.convolve([0, -1, 0, -1, 4, -1, 0, -1, 0])
  }
  blur (factor = 0.0625) { // 1/16 = 0.0625
    return this.convolve([1, 2, 1, 2, 4, 2, 1, 2, 1], factor)
  }
  edge () {
    return this.convolve([1, 1, 1, 1, -7, 1, 1, 1, 1])
  }

  // Create two new Array convolved datasets, slope and aspect, common in
  // the use of an elevation data set. See Esri tutorials for
  // [slope](http://goo.gl/ZcOl08) and [aspect](http://goo.gl/KoI4y5)
  //
  // It also returns the two derivitive DataSets, dzdx, dzdy for
  // those wanting to use the results of the two convolutions.
  //
  // Use this.convertType to convert to typed array
  slopeAndAspect (cellSize = 1, noNaNs = true, posAngle = true) {
    const dzdx = this.dzdx(); // sub left z from right
    const dzdy = this.dzdy(); // sub bottom z from top
    let [aspect, slope] = [[], []];
    const [h, w] = [dzdx.height, dzdx.width];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let [gx, gy] = [dzdx.getXY(x, y), dzdy.getXY(x, y)];
        slope.push(Math.atan(util.distance(gx, gy)) / cellSize); // radians
        if (noNaNs)
          while (gx === gy) {
            gx += util.randomNormal(0, 0.0001);
            gy += util.randomNormal(0, 0.0001);
          }
        // radians in [-PI,PI], downhill
        let rad = (gx === gy && gy === 0) ? NaN : Math.atan2(-gy, -gx);
        // positive radians in [0,2PI] if desired
        if (posAngle && rad < 0) rad += 2 * Math.PI;
        aspect.push(rad);
      }
    }
    slope = new DataSet(w, h, slope);
    aspect = new DataSet(w, h, aspect);
    return { slope, aspect, dzdx, dzdy }
  }

  // Convert dataset to an image context object.
  //
  // This can be used to "visualize" the data by normalizing
  // which will scale the data to use the entire RGB space.
  // It can also be used to create tiles or image-as-data if
  // the defaults are used.
  //
  // Due to
  // [alpha-premultiply](https://en.wikipedia.org/wiki/Alpha_compositing),
  // the best we can do as data is 24 bit ints.
  // You can simulate floats/fixed by multiplying the dataset
  // the dividing on conversion back.
  //
  // Our preferred transport is in the works, likely in the
  // tile datasets via blobs or arraybuffers. Sigh.
  toContext (normalize = false, gray = false, alpha = 255) {
    const [w, h, data] = [this.width, this.height, this.data];
    let idata;
    if (normalize) {
      idata = gray
        ? util.normalize8(data) : util.normalizeInt(data, 0, Math.pow(2, 24) - 1);
    } else {
      idata = data.map((a) => Math.round(a));
    }
    const ctx = util.createCtx(w, h);
    const id = ctx.getImageData(0, 0, w, h);
    const ta = id.data; // ta short for typed array
    for (let i = 0; i < idata.length; i++) {
      const [num, j] = [idata[i], 4 * i]; // j = byte index into ta
      if (gray) {
        ta[j] = ta[j + 1] = ta[j + 2] = Math.floor(num); ta[j + 3] = alpha;
      } else {
        ta[j] = (num >> 16) & 0xff;
        ta[j + 1] = (num >> 8) & 0xff;
        ta[j + 2] = num & 0xff;
        ta[j + 3] = alpha; // if not 255, image will be premultiplied.
      }
    }
    ctx.putImageData(id, 0, 0);
    return ctx
  }

  // Convert dataset to a canvas, which can be used as an image
  toCanvas (normalize = false, gray = false, alpha = 255) {
    return this.toContext(gray, normalize, alpha).canvas
  }
  // Convert dataset to a base64 string
  toDataUrl (normalize = false, gray = false, alpha = 255) {
    return util.ctxToDataUrl(this.toContext(gray, normalize, alpha))
  }

  // Return max/min of data
  max () {
    return this.data.reduce(function (a, b) {
      return Math.max(a, b)
    })
  }
  min () {
    return this.data.reduce(function (a, b) {
      return Math.min(a, b)
    })
  }
  equals (dataset) {
    return this.width === dataset.width &&
      this.height === dataset.height &&
      util.arraysEqual(this.data, dataset.data)
  }
}

// An .asc GIS file: a text file with a header:
//
//     ncols 195
//     nrows 195
//     xllcorner -84.355652
//     yllcorner 39.177963
//     cellsize 0.000093
//     NODATA_value -9999
//
// ..followed by a ncols X nrows matrix of numbers

class AscDataSet extends DataSet {
  constructor (ascString, Type = Array, options = {}) {
    const textData = ascString.split('\n');
    const header = {};
    util.repeat(6, (i) => {
      const keyVal = textData[i].split(/\s+/);
      header[keyVal[0].toLowerCase()] = parseFloat(keyVal[1]);
    });
    const data = [];
    util.repeat(header.nrows, (i) => {
      const nums = textData[6 + i].trim().split(' ');
      for (const num of nums)
        data.push(parseFloat(num));
    });
    super(header.ncols, header.nrows, util.convertArray(data, Type));
    this.header = header;
    Object.assign(this, options);
  }
}

// A general color module, supporting css string colors, canvas2d pixel
// colors, webgl and canvas2d Uint8ClampedArray r,g,b,a arrays.
// Notice a JavaScript Array is **not** a color!

const Color = {

// ### CSS Color Strings.

  // CSS colors in HTML are strings, see [Mozillas Color Reference](
  // https://developer.mozilla.org/en-US/docs/Web/CSS/color_value),
  // taking one of 7 forms:
  //
  // * Names: over 140 color case-insensitive names like
  //   Red, Green, CadetBlue, etc.
  // * Hex, short and long form: #0f0, #ff10a0
  // * RGB: rgb(255, 0, 0), rgba(255, 0, 0, 0.5)
  // * HSL: hsl(120, 100%, 50%), hsla(120, 100%, 50%, 0.8)
  //
  // See [this wikipedia article](https://goo.gl/ev8Kw0)
  // on differences between HSL and HSB/HSV.

  // Convert 4 r,g,b,a ints in [0-255] ("a" defaulted to 255) to a
  // css color string. Alpha "a" is converted to float in 0-1 for css string.
  // We use alpha in [0-255] to be compatible with TypedArray conventions.
  rgbaString (r, g, b, a = 255) {
    a = a / 255; const a4 = a.toPrecision(4);
    return (a === 1) ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a4})`
  },

  // Convert 4 ints, h,s,l,a, h in [0-360], s,l in [0-100]% a in [0-255] to a
  // css color string. Alpha "a" is converted to float in 0-1 for css string.
  //
  // NOTE: h=0 and h=360 are the same, use h in 0-359 for unique colors.
  hslString (h, s, l, a = 255) {
    a = a / 255; const a4 = a.toPrecision(4);
    return (a === 1) ? `hsl(${h},${s}%,${l}%)` : `hsla(${h},${s}%,${l}%,${a4})`
  },

  // Return a html/css hex color string for an r,g,b opaque color (a=255).
  // Hex strings do not support alpha.
  //
  // Both #nnn and #nnnnnn forms supported.
  // Default is to check for the short hex form.
  hexString (r, g, b, shortOK = true) {
    if (shortOK) {
      const [r0, g0, b0] = [r / 17, g / 17, b / 17];
      if (util.isInteger(r0) && util.isInteger(g0) && util.isInteger(b0))
        return this.hexShortString(r0, g0, b0)
    }
    return `#${(0x1000000 | (b | g << 8 | r << 16)).toString(16).slice(-6)}`
  },
  // Return the 4 char short version of a hex color.  Each of the r,g,b values
  // must be in [0-15].  The resulting color will be equivalent
  // to `r*17`, `g*17`, `b*17`, resulting in the 16 values:
  //
  //     0, 17, 34, 51, 68, 85, 102, 119, 136, 153, 170, 187, 204, 221, 238, 255
  //
  // This is equivalent util.aIntRamp(0,255,16), i.e. 16 values per rgb channel.
  hexShortString (r, g, b) {
    if ((r > 15) || (g > 15) || (b > 15)) {
      util.error(`hexShortString: one of ${[r, g, b]} > 15`);
    }
    return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`
  },

  // Tristring is a hybrid string and is our standard.  It returns:
  //
  // * rgbaString if a not 255 (i.e. not opaque)
  // * hexString otherwise
  // * with the hexShortString if appropriate
  triString (r, g, b, a = 255) {
    return (a === 255) ? // eslint-disable-line
      this.hexString(r, g, b, true) : this.rgbaString(r, g, b, a)
  },

// ### CSS String Conversions

  // Return 4 element array given any legal CSS string color.
  //
  // Because strings vary widely: CadetBlue, #0f0, rgb(255,0,0),
  // hsl(120,100%,50%), we do not parse strings, instead we let
  // the browser do our work: we fill a 1x1 canvas with the css string color,
  // returning the r,g,b,a canvas ImageData TypedArray.

  // The shared 1x1 canvas 2D context.
  sharedCtx1x1: util.createCtx(1, 1), // share across calls.
  // Convert any css string to 4 element Uint8ClampedArray TypedArray.
  // If you need a JavaScript Array, use `new Array(...TypedArray)`
  stringToUint8s (string) {
    this.sharedCtx1x1.clearRect(0, 0, 1, 1);
    this.sharedCtx1x1.fillStyle = string;
    this.sharedCtx1x1.fillRect(0, 0, 1, 1);
    return this.sharedCtx1x1.getImageData(0, 0, 1, 1).data
  },

  // ### Typed Color
  // A typedColor is a 4 element Uint8ClampedArray, with two properties:
  //
  // * pixelArray: A single element Uint32Array view on the Uint8ClampedArray
  // * string: an optional, lazy evaluated, css color string.
  //
  // This provides a universal color, good for canvas2d pixels, webgl & image
  // TypedArrays, and css/canvas2d strings.

  // Create typedColor from r,g,b,a. Use `toTypedColor()` below for strings etc.
  newTypedColor (r, g, b, a = 255) {
    const u8array = new Uint8ClampedArray([r, g, b, a]);
    u8array.pixelArray = new Uint32Array(u8array.buffer); // one element array
    // Make this an instance of TypedColorProto
    Object.setPrototypeOf(u8array, TypedColorProto);
    return u8array
  },
  isTypedColor (color) {
    return color.constructor === Uint8ClampedArray && color.pixelArray
  },
  // Create a typedColor from a css string, pixel, JavaScript or Typed Array.
  // Returns `any` if is typedColor already. Useful for
  // ```
  // css: `toTypedColor('#ff0a00')`
  // hsl: `toTypedColor('hsl(200,100%,50%)')`
  // named colors: `toTypedColor('CadetBlue')`
  // pixels: `toTypedColor(4294945280)`
  // JavaScript Arrays: `toTypedColor([255,0,0])`
  // ```
  toTypedColor (any) {
    if (this.isTypedColor(any)) return any
    const tc = this.newTypedColor(0, 0, 0, 0);
    if (util.isInteger(any)) tc.setPixel(any);
    else if (typeof any === 'string') tc.setCss(any);
    else if (Array.isArray(any) || util.isUintArray(any)) tc.setColor(...any);
    else if (util.isFloatArray(any)) tc.setWebgl(any);
    else util.error('toTypedColor: invalid argument', any);
    return tc
  },
  // Return a random rgb typedColor, a=255
  randomTypedColor () {
    const r255 = () => util.randomInt(256); // random int in [0,255]
    return this.newTypedColor(r255(), r255(), r255())
  },
  // A static transparent color, set at end of file
  transparent: null
};

// Prototype for typedColor. Getters/setters for usability, may be slower.
const TypedColorProto = {
  // Inherit from Uint8ClampedArray
  __proto__: Uint8ClampedArray.prototype,

  // Set the typedColor to new rgba values.
  setColor (r, g, b, a = 255) {
    this.checkColorChange();
    this[0] = r; this[1] = g; this[2] = b; this[3] = a;
  },
  // No real need for getColor, it *is* the typed Uint8 array
  set rgb (rgbaArray) { this.setColor(...rgbaArray); },
  get rgb () { return this },

  // Set the typedColor to a new pixel value
  setPixel (pixel) {
    this.checkColorChange();
    this.pixelArray[0] = pixel;
  },
  // Get the pixel value
  getPixel () { return this.pixelArray[0] },
  get pixel () { return this.getPixel() },
  set pixel (pixel) { this.setPixel(pixel); },

  // Set pixel/rgba values to equivalent of the css string.
  // 'red', '#f00', 'ff0000', 'rgb(255,0,0)', etc.
  //
  // Does *not* set the chached this.string, which will be lazily evaluated
  // to its common triString by getCss(). The above would all return '#f00'.
  setCss (string) {
    return this.setColor(...Color.stringToUint8s(string))
  },
  // Return the triString for this typedColor, cached in the @string value
  getCss () {
    if (this.string == null) this.string = Color.triString(...this);
    return this.string
  },
  get css () { return this.getCss() },
  set css (string) { this.setCss(string); },

  // Note: webgl colors are 3 RGB floats (no A) if A is 255.
  setWebgl (floatArray) {
    this.setColor( // OK if float * 255 non-int, setColor stores into uint8 array
      floatArray[0] * 255, floatArray[1] * 255, floatArray[2] * 255,
      floatArray.length === 4 ? floatArray[3] * 255 : undefined);
  },
  getWebgl () {
    if (this.floatArray == null) {
      const floats = [this[0] / 255, this[1] / 255, this[2] / 255];
      if (this[3] !== 255) floats.push(this[3] / 255);
      this.floatArray = new Float32Array(floats);
    }
    return this.floatArray
  },
  get webgl () { return this.getWebgl() },
  set webgl (floatArray) { this.setWebgl(floatArray); },

  // Housekeeping when the color is modified.
  checkColorChange () {
    // Reset string & webgl on color change.
    this.string = null; // will be lazy evaluated via getCss.
    this.floatArray = null;
  },
  // Return true if color is same value as myself, comparing pixels
  equals (color) { return this.getPixel() === color.getPixel() },
  // Return a [distance metric](
  // http://www.compuphase.com/cmetric.htm) between two colors.
  // Max distance is roughly 765 (3*255), for black & white.
  // For our purposes, omitting the sqrt will not effect our results
  rgbDistance (r, g, b) {
    const [r1, g1, b1] = this;
    const rMean = Math.round((r1 + r) / 2);
    const [dr, dg, db] = [r1 - r, g1 - g, b1 - b];
    const [dr2, dg2, db2] = [dr * dr, dg * dg, db * db];
    const distanceSq =
      (((512 + rMean) * dr2) >> 8) + (4 * dg2) + (((767 - rMean) * db2) >> 8);
    return distanceSq // Math.sqrt(distanceSq)
  }
};

Color.transparent = Color.newTypedColor(0, 0, 0, 0);

// A colormap is simply an array of typedColors with several utilities such
// as randomColor, closestColor etc.
// This allows the colors to be simple integer indices
// into the Array. They are also designed to be webgl-ready, being a
// GLSL "Uniform" variable TypedArray for colors.

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
    stops = stops.map((c) => Array.isArray(c) ? Color.rgbaString(...c) : c);
    const ctx = util.createCtx(nColors, 1);
    // Install default locs if none provide
    if (!locs) locs = util.aRamp(0, 1, stops.length);
    // Create a new gradient and fill it with the color stops
    const grad = ctx.createLinearGradient(0, 0, nColors, 0);
    util.repeat(stops.length, (i) => grad.addColorStop(locs[i], stops[i]));
    // Draw the gradient, returning the image data TypedArray
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, nColors, 1);
    return util.ctxImageData(ctx).data
  },

// ### Array Conversion Utilities

  // Convert a Uint8Array into Array of 4 element typedColors.
  // Useful for converting ImageData objects like gradients to colormaps.
  // WebGL ready: the array.typedArray is suitable for Uniforms.
  typedArrayToTypedColors (typedArray) {
    const array = [];
    util.step(typedArray.length, 4,
      // Note: can't share subarray as color's typed array:
      // it's buffer is for entire array, not just subarray.
      (i) => array.push(Color.newTypedColor(...typedArray.subarray(i, i + 4))));
    array.typedArray = typedArray;
    return array
  },
  // Convert an Array of Arrays to an Array of typedColors.
  // Webgl ready as above.
  arraysToColors (array) {
    const typedArray = new Uint8ClampedArray(array.length * 4);
    util.repeat(array.length, (i) => {
      const a = array[i];
      if (a.length === 3) a.push(255);
      typedArray.set(a, i * 4);
    });
    return this.typedArrayToTypedColors(typedArray)
  },

  // Permute the values of 3 arrays. Ex:
  //
  // [1,2],[3],[4,5] -> [ [1,3,4],[1,3,5],[2,3,4],[2,3,5] ]
  permuteArrays (A1, A2 = A1, A3 = A1) {
    const array = [];
    for (const a3 of A3) // sorta odd const works with ths, but...
      for (const a2 of A2)
        for (const a1 of A1)
          array.push([a1, a2, a3]);
    return array
  },
  // Use permuteArrays to create uniformly spaced color ramp permutation.
  // Ex: if numRs is 3, permuteArrays's A1 would be [0, 127, 255]
  permuteRGBColors (numRs, numGs = numRs, numBs = numRs) {
    const toRamp = (num) => util.aIntRamp(0, 255, num);
    const ramps = [numRs, numGs, numBs].map(toRamp);
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
      this.index = [];
      util.repeat(this.length, (i) => {
        const px = this[i].getPixel();
        this.index[px] = i;
        if (this.cssNames) this.index[this.cssNames[i]] = i;
      });
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
      number = util.clamp(number, min, max);
      const scale = util.lerpScale(number, min, max);
      const index = Math.round(util.lerp(0, this.length - 1, scale));
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
      let minDist = Infinity;
      let ixMin = 0;
      for (var i = 0; i < this.length; i++) {
        const d = this[i].rgbDistance(r, g, b);
        if (d < minDist) {
          minDist = d;
          ixMin = i;
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
      const cube = this.cube;
      const rgbSteps = cube.map(c => 255 / (c - 1));
      const rgbLocs = [r, g, b].map((c, i) => Math.round(c / rgbSteps[i]));
      const [rLoc, gLoc, bLoc] = rgbLocs;
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
    colors = this.arraysToColors(colors);
    Object.setPrototypeOf(colors, this.ColorMapProto);
    return colors
  },
  // Create a gray map (gray: r=g=b)
  // These are typically 256 entries but can be smaller
  // by passing a size parameter and the min/max range.
  grayColorMap (min = 0, max = 255, size = max - min + 1) {
    const ramp = util.aIntRamp(min, max, size);
    return this.basicColorMap(ramp.map((i) => [i, i, i]))
  },

  // Create a colormap by permuted rgb values.
  //
  // numRs, numGs, numBs are numbers, the number of steps beteen 0-255.
  // Ex: numRs = 3, corresponds to 0, 128, 255.
  // NOTE: the defaults: rgbColorCube(6) creates a `6 * 6 * 6` cube.
  rgbColorCube (numRs, numGs = numRs, numBs = numRs) {
    const array = this.permuteRGBColors(numRs, numGs, numBs);
    const map = this.basicColorMap(array);
    // Save the parameters for fast color calculations.
    map.cube = [numRs, numGs, numBs];
    return map
  },
  // Create a colormap by permuting the values of the given arrays.
  // Similar to above but with arrays that may have arbitrary values.
  rgbColorMap (R, G, B) {
    const array = this.permuteArrays(R, G, B);
    return this.basicColorMap(array)
  },

  // Create an hsl map, inputs are arrays to be permutted like rgbColorMap.
  // Convert the HSL values to typedColors, default to bright hue ramp (L=50).
  hslColorMap (H, S = [100], L = [50]) {
    const hslArray = this.permuteArrays(H, S, L);
    const array = hslArray.map(a => Color.toTypedColor(Color.hslString(...a)));
    return this.basicColorMap(array)
  },

  // Use gradient to build an rgba array, then convert to colormap.
  // Stops are css strings or rgba arrays.
  // locs defaults to evenly spaced, probably what you want.
  //
  // This easily creates all the MatLab colormaps like "jet" below.
  gradientColorMap (nColors, stops, locs) {
    const uint8arrays = this.gradientImageData(nColors, stops, locs);
    const typedColors = this.typedArrayToTypedColors(uint8arrays);
    Object.setPrototypeOf(typedColors, this.ColorMapProto);
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
    const array = cssArray.map(str => Color.stringToUint8s(str));
    const map = this.basicColorMap(array);
    map.cssNames = cssArray;
    return map
  },

// ### Shared Global ColorMaps

  // The shared global colormaps are lazy evaluated to minimize memory use.
  LazyMap (name, map) {
    Object.defineProperty(this, name, {value: map, enumerable: true});
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
};

// import ColorMap from './ColorMap.js'
// import SpriteSheet from './SpriteSheet'

// Flyweight object creation, see Patch/Patches.

// Class Link instances form a link between two turtles, forming a graph.

// The core default variables needed by a Link.
// Use links.setDefault(name, val) to change
// Modelers add additional "own variables" as needed.
const linkVariables = { // Core variables for patches. Not 'own' variables.
  id: null,             // unique id, promoted by agentset's add() method
  defaults: null,       // pointer to defaults/proto object
  agentSet: null,       // my agentset/breed
  model: null,      // my model
  world: null,          // my agent/agentset's world
  links: null,          // my baseSet

  end0: 0,              // Turtles: end0 & 1 are turtle ends of the link
  end1: 0,
  color: Color.toTypedColor('yellow'), // Note: links must have A = 255, opaque.
  // z: 1, // possibly a z offset from the turtles?

  // Line width. In Three.js/webgl this is always 1. See
  // [Drawing Lines is Hard!](https://mattdesl.svbtle.com/drawing-lines-is-hard)
  width: 1
};
class LinkProto {
  // Initialize a Link given its Links AgentSet.
  constructor (agentSet) {
    Object.assign(this, linkVariables);
    this.defaults = this;
    this.agentSet = agentSet;
    this.model = agentSet.model;
    this.world = agentSet.world;
    this.links = agentSet.baseSet;
  }
  init (from, to) {
    this.end0 = from;
    this.end1 = to;
    from.links.push(this);
    to.links.push(this);
  }
  // Remove this link from its agentset
  die () {
    this.agentSet.remove(this);
    util.removeItem(this.end0.links, this);
    util.removeItem(this.end1.links, this);
  }

  bothEnds () { return [this.end0, this.end1] }
  length () { return this.end0.distance(this.end1) }
  otherEnd (turtle) { return turtle === this.end0 ? this.end1 : this.end0 }

  // Breed get/set mathods.
  setBreed (breed) { breed.setBreed(this); }
  get breed () { return this.agentSet }
}

// import util from './util.js'
// import SpriteSheet from './SpriteSheet.js'
// import ColorMap from './ColorMap.js'

// Links are a collection of all the Link objects between turtles.
class Links extends AgentSet {
  constructor (model, AgentProto, name, baseSet = null) {
    // AgentSet sets these variables:
    // model, name, baseSet, world: model.world & agentProto: new AgentProto
    super(model, AgentProto, name, baseSet);
    // Skip if an basic Array ctor or a breedSet. See AgentSet comments.
    if (typeof model === 'number' || this.isBreedSet()) return
    // this.labels = [] // sparse array for labels
  }

  // Factory: Add 1 or more links from the from turtle to the to turtle(s) which
  // can be a single turtle or an array of turtles. The optional init
  // proc is called on the new link after inserting in the agentSet.
  create (from, to, initFcn = (link) => {}) {
    if (!Array.isArray(to)) to = [to];
    return to.map((t) => { // REMIND: skip dups
      const link = this.add();
      link.init(from, t);
      initFcn(link);
      return link
    }) // REMIND: return single link if to not an array?
  }

}

// Patches are the world other agentsets live on. They create a coord system
// from Model's world values: size, minX, maxX, minY, maxY
class Patches extends AgentSet {
  constructor (model, AgentProto, name, baseSet = null) {
    // AgentSet sets these variables:
    // model, name, baseSet, world: model.world, agentProto: new AgentProto
    // REMIND: agentProto: defaults, agentSet, world, [name]=agentSet.baseSet
    super(model, AgentProto, name, baseSet);
    // Skip if a basic Array ctor or a breedSet (don't rebuild patches!).
    // See AgentSet comments.
    if (typeof model === 'number' || this.isBreedSet()) return
    // this.world = model.world
    this.populate();
    this.setPixels();
    this.labels = []; // sparse array for labels
  }
  // Set up all the patches.
  populate () {
    util.repeat(this.world.numX * this.world.numY, (i) => {
      this.add(Object.create(this.agentProto));
    });
  }
  // Setup pixels ctx used for patch.color: `draw` and `importColors`
  setPixels () {
    const {numX, numY} = this.world;
    // const ctx = this.model.contexts.patches
    // const pixels = this.pixels = {are1x1: patchSize === 1}
    // pixels.ctx = pixels.are1x1 ? ctx : util.createCtx(numX, numY)
    this.pixels = {
      ctx: util.createCtx(numX, numY)
    };
    this.setImageData();
  }
  // Create the pixels object used by `setPixels` and `installColors`
  setImageData () {
    const pixels = this.pixels;
    pixels.imageData = util.ctxImageData(pixels.ctx);
    pixels.data8 = pixels.imageData.data;
    pixels.data = new Uint32Array(pixels.data8.buffer);
  }
  // Get/Set label. REMIND: not implemented.
  // Set removes label if label is null or undefined.
  // Get returns undefined if no label.
  setLabel (patch, label) { // REMIND: does this work for breeds?
    if (label == null) // null or undefined
      delete this.labels[patch.id];
    else
      this.labels[patch.id] = label;
  }
  getLabel (patch) {
    return this.labels[patch.id]
  }

  // Return the offsets from a patch for its 8 element neighbors.
  // Specialized to be faster than patchRect below.
  neighborsOffsets (x, y) {
    const {minX, maxX, minY, maxY, numX} = this.world;
    if (x === minX) {
      if (y === minY) return [-numX, -numX + 1, 1]
      if (y === maxY) return [1, numX + 1, numX]
      return [-numX, -numX + 1, 1, numX + 1, numX]
    }
    if (x === maxX) {
      if (y === minY) return [-numX - 1, -numX, -1]
      if (y === maxY) return [numX, numX - 1, -1]
      return [-numX - 1, -numX, numX, numX - 1, -1]
    }
    if (y === minY) return [-numX - 1, -numX, -numX + 1, 1, -1]
    if (y === maxY) return [1, numX + 1, numX, numX - 1, -1]
    return [-numX - 1, -numX, -numX + 1, 1, numX + 1, numX, numX - 1, -1]
  }
  // Return the offsets from a patch for its 4 element neighbors (N,S,E,W)
  neighbors4Offsets (x, y) {
    const numX = this.world.numX;
    return this.neighborsOffsets(x, y)
      .filter((n) => Math.abs(n) === 1 || Math.abs(n) === numX) // slightly faster
      // .filter((n) => [1, -1, numX, -numX].indexOf(n) >= 0)
      // .filter((n) => [1, -1, numX, -numX].includes(n)) // slower than indexOf
  }
  // Return my 8 patch neighbors
  neighbors (patch) {
    const {id, x, y} = patch;
    const offsets = this.neighborsOffsets(x, y);
    const as = new AgentSet(offsets.length);
    offsets.forEach((o, i) => { as[i] = this[o + id]; });
    return as
    // offsets.forEach((o, i, a) => { a[i] = this[o + id] })
    // return this.asAgentSet(offsets)
  }
  // Return my 4 patch neighbors
  neighbors4 (patch) {
    const {id, x, y} = patch;
    const offsets = this.neighbors4Offsets(x, y);
    const as = new AgentSet(offsets.length);
    offsets.forEach((o, i) => { as[i] = this[o + id]; });
    return as
  }

  // Return a random valid float x,y point in patch space
  randomPt () {
    const {minXcor, maxXcor, minYcor, maxYcor} = this.world;
    return [util.randomFloat2(minXcor, maxXcor), util.randomFloat2(minYcor, maxYcor)]
  }
  // Return a random patch.
  randomPatch () { return this.oneOf() }

  // Patches in rectangle dx, dy from p, dx, dy integers.
  // Both dx & dy are half width/height of rect
  patchRect (p, dx, dy = dx, meToo = true) {
    // Return cached rect if one exists.
    if (p.pRect && p.pRect.length === dx * dy) return p.pRect
    const rect = new AgentSet(0);
    let {minX, maxX, minY, maxY} = this.world;
    minX = Math.max(minX, p.x - dx);
    maxX = Math.min(maxX, p.x + dx);
    minY = Math.max(minY, p.y - dy);
    maxY = Math.min(maxY, p.y + dy);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const pnext = this.patchXY(x, y);
        if (p !== pnext || meToo) rect.push(pnext);
      }
    }
    return rect
  }

  installPixels () {
    const pixels = this.pixels;
    pixels.ctx.putImageData(pixels.imageData, 0, 0);
    return pixels
  }
  // REMIND: Three .. need pixels -> texture
  // Draw the patches onto the ctx using the pixel image data colors.
  // draw (ctx = this.model.contexts.patches) {
  //   const {pixels} = this
  //   pixels.ctx.putImageData(pixels.imageData, 0, 0)
  //   if (!pixels.are1x1)
  //     util.fillCtxWithImage(ctx, pixels.ctx.canvas)
  //   for (const i in this.labels) { // `for .. in`: skips sparse array gaps.
  //     const label = this.labels[i]
  //     const {labelOffset: offset, labelColor: color} = this[i]
  //     const [x, y] = this.patchXYToPixelXY(...this.patchIndexToXY(i))
  //     util.ctxDrawText(ctx, label, x + offset[0], y + offset[1], color.getCss())
  //   }
  // }
  // REMIND: No drawing layer yet
  // // Draws, or "imports" an image URL into the drawing layer.
  // // The image is scaled to fit the drawing layer.
  // // This is an async function, using es6 Promises.
  // importDrawing (imageSrc) {
  //   util.imagePromise(imageSrc)
  //   .then((img) => this.installDrawing(img))
  // }
  // // Direct install image into the given context, not async.
  // installDrawing (img, ctx = this.model.contexts.drawing) {
  //   util.fillCtxWithImage(ctx, img)
  // }
  importColors (imageSrc) {
    util.imagePromise(imageSrc)
    .then((img) => this.installColors(img));
  }
  // Direct install image into the patch colors, not async.
  installColors (img) {
    util.fillCtxWithImage(this.pixels.ctx, img);
    this.setImageData();
  }

  // Import/export DataSet to/from patch variable `patchVar`.
  // `useNearest`: true for fast rounding to nearest; false for bi-linear.
  importDataSet (dataSet, patchVar, useNearest = false) {
    const {numX, numY} = this.world;
    const dataset = dataSet.resample(numX, numY, useNearest);
    for (const patch of this)
      patch[patchVar] = dataset.data[patch.id];
  }
  exportDataSet (patchVar, Type = Array) {
    const {numX, numY} = this.world;
    let data = util.arrayProps(this, patchVar);
    data = util.convertArray(data, Type);
    return new DataSet(numX, numY, data)
  }

  // Return true if x,y floats are within patch world.
  // isOnWorld (x, y) {
  //   const {minXcor, maxXcor, minYcor, maxYcor} = this.world
  //   return (minXcor <= x) && (x <= maxXcor) && (minYcor <= y) && (y <= maxYcor)
  // }
  // Return the patch id/index given valid integer x,y in patch coords
  patchXYToIndex (x, y) {
    const {minX, maxY, numX} = this.world;
    return (x - minX) + (numX * (maxY - y))
  }
  // Return the patch x,y patch coords given a valid patches id/index
  patchIndexToXY (ix) {
    const {minX, maxY, numX} = this.world;
    return [(ix % numX) + minX, maxY - Math.floor(ix / numX)]
  }
  // Convert to/from pixel coords & patch coords
  pixelXYToPatchXY (x, y) {
    const {patchSize, minXcor, maxYcor} = this.world;
    return [minXcor + (x / patchSize), maxYcor - (y / patchSize)]
  }
  patchXYToPixelXY (x, y) {
    const {patchSize, minXcor, maxYcor} = this.world;
    return [(x - minXcor) * patchSize, (maxYcor - y) * patchSize]
  }

  // Utils for NetLogo patch location methods.
  // All return `undefined` if not onworld.
  // Note that foo == null checks for both undefined and null (== vs ===)
  // and is considered an OK practice.

  // Return patch at x,y float values according to topology.
  // Return undefined if off-world
  patch (x, y) {
    if (!this.world.isOnWorld(x, y)) return undefined
    const intX = x === this.world.maxXcor
      ? this.world.maxX : Math.round(x); // handle n.5 round up to n + 1
    const intY = y === this.world.maxYcor
      ? this.world.maxY : Math.round(y);
    return this.patchXY(intX, intY)
  }
  // Return the patch at x,y where both are valid integer patch coordinates.
  patchXY (x, y) { return this[this.patchXYToIndex(x, y)] }

  // Return patches within the patch rect, default is square & meToo
  // inRect (patch, dx, dy = dx, meToo = true) {
  //   return this.patchRect(patch, dx, dy, meToo)
  // }
  // Patches in circle radius (integer) from patch
  inRadius (patch, radius, meToo = true) {
    const rSq = radius * radius;
    const result = new AgentSet(0);
    const sqDistance = util.sqDistance; // 10% faster
    const pRect = this.patchRect(patch, radius, radius, meToo);
    for (let i = 0; i < pRect.length; i++) {
      const p = pRect[i];
      if (sqDistance(patch.x, patch.y, p.x, p.y) <= rSq) result.push(p);
    }
    return result
  }
  // Patches in cone from p in direction `angle`, with `coneAngle` and `radius`
  inCone (patch, radius, coneAngle, direction, meToo = true) {
    const pRect = this.patchRect(patch, radius, radius, meToo);
    const result = new AgentSet(0);
    for (let i = 0; i < pRect.length; i++) {
      const p = pRect[i];
      const isIn = util.inCone(p.x, p.y, radius, coneAngle, direction, patch.x, patch.y);
      if (isIn && (patch !== p || meToo)) result.push(p);
    }
    return result
  }

  // Return patch at distance and angle from obj's (patch or turtle)
  // x, y (floats). If off world, return undefined.
  // To use heading: patchAtAngleAndDistance(obj, util.angle(heading), distance)
  patchAtAngleAndDistance (obj, angle, distance) {
    let {x, y} = obj;
    x = x + distance * Math.cos(angle);
    y = y + distance * Math.sin(angle);
    return this.patch(x, y)
  }
  patchLeftAndAhead (dTheta, distance) {
    return this.patchAtAngleAndDistance(dTheta, distance)
  }
  patchRightAndAhead (dTheta, distance) {
    return this.patchAtAngleAndDistance(-dTheta, distance)
  }

  // Diffuse the value of patch variable `p.v` by distributing `rate` percent
  // of each patch's value of `v` to its neighbors.
  // If a color map is given, scale the patch color via variable's value
  // If the patch has less than 4/8 neighbors, return the extra to the patch.
  diffuse (v, rate, colorMap = null, min = 0, max = 1) {
    this.diffuseN(8, v, rate, colorMap, min, max);
  }
  diffuse4 (v, rate, colorMap = null, min = 0, max = 1) {
    this.diffuseN(4, v, rate, colorMap, min, max);
  }
  diffuseN (n, v, rate, colorMap = null, min = 0, max = 1) {
    // Note: for-of loops removed: chrome can't optimize them
    // test/apps/patches.js 22fps -> 60fps
    // zero temp variable if not yet set
    if (this[0]._diffuseNext === undefined)
      // for (const p of this) p._diffuseNext = 0
      for (let i = 0; i < this.length; i++) this[i]._diffuseNext = 0;

    // pass 1: calculate contribution of all patches to themselves and neighbors
    // for (const p of this) {
    for (let i = 0; i < this.length; i++) {
      const p = this[i];
      const dv = p[v] * rate;
      const dvn = dv / n;
      const neighbors = (n === 8) ? p.neighbors : p.neighbors4;
      const nn = neighbors.length;
      p._diffuseNext += p[v] - dv + (n - nn) * dvn;
      // for (const n of neighbors) n._diffuseNext += dvn
      for (let i = 0; i < neighbors.length; i++) neighbors[i]._diffuseNext += dvn;
    }
    // pass 2: set new value for all patches, zero temp,
    // modify color if colorMap given
    // for (const p of this) {
    for (let i = 0; i < this.length; i++) {
      const p = this[i];
      p[v] = p._diffuseNext;
      p._diffuseNext = 0;
      if (colorMap)
        p.setColor(colorMap.scaleColor(p[v], min, max));
    }
  }

}

// Class Patch instances represent a rectangle on a grid.  They hold variables
// that are in the patches the turtles live on.  The set of all patches
// is the world on which the turtles live and the model runs.

// The core variables needed by a Patch. Modelers add additional "own variables"
// as needed. Surprisingly `label` and `color` are not here, they are managed
// optimally by the Patches AgentSet. Similarly `x` & `y` are derived from id.
// The neighbors and neighbors4 variables are initially getters that
// are "promoted" to instance variables if used.
const patchVariables = { // Core variables for patches. Not 'own' variables.
  id: null,             // unique id, promoted by agentset's add() method
  defaults: null,       // pointer to defaults/proto object
  agentSet: null,       // my agentset/breed
  model: null,          // my model
  world: null,          // my agent/agentset's world
  patches: null,        // my patches/baseSet, set by ctor

  turtles: null,        // the turtles on me. Laxy evalued, see turtlesHere below
  labelOffset: [0, 0],  // text pixel offset from the patch center
  labelColor: Color.newTypedColor(0, 0, 0) // the label color
  // Getter variables: label, color, x, y, neighbors, neighbors4
};

// Flyweight object creation:
// Objects within AgentSets use "prototypal inheritance" via Object.create().
// Here, the PatchProto class is given to Patches for use creating Proto objects
// (new PatchProto(agentSet)), but only once per model/breed.
// The flyweight Patch objects are created via Object.create(protoObject),
// This lets the new PatchProto(agentset) obhect be "defaults".
class PatchProto {
  // Initialize a Patch given its Patches AgentSet.
  constructor (agentSet) {
    Object.assign(this, patchVariables);
    this.defaults = this;
    this.agentSet = agentSet;
    this.model = agentSet.model;
    this.world = agentSet.world;
    this.patches = agentSet.baseSet;
  }
  // Getter for x,y derived from patch id, thus no setter.
  get x () {
    return (this.id % this.world.numX) + this.world.minX
  }
  get y () {
    return this.world.maxY - Math.floor(this.id / this.world.numX)
  }
  // Getter for neighbors of this patch.
  // Uses lazy evaluation to promote neighbors to instance variables.
  // To avoid promotion, use `patches.neighbors(this)`.
  // Promotion makes getters accessed only once.
  // defineProperty required: can't set this.neighbors when getter defined.
  get neighbors () { // lazy promote neighbors from getter to instance prop.
    const n = this.patches.neighbors(this);
    Object.defineProperty(this, 'neighbors', {value: n, enumerable: true});
    return n
  }
  get neighbors4 () {
    const n = this.patches.neighbors4(this);
    Object.defineProperty(this, 'neighbors4', {value: n, enumerable: true});
    return n
  }
  // Similar for caching turtles here
  // get turtles () {
  //   Object.defineProperty(this, 'turtles', {value: [], enumerable: true})
  //   return this.turtles
  // }

  // Manage colors by directly setting pixels in Patches pixels object.
  // With getter/setters, slight performance hit.
  setColor (typedColor) {
    this.patches.pixels.data[this.id] = typedColor.getPixel();
  }
  // Optimization: If shared color provided, sharedColor is modified and
  // returned. Otherwise new color returned.
  getColor (sharedColor = null) {
    const pixel = this.patches.pixels.data[this.id];
    if (sharedColor) {
      sharedColor.pixel = pixel;
      return sharedColor
    }
    return Color.toTypedColor(pixel)
  }
  get color () { return this.getColor() }
  set color (typedColor) { return this.setColor(typedColor) }

  // Set label. Erase label via setting to undefined.
  setLabel (label) {
    this.patches.setLabel(this, label);
  }
  getLabel () {
    this.patches.getLabel(this);
  }
  get label () { return this.getLabel() }
  set label (label) { return this.setColor(label) }

  // Promote this.turtles on first call to turtlesHere.
  turtlesHere () {
    if (this.turtles == null) {
      // this.patches.forEach((patch) => { patch.turtles = [] })
      // this.model.turtles.forEach((turtle) => {
      //   turtle.patch.turtles.push(this)
      // })
      for (const patch of this.patches)
        patch.turtles = [];
      for (const turtle of this.model.turtles)
        turtle.patch.turtles.push(turtle);
    }
    return this.turtles
  }
  breedsHere (breed) {
    const turtles = this.turtlesHere();
    return turtles.filter((turtle) => turtle.agentSet === breed)
  }

  // 6 methods in both Patch & Turtle modules
  // Distance from me to x, y. REMIND: No off-world test done
  distanceXY (x, y) { util.distance(this.x, this.y, x, y); }
  // Return distance from me to object having an x,y pair (turtle, patch, ...)
  distance (agent) { this.distanceXY(agent.x, agent.y); }
  // Return angle towards agent/x,y
  // Use util.heading to convert to heading
  towards (agent) { return this.towardsXY(agent.x, agent.y) }
  towardsXY (x, y) { return util.radiansToward(this.x, this.y, x, y) }
  // Return patch w/ given parameters. Return undefined if off-world.
  // Return patch dx, dy from my position.
  patchAt (dx, dy) { return this.patches.patch(this.x + dx, this.y + dy) }
  patchAtAngleAndDistance (angle, distance) {
    return this.patches.patchAtAngleAndDistance(this, angle, distance)
  }

  inRadius (radius, meToo = true) { // radius is integer
    return this.patches.inRadius(this, radius, meToo)
  }
  inCone (radius, coneAngle, direction, meToo = true) {
    return this.patches.inRadius(this, radius, coneAngle, direction, meToo)
  }

  // Breed get/set mathods and getter/setter versions.
  setBreed (breed) { breed.setBreed(this); }
  get breed () { return this.agentSet }

  sprout (num = 1, breed = this.model.turtles, init = util.noop) {
    breed.create(num, (turtle) => {
      turtle.setxy(this.x, this.y);
      init(turtle);
    });
  }

}

// import SpriteSheet from './SpriteSheet.js'
// Turtles are the world other agentsets live on. They create a coord system
// from Model's world values: size, minX, maxX, minY, maxY
class Turtles extends AgentSet {
  constructor (model, AgentProto, name, baseSet = null) {
    // AgentSet sets these variables:
    // model, name, baseSet, world: model.world & agentProto: new AgentProto
    super(model, AgentProto, name, baseSet);
    // Skip if an basic Array ctor or a breedSet. See AgentSet comments.
    if (typeof model === 'number' || this.isBreedSet()) return
    // this.world = model.world
    // this.labels = [] // sparse array for labels
    // this.spriteSheet = new SpriteSheet()
    // this.colorMap = ColorMap.Basic16
  }
  create (num = 1, initFcn = (turtle) => {}) {
    return util.repeat(num, (i, a) => {
      const turtle = this.add();
      turtle.theta = util.randomFloat(Math.PI * 2);
      initFcn(turtle);
      if (!turtle.sprite)
        turtle.setSprite('default', ColorMap.Basic16.randomColor().css);
      a.push(turtle);
    })
  }
  // clear () {
  //   while (this.any()) this.last.die() // die a turtle method
  // }

  // Return an array of this breed within the array of patchs
  inPatches (patches) {
    let array = new AgentSet(0); // []
    for (const p of patches) array.push(...p.turtlesHere());
    if (this.isBreedSet()) array = array.filter((a) => a.agentSet === this);
    return array
  }
  // Return an array of turtles/breeds within the patchRect, dx/y integers
  // Note: will return turtle too. Also slightly inaccurate due to being
  // patch based, not turtle based.
  inPatchRect (turtle, dx, dy = dx, meToo = false) {
    // meToo: true for patches, could have several turtles on patch
    const patches = this.model.patches.patchRect(turtle.patch, dx, dy, true);
    const aSet = this.inPatches(patches);
    if (!meToo) util.removeItem(aSet, turtle); // don't use aSet.remove: breeds
    return aSet // this.inPatches(patches)
  }
  // Return the members of this agentset that are within radius distance
  // from me, using a patch rect.
  inRadius (turtle, radius, meToo = false) {
    const aSet = this.inPatchRect(turtle, radius, radius, true);
    return aSet.inRadius(turtle, radius, meToo)
  }
  inCone (turtle, radius, coneAngle, x0, y0, meToo = false) {
    const aSet = this.inPatchRect(turtle, radius, radius, true);
    return aSet.inCone(turtle, radius, coneAngle, turtle.theta, x0, y0, meToo)
  }

  // Circle Layout: position the turtles in the list in an equally
  // spaced circle of the given radius, with the initial turtle
  // at the given start angle (default to pi/2 or "up") and in the
  // +1 or -1 direction (counter clockwise or clockwise)
  // defaulting to -1 (clockwise).
  layoutCircle (
    list, radius, center = [0, 0], startAngle = Math.PI / 2, direction = -1) {
    const dTheta = 2 * Math.PI / list.length;
    const [x0, y0] = center;
    util.forEach(list, (turtle, i) => {
      turtle.setxy(x0, y0);
      turtle.theta = startAngle + (direction * dTheta * i);
      turtle.forward(radius);
    });
  }

}

// import Color from './Color.js'
// import ColorMap from './ColorMap.js'
// import SpriteSheet from './SpriteSheet'

// Flyweight object creation, see Patch/Patches.

// Class Turtle instances represent the dynamic, behavioral element of modeling.
// Each turtle knows the patch it is on, and interacts with that and other
// patches, as well as other turtles.

// The core default variables needed by a Turtle.
// Use turtles.setDefault(name, val) to change
// Modelers add additional "own variables" as needed.
const turtleVariables = { // Core variables for patches. Not 'own' variables.
  id: null,         // unique id, promoted by agentset's add() method
  defaults: null,   // pointer to defaults/proto object
  agentSet: null,   // my agentset/breed
  model: null,      // my model
  world: null,      // my agent/agentset's world
  turtles: null,    // my baseSet

  x: 0,             // x, y, z in patchSize units.
  y: 0,             // Use turtles.setDefault('z', num) to change default height
  z: 1,
  theta: 0,         // my euclidean direction, radians from x axis, counter-clockwise
  size: 1,          // size in patches, default to one patch

  // patch: null,   // the patch I'm on .. uses getter below
  // links: null,   // the links having me as an end point .. lazy promoted below
  atEdge: 'clamp',  // What to do if I wander off world. Can be 'clamp', 'wrap'
                    // 'bounce', or a function, see handleEdge() method
  sprite: null

  // spriteFcn: 'default',
  // spriteColor: Color.newTypedColor(255, 0, 0),

  // labelOffset: [0, 0],  // text pixel offset from the turtle center
  // labelColor: Color.newTypedColor(0, 0, 0) // the label color
};
class TurtleProto {
  // Initialize a Turtle given its Turtles AgentSet.
  constructor (agentSet) {
    Object.assign(this, turtleVariables);
    this.defaults = this;
    this.agentSet = agentSet;
    this.model = agentSet.model;
    this.world = agentSet.world;
    this.turtles = agentSet.baseSet;

    // this.sprite = this.turtles.model.spriteSheet.addDrawing('default')
    // this.sprite = this.turtles.spriteSheet.add('default', 'red')
  }
  die () {
    this.agentSet.remove(this); // remove me from my baseSet and breed
    if (this.hasOwnProperty('links')) // don't promote links
      while (this.links.length > 0) this.links[0].die();
    if (this.patch.turtles != null)
      util.removeItem(this.patch.turtles, this);
  }
  // Factory: create num new turtles at this turtle's location. The optional init
  // proc is called on the new turtle after inserting in its agentSet.
  hatch (num = 1, agentSet = this.agentSet, init = () => {}) {
    return agentSet.create(num, (turtle) => {
      turtle.setxy(this.x, this.y);
      // turtle.color = this.color // REMIND: sprite vs color
      // hatched turtle inherits parents' ownVariables
      for (const key of agentSet.ownVariables)
        if (turtle[key] == null) turtle[key] = this[key];
      init(turtle);
    })
  }
  // Getter for links for this turtle. REMIND: use new AgentSet(0)?
  // Uses lazy evaluation to promote links to instance variables.
  get links () { // lazy promote neighbors from getter to instance prop.
    Object.defineProperty(this, 'links', {value: [], enumerable: true});
    return this.links
  }
  // Getter for the patchs and the patch I'm on. Return null if off-world.
  get patch () { return this.model.patches.patch(this.x, this.y) }
  // REMIND: promote to default variable(s) if performance issue
  get patches () { return this.model.patches }

  // Breed get/set mathods.
  setBreed (breed) { breed.setBreed(this); }
  get breed () { return this.agentSet }

  // Heading vs Euclidean Angles
  get heading () { return util.heading(this.theta) }
  set heading (heading) { this.theta = util.angle(heading); }

  // Create my shape via src: sprite, fcn, string, or image/canvas
  setSprite (src, color = 'red', strokeColor = 'black') {
    if (src.sheet) { this.sprite = src; return } // src is a sprite
    const ss = this.model.renderer.spriteSheet;
    this.sprite = util.isImageable(src)
      ? ss.addImage(src)
      : ss.addDrawing(src, color, strokeColor);
  }
  // setSize (size) { this.size = size * this.world.patchSize }
  // setDrawSprite (fcn, color, color2) {
  //   this.sprite = this.model.spriteSheet.addDrawing(fcn, color)
  // }

  // Set x, y position. If z given, override default z.
  // Call handleEdge(x, y) if x, y off-world.
  setxy (x, y, z = null) {
    const p0 = this.patch;
    if (z) this.z = z;
    if (this.world.isOnWorld(x, y)) {
      this.x = x;
      this.y = y;
    } else {
      this.handleEdge(x, y);
      // const {minXcor, maxXcor, minYcor, maxYcor} = this.world
      // if (this.wrap) {
      //   this.x = util.wrap(x, minXcor, maxXcor)
      //   this.y = util.wrap(y, minYcor, maxYcor)
      // } else {
      //   this.x = util.clamp(x, minXcor, maxXcor)
      //   this.y = util.clamp(y, minYcor, maxYcor)
      // }
    }
    const p = this.patch;
    if (p.turtles != null && p !== p0) {
      util.removeItem(p0.turtles, this);
      p.turtles.push(this);
    }
  }
  // Handle turtle if x,y off-world
  handleEdge (x, y) {
    if (util.isString(this.atEdge)) {
      const {minXcor, maxXcor, minYcor, maxYcor} = this.world;
      if (this.atEdge === 'wrap') {
        this.x = util.wrap(x, minXcor, maxXcor);
        this.y = util.wrap(y, minYcor, maxYcor);
      } else if (this.atEdge === 'clamp' || this.atEdge === 'bounce') {
        this.x = util.clamp(x, minXcor, maxXcor);
        this.y = util.clamp(y, minYcor, maxYcor);
        if (this.atEdge === 'bounce') {
          if (this.x === minXcor || this.x === maxXcor)
            this.theta = Math.PI - this.theta;
          else
            this.theta = -this.theta;
        }
      } else {
        util.error(`turtle.handleEdge: bad atEdge: ${this.atEdge}`);
      }
    } else {
      this.atEdge(x, y);
    }
  }
  // Place the turtle at the given patch/turtle location
  moveTo (agent) { this.setxy(agent.x, agent.y); }
  // Move forward (along theta) d units (patch coords),
  forward (d) {
    this.setxy(this.x + d * Math.cos(this.theta), this.y + d * Math.sin(this.theta));
  }
  // Change current direction by rad radians which can be + (left) or - (right).
  rotate (rad) { this.theta = util.mod(this.theta + rad, Math.PI * 2); }
  right (rad) { this.rotate(-rad); }
  left (rad) { this.rotate(rad); }

  // Set my direction towards turtle/patch or x,y.
  // "direction" is euclidean radians.
  face (agent) { this.theta = this.towards(agent); }
  faceXY (x, y) { this.theta = this.towardsXY(x, y); }
  patchAhead (distance) { return this.patchAtAngleAndDistance(this.theta, distance) }
  canMove (distance) { return this.patchAhead(distance) != null } // null / undefined

  // 6 methods in both Patch & Turtle modules
  // Distance from me to x, y. REMIND: No off-world test done
  distanceXY (x, y) { return util.distance(this.x, this.y, x, y) }
  // Return distance from me to object having an x,y pair (turtle, patch, ...)
  // distance (agent) { this.distanceXY(agent.x, agent.y) }
  distance (agent) { return util.distance(this.x, this.y, agent.x, agent.y) }
  // Return angle towards agent/x,y
  // Use util.heading to convert to heading
  towards (agent) { return this.towardsXY(agent.x, agent.y) }
  towardsXY (x, y) { return util.radiansToward(this.x, this.y, x, y) }
  // Return patch w/ given parameters. Return undefined if off-world.
  // Return patch dx, dy from my position.
  patchAt (dx, dy) { return this.patches.patch(this.x + dx, this.y + dy) }
  // Note: angle is absolute, w/o regard to existing angle of turtle.
  // Use Left/Right versions below
  patchAtAngleAndDistance (angle, distance) {
    return this.patches.patchAtAngleAndDistance(this, angle, distance)
  }

  patchLeftAndAhead (angle, distance) {
    return this.patchAtAngleAndDistance(angle + this.theta, distance)
  }
  patchRightAndAhead (angle, distance) {
    return this.patchAtAngleAndDistance(angle - this.theta, distance)
  }
  // Return turtles/breeds within radius from me
  inRadius (radius, meToo = false) {
    return this.agentSet(this, radius, meToo)
  }
  // Return turtles/breeds within cone from me
  inCone (radius, meToo = false) {
    return this.agentSet(this, radius, meToo)
  }

  // Link methods. Note: this.links returns all links linked to me.
  // See links getter above.

  // Return other end of link from me. Link must include me!
  otherEnd (l) { return l.end0 === this ? l.end1 : l.end0 }
  // Return all turtles linked to me
  linkNeighbors () { return this.links.map((l) => this.otherEnd(l)) }

}

// Sprites are images/drawings within a sprite-sheet.
class SpriteSheet {
  constructor (spriteSize = 64, spritesPerRow = 16, usePowerOf2 = true) {
    Object.assign(this, {spriteSize, cols: spritesPerRow, usePowerOf2});
    this.rows = 1;
    this.nextCol = 0;
    this.nextRow = 0;
    this.sprites = {};
    this.paths = Object.assign({}, paths); // installPaths()
    if (usePowerOf2) this.checkPowerOf2();
    this.ctx = util.createCtx(this.width, this.height);
    this.texture = null; // THREE use optional
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
    const {row, col} = sprite;
    const {rows, cols} = this;
    const x0 = col / cols;
    const y0 = row / rows;
    const x1 = (col + 1) / cols;
    const y1 = (row + 1) / rows;
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
    const {width, height} = this;
    if (!(util.isPowerOf2(width) && util.isPowerOf2(height)))
      util.error(`SpriteSheet non power of 2: ${width}x${height}`);
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
    let name = img.src;
    name = name.replace(/^.*\//, '');
    name = name.replace(/\./, 'img');
    if (this.sprites[name]) return this.sprites[name]
    this.checkSheetSize(); // Resize ctx if nextRow > rows
    const [x, y, size] = [this.nextX, this.nextY, this.spriteSize];
    this.ctx.drawImage(img, x, y, size, size);
    const id = this.id; // Object.keys(this.sprites).length
    const {nextRow: row, nextCol: col} = this;
    const sprite = {id, name, x, y, row, col, size, sheet: this};
    sprite.uvs = this.getUVs(sprite);
    this.sprites[name] = sprite;
    this.incrementRowCol();
    if (this.texture) this.texture.needsUpdate = true;
    return sprite
  }
  addDrawing (drawFcn, fillColor = 'red', strokeColor = 'black', useHelpers = true) {
    const img = this.createImage(drawFcn, fillColor, strokeColor, useHelpers);
    return this.addImage(img) // return sprite
  }
  // getSprite (name) { return this.sprites[name] }
  // Resize ctx if nextRow > rows
  incrementRowCol () {
    this.nextCol += 1;
    if (this.nextCol < this.cols) return
    this.nextCol = 0;
    this.nextRow += 1;
  }
  // Resize ctx if too small for next row/col
  checkSheetSize () {
    if (this.nextRow === this.rows) { // this.nextCol should be 0
      this.rows = (this.usePowerOf2) ? this.rows * 2 : this.rows + 1;
      util.resizeCtx(this.ctx, this.width, this.height);
      // Recalculate existing sprite uvs.
      util.forEach(this.sprites, (sprite) => { sprite.uvs = this.getUVs(sprite); });
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
    const ctx = util.createCtx(this.spriteSize, this.spriteSize);
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    if (useHelpers) {
      ctx.scale(this.spriteSize / 2, this.spriteSize / 2);
      ctx.translate(1, 1);
      ctx.beginPath();
    }

    if (util.isString(drawFcn)) {
      this.paths[drawFcn](ctx);
    } else {
      drawFcn(ctx);
    }

    if (useHelpers) {
      ctx.closePath();
      ctx.fill();
    }

    const name = drawFcn.name || drawFcn;
    ctx.canvas.src = `${name}${fillColor}`;
    return ctx.canvas
  }
  installDrawing (fcn, name = fcn.name) { this.paths[name] = fcn; }

}

const paths = {
  poly (ctx, points) {
    points.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt[0], pt[1]);
      else ctx.lineTo(pt[0], pt[1]);
    });
  },
  default (ctx) { this.dart(ctx); },
  arrow (ctx) {
    this.poly(ctx,
      [[1, 0], [0, 1], [0, 0.4], [-1, 0.4], [-1, -0.4], [0, -0.4], [0, -1]]);
  },
  bug (ctx) {
    ctx.lineWidth = 0.1;
    this.poly(ctx, [[0.8, 0.45], [0.4, 0], [0.8, -0.45]]);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0.24, 0, 0.26, 0, 2 * Math.PI);
    ctx.arc(-0.1, 0, 0.26, 0, 2 * Math.PI);
    ctx.arc(-0.54, 0, 0.4, 0, 2 * Math.PI);
  },
  circle (ctx) { ctx.arc(0, 0, 1, 0, 2 * Math.PI); },
  dart (ctx) { this.poly(ctx, [[1, 0], [-1, 0.8], [-0.5, 0], [-1, -0.8]]); },
  frame (ctx) {
    const inset = 0.4;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.fill();
    ctx.clearRect(-1 + inset, -1 + inset, 2 - (2 * inset), 2 - (2 * inset));
  },
  frame2 (ctx) {
    const inset = 0.4;
    ctx.fillRect(-1, -1, 2, 2);
    ctx.fill();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillRect(-1 + inset, -1 + inset, 2 - (2 * inset), 2 - (2 * inset));
  },
  person (ctx) {
    this.poly(ctx, [ [0.3, -0.4], [0.6, 0], [0.25, 0.2], [0.25, -0.1],
    [0.2, 0.3], [0.5, 1], [0.1, 1], [0, 0.5],
    [-0.1, 1], [-0.5, 1], [-0.2, 0.3], [-0.25, -0.1],
    [-0.25, 0.2], [-0.6, 0], [-0.3, -0.4]]);
    ctx.closePath();
    ctx.arc(0, -0.7, 0.3, 0, 2 * Math.PI);
  },
  ring (ctx) { // transparent
    const [rOuter, rInner] = [1, 0.6];
    ctx.arc(0, 0, rOuter, 0, 2 * Math.PI, false);
    ctx.lineTo(rInner, 0);
    ctx.arc(0, 0, rInner, 0, 2 * Math.PI, true);
  },
  ring2 (ctx) { // fileStyle is outer color, strokeStyle inner color
    const [rOuter, rInner] = [1, 0.6];
    ctx.arc(0, 0, rOuter, 0, 2 * Math.PI); // x, y, r, ang0, ang1, cclockwise
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.arc(0, 0, rInner, 0, 2 * Math.PI); // x, y, r, ang0, ang1, cclockwise
  },
  square (ctx) { ctx.fillRect(-1, -1, 2, 2); },
  triangle (ctx) { this.poly(ctx, [[1, 0], [-1, -0.8], [-1, 0.8]]); }
};

// import * as THREE from '../libs/three.min.js'
// import OrbitControls from '../libs/threelibs/OrbitControls.js'
// import Stats from '../libs/stats.min.js'
// import dat from '../libs/dat.gui.min.js'

// util.toWindow({three: THREE}) // REMIND

class Three {
  static defaultOptions () {
    return {
      Renderer: Three,      // include me in options so Model can instanciate me
      orthoView: false,     // 'Perspective', 'Orthographic'
      clearColor: 0x000000, // clear to black
      useAxes: true,        // show x,y,z axes
      useGrid: true,        // show x,y plane
      useStats: true,       // show fps widget
      useControls: true,    // activate navigation. REMIND: name of control?
      useGUI: true          // activate dat.gui UI
    }
  }

  // The Model constructor takes a DOM div and overrides for defaults
  constructor (model, options = {}) {
    this.model = model;
    this.spriteSheet = new SpriteSheet();

    // Initialize options
    Object.assign(this, Three.defaultOptions); // install defaults
    Object.assign(this, options); // override defaults
    if (this.Renderer !== Three)
      util.error('Three ctor: Renderer not Three', this.renderer);

    // Initialize Three.js
    this.initThree();
    this.initThreeHelpers();

    this.unitQuad = util.createQuad(0.5, 0);
  }
  // createQuad (r, z = 0) { // r is radius of xy quad: [-r,+r], z is quad z
  //   const vertices = [-r, -r, z, r, -r, z, r, r, z, -r, r, z]
  //   const indices = [0, 1, 2, 0, 2, 3]
  //   return {vertices, indices}
  // }
  // Init Three.js core: scene, camera, renderer
  initThree () {
    const {clientWidth, clientHeight} = this.model.div;
    const {orthoView, clearColor} = this;
    const {width, height} = this.model.world;
    const [halfW, halfH] = [width / 2, height / 2];

    // this.spriteSheet.texture = new THREE.CanvasTexture(this.spriteSheet.ctx)
    // this.spriteSheet.setTexture(THREE.CanvasTexture)

    const scene = new THREE.Scene();
    const camera = orthoView
      ? new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 1, 1000)
      : new THREE.PerspectiveCamera(45, clientWidth / clientHeight, 1, 10000);

    if (orthoView)
      camera.position.set(0, 0, 100 * width);
    else
      camera.position.set(width, -width, width);
    camera.up.set(0, 0, 1);

    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(clientWidth, clientHeight);
    renderer.setClearColor(clearColor);
    this.model.div.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
      const {clientWidth, clientHeight} = this.model.div;
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight);
    });

    Object.assign(this, {scene, camera, renderer});
  }
  initThreeHelpers () {
    const {scene, renderer, camera} = this;
    const {useAxes, useGrid, useControls, useStats, useGUI} = this;
    const {width} = this.model.world;
    const helpers = {};

    if (useAxes) {
      helpers.axes = new THREE.AxisHelper(1.5 * width / 2);
      scene.add(helpers.axes);
    }
    if (useGrid) {
      // helpers.grid = new THREE.GridHelper(width, width / patchSize)
      helpers.grid = new THREE.GridHelper(1.25 * width, 10);
      helpers.grid.rotation.x = THREE.Math.degToRad(90);
      scene.add(helpers.grid);
    }
    if (useStats) {
      helpers.stats = new Stats();
      document.body.appendChild(helpers.stats.dom);
    }
    if (useControls) {
      // helpers.controls = new OrbitControls(camera, renderer.domElement)
      helpers.controls = new THREE.OrbitControls(camera, renderer.domElement);
    }
    if (useGUI) {
      helpers.gui = new dat.GUI();
    }

    Object.assign(this, helpers);
  }
  disposeThreeMesh (mesh) {
    if (mesh.parent !== this.scene) console.log('mesh parent not scene');
    mesh.parent.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
    if (mesh.material.map) mesh.material.map.dispose();
  }
  initPatchesMesh (canvas) {
    if (this.patchesMesh) this.disposeThreeMesh(this.patchesMesh);
    const {width, height, numX, numY} = this.model.world;
    // [CanvasTexture args:](https://goo.gl/HkTuHO)
    // canvas, mapping, wrapS, wrapT, magFilter, minFilter, format, type, anisotropy
    const texture = new THREE.CanvasTexture(canvas);
    // texture.generateMipmaps = false
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    // texture.premultiplyAlpha = false

    const geometry = new THREE.PlaneGeometry(width, height, numX, numY);
    geometry.name = 'patches';
    const material = new THREE.MeshBasicMaterial({
      map: texture, shading: THREE.FlatShading, side: THREE.DoubleSide
      //, side: THREE.DoubleSide//, wireframe: true
    });
    const mesh = this.patchesMesh = new THREE.Mesh(geometry, material);
    // mesh.rotation.x = -Math.PI / 2
    this.scene.add(mesh);
  }
  updatePatchesMesh (patches) {
    patches.installPixels();
    this.patchesMesh.material.map.needsUpdate = true;
  }
  initTurtlesMesh () {
    if (this.turtlesMesh) this.disposeThreeMesh(this.turtlesMesh);

    const texture = new THREE.CanvasTexture(this.spriteSheet.ctx.canvas);
    this.spriteSheet.texture = texture;

    const vertices = new Float32Array(0);
    const uvs = new Float32Array(0);
    const indices = new Uint32Array(0);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.addAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    geometry.name = 'turtles';
    const material = new THREE.MeshBasicMaterial({
      map: texture, alphaTest: 0.5, side: THREE.DoubleSide});

    const mesh = this.turtlesMesh = new THREE.Mesh(geometry, material);
    this.scene.add(mesh);
  }
  updateTurtlesMesh (turtles) {
    // const turtles = this.turtles
    const { vertices, indices } = this.unitQuad;
    const patchSize = this.model.world.patchSize;
    const mesh = this.turtlesMesh;
    const positionAttrib = mesh.geometry.getAttribute('position');
    const uvAttrib = mesh.geometry.getAttribute('uv');
    const indexAttrib = mesh.geometry.getIndex();
    // const positions = []
    const positions = new Float32Array(vertices.length * turtles.length);
    const uvs = [];
    const indexes = [];

    for (let i = 0; i < turtles.length; i++) {
      const turtle = turtles[i];
      const size = turtle.size; // * patchSize
      const theta = turtle.theta;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const offset = i * vertices.length;

      for (let j = 0; j < vertices.length; j = j + 3) {
        const x0 = vertices[j];
        const y0 = vertices[j + 1];
        const x = turtle.x; // * patchSize
        const y = turtle.y; // * patchSize
        positions[j + offset] = (size * (x0 * cos - y0 * sin) + x) * patchSize;
        positions[j + offset + 1] = (size * (x0 * sin + y0 * cos) + y) * patchSize;
        positions[j + offset + 2] = turtle.z * patchSize;
      }
      indexes.push(...indices.map((ix) => ix + (i * 4))); // 4
      uvs.push(...turtle.sprite.uvs);
    }
    // positionAttrib.setArray(new Float32Array(positions))
    positionAttrib.setArray(positions);
    positionAttrib.needsUpdate = true;
    uvAttrib.setArray(new Float32Array(uvs));
    uvAttrib.needsUpdate = true;
    indexAttrib.setArray(new Uint32Array(indexes));
    indexAttrib.needsUpdate = true;
  }
  initLinksMesh () {
    if (this.linksMesh) this.disposeThreeMesh(this.linksMesh);
    const vertices = new Float32Array(0);
    const colors = new Float32Array(0);
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.name = 'links';
    const material = new THREE.LineBasicMaterial({vertexColors: THREE.VertexColors});

    const mesh = this.linksMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(mesh);
  }
  updateLinksMesh (links) {
    const vertices = [];
    const colors = [];
    for (let i = 0; i < links.length; i++) {
      const {end0, end1, color} = links[i];
      const {x: x0, y: y0, z: z0} = end0;
      const {x: x1, y: y1, z: z1} = end1;
      const ps = this.model.world.patchSize;
      vertices.push(x0 * ps, y0 * ps, z0 * ps, x1 * ps, y1 * ps, z1 * ps);
      colors.push(...color.webgl, ...color.webgl);
    }
    const mesh = this.linksMesh;
    const positionAttrib = mesh.geometry.getAttribute('position');
    const colorAttrib = mesh.geometry.getAttribute('color');
    positionAttrib.setArray(new Float32Array(vertices));
    positionAttrib.needsUpdate = true;
    colorAttrib.setArray(new Float32Array(colors));
    colorAttrib.needsUpdate = true;
  }
}

// import SpriteSheet from './SpriteSheet.js'
// import * as THREE from '../libs/three.min.js'
// import OrbitControls from '../libs/threelibs/OrbitControls.js'
// import Stats from '../libs/stats.min.js'
// import dat from '../libs/dat.gui.min.js'

// util.toWindow({three: THREE}) // REMIND

// Class Model is the primary interface for modelers, integrating
// all the parts of a model. It also contains NetLogo's `observer` methods.
class Model {
  // Static class methods for default settings.
  static defaultWorld () {
    return {
      patchSize: 13,
      minX: -16,
      maxX: 16,
      minY: -16,
      maxY: 16
      // usePatches: true, // REMIND: Use these. Add Drawing? Labels?
      // useTurtles: true,
      // useLinks: true,
    }
  }
  // static defaultThree () {
  //   return {
  //     orthoView: false, // 'Perspective', 'Orthographic'
  //     clearColor: 0x000000,
  //     useAxes: true,
  //     useGrid: true,
  //     useStats: true,
  //     useControls: true,
  //     useGUI: true
  //   }
  // }

  // The Model constructor takes a DOM div and overrides for defaults
  constructor (div = document.body,
               worldOptions = {},
               rendererOptions = Three.defaultOptions()) {
    // Store and initialize the model's div and contexts.
    this.div = util.isString(div) ? document.getElementById(div) : div;
    // this.spriteSheet = new SpriteSheet()

    // Create this model's `world` object
    this.world = Model.defaultWorld();
    Object.assign(this.world, worldOptions);
    this.setWorld();

    // Initialize renderer
    this.renderer = new rendererOptions.Renderer(this, rendererOptions);
    // this.three = Model.defaultThree()
    // Object.assign(this.three, threeOptions)
    // this.initThree()
    // this.initThreeHelpers()

    // Create animator to handle draw/step.
    this.anim = new Animator(this);

    // Initialize model calling `startup`, `reset` .. which calls `setup`.
    this.modelReady = false;
    this.startup().then(() => {
      // this.reset(); this.setup(); this.modelReady = true
      this.reset(); this.modelReady = true;
    });
  }
  // Call fcn(this) when any async
  whenReady (fcn) {
    // util.waitPromise(() => this.modelReady).then(fcn())
    util.waitOn(() => this.modelReady, () => fcn(this));
  }
  // Add additional world variables derived from constructor's `worldOptions`.
  setWorld () {
    const world = this.world;
    // REMIND: change to xPatches, yPatches?
    world.numX = world.maxX - world.minX + 1;
    world.numY = world.maxY - world.minY + 1;
    world.width = world.numX * world.patchSize;
    world.height = world.numY * world.patchSize;
    world.minXcor = world.minX - 0.5;
    world.maxXcor = world.maxX + 0.5;
    world.minYcor = world.minY - 0.5;
    world.maxYcor = world.maxY + 0.5;
    world.isOnWorld = (x, y) => // No braces, is lambda expression
      (world.minXcor <= x) && (x <= world.maxXcor) &&
      (world.minYcor <= y) && (y <= world.maxYcor);
  }
  // createQuad (r, z = 0) { // r is radius of xy quad: [-r,+r], z is quad z
  //   const vertices = [-r, -r, z, r, -r, z, r, r, z, -r, r, z]
  //   const indices = [0, 1, 2, 0, 2, 3]
  //   return {vertices, indices}
  // }
  // (Re)initialize the model. REMIND: not quite right
  reset (restart = false) {
    this.anim.reset();
    this.setWorld();
    // this.three.unitQuad = util.createQuad(this.world.patchSize / 2, 0)
    // this.three.unitQuad = util.createQuad(0.5, 0)
    this.refreshLinks = this.refreshTurtles = this.refreshPatches = true;
    this.patches = new Patches(this, PatchProto, 'patches');
    this.renderer.initPatchesMesh(this.patches.pixels.ctx.canvas);
    this.turtles = new Turtles(this, TurtleProto, 'turtles');
    this.renderer.initTurtlesMesh();
    this.links = new Links(this, LinkProto, 'links');
    this.renderer.initLinksMesh();
    // REMIND: temp
    // this.div.appendChild(this.patches.pixels.ctx.canvas)
    // document.body.appendChild(this.patches.pixels.ctx.canvas)
    this.setup();
    if (restart) this.start();
  }

// ### User Model Creation
  // A user's model is made by subclassing Model and over-riding these
  // three abstract methods. `super` need not be called.

  // Async function to initialize model resources (images, files).
  async startup () {} // called by constructor.
  // Initialize your model variables and defaults here.
  setup () {} // called by constructor (after startup) or by reset()
  // Update/step your model here
  step () {} // called each step of the animation

  // Start/stop the animation. Return model for chaining.
  start () {
    util.waitOn(() => this.modelReady, () => {
      this.anim.start();
    });
    // util.waitPromise(() => this.modelReady)
    // .then(() => { this.anim.start() })
    return this
  }
  stop () { this.anim.stop(); }
  // Animate once by `step(); draw()`.
  once () { this.stop(); this.anim.once(); } // stop is no-op if already stopped

  // Change the world parameters. Requires a reset.
  // Resets Patches, Turtles, Links & reinitializes canvases.
  // If restart argument is true (default), will restart after resetting.
  // resizeWorld (worldOptions, restart = true) {
  //   Object.assign(this.world, worldOptions)
  //   this.setWorld(this.world)
  //   this.reset(restart)
  // }

  draw (force = this.anim.stopped || this.anim.draws === 1) {
    const {scene, camera} = this.renderer;
    if (this.div) {
      if (force || this.refreshPatches) {
        if (this.patches.length > 0)
          this.renderer.updatePatchesMesh(this.patches);
      }
      if (force || this.refreshTurtles) {
        if (this.turtles.length > 0)
          this.renderer.updateTurtlesMesh(this.turtles);
      }
      if (force || this.refreshLinks) {
        if (this.links.length > 0)
          this.renderer.updateLinksMesh(this.links);
      }

      this.renderer.renderer.render(scene, camera);
    }
    if (this.renderer.stats) this.renderer.stats.update();
  }

  // Breeds: create subarrays of Patches, Agentss, Links
  patchBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Patches(this, PatchProto, breedName, this.patches);
    }
  }
  turtleBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Turtles(this, TurtleProto, breedName, this.turtles);
    }
  }
  linkBreeds (breedNames) {
    for (const breedName of breedNames.split(' ')) {
      this[breedName] = new Links(this, LinkProto, breedName, this.links);
    }
  }
}

// Parse an RGBA image to a DataSet of the given type.
// We use all 4 bytes of the pixels, thus map exactly onto
// multiples all [TypedArray](https://goo.gl/3OOQzy) sizes.
class RGBADataSet extends DataSet {
  constructor (img, Type = Float32Array, options = {}) {
    const bytes = util.imageToBytes(img);
    const data = new Type(bytes.buffer); // Parse via a Type view on the buffer
    const dataPerPixel = 4 * data.length / bytes.length;
    const width = dataPerPixel * img.width;
    const height = img.height;
    super(width, height, data);
    Object.assign(this, options);
    this.src = img.src;
  }
}

class RGBDataSet extends DataSet {

  constructor (img, options = {}) {
    super(img.width, img.height, new Float32Array(img.width * img.height));
    Object.assign(this, options);
    const ctx = util.createCtx(img.width, img.height);
    util.fillCtxWithImage(ctx, img);
    const imgData = util.ctxImageData(ctx);
    const convertedData = this.data; // new Float32Array(img.width * img.height)
    for (var i = 0; i < convertedData.length; i++) {
      let r = imgData.data[4 * i], g = imgData.data[4 * i + 1], b = imgData.data[4 * i + 2];
      convertedData[i] = this.rgb2Number(r, g, b);
    }
    this.src = img.src;
    // var mydata = new DataSet(img.width, img.height, convertedData)
    // return mydata
  }

  // Convert RGB to a number.
  // by default this assumes the values are in decimeters, but it can be overwritten.
  //  This funnction gets called in a tight loop for every pixel.
  rgb2Number (r,g,b) {
      var negative = 1;
      if( r > 63 ){
         negative = -1;
         r = 0;
      }
      var n = negative * (r*256*256 + g*256 + b);
      n=n/10;
      return n;
  }
}

/* eslint-disable */
// import DataSetIO       from './DataSetIO.js'
/* eslint-enable */

var AS = {
  AgentSet,
  Animator,
  AscDataSet,
  Color,
  ColorMap,
  DataSet,
  // DataSetIO,
  Link: LinkProto,
  Links,
  Model,
  Patch: PatchProto,
  Patches,
  RGBADataSet,
  RGBDataSet,
  SpriteSheet,
  Turtle: TurtleProto,
  Turtles,
  util
};

return AS;

}());
