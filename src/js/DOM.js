/* jshint unused: false */
var DOM = {
    addClassToNode: function (node, className) {
        if (node && className) {
            if (node.classList) {
                node.classList.add(className);
            } else if ( ! (new RegExp('(^| +)' + className +'( +|$)')).test(node.className)) {
                node.className += (node.className.length ? ' ' : '') + className;
            }
        }

        return this;
    },

    addTextContent: function(node, text) {
        node['textContent' in document.body ? 'textContent' : 'innerText'] = text;

        return this;
    },

    bindEvent: function (node, evt, fn) {
        if (node.addEventListener) {
            node.addEventListener(evt, fn, false);
        } else if (node.attachEvent) {
            node.attachEvent('on' + evt, fn);
        }

        return this;
    },

    getHead: function () {
        if ( ! this._head) {
            this._head = document.head || document.getElementsByTagName('head')[0];
        }

        return this._head;
    },

    target: function(eventObj) {
        return eventObj.target || eventObj.srcElement;
    }
};
