'use strict';

require('colors');
var describeElement = require('./describeElement.js');

/**
 *  a utility for describing a d3 selection, for output in
 *  unit test error messages
 */
module.exports = function describeSelection(sel, depth) {
    depth = depth || 1;

    var descriptions = [];

    sel.each(function() {

        descriptions.push(describeElement(this, depth));
    });

    return '['.grey + descriptions.join(' ') + ']'.grey;
};