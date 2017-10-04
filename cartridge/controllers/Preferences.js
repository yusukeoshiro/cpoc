'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');

function start() {
	app.getForm('preferences').clear();
	app.getView({
	    	ContinueURL: dw.web.URLUtils.https('Preferences-HandleForm')
	    }).render('preferences/preferencesselect');
}

function handleForm() {
	
	app.getForm('preferences').handleAction({	        
		apply: function () {
	        	app.getView().render('preferences/preferencesselectresult');
	        }
	});
}

exports.Start = guard.ensure(['get'], start);
exports.HandleForm = guard.ensure(['post'],handleForm)