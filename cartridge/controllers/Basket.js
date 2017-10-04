/**
* Description of the Controller and the logic it provides
*
* @module  controllers/Basket
*/

'use strict';


var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');



function start() {

	
	var BasketMgr =  require('dw/order/BasketMgr');
	var currentBasket = BasketMgr.getCurrentBasket();
	
	if(currentBasket==null) {
		ISML.renderTemplate('basket/productnotfound.isml', {message:'No Basket found'});
	}else{
		
		ISML.renderTemplate('basket/basketfound.isml', {myBasket:currentBasket});
		
	}
	
}
exports.Start = guard.ensure(['get'], start);