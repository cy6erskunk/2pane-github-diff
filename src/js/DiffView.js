/* global DOM: false */
/**
 * @class DiffView
 *
 * @method init
 *
 * @method displayPanels
 * @method clearPanels
 * @method addLineToTarget
 * @method scroll
 *
 * @method _processOptions
 * @method _hideLoader
 * @method _determineLineHeight
 * @method _getPanels
 * @method _setLinesCount
 * @method _setNumbersWidth
 * @method _bindHandlers
 * @method _addCodeToTarget
 * @method _removeLines
 * @method _scrollUp
 * @method _scrollDown
 * @method _scrollToFirstLine
 * @method _positionPseudoScroll
 * @method _addOverView
 *
 **/

function DiffView(diffData) {
    if (! this instanceof DiffView) {
        return new DiffView(diffData);
    }

    this.diffData = diffData;
}

/*
/---start of loaded data----\
                             \
                              ===> hiddenLines.before
                             /
----start of visible area---/=\==> firstLine
                               \
                                => linesInPanel
                               /
----end of visible area-----\-/
                             \
                              ===> hiddenLines.after
                             /
\---end of loaded data------/
*/

var viewProto = DiffView.prototype;

viewProto.init = function (options) {
    return this
        ._processOptions(options)
        ._hideLoader()
        ._determineLineHeight()
        ._setNumbersWidth()
        ._getPanels()
        ._setLinesCount()
        ._bindHandlers()
        ._addOverview();
};

viewProto._processOptions = function (options) {
    var o = {
        loaderSelector: '.loader-wrapper',
        panelSelector: '.wrapper',
        leftPanelSelector: '.wrapper_left',
        rightPanelSelector: '.wrapper_right',
        lineWrapper: {
            cls: 'line-wrapper',
            tag: 'div'
        },
        lineNumber: {
            cls: 'line-number',
            tag: 'span'
        },
        lineText: {
            cls: 'line-text',
            tag: 'span'
        },
        diffAddClass: 'green',
        diffDelClass: 'red',
        diffChangeClass: 'yellow',
        MIN_HIDDEN_LINES_COUNT: 200,
        overviewSelector: '.overview',
        overviewChild: {
            cls: 'overview__diff',
            height: 10
        },
        pseudoScrollSelector: '.overview-wrapper .position'
    };

    if (options) {
        Object.keys(o).forEach(function (name) {
            if (options.hasOwnProperty(name)) {
                o[name] = options[name];
            }
        });
    }

    this.o = o;

    return this;
};

/**
 * @param {int} [firstLine] - first visible line in panel
 *                          (in case when there's not enough lines to fill the panel
 *                           it may be decreased)
 */
viewProto.displayPanels = function (firstLine) {
    var totalLineNumber = this.diffData.getLinesCount(),
        dataSlices;

    this.firstLine = typeof firstLine !== 'undefined'?
        // check if first line is not greater then total number of lines
        Math.min(parseInt(firstLine, 10) || 0, totalLineNumber) :
        this.firstLine;
    // make sure that last visible line is not greater than total number of lines
    if (this.firstLine + this.linesInPanel > totalLineNumber) {
        this.firstLine = totalLineNumber - this.linesInPanel + 1;
    }

    this.hiddenLines.before = Math.min(this.firstLine - 1, this.hiddenLines.max);
    this.hiddenLines.after = Math.min(totalLineNumber - (this.firstLine + this.linesInPanel - 1), this.hiddenLines.max);

    this.lineCount = this.linesInPanel + this.hiddenLines.before + this.hiddenLines.after;

    dataSlices = this.diffData.getLines(this.firstLine - this.hiddenLines.before - 1, this.lineCount);
    this.stopScrolling = false;
    this._addCodeToTarget(dataSlices.before, this.leftPanel);
    this._addCodeToTarget(dataSlices.after, this.rightPanel);

    this._scrollToFirstLine();
    this._positionPseudoScroll(this.firstLine);

    return this;
};

viewProto.clearPanels = function () {
    this.leftPanel.innerHTML = this.rightPanel.innerHTML = '';
    this.stopScrolling = true;

    return this;
};

/**
 * adds line of code to target Node
 * @param {Node} target
 * @param {lineObject} lineObject - lineObject described in DiffData
 */
viewProto.addLineToTarget = function (target, lineObject) {
    var lineElem = document.createElement(this.o.lineWrapper.tag),
        numberElem = document.createElement(this.o.lineNumber.tag),
        textElem = document.createElement(this.o.lineText.tag),
        _class, _number, _text,
        _addLine = function () {
            DOM.addClassToNode(lineElem, _class);
            DOM.addTextContent(numberElem, _number || lineObject.number);
            DOM.addTextContent(textElem, _text || lineObject.text || ' ');
        };

    DOM.addClassToNode(lineElem, this.o.lineWrapper.cls);
    DOM.addClassToNode(numberElem, this.o.lineNumber.cls);
    DOM.addClassToNode(textElem, this.o.lineText.cls);

    switch (lineObject.type) {
    case this.diffData.types.ADD_LEFT:
        _class = this.o.diffAddClass;
        _number = '+';
        break;
    case this.diffData.types.ADD_RIGHT:
        _class = this.o.diffAddClass;
        break;
    case this.diffData.types.REMOVE_RIGHT:
        _class = this.o.diffDelClass;
        _number = '-';
        break;
    case this.diffData.types.REMOVE_LEFT:
        _class = this.o.diffDelClass;
        break;
    case this.diffData.types.CHANGE:
        _class = this.o.diffChangeClass;
        break;
    }

    _addLine();

    lineElem.appendChild(numberElem);
    lineElem.appendChild(textElem);

    target.appendChild(lineElem);

    return this;
};

viewProto.scroll = function (lineNumber) {
    if (lineNumber < this.firstLine - this.hiddenLines.before / 2 &&
            this.hiddenLines.before >= this.hiddenLines.max) {
        this._scrollUp(lineNumber);
    } else if (lineNumber > this.firstLine + (this.linesInPanel + this.hiddenLines.after)/ 2 &&
            this.hiddenLines.after >= this.hiddenLines.max) {
        this._scrollDown(lineNumber);
    }

    return this;
};

viewProto._hideLoader = function () {
    document.querySelector(this.o.loaderSelector).style.display = 'none';

    return this;
};

viewProto._determineLineHeight = function () {
    var testLineWrapper = document.createElement(this.o.lineWrapper.tag),
        rect;

    testLineWrapper.style.position = 'absolute';
    testLineWrapper.style.left = '-9999px';

    this.addLineToTarget(testLineWrapper, { text: 'TEST', number: 1});
    document.body.appendChild(testLineWrapper);

    // @TODO take into account margins
    rect = testLineWrapper.firstChild.getBoundingClientRect();
    this.lineHeight = rect.height || (rect.bottom - rect.top);
    document.body.removeChild(testLineWrapper);

    return this;
};

viewProto._getPanels = function () {
    this.panels = document.querySelectorAll(this.o.panelSelector);
    this.leftPanel = document.querySelector(this.o.leftPanelSelector);
    this.rightPanel = document.querySelector(this.o.rightPanelSelector);

    return this;
};

viewProto._setLinesCount = function () {
    // @TODO paddings?
    var panelHeight = this.leftPanel.clientHeight;
    this.linesInPanel = Math.ceil(panelHeight / this.lineHeight);

    this.hiddenLines = {
        max: Math.max(this.o.MIN_HIDDEN_LINES_COUNT, 2 * this.linesInPanel)
    };
    this.hiddenLines.before = this.hiddenLines.after = this.hiddenLines.max;

    this.lineCount = this.linesInPanel + this.hiddenLines.before + this.hiddenLines.after;

    this.firstLine = 0;

    return this;
};

viewProto._setNumbersWidth = function () {
    var styleElem = document.createElement('style'),
        css = '.' + this.o.lineNumber.cls + '{width:' + (this.diffData.getLinesCount() + '').length + 'em;}';

    styleElem.setAttribute('type', 'text/css');

    if (styleElem.styleSheet) { // IE
        styleElem.styleSheet.cssText = css;
    } else {
        styleElem.appendChild(document.createTextNode(css));
    }

    DOM.getHead().appendChild(styleElem);

    return this;
};

viewProto._addCodeToTarget = function (data, target, prepend) {
    var _docFrag = document.createDocumentFragment(),
        self = this;

    data.forEach(function(v) {
        self.addLineToTarget(_docFrag, v);
    });

    if (prepend) {
        target.insertBefore(_docFrag, target.firstChild);
    } else {
        target.appendChild(_docFrag);
    }

    return this;
};

viewProto._removeLines = function(type, count) {
    [this.leftPanel, this.rightPanel].forEach(function (parent) {
        for (var i = 0; i < count; i += 1) {
            if (parent[type + 'Child']) {
                parent.removeChild(parent[type + 'Child']);
            }
        }
    });

    return this;
};

viewProto._scrollUp = function(lineNumber) {
    var linesToReceive = Math.abs(this.firstLine - lineNumber),
        dataSlices = this.diffData.getLines(lineNumber - this.hiddenLines.before, linesToReceive),
        linesReceived = dataSlices.length,
        linesToRemove = linesReceived,
        delta;

    if (lineNumber < this.hiddenLines.before) {
        this.hiddenLines.before = lineNumber;
    }

    if (this.hiddenLines.after < this.hiddenLines.max) {
        delta = this.hiddenLines.max - this.hiddenLines.after;
        this.hiddenLines.after += Math.min(delta, linesToRemove);
        linesToRemove -= Math.min(delta, linesToRemove);
    }

    this._removeLines('last', linesToRemove);
    this._addCodeToTarget(dataSlices.before, this.leftPanel, true);
    this._addCodeToTarget(dataSlices.after, this.rightPanel, true);

    this.firstLine = lineNumber;

    this.hiddenLines.before -= linesToReceive - linesReceived;

    this._scrollToFirstLine();

    return this;
};

viewProto._scrollDown = function (lineNumber) {
    var linesToReceive = Math.abs(this.firstLine - lineNumber),
        dataSlices = this.diffData.getLines(this.firstLine + this.linesInPanel + this.hiddenLines.after, linesToReceive),
        linesReceived = dataSlices.length,
        linesToRemove = linesReceived,
        delta;

    if (this.hiddenLines.before < this.hiddenLines.max) {
        delta = this.hiddenLines.max - this.hiddenLines.before;
        this.hiddenLines.before += Math.min(delta, linesToRemove);
        linesToRemove -= Math.min(delta, linesToRemove);
    }

    this._removeLines('first', linesToRemove);
    this._addCodeToTarget(dataSlices.before, this.leftPanel);
    this._addCodeToTarget(dataSlices.after, this.rightPanel);

    this.firstLine = lineNumber;

    this.hiddenLines.after -= linesToReceive - linesReceived;

    this._scrollToFirstLine();

    return this;
};

viewProto._bindHandlers = function () {
    var self = this;

    DOM.bindEvent(this.leftPanel, 'scroll', function (e) {
        var currentLineNumber = self.firstLine - self.hiddenLines.before + Math.floor(DOM.target(e).scrollTop / self.lineHeight);

        if ( ! self.stopScrolling) {
            self.scroll(currentLineNumber);

            self.rightPanel.scrollTop = DOM.target(e).scrollTop;
            self.rightPanel.scrollLeft = DOM.target(e).scrollLeft;
        }

        self._positionPseudoScroll(currentLineNumber);
    });

    DOM.bindEvent(this.rightPanel, 'scroll', function (e) {
        if ( ! self.stopScrolling) {
            self.leftPanel.scrollTop = DOM.target(e).scrollTop;
            self.leftPanel.scrollLeft = DOM.target(e).scrollLeft;
        }
    });

    return this;
};

/**
 * scrolls to this.firstLine
 */
viewProto._scrollToFirstLine = function () {
    this.leftPanel.scrollTop = (this.hiddenLines.before + 1) * this.lineHeight;
    // TODO: update linesInPanel on resize
    return this;
};

viewProto._positionPseudoScroll = function (currentLineNumber) {
    var pseudoScrollElem = document.querySelector(this.o.pseudoScrollSelector),
        overviewHeight = (document.querySelector(this.o.overviewSelector)).clientHeight;

    // minimal height of pseudoScrollElem = 10px
    pseudoScrollElem.style.top = (Math.floor(currentLineNumber / this.diffData.getLinesCount() * overviewHeight) - 5) + 'px';
    pseudoScrollElem.style.height = (Math.max(10, Math.floor(this.leftPanel.clientHeight / this.leftPanel.scrollHeight * overviewHeight)) )+ 'px';

    return this;
};

viewProto._addOverview = function () {
    var self = this,
        overviewElem = document.querySelector(this.o.overviewSelector),
        reducedLength =  this.diffData.getLinesCount() / overviewElem.clientHeight,
        dataAttr = 'data-diff';

    this.diffData.diffModel.map(function (diff) {
        /* jshint camelcase: false */
        var color = diff.before_line_count && diff.after_line_count ? 'yellow' :
                diff.before_line_count && !diff.after_line_count ? 'red' : 'green';

        return {
            color: color,
            lineNumber: diff.before_line_number,
            top: Math.floor(Math.min(diff.before_line_number, diff.after_line_number) / reducedLength)
        };
    }).forEach(function (diff, index, array) {
        var elem = document.createElement('diff');

        DOM.addClassToNode(elem, self.o.overviewChild.cls);
        elem.setAttribute(dataAttr, index);

        elem.style.top = diff.top + 'px';
        if (array[index - 1] && diff.top - array[index - 1].top < self.o.overviewChild.height) {
            diff.top += self.o.overviewChild.height - diff.top + array[index - 1].top;
            elem.style.top = diff.top + 'px';
        }

        elem.style.backgroundColor = diff.color;

        overviewElem.appendChild(elem);
    });


    DOM.bindEvent(overviewElem, 'click', function (e) {
        var target = DOM.target(e);

        if (target.getAttribute('data-diff')) {
            self
                .clearPanels()
                .displayPanels(self.diffData.getNthDiffFirstLineNumber(target.getAttribute(dataAttr)));
        }
    });
};
