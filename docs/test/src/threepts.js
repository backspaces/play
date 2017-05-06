// A billboarded points implementation turtles, fast!
import util from '../../src/util.js'

// import * as THREE from '../libs/three.min.js'
// import OrbitControls from '../libs/threelibs/OrbitControls.js'
// import Stats from '../libs/stats.min.js'
// import dat from '../libs/dat.gui.min.js'

const UI = {
  KTurtles: 10
}
const worldWidth = 200 // -100 -> 100
const worldRadius = worldWidth / 2
const patchSize = 10
const turtleRadius = 1 // -1 -> 1
const turtleZ = patchSize / 4

function initThree () {
  const renderer = new THREE.WebGLRenderer()
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor('rgb(240, 240, 240)')
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const axes = new THREE.AxisHelper(1.1 * worldRadius)
  scene.add(axes)
  const grid = new THREE.GridHelper(worldWidth, worldWidth / patchSize)
  grid.rotation.x = THREE.Math.degToRad(90)
  scene.add(grid)

  const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth / window.innerHeight, 0.1, 10000)
  camera.position.set(worldWidth, -worldWidth, worldWidth)
  camera.up.set(0, 0, 1)
  camera.lookAt(scene.position)

  const controls = new THREE.OrbitControls(camera, renderer.domElement)
  const stats = new Stats()
  document.body.appendChild(stats.dom)

  return {scene, camera, renderer, controls, stats}
}

const {scene, camera, renderer, stats} = initThree() // controls not needed

// Models/Turtles

const turtleMaterial = // side: THREE.DoubleSide .. not needed, billboard
  new THREE.PointsMaterial({size: turtleRadius * 2, color: 'red'})
let turtleGeometry = new THREE.Geometry() // let: reset on KTurtles UI change
let turtleMesh = new THREE.Points(turtleGeometry, turtleMaterial) // ditto
scene.add(turtleMesh)
function createTurtles (num) {
  // see http://stackoverflow.com/a/41906410/1791917 for point rotation
  util.repeat(num, () => {
    const vec = new THREE.Vector3(0, 0, turtleZ)
    vec.theta = 2 * Math.PI * Math.random()
    turtleGeometry.vertices.push(vec)
  })
}
createTurtles(UI.KTurtles * 1e3)

// Animator & Events
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

const speed = patchSize / 10
function step () {
  util.forEach(turtleGeometry.vertices, (turtle) => {
    const wiggle = Math.random() > 0.9 ? util.randomFloat2(-0.1, 0.1) : 0
    const theta = turtle.theta + wiggle
    let dx = speed * Math.cos(theta) // Cody: 1-2fps better w/o destructuring
    let dy = speed * Math.sin(theta)
    const x0 = turtle.x // no obvious advantage over destructuring
    const y0 = turtle.y
    const x = THREE.Math.clamp(x0 + dx, -worldRadius, worldRadius)
    const y = THREE.Math.clamp(y0 + dy, -worldRadius, worldRadius)
    if (Math.abs(x) === worldRadius) dx = -dx
    if (Math.abs(y) === worldRadius) dy = -dy
    turtle.x = x + dx
    turtle.y = y + dy
    turtle.theta = Math.atan2(dy, dx)
  })
  turtleGeometry.verticesNeedUpdate = true
}

function animate () {
  requestAnimationFrame(animate)
  step()
  renderer.render(scene, camera)
  stats.update()
  // controls.update()  // have the mouse update the view -- not needed?
}
animate()
console.log('renderer.info.render', renderer.info.render)

const gui = new dat.GUI()
function resetTurtles () {
  scene.remove(turtleMesh)
  turtleGeometry = new THREE.Geometry()
  turtleMesh = new THREE.Points(turtleGeometry, turtleMaterial)
  createTurtles(UI.KTurtles * 1e3)
  scene.add(turtleMesh)
}
gui.add(UI, 'KTurtles', 1, 100).step(1).onFinishChange(resetTurtles)

function stop () { debugger } // eslint-disable-line
window.stop = stop
