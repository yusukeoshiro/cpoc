'use strict';


var guard = require('storefront_controllers/cartridge/scripts/guard');
var URLUtils = require('dw/web/URLUtils');
var restUtils = require('training/cartridge/scripts/utils/RestUtils');
var inventoryList = require('training/cartridge/scripts/models/ProductInventoryListModel');



function start() {
	
	var isValid = restUtils.validateRequestId();

    let r = require('storefront_controllers/cartridge/scripts/util/Response');

//    if(isValid) {
//    	  r.renderJSON({
//    		  success: true
//  	    });
//    	
//    }else {
//    	  r.renderJSON({
//    		  	success: false,
//    	        error: 'IP Mismatch'
//    	    });
//    }
//    
    
	var jsonObj = restUtils.extractRequestBody();
  	
    if(empty(jsonObj.inventory_list_id)){
		 r.renderJSON({
		  	success: false,
 	        error: "Inventory List Is Empty"
 	    });
	}
  
  //  var inventoryList = app.getModel('ProductInventoryList');
    var status = inventoryList.updateInventory(jsonObj);
    
	 r.renderJSON({
	  	success: true,
	  	error: status
	 });
}


//exports.renderJSON = function (object) {
//    response.setContentType('application/json');
//
//    let json = JSON.stringify(object);
//    response.writer.print(json);
// };



exports.Start = guard.ensure(['post'], start);
