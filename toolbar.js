// Original copyright Philip Lawrence 
// http://dev.misterphilip.com/prism/plugins/toolbar/

(function () {
    if (!self.Prism) {
        return;
    }

    // Attach our hook, only for those parts that we highlighted
    Prism.hooks.add('after-highlight', function (env) {

        // Check if inline or actual code block (credit to line-numbers plugin)
        var pre = env.element.parentNode;

        if (!pre || !/pre/i.test(pre.nodeName) || pre.className.indexOf('code-toolbar') === -1) {
            return;
        }
        
        // Setup the toolbar
        var toolbar = document.createElement('div');
            toolbar.setAttribute('class', 'toolbar');
        
        // Copy to clipboard button, requires ZeroClipboard
        if (window.ZeroClipboard)
        {
            var linkCopy = document.createElement('a');
            linkCopy.innerHTML = 'Copy to clipboard';
            
            var client = new ZeroClipboard(linkCopy);

            client.on("ready", function (event) {
                client.on("copy", function (event) {
                    var node = event.target.parentNode.parentNode.getElementsByTagName('code')[0];
                    event.clipboardData.setData('text/plain', node.textContent || node.innerText);
                } );
                client.on("aftercopy", function (event) {
                    alert("Code copied to clipboard");
                    event.target.parentNode.parentNode.getElementsByTagName('code')[0].focus();
                } );
            } );

            toolbar.appendChild(linkCopy);
        }        
        
        // Add our toolbar to the <pre> tag
        pre.appendChild(toolbar);
    });
})();