'use strict';

var sortedIndexBy = require('lodash.sortedindexby')
var sortBy = require('lodash.sortby')

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
     * @param {T} data the data to be clustered - can be any type
     * @param {Number} the minimumDistance distance two clusters may be
     */
    return function(data, minimumDistanceAllowedBetweenClusters) {

        var clusters = data.map(function(datum) {
            return {
                elements: [datum],
                position: position(datum, minimumDistanceAllowedBetweenClusters)
            };
        });

        function closestElementsIndex() {
            var minDistanceSeen = minimumDistanceAllowedBetweenClusters;
            var closest = [-1, -1];

            for( var i = 0; i < clusters.length; i++) {
                for( var j = 0; j < i; j++) {

                    var clusterI = clusters[i];
                    var clusterJ = clusters[j];

                    var distanceBetweenElements = distance(
                        clusterI.position,
                        clusterJ.position,
                        minimumDistanceAllowedBetweenClusters
                    );

                    if( distanceBetweenElements === 0 && minimumDistanceAllowedBetweenClusters > 0 ) {
                        // can exit early - will never find closer than zero distance:
                        return [i, j];
                    }

                    if( distanceBetweenElements < minDistanceSeen ) {
                        minDistanceSeen = distanceBetweenElements;
                        closest[0] = i;
                        closest[1] = j;
                    }
                }
            }

            // if array still contains -1 we know that none were found:
            return closest[0] === -1? null : closest;
        }

        function conjoinClustersAtIndices(mergeInto, mergeFrom) {

            mergeFrom.elements.forEach(function(el) {
                insert( mergeInto.elements, el );
            });

            // update position of the updated cluster
            mergeInto.position = mergePositions(mergeInto.elements.map(position), minimumDistanceAllowedBetweenClusters);
        }

        for(var closest; closest = closestElementsIndex();) {
            var closestA = clusters[closest[0]];
            var closestB = clusters[closest[1]];

            // put everything from one cluster into the other
            conjoinClustersAtIndices(closestA, closestB);

            // remove the old cluster
            clusters.splice(closest[1], 1);
        }

        return clusterOrder
            ? sortBy(clusters, clusterOrder)
            : clusters;
    };
};