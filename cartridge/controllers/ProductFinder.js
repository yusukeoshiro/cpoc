'use strict';

var ISML = require('dw/template/ISML');
var guard = require('storefront_controllers/cartridge/scripts/guard');

function start() {

	
	var proId = request.httpParameterMap.pid.stringValue;
	var ProductMgr =  require('dw/catalog/ProductMgr');
	var product = ProductMgr.getProduct(proId);
	
	if(product==null) {
		ISML.renderTemplate('product/productnotfound.isml', {message:'product with id '+proId+' not found'});
	}else{
		
		ISML.renderTemplate('product/productfound.isml', {myProduct:product});
		
	}
	
}
exports.Start = guard.ensure(['get'], start);