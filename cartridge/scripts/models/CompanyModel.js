
var txn = require('dw/system/Transaction');
var Quantity = require('dw/value/Quantity');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');

var Logger = require('dw/system/Logger');
var HashMap = require('dw/util/HashMap');
var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var CustomerMgr = require('dw/customer/CustomerMgr');
var CompanyModel = ({
	
			buidDownloadCsvForUserCompanyId : function() {
				
				var profile = app.getModel('Profile').get();
				if(!profile) {
					return "";
				}
				var shopCode = profile.object.custom.shopCode;
				if(!shopCode) {
					return "";
				}
				
				var csvString ='';	
				 var map = new HashMap();
				 map.put('custom.shopCode',shopCode);
				 SeekableIterator = CustomerMgr.queryProfiles(map, 'custom.shopCode');
				 
				 while(SeekableIterator.hasNext()) {
						var customer =  SeekableIterator.next();
						var downloadList = customer.custom.downloadList;
						if(downloadList.length) {
							for (var i = 0; i < downloadList.length; i++) {
								var data = JSON.parse(downloadList[i]);
								var productsIds = data.prods ? data.prods : {};
								for (var j in productsIds) {
										//csvString += ','+productsIds[i]
									
									var temp = productsIds[j];
									if(csvString.indexOf(temp) <=0) {
										csvString += ','+temp;
									}
								}
								
							}
						}
				}
				 
				 session.custom['DownloadedProducts'] = csvString;
				 return csvString;
			}
    });

module.exports = CompanyModel;