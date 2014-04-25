var Parser = require('../lib/patch-parser'),
    expect = require('chai').expect,
    sinon = require('sinon'),
    sinonChai = require('sinon-chai'),
    parser;

describe('Parser', function () {
    describe('instance', function () {
        it('can be instantiated using "new"', function () {
            parser = new Parser();
            expect(parser).to.be.instanceof(Parser);
        });
        it('does not call parse when instantiated with "new"', function () {
            var s = sinon.spy(Parser.prototype, 'parse');
            
            parser = new Parser('');
            expect(s.called).to.be.false;
            Parser.prototype.parse.restore();
        });

        it('can be instantiated without "new"', function () {
            parser = Parser('');
            expect(parser).to.be.instanceof(Parser);
        });
        it('calls parse when instantiated without "new"', function () {
            var s = sinon.spy(Parser.prototype, 'parse');

            parser = Parser('');
            expect(s.calledOnce).to.be.true;
            Parser.prototype.parse.restore();
        });
    });

    describe('#patch getter', function () {
        it('is not inited (null) if #parse has not been called', function () {
            parser = new Parser(); // calling with new does not execute #parse
            expect(parser.patch).to.be.null;
        });
        it('is array if have been inited', function () {
            parser = Parser('');
            expect(parser.patch).to.be.instanceof(Array);
        });
    });

    describe('parse', function () {
        it('throws error when no patch have been passed', function () {
            expect(Parser).to.throw(TypeError, '`patch` should be string');
        });
        it('sets #patch to an array', function () {
            parser = Parser("@@ -66,9 +66,10 @@\n     }\n \n     function addDisconnectButton() {\n-        var button = document.createElement('div');\n+        var button = document.createElement('div'),\n+            initialOpacity = 0.2;\n \n-        button.className = 'changeUpdateStatus';\n+        button.className = 'connectButton';\n         button.innerHTML = 'Disconnect';\n         button.style.position = 'fixed';\n         button.style.left = '50px';\n@@ -76,6 +77,8 @@\n         button.style.zIndex = 100000;\n         button.style.padding = '0.2em';\n         button.style.border = '1px solid black';\n+        button.style.borderRadius = '5px';\n+        button.style.opacity = initialOpacity;\n         button.style.backgroundColor = 'white';\n         document.body.appendChild(button);\n \n@@ -97,6 +100,14 @@\n                 }\n             }\n         });\n+\n+        addEvent(button, 'mouseover', function () {\n+            button.style.opacity = 1;\n+        });\n+\n+        addEvent(button, 'mouseout', function () {\n+            button.style.opacity = initialOpacity;\n+        });\n     }\n \n })();");
            expect(parser.patch).to.be.instanceof(Array);
            expect(parser.patch).to.be.not.empty;
        });
    });

});
