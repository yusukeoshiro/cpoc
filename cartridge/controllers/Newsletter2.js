'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');
require('dw/web/URLUtils');
var Logger = require('dw/system/Logger');

var txn = require('dw/system/Transaction');

function start() {
	 app.getForm('newsletter').clear();
	app.getView({
	    ContinueURL: dw.web.URLUtils.https('Newsletter2-HandleForm')
	    }).render('newsletter/newslettersignup');
}

function handleForm() {
	
	var newsletterForm = app.getForm('newsletter');
	newsletterForm.handleAction({
	
		 cancel: function () {
			 newsletterForm.clear();
	            response.redirect(URLUtils.https('Newsletter2-Start'));
	        }, 
	        
	     subscribe: function () {
	    	 var logger = Logger.getLogger('training','training');
	    	//try {
	    		 var newsletter = session.forms.newsletter;
		    	 var email = newsletter.email.value;
		    	 
		    		 var CustomObjectMgr = require('dw/object/CustomObjectMgr');
//		    		 var CustomObject =  CustomObjectMgr.getCustomObject('NewsletterSubscription','1111@1111.com');
//		    		 if(CustomObject) {
//		    			 logger.info(CustomObject);
//		    		 }
		    		 
		    		 txn.wrap(function (){
		    			 var newsletterSubscriptionObj  =  CustomObjectMgr.createCustomObject('NewsletterSubscription', email);
		    			 newsletterSubscriptionObj.custom.firstName = newsletter.fname.value;
		    			 newsletterSubscriptionObj.custom.lastName = newsletter.lname.value;
		    		 });
		    		 
			    	 //customObject.custom.firstName = newsletter.fname.value;
			    	 //customObject.custom.lastName = newsletter.lName.value;
		   
		    	
		    	 
//	    	 }catch(e) {
//	    		 logger.error("A newsletter subscription for this email address already exists", e );
//	    		 	
//	    	 }
	    	  
	         app.getView().render('newsletter/newslettersignupresult');
	        }
	});
}

exports.Start = guard.ensure(['get'], start);
exports.HandleForm = guard.ensure(['post'],handleForm);