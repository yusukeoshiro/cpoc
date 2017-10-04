'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');
var HashMap = require('dw/util/HashMap');
var txn = require('dw/system/Transaction');
var Logger = require('dw/system/Logger');

function start() {
	
	 var CustomerMgr = require('dw/customer/CustomerMgr');
	 var orderCancelLogger = Logger.getLogger('order','order');
	 var SeekableIterator;
	 try {
		 
		 var shopCode = request.httpParameterMap.shopCode.stringValue;
		 var map = new HashMap();
		 
		 map.put('custom.shopCode',shopCode);
		 SeekableIterator = CustomerMgr.queryProfiles(map, 'custom.shopCode');
		 
		
		 var resStr='';
		while(SeekableIterator.hasNext()) {
			var customer =  SeekableIterator.next();
			var downloadList = customer.custom.downloadList;
			if(downloadList.length) {
				//for (var value; value = downloadList.pop();) {
				for (var i = 0; i < downloadList.length; i++) {
					resStr = resStr+ downloadList[i];
				}

			}
			
//			txn.wrap(function (){
//				customer.custom.shopCode='SFDC';
//			 });
		}
		
		 response.getWriter().println("<H1>Download basket Coming Soon for ID --></H1>" + resStr);
		 
	 }catch(e) {
		 orderCancelLogger.error(e);
	 }finally {
		 
		 if(SeekableIterator ) {
			 SeekableIterator.close();
		 }
	 }
}


exports.Start = guard.ensure(['get'], start);

//https://myeddala-inside-ap01-dw.demandware.net/on/demandware.store/Sites-Training-Site/default/Customer-Start?shopCode=SFDC
//https://myeddala-inside-ap01-dw.demandware.net/on/demandware.store/Sites-Training-Site/default/Customer-Start
