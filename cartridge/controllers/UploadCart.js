'use strict';


/* API Includes */
var ArrayList = require('dw/util/ArrayList');
var ISML = require('dw/template/ISML');
var Resource = require('dw/web/Resource');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var File = require('dw/io/File');
var FileReader = require('dw/io/FileReader');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var app = require('storefront_controllers/cartridge/scripts/app');
var training_app = require('training/cartridge/scripts/training_app');
var LinkedHashMap = require('dw/util/LinkedHashMap');
var Logger = require('dw/system/Logger');
var TrainerLogger = Logger.getLogger('training','training');


function submitForm() {
	
	var params = request.httpParameterMap;

	//var fileMap = params.processMultipart( creatFilesFromMultipart(field, ct, oname) );
	var files = params.processMultipart( (function( field, ct, oname ){
	     return new File( File.IMPEX + "/" + params.firstField );
	 }) );
	

	try {
		//nothing to do
		if ( files.size() < 1) {
			  app.getView('Cart', {
			        cart: training_app.getModel('Cart').get(),
			        RegistrationStatus: false
			    }).render('checkout/cart/cart');
		}
		
		 //for (var n = 0; n < files.length; n++) {
		var file = files.get("file");
		 var filereader = new FileReader(file);
		var lines =  filereader.getLines().iterator();
		var fileData = "";
		var cospCartModel = training_app.getModel("CospaCart").goc();
		
		while(lines.hasNext()){
			
			var temp = lines.next();
			var line = temp.split(',');
		//	var newQuantity = new Number(line[1], "");
		//	var newQuantity =line[1];
			cospCartModel.addProductToCart(line[0],line[1],false);
			//fileData = fileData+lines.next();
		}
		
	 // 	cospaCart.calculate();
		// finally rmove file 
		file.remove();
	}catch(e){
		TrainerLogger.error(e);
	}

	
  app.getView('Cart', {
        cart: app.getModel('Cart').get(),
        RegistrationStatus: false
    }).render('checkout/cart/cart');
	  
	//response.getWriter().println("<H1>File Data : " + fileData);
         
}




/*
* Exposed methods.
*/

/** Form handler for the cart form.
 * @see {@link module:controllers/Cart~submitForm} */
exports.Start = guard.ensure(['post', 'https'], submitForm);

