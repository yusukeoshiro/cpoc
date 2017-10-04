'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');
//var Number = require('Number');

var txn = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');

function start() {
	
	var idId = request.httpParameterMap.oid.stringValue;
	 var OrderMgr = require('dw/order/OrderMgr');
	 var orderCancelLogger = Logger.getLogger('order','order');
	 try {
		 txn.begin();
		 var order = OrderMgr.getOrder(idId);
		 
		 var shippingColl = order.getShipments();
		 var ite = shippingColl.iterator();
		 
		// txn.begin();
				 while(ite.hasNext()) {
					var shipmentObj =  ite.next();
					var lineItemsColl = shipmentObj.getProductLineItems().iterator();
					
					while(lineItemsColl.hasNext()) {
						var productLineItem  =  lineItemsColl.next();
						
						//var productLineItem = shipmentObj.getShippingLineItem(tempObj.getID());
					//	var updateQty = new Number("0");
						//var updateQty  = parseInt(2);
						//productLineItem.setQuantityValue(updateQty);
						 
						order.removeProductLineItem(productLineItem);
					
					}
					//var status = shipmentObj.getShippingStatus();
					//orderCancelLogger.error("Status {0}", status);
				 }
				 
					txn.commit();	
		 order.updateTotals();
		 response.getWriter().println("<H1>Download basket Coming Soon for ID --></H1>");
		 
	 }catch(e) {
			
			orderCancelLogger.error(e);
	 }	
}


exports.Start = guard.ensure(['get'], start);