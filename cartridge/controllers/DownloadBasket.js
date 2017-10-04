'use strict';

var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var ISML = require('dw/template/ISML');
var URLUtils = require('dw/web/URLUtils');
var training_app = require('training/cartridge/scripts/training_app');
var txn = require('dw/system/Transaction');
var ArrayList = require('dw/util/ArrayList');
var ProductListMgr = require('dw/customer/ProductListMgr');
var BasketMgr = require('dw/order/BasketMgr');
var ProductList = require('dw/customer/ProductList');
//var ProductMgr = require('dw/catalog/ProductMgr');
var Logger = require('dw/system/Logger');
function start() {
	
	try {
		
		if (customer.authenticated) {
			
			var DownloadBasket = training_app.getModel('DownloadBasket');
			var productList = DownloadBasket.getProductListMgrForCustomer();
			if(productList && productList.object) {
				var itemColl = productList.getProductItems();
			
				if(!itemColl.isEmpty()) {
					var itemsIte = itemColl.iterator();
					//var pidsList = new ArrayList();
					var newArray =[];
					while(itemsIte.hasNext()) {
						var listItem = itemsIte.next();
						var product = listItem.getProduct();
						var pid;
						if (product.isVariant()) {
							pid = product.getMasterProduct().getID();
						 }else {
							 pid= product.getID();
						 }
						//	var pid = listItem.getProductID();
						newArray.push(pid);
						//pidsList.add1(listItem.getProductID());
					}
				
					var jsonStr = toJSON(newArray);
					
					if(jsonStr) {
						// After converting to json for download or sharing with PIIP.. move the list to customer profile and remove the list from ProductList
						   var profile = app.getModel('Profile').get();
					        if (profile) {
					        	var profileObj = profile.object;
					        	var downlaodSet = profileObj.custom.downloadList;
					        	//var temp = downlaodSet.indexOf(jsonStr);
					        	if(!downlaodSet.length) {
					        		downlaodSet = [jsonStr];
					        	}else if(downlaodSet.indexOf(jsonStr) == -1 ){
					        		downlaodSet =  downlaodSet.concat(jsonStr);
					        		 //Limit for quota 'api.object.maxMultiValueAttribute' exceeded. Limit is 200, actual is 225.
										//	
					        			//for(i=0;i<1000;i++) {
										//	downlaodSet =  downlaodSet.concat(toJSON(newArray));
										//	i++;
										//}
					        	}
						    	 txn.wrap(function (){
						    		 
						    		 	profileObj.custom.downloadList = downlaodSet;
						    		 	
						    			 itemsIte = itemColl.iterator();
						    				while(itemsIte.hasNext()) {
						    					productList.removeItem(itemsIte.next());
						    				}
						    				
						    				// Finally remove Basket
						    				var cart = training_app.getModel('Cart').get();
						    				var prodIter = cart.getAllProductLineItems().iterator();
					    				   while (prodIter.hasNext()) {
					    					  cart.object.removeProductLineItem(prodIter.next());
					    				   }
						    				
						    		 	//ProductListMgr.removeProductList(productList.object);
						    			//var removeList = new ArrayList(productList.getProductItems());		    		 
						    			//productList.getProductItems().removeAll(removeList);
						    		// productList.getProductItems().clear();
						    		// itemColl.clear();
						    	 });
					        }
					}
					session.custom['DownloadedProducts']=null;
					response.getWriter().println("<H1>Download basket Coming Soon for ID " + jsonStr);
				}
			}
		}else {
			response.getWriter().println("<H1>Not Logged In Customer </h1>");
		}
	}catch(e){
		  var TrainerLogger = Logger.getLogger('training','training');
			 TrainerLogger.error(e);
	}
	
}


function toJSON(productIds) {
	
	var date = new Date();
	var o = {
	  date: date.getDate()+'-'+date.getMonth()+'-'+date.getFullYear()+' '+date.getHours()+'-'+date.getMinutes()+'-'+date.getSeconds()+'-'+date.getMilliseconds(),
	  prods: productIds
	};
//	
//	var o = {
//			  prods: productIds
//			};
	return JSON.stringify(o);
	//return JSON.stringify(o);
}

function downalod() {
	var training_app = require('training/cartridge/scripts/training_app');
	var downloadBasket = training_app.getModel('DownloadBasket').getDownloadBasketForSession();
	var lineItems = downloadBasket.object.custom.lineItemIDs;
	var csvString="";
	if(lineItems && lineItems.length) {
		var length = lineItems.length;
		for (var i in lineItems) {
				csvString += lineItems[i]+ '\r\n';
		}
	}
	
	response.setContentType("text/csv"); 
	response.setHttpHeader("Content-Disposition", "attachment; filename=downloaf-basket.csv");
	response.getWriter().write(csvString);
	//response.getWriter().println("<H1>Download basket Coming Soon for ID " + downloadBasket.object.custom.downloadId);
	//response.getWriter().println("<H1>Download basket Coming Soon for ID " + temp);
}


exports.Start = guard.ensure(['get'], start);