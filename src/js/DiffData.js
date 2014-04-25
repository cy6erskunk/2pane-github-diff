/**
 * @typedef {lineObject}
 *
 * @property {int} [number] - lineNumber
 * @property {string} [text] - line of code
 * @property {lineType} [type] - any of DiffData#types
 */

/**
 * @class DiffData
 *
 * @method getLines
 * @method getNthDiffFirstLineNumber
 * @method getLinesCount
 *
 */

function DiffData(before, after, diffModel) {
    if (! this instanceof DiffData) {
        return new DiffData(before, after, diffModel);
    }

    this.diffModel = diffModel;
    this
        ._initDiffData(before, after)
        ._setDiffStartLines();

    return this;
}

var dataProto = DiffData.prototype;

dataProto.types = {
    ADD_LEFT: '+_',
    ADD_RIGHT: '_+',
    REMOVE_LEFT: '-_',
    REMOVE_RIGHT: '_-',
    CHANGE: '#'
};

/**
 * returns up to `count` lines of code
 * @param  {int} start - becomes 0 if not an int or < 0
 * @param  {int} [count]
 * @return {lineObject[]}
 */
dataProto.getLines = function (start, count) {
    var end = this.length,
        result;

    start = parseInt(start, 10) || 0;
    if (start < 0) {
        start = 0;
    }

    if (count) {
        end = Math.min(start + count, this.length);
    }

    result = {
        before: this.before.slice(start, end),
        after: this.after.slice(start, end),
    };

    if (result.before.length !== result.after.length) {
        throw new Error('DiffData#getLines returned different number of lines');
    }

    result.length = result.before.length;

    return result;
};

/**
 * @param  {int} [diffIndex = 0] - zero-based diff index
 *
 * @return {int|null}
 */
dataProto.getNthDiffFirstLineNumber = function (diffIndex) {
    /* jshint camelcase: false */
    diffIndex = parseInt(diffIndex, 10) || 0;

    if (typeof this._diffStartLines[diffIndex] === 'undefined') {
        return null;
    }

    return this._diffStartLines[diffIndex];
};

dataProto.getLinesCount = function () {
    return this.length;
};

dataProto._initDiffData = function (before, after) {
    var self = this,
        _processData = function(data, isRight) {
            var _diffModel = self.diffModel.slice(),
                _specialLines = {
                    type: null,
                    lines: 0
                },
                diff = _diffModel.shift(),
                _addSpecialLines = function (type, count) {
                    var specialLines = [];

                    for (var i = 0; i < count; i += 1) {
                        specialLines.push({
                            type: type
                        });
                    }

                    return specialLines;
                };

            return data.reduce(function (head, currentValue, index) {
                /* jshint camelcase: false */
                var lineNumber = index,
                    type = null;

                if (isRight) {
                    while(diff && (lineNumber > diff.after_line_number)) {
                        diff = _diffModel.shift();
                    }
                } else {
                    while(diff && (lineNumber > diff.before_line_number)) {
                        diff = _diffModel.shift();
                    }
                }

                if (diff) {
                    if (isRight) {
                        if (diff.after_line_number === lineNumber) {
                            // добавление
                            if (! diff.before_line_count) {
                                _specialLines.lines = diff.after_line_count;
                                _specialLines.type = self.types.ADD_RIGHT;
                            // удаление
                            } else if (! diff.after_line_count) {
                                head = head.concat(_addSpecialLines(self.types.REMOVE_RIGHT, diff.before_line_count));
                            // изменение
                            } else if (diff.before_line_count) {
                                _specialLines.lines = diff.after_line_count;
                                _specialLines.type = self.types.CHANGE;

                            }
                        }
                    } else {
                        if (diff.before_line_number === lineNumber) {
                            // добавление
                            if (! diff.before_line_count) {
                                head = head.concat(_addSpecialLines(self.types.ADD_LEFT, diff.after_line_count));
                            // удаление
                            } else if (! diff.after_line_count) {
                                _specialLines.lines = diff.before_line_count;
                                _specialLines.type = self.types.REMOVE_LEFT;
                            // изменение
                            } else if (diff.after_line_count) {
                                _specialLines.lines = diff.before_line_count;
                                _specialLines.type = self.types.CHANGE;
                            }
                        }
                    }
                }

                if (_specialLines && _specialLines.lines && ! type) {
                    type = _specialLines.type;
                    _specialLines.lines -= 1;
                }

                head.push({
                    number: lineNumber,
                    text: currentValue,
                    type: type
                });

                return head;
            }, []);
        };

    this.before = _processData(before);
    this.after = _processData(after, true);

    if (this.before.length !== this.after.length) {
        throw new Error('#before and #after have different lengths!');
    }

    this.length = this.before.length;

    return this;
};

dataProto._setDiffStartLines = function () {
    var startLines = [],
        addition = 0;

    this.diffModel.forEach(function(diff) {
        /* jshint camelcase: false */
        startLines.push(diff.before_line_number + addition);
        if ( !diff.before_line_count) {
            addition += Math.max(diff.before_line_count, diff.after_line_count);
        }
    });

    this._diffStartLines = startLines;

    return this;
};
