'use strict';

require('colors');
var merge = require('lodash.merge');
var utilInspectOptions = {colors: true, depth: 3};
var utilInspect = require('util-inspect');

var inspect = function(thing, options) {
    var mergedOptions = merge(utilInspectOptions, options);
    return utilInspect(thing, mergedOptions);
};
var describeElement = require('./describeElement.js');
var describeSelection = require('./describeSelection.js');

inspect.decorateNativeTypesWhileTestsAreRunning = function () {
    beforeEach(function() {
        // Make some native types easlier to read in Node.inspect error messages.
        // See https://nodejs.org/api/util.html#util_custom_inspect_function_on_objects

        Date.prototype.inspect = function(_depth){
            return 'Date: ' + ('' + this).cyan;
        };
        Element.prototype.inspect = function(depth) {
            return 'Element: ' + describeElement(this, depth);
        };
    });
    afterEach(function() {
        // clean up after ourselves
        delete Date.prototype.inspect;
        delete Element.prototype.inspect;
    });
};

module.exports = inspect;