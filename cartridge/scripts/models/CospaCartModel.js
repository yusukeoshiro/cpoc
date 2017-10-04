'use strict';
/**
 * Model for cart functionality. Creates a CartModel class with payment, shipping, and product
 * helper methods.
 * @module models/CartModel
 */
var Transaction = require('dw/system/Transaction');

/* API Includes */
var AbstractModel = require('storefront_controllers/cartridge/scripts/models/AbstractModel');
var ArrayList = require('dw/util/ArrayList');
var BasketMgr = require('dw/order/BasketMgr');
var Money = require('dw/value/Money');
var MultiShippingLogger = dw.system.Logger.getLogger('multishipping');
var OrderMgr = require('dw/order/OrderMgr');
var PaymentInstrument = require('dw/order/PaymentInstrument');
var Product = require('storefront_controllers/cartridge/scripts/models/ProductModel');
var ProductInventoryMgr = require('dw/catalog/ProductInventoryMgr');
var ProductListMgr = require('dw/customer/ProductListMgr');
var QuantityLineItem = require('storefront_controllers/cartridge/scripts/models/QuantityLineItemModel');
var Resource = require('dw/web/Resource');
var ShippingMgr = require('dw/order/ShippingMgr');
var StoreMgr = require('dw/catalog/StoreMgr');
var TransientAddress = require('storefront_controllers/cartridge/scripts/models/TransientAddressModel');
var UUIDUtils = require('dw/util/UUIDUtils');
var lineItem;
var app = require('storefront_controllers/cartridge/scripts/app');
var ProductList = app.getModel('ProductList');
var Logger = require('dw/system/Logger');
var TrainerLogger = Logger.getLogger('training','training');
var txn = require('dw/system/Transaction');
var CospaCartModel = AbstractModel.extend({
  
    calculate: function () {
        dw.system.HookMgr.callHook('dw.ocapi.shop.basket.calculate', 'calculate', this.object);
    },

    addProductToCart: function(pid,qtyDoubleValue,calculate) {
        var cospaCart = this;
        
        var Product = app.getModel('Product');
        
        var productToAdd = Product.get(pid);

//        var  productOptionModel = productToAdd.updateOptionSelection(params);
        var productOptionModel=null;
        cospaCart.addProductItem(productToAdd.object, qtyDoubleValue, productOptionModel,calculate);
          
    },

    addProductItem: function (product, quantity, productOptionModel,calculate) {
        	var cospaCart = this;        
        	var isComitted = false;
            if (product) {
            	txn.begin();
            	try {
            		   var productInCart;
                       var productLineItem;
                       var productLineItems = cospaCart.object.productLineItems;
                       var quantityInCart;
                       var quantityToSet;
                       var shipment = cospaCart.object.defaultShipment;

                       for (var q = 0; q < productLineItems.length; q++) {
                           if (productLineItems[q].productID === product.ID) {
                               productInCart = productLineItems[q];
                               break;
                           }
                       }

                       if (productInCart) {
//                           if (productInCart.optionModel) {
//                               productLineItem = cospaCart.createProductLineItem(product, productOptionModel, shipment);
//                               if (quantity) {
//                            	   quantity = parseInt(quantity);
//                                   productLineItem.setQuantityValue(quantity);
//                               }
//                           } else {
                               quantityInCart = productInCart.getQuantity();
                               var tempQty =  parseInt(quantity);
                               quantityToSet = quantity ? tempQty + quantityInCart.value : quantityInCart.value + 1;
                               quantity = parseInt(quantityToSet);
                               productInCart.setQuantityValue(quantity);
                          // }
                       } else {
                           productLineItem = cospaCart.createProductLineItem(product, productOptionModel, shipment);

                           if (quantity) {
                        	   quantity = parseInt(quantity);
                               productLineItem.setQuantityValue(quantity);
                           }
                       }

                       if(calculate) {
                       	cospaCart.calculate();
                       }
                   	txn.commit();
					isComitted = true;
            	}catch(e) {
            		TrainerLogger.error(e);
            	}finally {
    				if(!isComitted) {
    					txn.rollback();
    				}
    			}
            }
    },


    /**
     * Replaces the current product of the specified product line item with the specified product.
     *
     * By default, when a bundle is added to a cart, all its child products are added as well.
     * However, if those products are variants then the master products must be replaced
     * with the selected variants that get passed in the CurrentHttpParameterMap.childPids as comma separated list of
     * pids of the bundled products that are variations and any options.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/updateLineItem
     * @param {dw.order.ProductLineItem} lineItem - The product line item to replace.
     * @param {dw.catalog.Product} product - The new product.
     * @param {Number} quantity - The quantity of the product line item after replacement.
     * @param {dw.catalog.ProductOptionModel} productOptionModel - The option model of the product to add to the basket.
     */
    updateLineItem: function (lineItem, product, quantity, productOptionModel) {
        var optionValues = productOptionModel.getOptions();

        lineItem.replaceProduct(product);
        lineItem.setQuantityValue(quantity);

        if (optionValues.length) {
            lineItem.updateOptionValue(optionValues[0]);
        }

        if (product.isBundle()) {

            if (request.httpParameterMap.childPids.stringValue) {
                var childPids = request.httpParameterMap.childPids.stringValue.split(',');

                for (var i = 0; i < childPids.length; i++) {
                    var childProduct = Product.get(childPids[i]).object;

                    if (childProduct) {
                        // why is this needed ?
                        childProduct.updateOptionSelection(request.httpParameterMap);

                        var foundLineItem = null;
                        foundLineItem = this.getBundledProductLineItemByPID(lineItem, (childProduct.isVariant() ? childProduct.masterProduct.ID : childProduct.ID));

                        if (foundLineItem) {
                            foundLineItem.replaceProduct(childProduct);
                        }
                    }
                }
            }
        }
    },

    /**
     * Implements a typical shopping cart checkout validation. Some parts of the validation script are specific to
     * the reference application logic and might not be applicable to our customer's storefront applications.
     * However, the shopping cart validation script can be customized to meet specific needs and requirements.
     *
     * This function implements the validation of the shopping cart against specific
     * conditions in the following steps:
     * - validate that total price is not N/A
     * - validate that all products in the basket are still in site catalog and online
     * - validate that all coupon codes in the basket are valid
     * - validate that the taxes can be calculated for all products in the basket (if ValidateTax input parameter is true)
     *
     * @alias module:models/CartModel~CartModel/validateForCheckout
     * @returns {dw.system.Status} BasketStatus
     * @returns {Boolean} EnableCheckout
     */
    validateForCheckout: function () {
        var ValidateCartForCheckout = require('storefront_core/cartridge/scripts/cart/ValidateCartForCheckout');
        return ValidateCartForCheckout.validate({
            Basket: this.object,
            ValidateTax: false
        });
    },

    /**
     * The function removes all empty shipments of the current cart.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/removeEmptyShipments
     */
    removeEmptyShipments: function () {
        var that = this;
        // Gets the list of shipments.
        var shipments = that.getShipments();

        dw.system.Transaction.wrap(function () {
            for (var i = 0; i < shipments.length; i++) {
                var shipment = shipments[i];

                if (!shipment.isDefault()) {
                    if (shipment.getProductLineItems().isEmpty() && shipment.getGiftCertificateLineItems().isEmpty()) {
                        that.removeShipment(shipment);
                    }
                }
            }
        });
    },

    /**
     * Determines the physical shipments of the current cart. Physical shipments are shipments that contain at
     * least one product line item. A shipment that contains only gift certificates is not a physical shipment.
     * Product line items marked for in-store pickup are also not considered physical shipments.
     *
     * @alias module:models/CartModel~CartModel/getPhysicalShipments
     * @returns {dw.util.ArrayList} List of physical shipments.
     */
    getPhysicalShipments: function () {

        // list of physical shipments
        var physicalShipments = new ArrayList();

        // find physical shipments
        var shipments = this.getShipments();

        for (var i = 0; i < shipments.length; i++) {
            var shipment = shipments[i];
            if (!shipment.getProductLineItems().isEmpty() && shipment.custom.shipmentType !== 'instore') {
                physicalShipments.add(shipment);
            }
        }

        return physicalShipments;
    },

   

    /**
     * Determines a unique shipment ID for shipments in the current cart and the given base ID. The function appends
     * a counter to the base ID and checks the existence of the resulting ID. If the resulting ID is unique, this ID
     * is returned; if not, the counter is incremented and checked again.
     *
     * @alias module:models/CartModel~CartModel/determineUniqueShipmentID
     * @param {String} baseID - The base ID.
     * @returns {String} Calculated shipment ID.
     */
    determineUniqueShipmentID: function (baseID) {
        var counter = 1;
        var shipment = null;
        var candidateID = baseID + '' + counter;

        while (shipment === null) {
            shipment = this.getShipment(candidateID);
            if (shipment) {
                // This ID is already taken, increment the counter
                // and try the next one.
                counter++;
                candidateID = baseID + '' + counter;
                shipment = null;
            } else {
                return candidateID;
            }
        }

        // Should never go here
        return null;
    },

    /**
     * Creates a shipping address for the shipment with the given shipment ID.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/createShipmentShippingAddress
     * @param {String} shipmentID - The ID of the shipment to create the shipping address for.
     * @returns {dw.order.OrderAddress} The created shipping address.
     */
    createShipmentShippingAddress: function (shipmentID) {

        var shipment = this.getShipment(shipmentID);
        var shippingAddress = shipment.getShippingAddress();

        // If the shipment has no shipping address yet, create one.
        if (shippingAddress === null) {
            shippingAddress = shipment.createShippingAddress();
        }

        return shippingAddress;

    },

    /**
     * Scans the basket and consolidates items that are going to the same store. It also creates shipments
     * with shipment type and method for the rest of checkout.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/consolidateInStoreShipments
     * @returns {boolean} true if there is a home delivery found in the basket, false otherwise.
     */
    consolidateInStoreShipments: function () {
        var sliArrayList = new ArrayList();
        var homeDeliveries = false;
        var storeObject, shippingAddress, orderAddress;

        var plis = this.getAllProductLineItems();
        for (var i = 0; i < plis.length; i++) {
            var pli = plis[i];

            if (pli.custom.fromStoreId === null) {
                //Skips line items that are not in-store product line items.
                homeDeliveries = true;
                continue;
            }
            if (pli.shipment.shippingMethod && pli.shipment.shippingMethod.custom.storePickupEnabled) {
                //Checks to see if the store id changed.
                if (pli.custom.fromStoreId === pli.shipment.custom.fromStoreId) {
                    if (pli.shipment.shippingAddress) {
                        continue;
                    } else {
                        //Creates the shipment address to reflect the new store address.
                        shippingAddress = new TransientAddress();
                        storeObject = StoreMgr.getStore(pli.custom.fromStoreId);
                        orderAddress = pli.shipment.createShippingAddress();
                        shippingAddress.storeAddressTo(orderAddress, storeObject);
                        continue;
                    }
                } else {
                    storeObject = StoreMgr.getStore(pli.custom.fromStoreId);
                    //Changes the shipment address to reflect the new store address.
                    pli.shipment.shippingAddress.setFirstName('');
                    pli.shipment.shippingAddress.setLastName(storeObject.name);
                    pli.shipment.shippingAddress.setAddress1(storeObject.address1);
                    pli.shipment.shippingAddress.setAddress2(storeObject.address2);
                    pli.shipment.shippingAddress.setCity(storeObject.city);
                    pli.shipment.shippingAddress.setPostalCode(storeObject.postalCode);
                    pli.shipment.shippingAddress.setStateCode(storeObject.stateCode);
                    pli.shipment.shippingAddress.setCountryCode(storeObject.custom.countryCodeValue);
                    pli.shipment.shippingAddress.setPhone(storeObject.phone);
                    pli.shipment.custom.fromStoreId = pli.custom.fromStoreId;
                    continue;
                }
            }

            //Checks whether the function is creating a new shipment or adding to an existing one.
            if (sliArrayList.contains(pli.custom.fromStoreId)) {
                //Adds the product line item to the existing shipment.
                //Loops through to find the shipment with the storeid and set it as the shipment for the pli.
                var shipments = this.getShipments();
                for (var j = 0; j < this.getShipments().length; j++) {
                    var inStoreShipment = shipments[j];

                    if (inStoreShipment.custom.fromStoreId && (pli.custom.fromStoreId === inStoreShipment.custom.fromStoreId)) {
                        //If an existing shipment that has the correct address is found.
                        pli.setShipment(inStoreShipment);
                    }

                }

            } else {
                //create a new shipment to put this product line item in
                var shipment = null;
                shipment = this.createShipment(UUIDUtils.createUUID());
                shipment.custom.fromStoreId = pli.custom.fromStoreId;
                shipment.custom.shipmentType = 'instore';

                //Loops over the shipping methods and picks the in-store method.
                var shippingMethods = new ArrayList(ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods());
                for (var k = 0; k < shippingMethods.length; k++) {
                    var shippingMethod = shippingMethods[k];

                    if (shippingMethod.custom.storePickupEnabled) {
                        shipment.setShippingMethod(shippingMethod);
                    }

                }

                shippingAddress = new TransientAddress();
                storeObject = StoreMgr.getStore(pli.custom.fromStoreId);
                orderAddress = shipment.createShippingAddress();
                shippingAddress.storeAddressTo(orderAddress, storeObject);
                pli.setShipment(shipment);

            }

            sliArrayList.add(pli.custom.fromStoreId);
        }

        return homeDeliveries;
    },

    /**
     * Updates the shipping method of the given shipment. If a shipping method ID is given, the given
     * shipping method is used to update the shipment.
     *
     * @alias module:models/CartModel~CartModel/preCalculateShipping
     * @param {dw.order.ShippingMethod} shippingMethod - A shipping method.
     * @returns {Object} Returns the following object:
     * <code><pre>
     * "shippingExclDiscounts"         : this.getShippingTotalPrice(),
     * "shippingInclDiscounts"         : this.getAdjustedShippingTotalPrice(),
     * "productShippingCosts"          : productShippingCosts,
     * "productShippingDiscounts"      : productShippingDiscounts,
     * "shippingPriceAdjustments"      : priceAdjArray,
     * "shippingPriceAdjustmentsTotal" : priceAdjTotal,
     * "surchargeAdjusted"             : adustedSurchargeTotal,
     * "baseShipping"                  : baseShipping,
     * "baseShippingAdjusted"          : baseShippingAdjusted
     * </pre></code>
     */
    preCalculateShipping: function (shippingMethod) {

        var shipment = this.getDefaultShipment();

        if (shipment) {
            var currencyCode = this.getCurrencyCode();
            var productShippingCosts     = [], // array to hold product level shipping costs (fixed or surcharges), each entry is an object containing product name and shipping cost
                productShippingDiscounts = new ArrayList(), // list holds all products shipping discounts NOT promotions e.g. fixed shipping discount or free shipping for individual products discount
                productIter              = this.getAllProductLineItems().iterator(),
                priceAdj,
                priceAdjArray            = [], // array to hold shipping price adjustments data (we have to create objects since price adjustments get lost after applying a shipping method
                priceAdjIter             = shipment.getShippingPriceAdjustments().iterator(),
                priceAdjTotal            = new Money(0.0, currencyCode), // total of all price adjustments
                surchargeTotal           = new Money(0.0, currencyCode), // total of all surcharges
                adustedSurchargeTotal    = new Money(0.0, currencyCode); // total of all surcharges minus price adjustments

            // Iterates over all products in the basket
            // and calculates their shipping cost and shipping discounts
            while (productIter.hasNext()) {
                var pli = productIter.next();
                var product = pli.product;
                if (product) {
                    var psc = ShippingMgr.getProductShippingModel(product).getShippingCost(shippingMethod);
                    productShippingCosts[productShippingCosts.length] = {
                        name: product.name,
                        shippingCost: psc,
                        qty: pli.getQuantity()
                    };
                    if (psc && psc.getAmount() && psc.isSurcharge()) {
                        // update the surcharge totals
                        surchargeTotal = surchargeTotal.add(psc.getAmount());
                        adustedSurchargeTotal = adustedSurchargeTotal.add(psc.getAmount());
                    }
                    //productShippingDiscounts.addAll(discountPlan.getProductShippingDiscounts(pli));
                    //productShippingDiscounts.addAll(pli.shippingLineItem.priceAdjustments);
                    if (pli.shippingLineItem) {
                        var pdiscountsiter = pli.shippingLineItem.priceAdjustments.iterator();
                        while (pdiscountsiter.hasNext()) {
                            priceAdj = pdiscountsiter.next();
                            if (priceAdj && priceAdj.promotion !== null) {
                                if (pli.shippingLineItem.isSurcharge()) {
                                    // adjust the surchage total value
                                    adustedSurchargeTotal = adustedSurchargeTotal.add(priceAdj.price);
                                }
                                productShippingDiscounts.add({
                                    price: priceAdj.price,
                                    calloutMsg: priceAdj.promotion.calloutMsg
                                });
                            }
                        }
                    }
                }
            }

            // Iterates over all shipping price adjustments and
            // grabs price and calloutMsg objects.
            while (priceAdjIter.hasNext()) {
                priceAdj = priceAdjIter.next();
                if (priceAdj && priceAdj.promotion !== null) {
                    priceAdjTotal = priceAdjTotal.add(priceAdj.price);
                    priceAdjArray[priceAdjArray.length] = {
                        price: priceAdj.price,
                        calloutMsg: priceAdj.promotion.calloutMsg
                    };
                }
            }

            var baseShipping = this.getShippingTotalPrice().subtract(surchargeTotal);
            var baseShippingAdjusted = null;
            if (priceAdjTotal >= 0) {
                baseShippingAdjusted = baseShipping.subtract(priceAdjTotal);
            } else {
                baseShippingAdjusted = baseShipping.add(priceAdjTotal);
            }

            return {
                shippingExclDiscounts: this.getShippingTotalPrice(),
                shippingInclDiscounts: this.getAdjustedShippingTotalPrice(),
                productShippingCosts: productShippingCosts,
                productShippingDiscounts: productShippingDiscounts,
                shippingPriceAdjustments: priceAdjArray,
                shippingPriceAdjustmentsTotal: priceAdjTotal,
                surchargeAdjusted: adustedSurchargeTotal,
                baseShipping: baseShipping,
                baseShippingAdjusted: baseShippingAdjusted
            };
        }
    },

    /**
     * Sets the shipping method of the given shipment to the passed method.  The list of allowed shipping
     * methods may be passed in as a parameter.  If not, then it is retrieved using ShipmentShippingModel.getApplicableShippingMetods().
     * If the passed shipping method is not in this list, then the function uses the default shipping method.
     * If the default shipping method is not in the list, the function uses the first method in the list.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/updateShipmentShippingMethod
     * @param {String} shipmentID - The ID of the shipment to update the shipping method for.
     * @param {String} shippingMethodID - The ID of the shipping method to set for the shipment.
     * @param {dw.order.ShippingMethod} shippingMethod - The shipping method to set for the shipment.
     * @param {dw.util.Collection} shippingMethods - The list of applicable shipping methods.
     */
    updateShipmentShippingMethod: function (shipmentID, shippingMethodID, shippingMethod, shippingMethods) {

        var shipment = this.getShipment(shipmentID);

        if (!shippingMethods) {
            shippingMethods = ShippingMgr.getShipmentShippingModel(shipment).getApplicableShippingMethods();
        }

        // Tries to set the shipment shipping method to the passed one.
        for (var i = 0; i < shippingMethods.length; i++) {
            var method = shippingMethods[i];

            if (!shippingMethod) {
                if (!method.ID.equals(shippingMethodID)) {
                    continue;
                }
            } else {
                if (method !== shippingMethod) {
                    continue;
                }

            }

            // Sets this shipping method.
            shipment.setShippingMethod(method);
            return;
        }

        var defaultShippingMethod = ShippingMgr.getDefaultShippingMethod();
        if (shippingMethods.contains(defaultShippingMethod)) {
            // Sets the default shipping method if it is applicable.
            shipment.setShippingMethod(defaultShippingMethod);
        } else if (shippingMethods.length > 0) {
            // Sets the first shipping method in the applicable list.
            shipment.setShippingMethod(shippingMethods.iterator().next());
        } else {
            // Invalidates the current shipping method selection.
            shipment.setShippingMethod(null);
        }

        return;
    },

    /**
     * Retrieves the list of applicable shipping methods for a given shipment and a full or partial shipping address.
     * A shipping method is applicable if it does not exclude any of the products in the shipment, and does not
     * exclude the specified address.
     *
     * @alias module:models/CartModel~CartModel/getApplicableShippingMethods
     * @param {module:models/TransientAddressModel~TransientAddressModel} address - The address to get the applicable shipping
     * methods for.
     * @returns {dw.util.Collection} The list of applicable shipping methods for the default shipment and the given address.
     */
    getApplicableShippingMethods: function (address) {
        // Modify as needed.
        if (!address.countryCode) {
            address.countryCode = 'US';
        }
        if (!address.stateCode) {
            address.stateCode = 'NY';
        }

        // Retrieves the list of applicable shipping methods for the given shipment and address.
        return ShippingMgr.getShipmentShippingModel(this.getDefaultShipment()).getApplicableShippingMethods(address);
    },


    /**
     * Deletes multiple payment instruments.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/removePaymentInstruments
     * @param {dw.util.Collection} paymentInstruments - The payment instruments to remove.
     */
    removePaymentInstruments: function (paymentInstruments) {

        for (var i = 0; i < paymentInstruments.length; i++) {
            var pi = paymentInstruments[i];
            this.removePaymentInstrument(pi);
        }

    },

    /**
     * Calculates the total amount of an order paid for by gift certificate payment
     * instruments. Any remaining open amount is applied to the non-gift certificate payment
     * instrument, such as a credit card. <b>Note:</b> this script assumes that only one non-gift certificate
     * payment instrument is used for the payment.
     *
     * @alias module:models/CartModel~CartModel/calculatePaymentTransactionTotal
     * @returns {boolean} false in the case of an error or if the amount of the transaction is not covered, true otherwise.
     */
    calculatePaymentTransactionTotal: function () {

        // Gets all payment instruments for the basket.
        var iter = this.getPaymentInstruments().iterator();
        var paymentInstrument = null;
        var nonGCPaymentInstrument = null;
        var giftCertTotal = new Money(0.0, this.getCurrencyCode());

        // Locates a non-gift certificate payment instrument if one exists.
        while (iter.hasNext()) {
            paymentInstrument = iter.next();
            if (PaymentInstrument.METHOD_GIFT_CERTIFICATE.equals(paymentInstrument.getPaymentMethod())) {
                giftCertTotal = giftCertTotal.add(paymentInstrument.getPaymentTransaction().getAmount());
                continue;
            }

            // Captures the non-gift certificate payment instrument.
            nonGCPaymentInstrument = paymentInstrument;
            break;
        }

        // Gets the order total.
        var orderTotal = this.getTotalGrossPrice();

        // If a gift certificate payment and non-gift certificate payment
        // instrument are found, the function returns true.
        if (!nonGCPaymentInstrument) {
            // If there are no other payment types and the gift certificate
            // does not cover the open amount, then return false.
            if (giftCertTotal < orderTotal) {
                return false;
            } else {
                return true;
            }
        }

        // Calculates the amount to be charged for the
        // non-gift certificate payment instrument.
        var amount = this.getNonGiftCertificateAmount();

        // now set the non-gift certificate payment instrument total.
        if (amount.value <= 0.0) {
            var zero = new Money(0, amount.getCurrencyCode());
            nonGCPaymentInstrument.getPaymentTransaction().setAmount(zero);
        } else {
            nonGCPaymentInstrument.getPaymentTransaction().setAmount(amount);
        }

        return true;
    },

  
    /**
     * Verifies whether existing non-gift-certificate payment instrument methods or cards are still applicable.
     * Returns the collection of valid and invalid payment instruments.
     *
     * @alias module:models/CartModel~CartModel/validatePaymentInstruments
     * @param {dw.customer.Customer} customer - The current customer.
     * @param {String} countryCode - The country code.
     * @param {Number} amount - The payment amount.
     *
     * @returns {dw.util.Collection} ValidPaymentInstruments - The collection of valid payment instruments.
     * @returns {dw.util.Collection} InvalidPaymentInstruments - The collection of invalid payment instruments.
     */
    validatePaymentInstruments: function (customer, countryCode, amount) {
        var paymentHelpers = require('~/cartridge/scripts/payment/common');
        return paymentHelpers.validatePaymentInstruments(this, countryCode, amount);
    },


    /**
     * Creates a new QuantityLineItem helper object for each quantity of a ProductLineItem, if one does not already exist.
     * It does not create QuantityLineItems for products using in-store pickup as the shipping method.
     *
     * @alias module:models/CartModel~CartModel/separateQuantities
     * @param {dw.order.ProductLineItem} pli - The ProductLineItem.
     * @param {dw.util.ArrayList} quantityLineItems - The existing QuantityLineItems.
     * @returns {dw.util.ArrayList} A list of separated QuantityLineItems.
     */
    separateQuantities: function (pli, quantityLineItems) {

        var quantity = pli.quantityValue;

        // Creates new ArrayList if there are no QLIs
        if (!quantityLineItems) {
            quantityLineItems = new ArrayList();
        }

        // Creates for each quantity of the ProductLineItem a new QuantityLineItem.
        for (var i = 0; i < quantity; i++) {
            //Skips plis that are using the in-store pick up shipping method.
            if (empty(pli.custom.fromStoreId)) {
                quantityLineItems.add(new QuantityLineItem(pli));
            }
        }

        return quantityLineItems;
    },

    /**
     * Loads customer addresses and shipment addresses and stores them into the session address book attribute of the cart,
     * if they are available and configured in Business Manager.
     * @alias module:models/CartModel~CartModel/initAddressBook
     * @transactional
     *
     * @param {dw.customer.Customer} customer - The customer to load the addresses from.
     */
    initAddressBook: function (customer) {

        var shipments = this.getShipments();

        // Loads addresses from the customer address book.
        if (customer.registered && customer.addressBook) {
            for (var i = 0; i < customer.addressBook.addresses.length; i++) {
                this.addAddressToAddressBook(customer.addressBook.addresses[i]);
            }
        }

        // Loads addresses from Shipments excluding in-store shipments.
        if (shipments) {
            for (var k = 0; k < shipments.length; k++) {
                var shipment = shipments[k];
                if (shipment.shippingAddress && shipment.custom.shipmentType !== 'instore') {
                    this.addAddressToAddressBook(shipment.getShippingAddress());
                }
            }
        }
    },

    /**
     * Returns all addresses of the cart's address book. The addresses are stored as a JSON objects in a custom
     * attribute named 'sessionAddressBook'.
     *
     * @alias module:models/CartModel~CartModel/getAddressBookAddresses
     * @returns {dw.util.ArrayList} An ArrayList containing a addresses of the addresses stored in the carts address
     * book.
     */
    getAddressBookAddresses: function () {
        var addressBook = {};
        var addresses = new ArrayList();

        if (!empty(this.object.describe().getCustomAttributeDefinition('sessionAddressBook'))) {

            // Checks session addresses availability.
            if (this.object.custom.sessionAddressBook) {
                try {
                    addressBook = JSON.parse(this.object.custom.sessionAddressBook);
                    addresses.add(addressBook.addresses);
                } catch (error) {
                    MultiShippingLogger.error(Resource.msgf('multishipping.error.parsejson', 'checkout', null, error));
                    return null;
                }
            }

            return addresses;
        }

        return null;
    },

    /**
     * Adds the given address to the address book of the cart.
     *
     * @alias module:models/CartModel~CartModel/addAddressToAddressBook
     * @transactional
     * @param {module:models/TransientAddressModel~TransientAddressModel} addressToAdd - The address to add.
     */
    addAddressToAddressBook: function (addressToAdd) {
        var address = new TransientAddress();
        var addressBook = {};

        if (addressToAdd) {

            // Tries to parse incoming JSON string.
            if (this.object.custom.sessionAddressBook) {
                try {
                    addressBook = JSON.parse(this.object.custom.sessionAddressBook);
                } catch (error) {
                    MultiShippingLogger.error(Resource.msgf('multishipping.error.parsejson', 'checkout', null, error));
                    return;
                }
            }

            // Checks if JSON object already has addresses.
            if (!(addressBook.addresses instanceof Array)) {
                addressBook.addresses = [];
            }

            // Copies referenceAddress to address object to be stringified.
            address.copyFrom(addressToAdd);
            address.UUID = addressToAdd.UUID;
            // Adds address if not already existing.
            if (!address.addressExists(addressBook.addresses)) {
                addressBook.addresses.push(address);
            }
        }

        this.object.custom.sessionAddressBook = JSON.stringify(addressBook);
    },

    /**
     * Updates the given address in the cart's address book.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/updateAddressBookAddress
     * @param {module:models/TransientAddressModel~TransientAddressModel} addressToUpdate - The address to update.
     */
    updateAddressBookAddress: function (addressToUpdate) {
        var addresses = [];
        var addressBook = {};

        if (addressToUpdate && this.object.custom.sessionAddressBook) {
            try {
                addressBook = JSON.parse(this.object.custom.sessionAddressBook);
            } catch (error) {
                MultiShippingLogger.error(Resource.msgf('multishipping.error.parsejson', 'checkout', null, error));
                return;
            }

            addresses = addressBook.addresses;

            for (var i = 0; i < addresses.length; i++) {
                if (addresses[i].UUID === addressToUpdate.UUID) {
                    addressToUpdate.ID = addresses[i].ID;
                    addressToUpdate.referenceAddressUUID = addresses[i].referenceAddressUUID;
                    addressBook.addresses[i] = addressToUpdate;
                }
            }

            this.object.custom.sessionAddressBook = JSON.stringify(addressBook);
        }
    },

    /**
     * Creates an Order based on the cart. If the order is created successfully, it has status CREATED.
     * Once the order is created, the cart is removed from the session and marked for removal.
     *
     * If the order is not created successfully the function returns null, if any of the following conditions are encountered:
     * <ul>
     * <li>any of the totals (net, gross, tax) of the basket is N/A</li>
     * <li>any of the product items is not available</li>
     * <li>any campaign-based coupon in the basket is invalid (see dw.order.CouponLineItem.isValid())</li>
     * <li>the basket represents an order being edited, but the order has been already been replaced by another order</li>
     * <li>the basket represents an order being edited, but the customer associated with the original order is not the same as the current customer</li>
     * </ul>
     * All empty shipments of the basket are removed before creating the order. A shipment is empty if it contains
     * no product or gift certificate line items or all total prices (net, gross, tax) are 0.0.
     *
     * The function decrements inventory for all products contained in the order. This means the 'reserve inventory for
     * order' functionality must not be subsequently called. The function redeems all coupons contained in the order.
     *
     * If the cart contains product or gift certificate line items associated with product list items, the function
     * updates the purchase of the product list items. For example, if the basket contains an item added from a gift
     * registry, the purchase history of the respective gift registry item is updated.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/createOrder
     * @returns {dw.order.Order} The created order in status CREATED or null if an error occured.
     */
    createOrder: function () {
        var basket = this.object;
        var order;
        try {
            order = Transaction.wrap(function () {
                return OrderMgr.createOrder(basket);
            });
        } catch (error) {
            return;
        }

        return order;
    },

    /**
     * Determines if the cart already contains payment instruments of the given payment method and removes them
     * from the basket.
     *
     * @transactional
     * @alias module:models/CartModel~CartModel/removeExistingPaymentInstruments
     * @param {String} method - Name of the payment method.
     */
    removeExistingPaymentInstruments: function (method) {
        var iter = this.getPaymentInstruments(method).iterator();

        // Remove payment instruments.
        while (iter.hasNext()) {
            this.removePaymentInstrument(iter.next());
        }
    }

});


/**
 * Gets or creates a new instance of a basket.
 *
 * @alias module:models/CartModel~CartModel/goc
 * @returns {module:models/CartModel~CartModel}
 */
CospaCartModel.goc = function () {
    var obj = null;

    var basket = BasketMgr.getCurrentOrNewBasket();

    if (basket && basket !== null) {
        obj = basket;
    }

    return new CospaCartModel(obj);
};



/** The cart class */
module.exports = CospaCartModel;
