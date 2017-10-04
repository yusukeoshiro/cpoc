'use strict';
/**
 * Model for product variation functionality.
 * @module models/ProductVariationModel
 */

/* API Includes */
var AbstractModel = require('./AbstractModel');

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
    }
});

/** The model class */
module.exports = ProductVariationModel;
