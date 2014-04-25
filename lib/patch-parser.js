/* jshint node: true */
var extend = require('extend');

function Parser(patch) {
    // patch may be passed immediately when calling without new
    if ( ! (this instanceof Parser)) {
        return (new Parser()).parse(patch);
    }
    this._patch = null;
    this._parsedPatch = null;

    this.__defineGetter__('patch', function () {
        return this._parsedPatch;
    });

    return this;
}

Parser.prototype.parse = function (patch) {
    var _chunk = {},
        self = this,
        pushChunk = function(chunk) {
            /* jshint camelcase: false */
            var changeCount;

            if (chunk.before_line_count || chunk.after_line_count) {
                if (chunk.before_line_count && chunk.after_line_count &&
                        chunk.before_line_count !== chunk.after_line_count) {
                    changeCount = Math.min(chunk.before_line_count, chunk.after_line_count);

                    self._parsedPatch.push({
                        before_line_number: chunk.before_line_number,
                        before_line_count: changeCount,
                        after_line_number: chunk.after_line_number,
                        after_line_count: changeCount
                    });

                    chunk.before_line_number += changeCount;
                    chunk.before_line_count -= changeCount;
                    chunk.after_line_number += changeCount;
                    chunk.after_line_count -= changeCount;
                }

                self._parsedPatch.push(extend({}, chunk));
            }
        };

    if (typeof patch !== 'string') {
        throw new TypeError('`patch` should be string');
    }

    this._patch = patch;
    this._parsedPatch = [];
    var _parsedPatch = this._patch.split('\n');
    if (_parsedPatch.length > 1) {
        _parsedPatch.forEach(function (line) {
            /* jshint camelcase: false */
            var chunkDescr = line.match(/^@@ -(\d+),(\d+) \+(\d+),(\d+) @@/);
            if (chunkDescr && chunkDescr.length === 5) {
                if (_chunk.before_line_count && _chunk.after_line_count) {
                    pushChunk(_chunk);
                }
                _chunk = {
                    before_line_number: parseInt(chunkDescr[1], 10) - 1,
                    before_line_count: 0,
                    after_line_number: parseInt(chunkDescr[3], 10) - 1,
                    after_line_count: 0
                };
            } else if (/^\+/.test(line)) {
                _chunk.after_line_count += 1;
            } else if (/^-/.test(line)) {
                _chunk.before_line_count += 1;
            } else if (_chunk.before_line_count === 0 && _chunk.after_line_count === 0) { // intro lines
                _chunk.before_line_number += 1;
                _chunk.after_line_number += 1;
            } else { // chunk split or outro
                pushChunk(_chunk);
                _chunk.before_line_number += _chunk.before_line_count + 1;
                _chunk.before_line_count = 0;
                _chunk.after_line_number += _chunk.after_line_count + 1;
                _chunk.after_line_count = 0;
            }
        });
    }

    return this;
};

module.exports = Parser;
