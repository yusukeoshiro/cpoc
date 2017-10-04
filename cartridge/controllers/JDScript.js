/**
* Description of the Controller and the logic it provides
*
* @module  controllers/JDScript
*/

'use strict';


var ISML = require('dw/template/ISML');
var guard = require('storefront_controllers/cartridge/scripts/guard');

function start() {

	
	var cusId = request.httpParameterMap.cid.stringValue;
	var CustomerMgr =  require('dw/customer/CustomerMgr');
	var customer = CustomerMgr.getCustomerByLogin(cusId);

	if(customer==null) {
		ISML.renderTemplate('customer/customernotfound.isml.isml', {message:'Customer with id '+cusId+' not found'});
	}else{
		
		ISML.renderTemplate('customer/customerfound.isml', {customer:customer.profile});
		
	}
	
}
exports.Start = guard.ensure(['get'], start);