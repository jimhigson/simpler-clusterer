'use strict';

var isObject = require('lodash.isobject');
var isDate = require('lodash.isdate');
var isArray = require('lodash.isarray');
var isNumber = require('lodash.isnumber');
var isNan = require('lodash.isnan');
var includes = require('lodash.includes');
var contains = require('lodash.contains');
var reduce = require('lodash.reduce');
var inspect = require('./inspect.js');
var _ = require('lodash');
require('colors');

var NOT_FOUND = {};
var success = {pass: true, message: ''};

function failure(message) {
    return {
        pass: false,
        message: message
    };
}

/**
 * @param successMessage - a message to include if the test passes to describe the test.
 * This is only used by jasmine if the test has been negated.
 */
function eitherPasses(resultA, resultB, successMessage, failureMessage) {
    var result = {
        pass: resultA.pass || resultB.pass
    };

    if( result.pass && successMessage ) {
        result.message = successMessage;
    }

    if( !result.pass && failureMessage ) {
        result.message = failureMessage;
    }

    return result;
}

/**
 * @param successMessage - a message to include if the test passes to describe the test.
 * This is only used by jasmine if the test has been negated.
 */
function bothPasses(resultA, resultB, successMessage, failureMessage) {
    var result = {
        pass: resultA.pass && resultB.pass
    };

    if( result.pass && successMessage ) {
        result.message = successMessage;
    }

    if( !result.pass && failureMessage ) {
        result.message = failureMessage;
    }

    return result;
}

bothPasses.unitValue = success;
eitherPasses.unitValue = failure();

function reduceTree(value, transform, combine, ignoreKeys) {

    ignoreKeys = ignoreKeys || [];

    // circular references are not entered. For this, we track all branches seen
    // so far and refuse to visit the same branch twice
    var branchesSeen = [];

    // we take advantage of object identity, so that this special value representing
    // a circular or ignored reference is inequal to all other values.
    var CIRCULAR_REFERENCE = {};
    var IGNORED_REFERENCE = {};

    return _reduceTree(value, []);

    function _reduceTree(value, path) {

        var isBranch = isObject(value) && !isDate(value);
        var recursiveResults;

        if( isBranch ) {

            branchesSeen.push(value);

            // get the results for each child node in the tree
            var usedIndices = [];
            recursiveResults =
                _(value)
                    .map(function(childValue, childKey) {
                        var childPath;

                        var isCircular = includes(branchesSeen, childValue);
                        if(isCircular) {
                            return CIRCULAR_REFERENCE;
                        }

                        var isIgnored = includes(ignoreKeys, childKey);
                        if( isIgnored ) {
                            return IGNORED_REFERENCE;
                        }

                        if(isArray(value) && value.__orderInsensitive) {
                            for(var i = 0; i < value.length; i++) {
                                if(contains(usedIndices, i)) {
                                    continue;
                                }

                                childPath = path.concat(i);
                                var hitAtIndex = _reduceTree(childValue, childPath);

                                if( hitAtIndex.pass ) {
                                    usedIndices.push(i);
                                    return hitAtIndex;
                                }
                            }
                            return failure(
                                'did not satisfy all elements of ' +
                                'order-insensitive array' + inspect(value)
                            );
                        } else {
                            childPath = path.concat(childKey);
                            return _reduceTree(childValue, childPath);
                        }
                    })
                    .filter(function(v) {

                        // ignore any circular references by filtering them out
                        return !(v === CIRCULAR_REFERENCE || v === IGNORED_REFERENCE);
                    })
                    .value();

            // combine those results into a single composite result
            return reduce(recursiveResults, combine, transform(value, path));

        } else {
            return transform(value, path);
        }
    }
}

function pickAt(obj, path) {

    return reduce(path, function(soFar, nextPathElement){

        if( !isObject(soFar) || soFar === NOT_FOUND || !soFar.hasOwnProperty(nextPathElement) ) {
            return NOT_FOUND;
        }

        return soFar[nextPathElement];
    }, obj);

}

function toRecursivelyContain(util, customEqualityTesters) {

    return {
        compare: function (actualObject, expectedContents) {

            function describePath(path) {
                if(path.length == 0) {
                    return inspect('root of expected');
                }

                return inspect('(root)' + path.map(function(p){
                        if(isNumber(p)) {

                            return '[' + p + ']';

                        } else {

                            if(isNaN(parseInt(p))){
                                return '.' + p;
                            } else {
                                return '["' + p + '"]';
                            }

                        }
                    }).join(''));
            }

            function testArray(actual, expected, path) {
                if( !isArray( actual ) ) {

                    return failure(
                        'expected ' + 'Array'.cyan + ' at ' +
                        describePath(path) +
                        ' but got ' +
                        ((actual && actual.constructor && actual.constructor.name) || actual)
                    );
                }

                if( expected.length != actual.length ) {
                    return failure(
                        'expected ' + 'Array'.cyan + ' at ' + describePath(path) +
                        ' to be of length ' + inspect(expected.length) + ' but is ' +
                        inspect(actual.length)
                    );
                }
            }

            function testObject(actual, expected, path) {
                if( !isObject( actual ) ) {
                    return failure('expected ' + 'Object'.cyan + ' at ' + describePath(path));
                }
            }

            function testScalar(actual, expected, path) {
                var equal = util.equals(actual, expected, customEqualityTesters);
                if(!equal) {
                    return failure(
                        'expected ' + inspect(expected) +
                        ' at ' + describePath(path) +
                        ' but got ' + inspect(actual)
                    );
                }
            }

            var result = reduceTree(
                expectedContents,
                function testNode(expectedNode, expectedNodePath ){

                    var actualNode = pickAt(actualObject, expectedNodePath);

                    if( actualNode === NOT_FOUND ) {
                        return failure('has nothing at path ' + describePath(expectedNodePath));
                    }

                    var isPlainObject = isObject(expectedNode) && !isDate(expectedNode) && !isArray(expectedNode);
                    var test;

                    if(isPlainObject) {
                        test = testObject;
                    } else if (isArray(expectedNode)) {
                        test = testArray;
                    } else {
                        test = testScalar;
                    }

                    var testAndReportNode = function() {
                        var result = test(actualNode, expectedNode, expectedNodePath);
                        if( result ) {
                            result.message += ' in ' + inspect(actualObject);
                        }
                        return result;
                    };

                    return testAndReportNode() || success;
                },
                function combineResults(resultA, resultB){
                    return {
                        pass: resultA.pass && resultB.pass,
                        message: (resultA.message || resultB.message)
                    };
                }
            );

            if( result.message ) {
                result.message =
                    'actual result:'.blue + inspect(actualObject) +
                    '\ndid not conatain: '.blue +
                    inspect(expectedContents) +'\nbecause: '.blue + result.message;
            }
            /*
            result.message =
                'expected '.blue + inspect( actualObject ) +
                ' to contain '.blue + inspect( expectedContents ) +
                ' ' + result.message; */

            return result;

        }
    };
}

function parseConditions(args) {
    var expectedContents;
    var combination;
    var ignoring;
    var firstArg = args[0];

    if( firstArg.allOf ) {
        expectedContents = firstArg.allOf;
        combination = bothPasses;
        ignoring = firstArg.ignoring || [];
    } else if( firstArg.anyOf ) {
        expectedContents = firstArg.anyOf;
        combination = eitherPasses;
        ignoring = firstArg.ignoring || [];
    } else {
        expectedContents = args;
        combination = bothPasses;
        ignoring = [];
    }

    return {
        expectedContents: expectedContents,
        combination: combination,
        ignoring: ignoring
    };
}

function toContainAnywhere(util, customEqualityTesters) {
    var containsMatcher = toRecursivelyContain(util, customEqualityTesters).compare;

    return {
        compare: function (actualObject /*, expectedContents1 , expectedContents2, expectedContents3... */) {

            var conditions = parseConditions(toArray(arguments).slice(1));

            return reduce( conditions.expectedContents, function(acc, expectedContent) {

                var contentResult = reduceTree(
                    actualObject,

                    function testNode(actualNode, _path ) {
                        return containsMatcher(actualNode, expectedContent);
                    },
                    eitherPasses,
                    conditions.ignoring
                );

                return conditions.combination(
                    acc, contentResult,
                    'found ' + inspect(expectedContent) + '\nin\n' + inspect(actualObject),
                    'did not find ' + inspect(expectedContent) + '\nin\n' + inspect(actualObject)
                );
            }, conditions.combination.unitValue);
        }
    }
}

function toBeAnInstanceOf(util, customEqualityTesters) {

    return {
        compare: function(actual, expectedType) {

            // 'string' instanceof String returns false - it is unlikely anybody wants to make
            // this distinction in their tests so special case strings:
            var stringMatch = (typeof actual === 'string') && (expectedType === String);
            return {
                pass: stringMatch || (actual instanceof expectedType),
                message: 'Expected ' + actual + ' to be an instance of ' + expectedType
            };
        }
    };
}

module.exports = {
    toRecursivelyContain: toRecursivelyContain,

    toBeAnInstanceOf: toBeAnInstanceOf,

    toContainAnywhere: toContainAnywhere,

    toApproximatelyEqual: function() {
        return {
            compare: function(actual, expected, allowance){

                return {
                    pass: Math.abs(actual - expected) < allowance,
                    message: 'expected ' + actual + ' to be within ' + allowance + ' of ' + expected +
                    ' but was ' + Math.abs(actual - expected) + ' away'
                };
            }
        };
    },

    decorateArraysDuringTestRuns: function() {
        beforeEach(function(){
            Array.prototype.inAnyOrder = function(){
                this.__orderInsensitive = true;
                return this;
            };
        });
        afterEach(function(){
            delete Array.prototype.inAnyOrder;
        });
    }

};