'use strict';
/**
 * Model for product variation functionality.
 * @module models/ProductVariationModel
 */

/* API Includes */
var AbstractModel = require('storefront_controllers/cartridge/scripts/models/AbstractModel');
var Logger = require('dw/system/Logger');
var HashMap = require('dw/util/HashMap');
var LinkedHashMap = require('dw/util/LinkedHashMap');
var ArrayList = require('dw/util/ArrayList');
var Set = require('dw/util/Set');
var HashSet = require('dw/util/HashSet');
/**
 * ProductVariationModel helper class providing enhanced profile functionality
 * @class module:models/ProductVariationModel~ProductVariationModel
 */
var ProductVariationModel = AbstractModel.extend({
    /** @lends module:models/ProductVariationModel~ProductVariationModel.prototype */
    /**
     * Gets a new instance for a given product variation model.
     * @alias module:models/ProductVariationModel~ProductVariationModel/init
     * @param parameter method of of super class to call.
     */
    init: function (parameter) {
        var instance = this._super(parameter);
        this.initProperties();
        return instance;
    },

    // Please see https://intranet.demandware.com/jira/browse/RAP-4424
    /**
     * Unfortunately, we need to override this function as the instance has no way of updating
     * the selected variations with Controllers.  We can, however, mimic a ProductVariationMaster
     * with updated selected variations by calling ProductVariationMaster.getVariants() with a
     * HashMap of the known selected attributes, as well as with any other attribute under
     * consideration.
     *
     * @param {dw.catalog.ProductVariationAttribute} attr - attribute type
     * @param {dw.catalog.ProductVariationAttributeValue} value - attribute value
     */
    hasOrderableVariants: function (attr, value) {
        var lookupMap = this.selectionMap.clone();
        var variant;
        var variantsIter;
        var variationModel;

        lookupMap.put(attr.attributeID, value.value);
        variantsIter = this.object.getVariants(lookupMap).iterator();

        if (variantsIter.hasNext()) {
            variant = variantsIter.next();
            variationModel = variant.masterProduct.variationModel;
            return variationModel.hasOrderableVariants(attr, value);
        }
    },
    
    /**
     * Returns the ProductVariationAttrbuteValue object for the given attribute and the value ID.
     *
     * @alias module:models/ProductVariationModel~ProductVariationModel/getVariationAttributeValue
     * @param {dw.catalog.ProductVariationAttrbute} variationAttribute - the attribute
     * @param {String} variationAttributeValueID - the variation attribute value ID
     */
    getVariationAttributeValue: function (variationAttribute, variationAttributeValueID) {
        if (variationAttributeValueID) {
            var allValues = this.object.getAllValues(variationAttribute);
            for (var i = 0; i < allValues.length; i++) {
                if (allValues[i].ID === variationAttributeValueID) {
                    return allValues[i];
                }
            }
        }
        return null;
    },
    
    getAllVariant_Values: function() {
    	
    	
    	var LOG = Logger.getLogger('PDP','PDP');
    	var masterProduct = this.getMaster();
    	var productVariationModel = masterProduct.getVariationModel();

    	var allAttri;
    	var allAttriValueMap = new LinkedHashMap();
    	// Get All variant attributes and values for given product 
    	if(productVariationModel) {
    		allAttri = productVariationModel.getProductVariationAttributes(); 
    		var allAttriColl = allAttri.iterator();
    		while(allAttriColl.hasNext()) {
    			var productVariationAttribute = allAttriColl.next();
    			
    			if(productVariationAttribute) {
    				var allValues =  productVariationModel.getAllValues(productVariationAttribute);
    				var values= new ArrayList();;
    				for (var i = 0; i < allValues.length; i++) {
    					var ProductVariationAttributeValue =  allValues[i];
    					values.push(ProductVariationAttributeValue.getID());
    					//values = values+","+ProductVariationAttributeValue.getID();
    				}
    				
    				allAttriValueMap.put(productVariationAttribute.ID,values);
    			}
    			//LOG.error('Variation ID :: "{0}" and values for ::  "{1}" ', productVariationAttribute.ID,values);
    		}
    	}
    	
    	
    	var currentHttpParameterMap = request.httpParameterMap;

    	var params = currentHttpParameterMap.getParameterMap( 'dwvar_' + masterProduct.getID().replace(/_/g,'__') + '_');
        var paramNames = params.getParameterNames();
          
    	//var paramSet = currentHttpParameterMap.getParameterNames();
    	var filter = new HashMap();
    	if(paramNames) {
    		var tempIte = paramNames.iterator();
    		while(tempIte.hasNext()) {
    			var paramTemp  =tempIte.next();
    			//	var value = currentHttpParameterMap.paramTemp.stringValue;
    			 var value = params.get(paramTemp).getStringValue();
    			filter.put(paramTemp, value);
//    	        filter.put('productType', "2000-1");
    		}
    	}
       	// Get All variant Products for selected variant attributes values
        var variantProductColl =  this.getVariants(filter);
        
        if(variantProductColl) {
        	   var variantProductIte = variantProductColl.iterator();
        		while(variantProductIte.hasNext()) {
        			var variantProduct = variantProductIte.next();
        			var productVariationModel = variantProduct.getVariationModel();
        			LOG.error('Variation ID ::  "{0}" ', variantProduct.ID);
        			var allAttriColl = allAttri.iterator();
        			while(allAttriColl.hasNext()) {
        				var productVariationAttribute = allAttriColl.next();
        				var ProductVariationAttributeValue = productVariationModel.getVariationValue(variantProduct,productVariationAttribute);
        				LOG.error('ProductVariationAttributeValue ID ::  "{0}" ',productVariationAttribute.getID() + "::"+ ProductVariationAttributeValue.getID());
        			}
        	
        		}
        }
     
        
    	
    	//ProductVariationModel getVariants(filter : HashMap) : Collection
    	//getVariants(filter : HashMap) : Collection
//    	var masterProduct = this.getMaster();
//    	var variantCollection = masterProduct.getVariants();
    	
//    	if(variantCollection) {
//    		var variantIte = variantCollection.iterator();
//    		while(variantIte.hasNext()) {
//    			var productVariationModel = variantIte.next();
//    			var varirationAttributeIte = this.getProductVariationAttributes().iterator();
//    			while(varirationAttributeIte.hasNext()) {
//    				var varirationAttribute = varirationAttributeIte.next();
//    				LOG.error('Variation ID ::  "{0}" ', varirationAttribute.ID);
//    			}
//    		
//    		}
//    	}
    }
});

/** The model class */
module.exports = ProductVariationModel;
