'use strict';

var utilInspect = require('util-inspect');

/** produces a colourful string description of a DOM element for
 *  reporting in unit tests
 */
module.exports = function describeElement(ele, depth) {
    depth = depth || 1;

    return ('<' + ele.tagName + '>').cyan +
        (ele.getAttribute('id') ? '#' + ele.getAttribute('id') : '').red +
        (ele.getAttribute('class') ? '.' + ele.getAttribute('class').split(' ').join('.') : '').yellow +
        (ele.__data__ ?
            ' data: ' +  utilInspect(ele.__data__, {colors: true, depth: depth-1}) :
                ''
        );
};