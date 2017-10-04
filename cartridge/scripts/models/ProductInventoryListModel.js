

var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
var txn = require('dw/system/Transaction');
var Quantity = require('dw/value/Quantity');
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
var txn = require('dw/system/Transaction');

// var ProductInventoryListModel = AbstractModel.extend(
var ProductInventoryListModel = ({
	
    	updateInventory : function(jsonObject) {
    		
    		if(empty(jsonObject.inventory_list_id)){
				return "100";
			}
    		
			var productInventoryListModel= getProductInventoryList(jsonObject.inventory_list_id);
//			
//			if(empty(jsonObject.inventory.product_id)){	
//				return "101";
//			}
//			if(isNaN(jsonObject.inventory.inventoy_update_count)){
//				
//				return "102";
//			}
			
			
			var inventoryArrayObj = jsonObject.inventory;
			
			
			if(Array.isArray(inventoryArrayObj)) {
				
				var isComitted= false;
				try {
					txn.begin();
					
					for (var i=0; i<inventoryArrayObj.length; i++) {
						
							var inventory = inventoryArrayObj[i];
							
							if(empty(inventory.product_id)){	
								return "101";
							}
							if(isNaN(inventory.inventoy_update_count)){
								
								return "102";
							}
							
							var productId  = inventory.product_id;
							var productInvetoryRecord = productInventoryListModel.getRecord(productId);
							
							if(productInvetoryRecord == null){
				    			return "103";
				    		}
				    		var currentQty = productInvetoryRecord.getAllocation();
				    		var inventoryUpdateCount = new Number(inventory.inventoy_update_count.valueOf());
				    		var newQuantity = new Quantity(inventoryUpdateCount, "");
				    		var updatedQuantity = currentQty.add(newQuantity);
				    		var turOver = productInvetoryRecord.getTurnover();
				    		updatedQuantity = 	updatedQuantity.subtract(turOver);
				    		productInvetoryRecord.setAllocation(updatedQuantity.getValue());
						}
						
					txn.commit();
					isComitted = true;
					
				}catch(e) {
					
						
						return "109";
					
				}finally {
					if(!isComitted) {
						txn.rollback();
					}
					
				}
			}
			
//			var productId  = jsonObject.inventory.product_id;
//			var inventoryUpdateCount = new Number(jsonObject.inventory.inventoy_update_count.valueOf());
			
    		// Get the inventory record using the product Id
    	//	var productInvetoryRecord = productInventoryListModel.getRecord(productId);
    
    	
    		
    		return "200";
    	}
    });


function getProductInventoryList(inventoryListId) {
	var obj  = ProductInventoryMgr.getInventoryList(inventoryListId);
	return obj;
}

// ProductInventoryListModel.get = function (parameter) {
// var obj = null;
// if (typeof parameter === 'string') {
// var obj = ProductInventoryMgr.getInventoryList(inventoryListId);
// } else if (typeof parameter === 'object') {
// obj = parameter;
// }
// return new ProductInventoryListModel(obj);
// };


module.exports = ProductInventoryListModel;