'use strict';

var sortedIndexBy = require('lodash.sortedindexby')
var sortBy = require('lodash.sortBy')

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

    function insertSorted(elements, element) {
        var insertIndex = sortedIndexBy(elements, element, elementOrder);
        elements.splice(insertIndex, 0, element);
    }

    function insertAtEnd(elements, element) {
        // we are unconcerned regarding order - add to the end of the array
        elements.push(element);
    }

    var insert = elementOrder ? insertSorted : insertAtEnd;

    /**
     * @param {T} data the data to be clustered
     * @param {Number} the minimumDistance distance two clusters may be in the returned clusters
     */
    return function(data, minimumDistance) {

        var clusters = data.map(function(datum) {
            return {
                elements: [datum],
                position: position(datum, minimumDistance)
            };
        });

        function closestElementsIndex() {
            var minDistanceSeen = minimumDistance;
            var closest = null;

            for( var i = 0; i < clusters.length; i++) {
                for( var j = 0; j < i; j++) {

                    var clusterI = clusters[i];
                    var clusterJ = clusters[j];

                    var distanceBetweenElements = distance( clusterI.position, clusterJ.position, minimumDistance);

                    if( distanceBetweenElements < minDistanceSeen ) {
                        minDistanceSeen = distanceBetweenElements;
                        closest = [i,j];
                    }
                }
            }

            return closest;
        }

        function conjoinAtIndex(mergeInto, mergeFrom) {

            mergeFrom.elements.forEach(function(el) {
                insert( mergeInto.elements, el );
            });

            // update position of the updated simple-clusterer
            mergeInto.position = mergePositions(mergeInto.elements.map(position), minimumDistance);
        }

        for(var closest; closest = closestElementsIndex();) {
            var closestA = clusters[closest[0]];
            var closestB = clusters[closest[1]];

            // put everything from one simple-clusterer into the other
            conjoinAtIndex(closestA, closestB);

            // remove the old simple-clusterer
            clusters.splice(closest[1], 1);
        }

        return clusterOrder
            ? sortBy(clusters, clusterOrder)
            : clusters;
    };
};