'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');

function start() {
	 app.getForm('newsletter').clear();
	app.getView({
	    ContinueURL: dw.web.URLUtils.https('Newsletter-HandleForm')
	    }).render('newsletter/newslettersignup');
}

function handleForm() {
	
	app.getForm('newsletter').handleAction({
	
		 cancel: function () {
	            app.getForm('newsletter').clear();
	            response.redirect(URLUtils.https('Newsletter-Start'));
	        }, 
	        
	     subscribe: function () {
	        	app.getView().render('newsletter/newslettersignupresult');
	        }
	});
}

exports.Start = guard.ensure(['get'], start);
exports.HandleForm = guard.ensure(['post'],handleForm);