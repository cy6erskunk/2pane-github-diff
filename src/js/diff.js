/* global DiffData: false, DiffView: false, diff_model: false, content_before: false, content_after: false */
/* jshint camelcase: false */
var diffData = new DiffData(content_before.split('\n'), content_after.split('\n'), diff_model),
    diffView = new DiffView(diffData);

diffView.init();
diffView.displayPanels(diffData.getNthDiffFirstLineNumber());
