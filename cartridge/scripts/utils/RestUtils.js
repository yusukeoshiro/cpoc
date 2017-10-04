/**
* Description of the module and the logic it provides
*
* @module cartridge/scripts/utils/RestUtils
*/

'use strict';

var Resource = require('dw/web/Resource');

exports.validateRequestId = function()
{
	var remoteIPAddress  = request.httpRemoteAddress;
	var allowedRemoteIPsForAPIAccess  = Resource.msg("api.allowedremoteips", "locale", "");
	if(!empty(allowedRemoteIPsForAPIAccess) &&  allowedRemoteIPsForAPIAccess.indexOf(remoteIPAddress) >= 0){
		return true;
	}
	return false;
}



exports.extractRequestBody = function(){
	
	var requestBody = request.httpParameterMap.requestBodyAsString;
	var object;
	try {
		object = JSON.parse(requestBody);
	}catch(e){
		//TODO
	}
	
	return object;
} 