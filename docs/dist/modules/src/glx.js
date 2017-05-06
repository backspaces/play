import util from './util.js'

// A set of GL "eXtensions" for simplifying webgl use.

const glx = {

// #### Shaders and Programs

  // Use gl util.getContext(can/string, 'webgl', {attributes})
  // to create the webgl context.
  getGLContext (canvas, attributes = {}) {
    return util.getContext(canvas, 'webgl', attributes)
  },

  // Add [debug wrappers](https://www.khronos.org/webgl/wiki/Debugging)
  // to the gl object. If fcnsToo, enable function logging to console.
  addDebugWrappers (gl, webglDebug, fcnsToo = false) {
    if (fcnsToo)
      return webglDebug.makeDebugContext(gl, null, (functionName, args) => {
        args = webglDebug.glFunctionArgsToString(functionName, args)
        console.log(`gl.${functionName}(${args})`)
      })
    else
      return webglDebug.makeDebugContext(gl)
  },
  // [Adjust canvas](https://goo.gl/15EQyN) to match clientWidth/Height changes.
  // If aspect ratio is non-null, modify clientHeight via canvas.style
  adjustCanvas (gl, aspectRatio = null) {
    const {width, height, clientWidth} = gl.canvas
    let {clientHeight} = gl.canvas
    if (clientWidth !== width || clientHeight !== height) {
      if (aspectRatio) // adjust css style for aspectRatio
        clientHeight = gl.canvas.style.height = clientWidth / aspectRatio
      gl.canvas.width = clientWidth
      gl.canvas.height = clientHeight
      this.setViewport(gl)
    }
  },
  setViewport: (gl) => {
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
  },

// #### Shaders and Programs

  // Create a shader from a shader script string, generally a template string.
  createShader (gl, shaderScript, type) {
    const shader = gl.createShader(type)

    gl.shaderSource(shader, shaderScript)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
      this.error(gl.getShaderInfoLog(shader))

    return shader
  },
  createProgram (gl, vShaderScript, fShaderScript) {
    const vertShader = this.createShader(gl, vShaderScript, gl.VERTEX_SHADER)
    const fragShader = this.createShader(gl, fShaderScript, gl.FRAGMENT_SHADER)
    const program = gl.createProgram()

    gl.attachShader(program, vertShader)
    gl.attachShader(program, fragShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
      this.error('Could not initialise shaders')

    program.attribInfo = this.getAttributes(gl, program)
    program.uniformInfo = this.getUniforms(gl, program)
    gl.useProgram(program) // maybe not?
    return program
  },

// #### Program Information: Uniforms & Attributes

  // Convert a read-only WebGLActiveInfo into simple object w/
  // info shared between attributes and uniforms.
  typedArrayTypes: {   /* eslint-disable */
    BYTE:           Int8Array,
    UNSIGNED_BYTE:  Uint8Array,
    SHORT:          Int16Array,
    UNSIGNED_SHORT: Uint16Array,
    INT:            Int32Array,
    UNSIGNED_INT:   Uint32Array,
    FLOAT:          Float32Array
  },  /* eslint-enable */
  initActiveInfo (gl, program, index, isAttrib) {
    const aInfo = isAttrib
      ? gl.getActiveAttrib(program, index)
      : gl.getActiveUniform(program, index)
    const info = {name: aInfo.name, type: aInfo.type, size: aInfo.size}
    info.location = isAttrib
      ? gl.getAttribLocation(program, info.name)
      : gl.getUniformLocation(program, info.name)
    info.typeName = util.keyForValue(gl, info.type)
    if (info.typeName !== 'SAMPLER_2D') {
      const num = info.typeName.replace(/^\D*/, '') || '1'
      info.components = parseInt(num)
      info.componentType = info.typeName.replace(/_.*$/, '')
    }
    return info
  },
  // Get program's information for all attributes
  getAttributes (gl, program) {
    const attribInfo = {} // name: value pairs for each attribute in program.
    const numAttribs = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES)

    for (let i = 0; i < numAttribs; i++) {
      const info = this.initActiveInfo(gl, program, i, true)
      info.typedArray = this.typedArrayTypes[info.componentType]
      attribInfo[info.name] = info
    }
    return attribInfo
  },
  // Get program's information for all uniforms
  getUniforms (gl, program) {
    const uniformInfo = {} // name: value pairs for each uniform in program.
    const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    let texNum = 0

    for (let i = 0; i < numUniforms; i++) {
      const info = this.initActiveInfo(gl, program, i, false)
      info.isArray = info.name.endsWith('[0]') || info.size > 1
      info.name = info.name.replace('[0]', '')
      if (info.typeName === 'SAMPLER_2D') {
        info.fcn = 'uniform1i'
        info.texUnit = texNum++
      } else {
        info.fcn = info.typeName.match('MAT') ? 'uniformMatrix' : 'uniform'
        info.fcn += info.components
        info.fcn += info.typeName.match('FLOAT') ? 'f' : 'i'
        info.fcn += info.typeName.match(/VEC|MAT/) || info.isArray ? 'v' : ''
      }
      uniformInfo[info.name] = info
    }
    return uniformInfo
  },

// #### Use atrib & uniform information to manage buffers.

  // Create empty initial buffers.
  initBuffers (gl, program, elementArrayName = null) {
    const buffInfo = {}
    util.forEach(program.attribInfo, (aInfo, name) => {
      const buffer = gl.createBuffer()
      buffer.target = gl.ARRAY_BUFFER
      buffer.ArrayType = aInfo.typedArray
      gl.bindBuffer(buffer.target, buffer)

      const {location, components, componentType} = aInfo
      buffer.components = components
      gl.vertexAttribPointer(
        location, components, gl[componentType], false, 0, 0
      )
      gl.enableVertexAttribArray(location)

      buffInfo[name] = buffer
    })
    if (elementArrayName) {
      const buffer = gl.createBuffer()
      buffer.components = 1
      buffer.target = gl.ELEMENT_ARRAY_BUFFER
      buffer.ArrayType = Uint16Array
      gl.bindBuffer(buffer.target, buffer)
      buffInfo[elementArrayName] = buffer
    }
    return buffInfo
  },

  setBuffers (gl, program, buffInfo, data) {
    util.forEach(data, (array, name) => {
      const buffer = buffInfo[name]
      if (!buffer) util.error(`setBuffers: ${name} not a buffer`)
      if (!array.buffer) array = new buffer.ArrayType(array)
      gl.bindBuffer(buffer.target, buffer)
      gl.bufferData(buffer.target, array, gl.STATIC_DRAW)
    })
  }

}

export default glx
