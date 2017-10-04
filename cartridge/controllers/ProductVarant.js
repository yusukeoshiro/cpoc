'use strict';
var params = request.httpParameterMap;

/* Script Modules */
var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var CompanyModel = require('training/cartridge/scripts/models/CompanyModel');
var training_app = require('training/cartridge/scripts/training_app');


function varitationShow() {

    const Product = training_app.getModel('Product');
    const resetAttributes = false;
    let product = Product.get('cospa-0001');

    let currentVariationModel = product.updateVariationSelection(params);
    product = product.isVariationGroup() ? product : getSelectedProduct(product);

    if (product.isVisible()) {
        if (params.source.stringValue === 'bonus') {
            const Cart = app.getModel('Cart');
            const bonusDiscountLineItems = Cart.get().getBonusDiscountLineItems();
            let bonusDiscountLineItem = null;

            for (let i = 0; i < bonusDiscountLineItems.length; i++) {
                if (bonusDiscountLineItems[i].UUID === params.bonusDiscountLineItemUUID.stringValue) {
                    bonusDiscountLineItem = bonusDiscountLineItems[i];
                    break;
                }
            }

            app.getView('Product', {
                product: product,
                CurrentVariationModel: currentVariationModel,
                BonusDiscountLineItem: bonusDiscountLineItem
            }).render('product/components/bonusproduct');
        } else if (params.format.stringValue) {
            app.getView('Product', {
                product: product,
                GetImages: true,
                resetAttributes: resetAttributes,
                CurrentVariationModel: currentVariationModel
            }).render('product/productcontent');
        } else {
            app.getView('Product', {
                product: product,
                CurrentVariationModel: currentVariationModel
            }).render('product/product');
        }
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Renders variation selection controls for the product set item identified by a given product ID, taken from the httpParameterMap.
 *
 * If the product is online, updates variation information and gets the selected variant. If it is an ajax request, renders the
 * product set page (product/components/productsetproduct template), otherwise renders the product page (product/product template).
 *  If the product is offline, sets the request status to 401 and renders an error page (error/notfound template).
 *
 */
function variationPS() {

    var Product = training_app.getModel('Product');
    var product = Product.get(params.pid.stringValue);

    if (product.isVisible()) {

        var productView = app.getView('Product', {
            product: product
        });

        var productVariationSelections = productView.getProductVariationSelections(params);
        product = Product.get(productVariationSelections.SelectedProduct);

        if (product.isMaster()) {
            product = Product.get(product.getVariationModel().getDefaultVariant());
        }

        if (params.format.stringValue) {
            app.getView('Product', {product: product}).render('product/components/productsetproduct');
        } else {
            app.getView('Product', {product: product}).render('product/product');
        }
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}



/**
 * Renders a set item view for a given product ID, taken from the httpParameterMap pid parameter.
 * If the product is online, get a ProductView and renders the product set page (product/components/productsetproduct template).
*  If the product is offline, sets the request status to 401 and renders an error page (error/notfound template).
*/
function getSetItem() {
    var currentVariationModel;
    var Product = training_app.getModel('Product');
    var product = Product.get(params.pid.stringValue);
    product = getSelectedProduct(product);
    currentVariationModel = product.updateVariationSelection(params);

    if (product.isVisible()) {
        app.getView('Product', {
            product: product,
            CurrentVariationModel: currentVariationModel,
            isSet: true
        }).render('product/components/productsetproduct');
    } else {
        // @FIXME Correct would be to set a 404 status code but that breaks the page as it utilizes
        // remote includes which the WA won't resolve
        response.setStatus(410);
        app.getView().render('error/notfound');
    }

}

/**
 * Checks whether a given product has all required attributes selected, and returns the selected variant if true
 *
 * @param {dw.catalog.Product} product
 * @returns {dw.catalog.Product} - Either input product or selected product variant if all attributes selected
 */
function getSelectedProduct (product) {
    const currentVariationModel = product.updateVariationSelection(params);
    let selectedVariant;

    if (currentVariationModel) {
        selectedVariant = currentVariationModel.getSelectedVariant();
        if (selectedVariant) {
            product = app.getModel('Product').get(selectedVariant);
        }
    }

    return product;
}

/*
 * Web exposed methods
 */
/**
 * Renders the product template.
 * @see module:controllers/Product~show
 */
exports.Show = guard.ensure(['get'], varitationShow);

