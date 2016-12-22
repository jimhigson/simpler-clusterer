'use strict';

var sortBy = require('lodash.sortby')
var SortedSet = require('collections/sorted-set')
var List = require('collections/list')
var ColSet = require('collections/set')

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

    function Cluster(elements, position) {
        this.elements = elements;
        this.position = position;
        this.edges = [];
    }
    Cluster.prototype.removeLinksToCluster = function( c ) {
        this.edges = this.edges.filter( function( e ) { return !e.mentions(c) } )
    };

    var edgeIndex = 0;
    function Edge(from, to, distance) {
        this.from = from;
        this.to = to;
        this.distance = distance;
        this.edgeIndex = ++edgeIndex;
    }
    Edge.prototype.oppositeSideTo = function( node ) {
        return this.to == node? this.from: this.to;
    };
    Edge.prototype.mentions = function( node ) {
        return this.from == node || this.to == node;
    };

    /**
     * @param {T} data the data to be clustered - can be any type
     * @param {Number} the minimumDistance distance two clusters may be
     */
    return function(data, minimumDistanceAllowedBetweenClusters) {

        var shortEdges = edgesSet();
        var clusters = clustersList();

        data.forEach( function( datumI ) {

            var clusterI = new Cluster([datumI], position(datumI));

            findShortEdgesFrom( clusterI, clusters );
            clusters.push( clusterI );
        });

        while( shortEdges.length > 0 ) {

            var shortestEdge = shortEdges.shift();

            conjoinClusters(shortestEdge.from, shortestEdge.to);
        }

        function findShortEdgesFrom( subjectCluster, clustersToSearchIn ) {
            clustersToSearchIn.forEach( function( otherCluster ) {
                return compareClusters( subjectCluster, otherCluster)
            });
        }

        function compareClusters(clusterA, clusterB) {
            var distanceBetweenElements = distance(
                clusterA.position,
                clusterB.position
            );

            if( distanceBetweenElements < minimumDistanceAllowedBetweenClusters ) {

                var edge = new Edge(clusterA, clusterB, distanceBetweenElements);

                shortEdges.push( edge );
                clusterA.edges.push( edge );
                clusterB.edges.push( edge );
            }
        }

        function deleteCluster(c) {
            shortEdges.deleteEach( c.edges );
            clusters.delete(c);

            // remove links back to this one
            c.edges.forEach( function( e ) {
                return e.oppositeSideTo(c).removeLinksToCluster(c)
            });
        }

        function conjoinClusters(clusterA, clusterB) {

            var elementsFromBothClusters = clusterA.elements.concat( clusterB.elements );
            var newCluster = new Cluster(
                elementsFromBothClusters,
                mergePositions(elementsFromBothClusters.map(position))
            );

            deleteCluster(clusterA);
            deleteCluster(clusterB);

            var clustersToScanForNewEdges = new ColSet( null, referenceEquality );

            function considerEdgesFrom( thisCluster, ignoreCluster ) {
                thisCluster.edges.forEach( function( edgeFromThisCluster ) {
                    var clusterAtOtherEndOfEdge = edgeFromThisCluster.oppositeSideTo(thisCluster);

                    if( clusterAtOtherEndOfEdge != ignoreCluster ) {
                        clustersToScanForNewEdges.add( clusterAtOtherEndOfEdge )
                    }
                });
            }

            considerEdgesFrom(clusterA, clusterB);
            considerEdgesFrom(clusterB, clusterA);

            findShortEdgesFrom( newCluster, clustersToScanForNewEdges );

            clusters.push(newCluster);
        }

        // clean up data that we don't need to be exported and convert into standard arrays:
        var clustersArray = clusters.toArray()
        clustersArray.forEach( function( c ) {
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