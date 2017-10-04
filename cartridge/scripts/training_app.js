'use strict';

/**
 * @module app
 */

/**
 * Returns the model for the given name. The model is expected under the models directory.
 */
exports.getModel = function (modelName) {
    return require('./models/' + modelName + 'Model');
};

/**
 * Returns the controller with the given name.
 */
exports.getController = function (controllerName) {
	return require('~/cartridge/controllers/' + controllerName);
};

exports.getView = function (viewName, parameters) {
    var View;
    try {

        if (typeof viewName === 'string') {
            View = require('./views/' + viewName + 'View');
        } else {
            // use first argument as parameters if not a string
            // to allow for anonymous views
            parameters = viewName;
            View = require('./views/View');
        }
    } catch (e) {
        View = require('./views/View');
    }
    return new View(parameters || {});
};
