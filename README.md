
Highly customisable, generic, single-level clusterer that works for user interfaces and small-medium data sets.

This isn't well suited for crunching scientific data, but works well for clustering user-interface elements,
for example coalescing items on a map or timeline where icons need to maintain a minimum distance before
they overlap.

Can create a clusterer to work on an array of any type T with positions of any type P, so long as simple Number distances
can be computed between two positions

Generates only single-depth clusters. For multiple depth, call recursively.

Installing
==========

`npm install --save simple-clusterer`

Testing
=======

`npm test`

API
===

Create a clusterer by calling:

```js
const myClusterer = simpleClusterer(position, distance, mergePositions, elementOrder, clusterOrder)
```

Where the parameters are:

```
position:          T => P              a function get the position of an item
distance:          (P, <P>) -> Number    a function to compute the distance between two positions
mergePositions:    [<P>] -> <P>       a function compute the midpoint (or other merge kind) between several positions. This is
                                            used to calculate the position of clusters of elements
elementOrder:      <T> -> {*}              OPTIONAL - the order of elements inside a cluster.
clusterOrder:      <Cluster<T>> -> {*}

```

This can then be called like:

``` js
myClusterer(items, minimumDistance)
```

```
items:             [<T>]                    array of items to be clustered
minimumDistance:   Number                   minimum distance two output clusters may be. No two clusters returned
                                            will be closer than this distance
```

Performance
===========

Clustering random numbers, running on node 7.2.1 on a 2014 Macbook Pro. Performance is good for sizes up to
about 250, and degrades quickly after 500. That seems a sensible maximum to load into an interface.

These results can be reproduced by running the tests.

```
clustering 10 random numbers into 9 clusters took 1ms
clustering 100 random numbers into 46 clusters took 10ms
clustering 250 random numbers into 46 clusters took 22ms
clustering 500 random numbers into 69 clusters took 54ms
clustering 1000 random numbers into 67 clusters took 194ms
clustering 2000 random numbers into 72 clusters took 955ms
```


Usage Example
=======

```js
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

// returns four clusters like:

[
    {
        "elements": [
            {
                "name": "field",
                "location": {"x": 4, "y": 1}
            }
        ],
        "position": {"x": 4, "y": 1}
    },
    {
        "elements": [
            {
                "name": "house",
                "location": {"x": 1, "y": 4}
            },
            {
                "name": "office",
                "location": {"x": 2, "y": 6}
            },
            {
                "name": "path",
                "location": {"x": 5, "y": 5}
            },
            {
                "name": "tree",
                "location": {"x": 3, "y": 8}
            }
        ],
        "position": {"x": 2.75, "y": 5.75}
    },
    {
        "elements": [
            {
                "name": "factory",
                "location": {"x": 6, "y": 9}
            },
            {
                "name": "gate",
                "location": {"x": 9, "y": 8}
            },
            {
                "name": "road",
                "location": {"x": 7, "y": 7}
            }
        ],
        "position": {"x": 7.333333333333333, "y": 8}
    },
    {
        "elements": [
            {
                "name": "park",
                "location": {"x": 9, "y": 3}
            },
            {
                "name": "school",
                "location": {"x": 7, "y": 0}
            },
            {
                "name": "university",
                "location": {"x": 8, "y": 1}
            }
        ],
        "position": {"x": 8, "y": 1.3333333333333333}
    }
]

```