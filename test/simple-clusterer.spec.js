
var sum = require('lodash.sum')
var identity = require('lodash.identity')

describe('clustering', function() {

    describe("simple, unsorted numbers", function () {

        beforeEach(function() {
            function distance(a,b) {
                return Math.abs(b-a);
            }
            var position = identity;

            function merge(positions) {
                return sum(positions) / positions.length;
            }

            this.numberClusterer = require('../simple-clusterer.js')(position, distance, merge);
        });

        it('tolerates empty data', function() {
            expect(this.numberClusterer([], 1)).toRecursivelyContain(clustersLike([]));
        });

        it('creates a single simple-clusterer from singleton list', function() {
            expect(this.numberClusterer([2], 1)).toRecursivelyContain([
                {elements:[2], position: 2}
            ]);
        });

        it('can create a single simple-clusterer while leaving another point as a singleton', function() {
            expect(this.numberClusterer([1,2,5], 2)).toRecursivelyContain(clustersLike([
                {elements:[1,2], position:1.5},
                {elements:[5], position:5}
            ]));
        });

        it('can bunch all datums into a single simple-clusterer', function() {
            expect(this.numberClusterer([1,2,5], 4)).toRecursivelyContain(clustersLike([
                {elements:[1,2,5], position:8/3}
            ]));
        });

        it('finds two clusters', function() {
            expect(this.numberClusterer([1,2,5,6], 2)).toRecursivelyContain(clustersLike([
                {elements:[1,2], position:1.5},
                {elements:[5,6], position:5.5}
            ]));
        });

        it('can find a large simple-clusterer while leaving two singletons', function() {
            expect(this.numberClusterer([1,3,4,5,9], 2)).toRecursivelyContain(clustersLike([
                {elements:[1], position: 1},
                {elements:[3,4,5], position: 4},
                {elements:[9], position: 9}
            ]));
        });

        it('can avoid one big simple-clusterer if several will work', function() {
            expect(this.numberClusterer([1,2,3,4,5,6], 2)).toRecursivelyContain(clustersLike([
                {elements:[1,2], position: 1.5},
                {elements:[3,4], position: 3.5},
                {elements:[5,6], position: 5.5}
            ]));
        });

        it('does not require sorted input', function() {
            expect(this.numberClusterer([30,2,50,51,31,1], 2)).toRecursivelyContain(clustersLike([
                {elements:[1,2], position: 1.5},
                {elements:[30,31], position: 30.5},
                {elements:[50, 51], position: 50.5}
            ]));
        });

        it('clusters to an epsilon distance by creating one simple-clusterer per item except for repeated values', function() {
            expect(this.numberClusterer([1,2,3,3,4,5,6], 1e-6)).toRecursivelyContain(clustersLike([
                {elements:[1], position: 1},
                {elements:[2], position: 2},
                {elements:[3,3], position: 3},
                {elements:[4], position: 4},
                {elements:[5], position: 5},
                {elements:[6], position: 6}
            ]));
        });

        it('clusters to zero distance by creating one simple-clusterer per item, even with repeated values', function() {
            expect(this.numberClusterer([1,2,3,3,4,5,6], 0)).toRecursivelyContain(clustersLike([
                {elements:[1], position: 1},
                {elements:[2], position: 2},
                {elements:[3], position: 3},
                {elements:[3], position: 3},
                {elements:[4], position: 4},
                {elements:[5], position: 5},
                {elements:[6], position: 6}
            ]));
        });



    });

    describe("ordering", function () {
        it("can sort inside clusters and between clusters", function () {

            expect(this.sortedNumberClusterer([30,29,50,51,31,49], 2)).toRecursivelyContain([
                {elements:[29, 30, 31], position: 30},
                {elements:[49, 50, 51], position: 50}
            ]);
        });

        it("can sort between clusters", function () {

            expect(this.sortedNumberClusterer([30,29,50,51,31,49], 0)).toRecursivelyContain([
                {elements:[29], position: 29},
                {elements:[30], position: 30},
                {elements:[31], position: 31},
                {elements:[49], position: 49},
                {elements:[50], position: 50},
                {elements:[51], position: 51}
            ]);
        });

        beforeEach(function() {
            function distance(a,b) {
                return Math.abs(b-a);
            }
            var position = identity;

            function merge(positions) {
                return sum(positions) / positions.length;
            }
            var orderInCluster = identity;
            var orderBetweenClusters = c => c.position;

            this.sortedNumberClusterer = require('../simple-clusterer.js')
            (position, distance, merge, orderInCluster, orderBetweenClusters);
        });
    });

    describe('two-dimensional data', function() {
        function sq(n){
            return n * n;
        }

        beforeEach(function() {
            this.position = function(thing){
                return thing.location;
            };

            // Nb: that we are dealing in distance squared
            this.distance = function(locationA, locationB) {
                var xd = Math.abs(locationA.x - locationB.x);
                var yd = Math.abs(locationA.y - locationB.y);
                return sq(xd) + sq(yd);
            };

            this.mergePositions = function(positions) {
                return {
                    x: sum(positions, 'x') / positions.length,
                    y: sum(positions, 'y') / positions.length
                };
            };

            this.thingClusterer = require('../simple-clusterer.js')
            (this.position, this.distance, this.mergePositions);

            this.things = [
                {description: 'apple',  location:{x: 0,  y: 0}},
                {description: 'banana', location:{x: 10, y: 0}},
                {description: 'carrot', location:{x: 5,  y: 5}},
                {description: 'donkey', location:{x: -11,  y: -11}}
            ];
        });

        it('can lump into a single simple-clusterer', function() {
            var result = this.thingClusterer(this.things, sq(100)); // distance squared, so really 100

            expect(
                result
            ).toRecursivelyContain(clustersLike([
                { position: {
                    x: 1,       // mean( 0, 10, 5, -11)
                    y: -1.5     // mean( 0, 0, 5, -11)
                },
                    elements: [
                        {description: 'apple'},
                        {description: 'banana'},
                        {description: 'carrot'},
                        {description: 'donkey'}
                    ]
                }
            ]));
        });

        it('find two clusters', function() {
            var result = this.thingClusterer(this.things, sq(10)); // distance squared, so really 100

            // the donkey is quite far from all the other items. This is good or it would
            // eat them. So, we should find two clusters: one with just a donkey, and one
            // with the other three items

            expect(
                result
            ).toRecursivelyContain(clustersLike([
                { position: {
                    x: 5,
                    y: 5/3
                },
                    elements: [
                        {description: 'apple'},
                        {description: 'banana'},
                        {description: 'carrot'}
                    ]
                },

                { position: {
                    x: -11,
                    y: -11
                },
                    elements: [
                        {description:'donkey'}
                    ]
                }
            ]));
        });

        it('can simple-clusterer close items if not adjacent in the array', function() {
            var otherThings = [
                {description: 'nearby standard tree', location:{x:0, y:0}},
                {description: 'faraway magical tree', location:{x:50, y:50}},
                {description: 'monkey in nearby tree', location:{x:1, y:1}}
            ];

            var result = this.thingClusterer(otherThings, sq(5));

            expect(
                result
            ).toRecursivelyContain(clustersLike([
                { elements:[
                    {description: 'faraway magical tree', location:{x:50, y:50}}
                ],
                    position:{x:50, y:50}
                },
                { elements:[
                    {description: 'monkey in nearby tree', location:{x:1, y:1}},
                    {description: 'nearby standard tree', location:{x:0, y:0}}
                ],
                    position:{x:0.5, y:0.5}
                }
            ]));

        });
    });

    it('works with composite values', function () {
        function distanceFunction(a,b) {
            return Math.abs(b-a);
        }
        function positionFunction(thing){
            return thing.where;
        }
        function mergePosition(positions){
            return sum(positions) / positions.length;
        }

        var thingsClusterer = require('../simple-clusterer.js')
        (positionFunction, distanceFunction, mergePosition);

        expect(thingsClusterer([
                {where:1},{where:3},{where:4},{where:5},{where:9}
            ], 2)
        ).toRecursivelyContain(clustersLike([
            {elements: [{where:1}], position: 1} ,
            {elements: [{where:3},{where:4},{where:5}], position: 4},
            {elements: [{where:9}], position: 9}
        ]));
    });

    function clustersLike(spec) {

        spec.inAnyOrder().forEach(function(clusterSpec) {
            clusterSpec.elements.inAnyOrder();
        });

        return spec;
    }

    beforeEach(function() {
        jasmine.addMatchers(require('./jasmineCustomMatchers.js'));
    });

    require('./jasmineCustomMatchers.js').decorateArraysDuringTestRuns();
});