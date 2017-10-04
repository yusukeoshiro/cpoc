
var AbstractModel = require('storefront_controllers/cartridge/scripts/models/AbstractModel');
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
var txn = require('dw/system/Transaction');
var Quantity = require('dw/value/Quantity');
var CustomObjectMgr = require('dw/object/CustomObjectMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var ProductList = require('dw/customer/ProductList');
var Logger = require('dw/system/Logger');
var HashMap = require('dw/util/HashMap');

var DownloadBasketModel = AbstractModel.extend({
	
	addProductToDownloadBasket : function(pid) {
		
			var sessionDowloaBasketObj =  session.custom['DownloadBasket'];
			var sessionDowloaBasket = CustomObjectMgr.queryCustomObject('DowloaBasket','custom.downloadId = {0}',sessionDowloaBasketObj.custom.downloadId);
			//var sessionDowloaBasket = CustomObjectMgr.getCustomObject('DowloaBasket', session.getSessionID());
			var lineItemIDs = sessionDowloaBasket.custom.lineItemIDs;
			
			var isComitted = false;
			
			try {
					var length = lineItemIDs.length;
					var newArray;
					if(!length) {
						newArray =[pid];
					}else {
						newArray = lineItemIDs.concat(pid);
					}
					txn.begin();
						sessionDowloaBasket.custom.lineItemIDs = newArray;
					txn.commit();
					isComitted = true;
			}catch(e){
				var TrainerLogger = Logger.getLogger('training','training');
				TrainerLogger.error(e);
			}finally {
				if(!isComitted) {
					txn.rollback();
				}
			}
    	},

		addProductDownlodroductList : function(productObj,qty) {
			
			var isComitted = false;
			
			try {
					txn.begin();
						var productListItem =  this.object.createProductItem(productObj);
						var qty  = parseInt(qty);
						productListItem.setQuantityValue(qty);
					txn.commit();
				
			}catch(e){
				var TrainerLogger = Logger.getLogger('training','training');
				TrainerLogger.error(e);
			}finally {
				if(!isComitted) {
					txn.rollback();
				}
			}
		}
});



DownloadBasketModel.get = function () {
	
	var obj =  session.custom['DownloadBasket'];
	if(!obj) {
		 txn.wrap(function (){
			 var obj  =  CustomObjectMgr.createCustomObject('DowloaBasket', session.getSessionID());
			 session.custom['DownloadBasket'] = obj;
		 });
	}
    
    return new DownloadBasketModel(obj);
};

DownloadBasketModel.getDownloadBasketForSession = function() {
	try {
		var sessionDowloaBasket = CustomObjectMgr.getCustomObject('DowloaBasket', session.getSessionID());
		return new DownloadBasketModel(sessionDowloaBasket); 
	}catch(e){
		  var TrainerLogger = Logger.getLogger('training','training');
		 TrainerLogger.error(e);
	}
	return null;
};

DownloadBasketModel.getProductListMgrForCustomer = function() {
	var currentProductList;
	try {
		if (customer.authenticated) {
			var productLists = ProductListMgr.getProductLists(customer, ProductList.TYPE_CUSTOM_1);
			if(productLists && !productLists.isEmpty()) {
				currentProductList = productLists.iterator().next();
			}else if(productLists && productLists.isEmpty()) {
				 txn.wrap(function (){
						currentProductList = ProductListMgr.createProductList(customer, ProductList.TYPE_CUSTOM_1);
				 });
			
			}
		}
		return new DownloadBasketModel(currentProductList); 
	}catch(e){
		  var TrainerLogger = Logger.getLogger('training','training');
		 TrainerLogger.error(e);
	}
	return null;
};





//function toJSON() {
//    var o = {
//        cid: (currentCategoryID ? currentCategoryID : null),
//        prods: categoryProducts
//    };
//    return JSON.stringify(o);
//}

module.exports = DownloadBasketModel;

