'use strict';

/**
 * Controller for all customer login storefront processes.
 *
 * @module controllers/Login
 */

/* API Includes */
var OAuthLoginFlowMgr = require('dw/customer/oauth/OAuthLoginFlowMgr');
var OrderMgr = require('dw/order/OrderMgr');
var Transaction = require('dw/system/Transaction');
var URLUtils = require('dw/web/URLUtils');
var RateLimiter = require('storefront_core/cartridge/scripts/util/RateLimiter');

/* Script Modules */
var app = require('storefront_controllers/cartridge/scripts/app');
var guard = require('storefront_controllers/cartridge/scripts/guard');
var training_app = require('training/cartridge/scripts/training_app');
var Customer = app.getModel('Customer');
var LOGGER = dw.system.Logger.getLogger('login');

/**
 * Contains the login page preparation and display, it is called from various
 * places implicitly when 'loggedIn' is ensured via the {@link module:guard}.
 */
function show() {
    var pageMeta = require('storefront_controllers/cartridge/scripts/meta');
    var ContentMgr = dw.content.ContentMgr;
    var content = ContentMgr.getContent('myaccount-login');
    var loginForm = app.getForm('login');
    var oauthLoginForm = app.getForm('oauthlogin');
    var orderTrackForm = app.getForm('ordertrack');
    var loginView = app.getView('Login',{
        RegistrationStatus: false
    });

    loginForm.clear();
    oauthLoginForm.clear();
    orderTrackForm.clear();

    if (customer.registered) {
        loginForm.setValue('username', customer.profile.credentials.login);
        loginForm.setValue('rememberme', true);
    }

    if (content) {
        pageMeta.update(content);
    }

    // Save return URL in session.
    if (request.httpParameterMap.original.submitted) {
        session.custom.TargetLocation = request.httpParameterMap.original.value;
    }

    if (request.httpParameterMap.scope.submitted) {
        switch (request.httpParameterMap.scope.stringValue) {
            case 'wishlist':
                loginView.template = 'account/wishlist/wishlistlanding';
                break;
            case 'giftregistry':
                loginView.template = 'account/giftregistry/giftregistrylanding';
                break;
            default:
        }
    }

    loginView.render();
}

/**
 * Internal function that reads the URL that should be redirected to after successful login
 * @return {dw.web.Url} The URL to redirect to in case of success
 * or {@link module:controllers/Account~Show|Account controller Show function} in case of failure.
 */
function getTargetUrl () {
    if (session.custom.TargetLocation) {
        var target = session.custom.TargetLocation;
        delete session.custom.TargetLocation;
        //@TODO make sure only path, no hosts are allowed as redirect target
        dw.system.Logger.info('Redirecting to "{0}" after successful login', target);
        return decodeURI(target);
    } else {
        return URLUtils.https('Account-Show');
    }
}

/**
 * Form handler for the login form. Handles the following actions:
 * - __login__ - logs the customer in and renders the login page.
 * If login fails, clears the login form and redirects to the original controller that triggered the login process.
 * - __register__ - redirects to the {@link module:controllers/Account~startRegister|Account controller StartRegister function}
 * - __findorder__ - if the ordertrack form does not contain order number, email, or postal code information, redirects to
 * {@link module:controllers/Login~Show|Login controller Show function}. If the order information exists, searches for the order
 * using that information. If the order cannot be found, renders the LoginView. Otherwise, renders the order details page
 * (account/orderhistory/orderdetails template).
 * - __error__ - renders the LoginView.
 */
function handleLoginForm () {
    var loginForm = app.getForm('login');

    loginForm.handleAction({
        login: function () {
            // Check to see if the number of attempts has exceeded the session threshold
            if (RateLimiter.isOverThreshold('FailedLoginCounter')) {
                RateLimiter.showCaptcha();
            }

            var success = Customer.login(loginForm.getValue('username'), loginForm.getValue('password'), loginForm.getValue('rememberme'));

            if (!success) {
                loginForm.get('loginsucceeded').invalidate();
                app.getView('Login').render();
                return;
            } else {
                loginForm.clear();
            }

            RateLimiter.hideCaptcha();

            // In case of successful login
            // Redirects to the original controller that triggered the login process.
            response.redirect(getTargetUrl());

            return;
        },
        register: function () {
            response.redirect(URLUtils.https('Account-StartRegister'));
            return;
        },
        findorder: function () {
            var orderTrackForm = app.getForm('ordertrack');
            var orderNumber = orderTrackForm.getValue('orderNumber');
            var orderFormEmail = orderTrackForm.getValue('orderEmail');
            var orderPostalCode = orderTrackForm.getValue('postalCode');

            if (!orderNumber || !orderPostalCode || !orderFormEmail) {
                response.redirect(URLUtils.https('Login-Show'));
                return;
            }

            // Check to see if the number of attempts has exceeded the session threshold
            if (RateLimiter.isOverThreshold('FailedOrderTrackerCounter')) {
                RateLimiter.showCaptcha();
            }

            var orders = OrderMgr.searchOrders('orderNo={0} AND status!={1}', 'creationDate desc', orderNumber,
                dw.order.Order.ORDER_STATUS_REPLACED);

            if (empty(orders)) {
                app.getView('Login', {
                    OrderNotFound: true
                }).render();
                return;
            }

            var foundOrder = orders.next();

            if (foundOrder.billingAddress.postalCode.toUpperCase() !== orderPostalCode.toUpperCase() || foundOrder.customerEmail !== orderFormEmail) {
                app.getView('Login', {
                    OrderNotFound: true
                }).render();
                return;
            }

            // Reset the error condition on exceeded attempts
            RateLimiter.hideCaptcha();

            app.getView({
                Order: foundOrder
            }).render('account/orderhistory/orderdetails');
        },
        search: function (form, action) {
            var ProductList = require('dw/customer/ProductList');
            var ProductListModel = app.getModel('ProductList');
            var context = {};
            var searchForm, listType, productLists, template;
            if (action.htmlName.indexOf('wishlist_search') !== -1) {
                searchForm = action.parent;
                listType = ProductList.TYPE_WISH_LIST;
                template = 'account/wishlist/wishlistresults';
                productLists = ProductListModel.search(searchForm, listType);
                Transaction.wrap(function () {
                    session.forms.wishlist.productlists.copyFrom(productLists);
                    searchForm.clearFormElement();
                });
                context.SearchFirstName = searchForm.firstname.value;
                context.SearchLastName = searchForm.lastname.value;
                context.SearchEmail = searchForm.email.value;
            } else if (action.htmlName.indexOf('giftregistry_search') !== -1) {
                searchForm = action.parent.simple;
                listType = ProductList.TYPE_GIFT_REGISTRY;
                template = 'account/giftregistry/giftregistryresults';
                productLists = ProductListModel.search(searchForm, listType);
                context.ProductLists = productLists;
            }
            app.getView(context).render(template);
        },
        error: function () {
            app.getView('Login').render();
            return;
        }
    });
}

/**
 * Form handler for the oauthlogin form. Handles the following actions:
 * - __login__ - Starts the process of authentication via an external OAuth2 provider.
 * Uses the OAuthProvider property in the httpParameterMap to determine which provider to initiate authentication with.
 * Redirects to the provider web page where the customer initiates the actual user authentication.
 * If no provider page is available, renders the LoginView.
 * - __error__ - renders the LoginView.
 */
function handleOAuthLoginForm() {
    var oauthLoginForm = app.getForm('oauthlogin');
    oauthLoginForm.handleAction({
        login: function () {
            if (request.httpParameterMap.OAuthProvider.stringValue) {
                session.custom.RememberMe = request.httpParameterMap.rememberme.booleanValue || false;

                var OAuthProviderID = request.httpParameterMap.OAuthProvider.stringValue;
                var initiateOAuthLoginResult = OAuthLoginFlowMgr.initiateOAuthLogin(OAuthProviderID);

                if (!initiateOAuthLoginResult) {
                    oauthLoginForm.get('loginsucceeded').invalidate();

                    // Show login page with error.
                    app.getView('Login').render();
                    return;

                }
                response.redirect(initiateOAuthLoginResult.location);
            }
            return;
        },
        error: function () {
            app.getView('Login').render();
            return;
        }
    });
}

/**
 * Determines whether the request has an OAuth provider set. If it does, calls the
 * {@link module:controllers/Login~handleOAuthLoginForm|handleOAuthLoginForm} function,
 * if not, calls the {@link module:controllers/Login~handleLoginForm|handleLoginForm} function.
 */
function processLoginForm () {
    if (request.httpParameterMap.OAuthProvider.stringValue) {
        handleOAuthLoginForm();
    } else {
        handleLoginForm();
    }
}

/**
 * Invalidates the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthFailed() {
    app.getForm('oauthlogin').get('loginsucceeded').invalidate();
    finishOAuthLogin();
}
/**
 * Clears the oauthlogin form.
 * Calls the {@link module:controllers/Login~finishOAuthLogin|finishOAuthLogin} function.
*/
function oAuthSuccess() {
    app.getForm('oauthlogin').clear();
    finishOAuthLogin();
}
/**
 * This function is called after authentication by an external oauth provider.
 * If the user is successfully authenticated, the provider returns an authentication code,
 * this function exchanges the code for a token and with that token requests  the user information specified by
 *  the configured scope (id, first/last name, email, etc.) from the provider.
 * If the token exchange succeeds, calls the {@link module:controllers/Login~oAuthSuccess|oAuthSuccess} function.
 * If the token exchange fails, calls the {@link module:controllers/Login~oAuthFailed|oAuthFailed} function.
 * The function also handles multiple error conditions and logs them.
*/
function handleOAuthReentry() {
    var finalizeOAuthLoginResult = OAuthLoginFlowMgr.finalizeOAuthLogin();
    if (!finalizeOAuthLoginResult) {
        oAuthFailed();
        return;
    }
    var responseText = finalizeOAuthLoginResult.userInfoResponse.userInfo;
    var oAuthProviderID = finalizeOAuthLoginResult.accessTokenResponse.oauthProviderId;
    var accessToken = finalizeOAuthLoginResult.accessTokenResponse.accessToken;

    if (!oAuthProviderID) {
        LOGGER.warn('OAuth provider id is null.');
        oAuthFailed();
        return;
    }

    if (!responseText) {
        LOGGER.warn('Response from provider is empty');
        oAuthFailed();
        return;
    }

    //whether to drop the rememberMe cookie (preserved in the session before InitiateOAuthLogin)
    var rememberMe = session.custom.RememberMe;
    delete session.custom.RememberMe;

    var extProfile = {};
    // All other providers return JSON.
    extProfile = JSON.parse(responseText);
    if (!extProfile) {
        LOGGER.warn('Data could not be extracted from the response:\n{0}', responseText);
        oAuthFailed();
        return;
    }
    if (oAuthProviderID != 'Auth0') {
    	  oAuthFailed();
          return;
    }
   
    var userId =extProfile.email;
    var externalId = extProfile.sub;
    if (!userId) {
        oAuthFailed();
        return;
    }
     
    var profile = dw.customer.CustomerMgr.getExternallyAuthenticatedCustomerProfile(oAuthProviderID, externalId);
    var customer;
       
    if (!profile) {

        var customer = dw.customer.CustomerMgr.getCustomerByLogin(userId);
        // Customer should have been create by calling OCC API. if customer or profile not found. Reject the user
        if(!customer) {
        	oAuthFailed();
	    	return;
        }
        var profile =  customer.profile;
        
        if(!profile) {
	    	oAuthFailed();
	    	return;
        }
        
        Transaction.wrap(function () {
        	   var credentials = profile.getCredentials();
        	   credentials.authenticationProviderID=oAuthProviderID;
        	   credentials.externalID=externalId;
        	   credentials.enabledFlag=true;
        });
        
    } else {
        customer = profile.getCustomer();
    }
    
    Transaction.wrap(function () {
    	customer =  dw.customer.CustomerMgr.loginExternallyAuthenticatedCustomer(oAuthProviderID, externalId, rememberMe);
    });
    
    if(!customer) {
    	oAuthFailed();
    	return;
    }
    
    oAuthSuccess();
}


/**
 * Internal helper function to finish the OAuth login.
 * Redirects user to the location set in either the
 * {@link module:controllers/Login~handleOAuthLoginForm|handleOAuthLoginForm} function
 */
function finishOAuthLogin() {
    // To continue to the destination that is already preserved in the session.
    var location = getTargetUrl().toString();
    response.redirect(location);
}
/**
 * Logs the customer out and clears the login and profile forms.
 * Calls the {@link module:controllers/Account~Show|Account controller Show function}.
 */
function Logout() {
    Customer.logout();

    app.getForm('login').clear();
    app.getForm('profile').clear();


    //Cart.get().calculate();

    response.redirect(URLUtils.https('Account-Show'));
}

/*
 * Web exposed methods
 */
/** Contains the login page preparation and display.
 * @see module:controllers/Login~show */
exports.Show                    = guard.ensure(['https'], show);
/** Determines whether the request has an OAuth provider set.
 * @see module:controllers/Login~processLoginForm */
exports.LoginForm               = guard.ensure(['https','post', 'csrf'], processLoginForm);
/** Form handler for the oauthlogin form.
 * @see module:controllers/Login~handleOAuthLoginForm */
exports.OAuthLoginForm          = guard.ensure(['https','post', 'csrf'], handleOAuthLoginForm);
/** Exchanges a user authentication code for a token and requests user information from an OAUTH provider.
 * @see module:controllers/Login~handleOAuthReentry */
exports.OAuthReentry            = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryLinkedIn    = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGoogle      = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGooglePlus  = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryMicrosoft   = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryFacebook    = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryGitHub      = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentrySinaWeibo   = guard.ensure(['https','get'], handleOAuthReentry);
/** @deprecated This is only kept for compatibility reasons, use {@link module:controllers/Login~handleOAuthReentry|handleOAuthReentry} instead */
exports.OAuthReentryVKontakte   = guard.ensure(['https','get'], handleOAuthReentry);
exports.OAuthReentryAuth0           = guard.ensure(['https','get'], handleOAuthReentry);
/** Contains the login page preparation and display.
 * @see module:controllers/Login~show */
exports.Logout                  = guard.all(Logout);

