describe('microDOM', function () {

    describe('addClassToNode', function () {

        var node;

        beforeEach(function() {
            node = document.createElement('div');
        });

        it('adds class to empty className', function () {
            var className = 'foo';

            expect(node.className).toBe('');
            DOM.addClassToNode(node, className);
            expect(node.className).toBe(className);
        });

        it('adds new class to non-empty className', function () {
            var className = 'foo';

            node.className = 'xoxo';

            expect(node.className).toBe('xoxo');
            DOM.addClassToNode(node, className);
            expect(node.className).toBe('xoxo foo');

        });

        it('does nothing when there\'s not enough arguments', function () {
            var className = node.className;

            expect(DOM.addClassToNode).not.toThrow();
            expect(node.className).toEqual(className);
            expect(function () { DOM.addClassToNode(node); }).not.toThrow();
            expect(node.className).toEqual(className);
            expect(function () { DOM.addClassToNode(undefined, node); }).not.toThrow();
            expect(node.className).toEqual(className);
            expect(function () { DOM.addClassToNode(node, ''); }).not.toThrow();
            expect(node.className).toEqual(className);
        });

        it('correctly processes duplicate classes', function () {
            node.className = 'x';

            DOM.addClassToNode(node, 'x');
            expect(node.className).toBe('x');

            var original = 'wxy xyz foo';

            node.className = original;
            DOM.addClassToNode(node, 'xyz');
            expect(node.className).toBe(original);

        });

        it('correctly processes substrings of existing classes', function () {
            var node = document.createElement('span');

            node.className = 'xyz';
            DOM.addClassToNode(node, 'yz');
            expect(node.className).toBe('xyz yz');

            node.className = 'xyz';
            DOM.addClassToNode(node, 'xy');
            expect(node.className).toBe('xyz xy');

            node.className = 'xyz';
            DOM.addClassToNode(node, 'y');
            expect(node.className).toBe('xyz y');
        });

    });

    it('can get head node', function () {
        expect(DOM.getHead()).toEqual(document.getElementsByTagName('head')[0]);
    });
});
