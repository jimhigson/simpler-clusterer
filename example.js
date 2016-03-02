// executable example from README.js to check that it works

// $ node example.js > output.json

const sumBy = require('lodash.sumby')
const pythagorasXY = (p1, p2) => Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
const centreOfMass = ps => ({
    x: sumBy(ps, 'x')/ps.length,
    y: sumBy(ps, 'y')/ps.length
})
const simpleClusterer = require('./simple-clusterer.js')
const clusterByLocation = simpleClusterer(
    place => place.location,
    pythagorasXY,
    centreOfMass,
    'name' // sort inside clusters alphabetically
)

const clusters = clusterByLocation([
    {name: 'house',         location:{x:1, y:4}},
    {name: 'office',        location:{x:2, y:6}},
    {name: 'tree',          location:{x:3, y:8}},
    {name: 'field',         location:{x:4, y:1}},
    {name: 'gate',          location:{x:9, y:8}},
    {name: 'road',          location:{x:7, y:7}},
    {name: 'path',          location:{x:5, y:5}},
    {name: 'factory',       location:{x:6, y:9}},
    {name: 'school',        location:{x:7, y:0}},
    {name: 'university',    location:{x:8, y:1}},
    {name: 'park',          location:{x:9, y:3}}
], 4)

console.log(JSON.stringify(clusters, null, 4))