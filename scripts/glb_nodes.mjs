// Prints the node tree (names, transforms) of a GLB — reads the JSON chunk only.
import { readFileSync } from 'node:fs'
const b = readFileSync(process.argv[2]); const len = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + len).toString('utf8'))
const f = (a) => a?.map((v) => +v.toFixed(3)).join(',')
const walk = (i, d) => { const n = j.nodes[i]; console.log('  '.repeat(d) + n.name + (n.mesh !== undefined ? ' [mesh ' + j.meshes[n.mesh].name + ']' : '') + (n.translation ? ' T(' + f(n.translation) + ')' : '') + (n.rotation ? ' R(' + f(n.rotation) + ')' : '') + (n.scale ? ' S(' + f(n.scale) + ')' : '')); (n.children || []).forEach((c) => walk(c, d + 1)) }
j.scenes[0].nodes.forEach((i) => walk(i, 0))
console.log('materials:', j.materials.map((m) => m.name).join(', ')); console.log('images:', (j.images || []).length, 'animations:', (j.animations || []).length)
