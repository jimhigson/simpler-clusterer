'use strict';

var sortedIndexBy = require('lodash.sortedindexby')
var sortBy = require('lodash.sortby')
var SortedSet = require('collections/sorted-set')
var List = require('collections/list')

/**
 * Create a clusterer for clusters of type <T> at positions of type <P> ...
 *
 * Clusters have properties position and elements.
 *
 * @param {Function} position <T> -> <P>
 * @param {Function} distance (<P>, <P>) -> Number
 * @param {Function} mergePositions (<P>, <P>) -> <P>
 * @param {Function} elementOrder <T> -> {*}
 * @param {Function} [clusterOrder] <Cluster<T>> -> {*}
 */
module.exports = function (position, distance, mergePositions, elementOrder, clusterOrder) {

    function referenceEquality(e1, e2) {
        return e1 == e2;
    }

    function edgeCompare(e1, e2) {

        var relativeDistance = e1.distance - e2.distance;
        if( relativeDistance == 0 ) {
            return e1.edgeIndex - e2.edgeIndex;
        }
        return relativeDistance;
    }

    function edgesSet() {
        return new SortedSet(
            [],
            referenceEquality, // we never create equal edges, so can use reference identity
            edgeCompare
        );
    }

    function clustersList( contents ) {
        return new List(
            contents,
            referenceEquality // we never create equal clusters, so can use reference identity
        );
    }

    /**
     * @param {T} data the data to be clustered - can be any type
     * @param {Number} the minimumDistance distance two clusters may be
     */
    return function(data, minimumDistanceAllowedBetweenClusters) {

        var shortEdges = edgesSet();
        var clusters = clustersList();
        var edgeIndex = 0;

        data.forEach( datumI => {

            var clusterI = {
                elements: [datumI],
                position: position(datumI, minimumDistanceAllowedBetweenClusters),
                edges: edgesSet()
            };

            findShortEdgesFrom( clusterI );
            clusters.push( clusterI );
        });

        while( shortEdges.length > 0 ) {
            var shortestEdge = shortEdges.shift();

            conjoinClusters(shortestEdge.from, shortestEdge.to);
        }

        function findShortEdgesFrom( subjectCluster ) {
            clusters.forEach( otherCluster => {

                let distanceBetweenElements = distance(
                    subjectCluster.position,
                    otherCluster.position,
                    minimumDistanceAllowedBetweenClusters
                );

                if( distanceBetweenElements < minimumDistanceAllowedBetweenClusters ) {

                    var edge = {
                        from: subjectCluster,
                        to: otherCluster,
                        edgeIndex: ++edgeIndex,
                        distance: distanceBetweenElements
                    };

                    shortEdges.push( edge );
                    subjectCluster.edges.push( edge );
                    otherCluster.edges.push( edge );
                }
            });
        }

        function conjoinClusters(clusterA, clusterB) {

            var elementsFromBothClusters = clusterA.elements.concat( clusterB.elements );
            var newCluster = {
                elements: elementsFromBothClusters,
                position: mergePositions(elementsFromBothClusters.map(position)),
                edges: edgesSet()
            };

            shortEdges.deleteEach( clusterA.edges );
            shortEdges.deleteEach( clusterB.edges );

            clusters.delete(clusterA);
            clusters.delete(clusterB);

            findShortEdgesFrom( newCluster );

            clusters.push(newCluster);
        }

        // clean up data that we don't need to be exported and convert into standard arrays:
        var clustersArray = clusters.toArray()
        clustersArray.forEach( c => {
            if( elementOrder ) {
                c.elements = sortBy( c.elements, elementOrder );
            }

            delete c.edges
        });

        return clusterOrder
            ? sortBy(clustersArray, clusterOrder)
            : clustersArray;
    };
};