'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');

var txn = require('dw/system/Transaction');


function start() {
	//var preferencesForm =  app.getForm('preferences');
	var preferencesForm = session.forms.preferences;
	preferencesForm.clearFormElement();
	
	if (customer.authenticated) {
		var profileObj = customer.profile;
		//preferencesForm.copyFrom(customer.profile); 
		preferencesForm.interestApparel.value=profileObj.custom.interestApparel;
		preferencesForm.interestElectronics.value=profileObj.custom.interestElectronics;
		preferencesForm.interestedinNewsletter.value = profileObj.custom.newsletter;
	}
	
	app.getView({
	    	ContinueURL: dw.web.URLUtils.https('Preferences2-HandleForm'),
	    	CurrentForms : session.forms
	    }).render('preferences/preferencesselect');
}

function handleForm() {
	 
	app.getForm('preferences').handleAction({	        
		apply: function () {
			
		    if (customer.authenticated) {
		    	//var profileTemp = customer.profile;
		    	//var requestBody = JSON.stringify(profileTemp.custom);  
		    	//var cust = profileTemp.custom.interestApparel;
		        var profile = app.getModel('Profile').get();
		        if (profile) {
		        	var profileObj = profile.object;
//		        	var cust = profileObj.custom.interestApparel;
		        	
		        var preferencesForm = session.forms.preferences;
		       	
		    	 txn.wrap(function (){
		    		 profileObj.custom.newsletter = preferencesForm.interestedinNewsletter.value;
		    	 	 profileObj.custom.interestApparel = preferencesForm.interestApparel.value;
			       	 profileObj.custom.interestElectronics = preferencesForm.interestElectronics.value;
		    	 });
		      
		      //  	var interestApparel = profileObj.interestApparel;
		        //	var customerNo = profileObjt.customerNo;
		           // applicableCreditCards = profile.validateWalletPaymentInstruments(countryCode, paymentAmount.getValue()).ValidPaymentInstruments;
		        }
		    }
		    
//			  	var ProfileModel = app.getModel('Profile');
//			  	var profile = ProfileModel.get();
//			 	var customerNo = customer.profile.customerNo;
	        	app.getView().render('preferences/preferencesselectresult');
	        }
	});
}

exports.Start = guard.ensure(['get'], start);
exports.HandleForm = guard.ensure(['post'],handleForm)