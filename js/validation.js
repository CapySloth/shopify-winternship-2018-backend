//https://cdnjs.cloudflare.com/ajax/libs/jquery/3.2.1/jquery.min.js is included in this Pen,
//https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.js is included in this Pen
//JSON Schema validation using Java Script by Kostia Arlouski
//At the point when I was almost finished the challenge, I found out about the concept of Schema validation and a java script libraries that perform it ...Not very DRY of me, but it was fun coding this!
//Build a URL with a proxy, to avoid cross-domain request block
var ShopifyAPI =
	"https://backend-challenge-winter-2017.herokuapp.com/customers.json";
var proxy = "https://cors-anywhere.herokuapp.com/";
var finalURL = proxy + ShopifyAPI;
//Base case counter for recursive loading of JSON data
var counter = 0;
//Create invalid customers JSON object to store information on ids of customers that have invalid fields, as well as information on the fields that are invalid
var jsonObj = { invalid_customers: [] };

//The data is loaded and localy stored to avoid 429 Too Many Requests Error
//If local storage does not contain API JSON data, then request it and store it, otherwise perform validation on pre-stored data
if (localStorage.getItem("shopify-data") === null) {
	getPageJSON(finalURL);
} else {
	beginValidation();
}

//Request Shopify API data until last page is reached and store it in local storage, return true after end of data (last page) is reached
function getPageJSON(ShopifyAPI) {
	$.getJSON(ShopifyAPI, function(data) {
		var pagination = data.pagination;
		counter++;
		//Keep requesting JSON data till last page is reached
		if (counter <= pagination.total) {
			var ShopifyAPI =
				"https://backend-challenge-winter-2017.herokuapp.com/customers.json?page=" +
				counter;
			var proxy = "https://cors-anywhere.herokuapp.com/";
			var finalURL = proxy + ShopifyAPI;
			setDataToLocalStorage(data);
			return getPageJSON(finalURL);
		} else {
			beginValidation();
		}
	});
}

function beginValidation() {
	var localData = getDataFromLocalStorage();
	for (var item in localData) {
		performValidation(localData[item]);
		printInvalidCustomerJSON(jsonObj);
	}
}

//Append object to array, then update local storage value with new array
function setDataToLocalStorage(data) {
	//Grab JSON data from local storage, if it does not exist create an empty array
	var array = JSON.parse(localStorage.getItem("shopify-data")) || [];
	// Push the new data (whether it be an object or anything else) onto the array
	array.push(data);
	// Re-serialize the array back into a string and store it in localStorage
	localStorage.setItem("shopify-data", JSON.stringify(array));
}

//Retrieve array of objects from local storage
function getDataFromLocalStorage() {
	return JSON.parse(localStorage.getItem("shopify-data"));
}

function performValidation(data) {
	var customers = data.customers;
	//For every customer field, check validations placed and call oppropriate functions.
	for (var cust in customers) {
		if (customers.hasOwnProperty(cust)) {
			assignValidation(data, customers[cust]);
		}
	}
}

//Check if requiered, type or lengths validation exists and then if it does, perform the validation, else keep going.
function assignValidation(data, validate) {
	//For each property in validations (Ex. name, email, age, newsletter)
	for (var index in data.validations) {
		var validationPropertyKeyName = Object.keys(
			data.validations[index]
		).toString();
		var valParameter = "[" + index + "]." + validationPropertyKeyName;
		var validationTypeKeysList = Object.keys(
			getNestedObject(data.validations, valParameter)
		);
		var validateKeysList = Object.keys(validate);
		//For each property (key) that a customer has (Ex. name, email ...) check if that property has a validation in validations list
		for (var item in validateKeysList) {
			//If customer has a property which is included in the validation list, perform validation on value of customer's property
			if (validateKeysList[item] === validationPropertyKeyName) {
				for (var validationItem in validationTypeKeysList) {
					var valueToValidateAgainst = getNestedObject(
						getNestedObject(data.validations, valParameter),
						validationTypeKeysList[validationItem]
					);
					var valueToValidate = getNestedObject(validate, validationPropertyKeyName);

					switch (validationTypeKeysList[validationItem]) {
						case "required":
							if (!isRequired(valueToValidateAgainst, valueToValidate)) {
								populateInvalidCustomer(validate, validationPropertyKeyName);
							}
							break;
						case "type":
							if (!isType(valueToValidateAgainst, valueToValidate)) {
								populateInvalidCustomer(validate, validationPropertyKeyName);
							}
							break;
						case "length":
							if (!isLength(valueToValidateAgainst, valueToValidate)) {
								populateInvalidCustomer(validate, validationPropertyKeyName);
							}
							break;
						default:
							break;
					}
				}
			}
		}
	}
}

//Validate if parameter matches type (bool/string/int)
function isType(validation, validate) {
	//Uncomment block of code below, if strings that have values true/false should be treated as valid boolean types
	/*
	if (validate == "true") {
		validate = Boolean(validate.match(/^true$/i));
	} else if (validate == "false") {
		validate = Boolean(validate.match(/^false$/i));
	}
	*/
	if (typeof validate != validation) {
		//Input id and name of customer to "invalid_customer" json object
		return false;
	}
	return true;
}

//Validate if parameter is requiered
function isRequired(validation, validate) {
	if (validation === true) {
		if (validate === "" || validate === null) {
			return false;
		}
	}
	return true;
}

//Validate length
function isLength(validation, validate) {
	if (validate === null || validate === "") {
		if (0 == validation.min || 0 == validation.max) {
			return true;
		}
		return false;
	} else if (
		!validate.toString().length >= validation.min ||
		!validate.toString().length <= validation.max
	) {
		return false;
	}
	return true;
}

//Add Key of object to dot delimited properties list to further navigate JSON object hierarchy dynamically, depending on validation schema
function getNestedObject(object, key) {
	key = key.replace(/\[(\w+)\]/g, ".$1"); //convert keys to properties
	key = key.replace(/^\./, ""); //strip a leading dot
	var a = key.split(".");
	for (var i = 0, n = a.length; i < n; ++i) {
		var k = a[i];
		if (k in object) {
			object = object[k];
		} else {
			return;
		}
	}
	return object;
}

//Populates global array of invalid_customers, with invalid_customer information
function populateInvalidCustomer(validate, validationPropertyKeyName) {
	if (jsonObj.invalid_customers.length === 0) {
		var invalid_customer = {
			id: validate.id,
			invalid_fields: [validationPropertyKeyName]
		};
		jsonObj.invalid_customers.push(invalid_customer);
	} else {
		var isUnique = true;
		//For every customer that exists in invalid_customers
		for (var index in jsonObj.invalid_customers) {
			//Check if customer already exists with other invalid fields
			if (jsonObj.invalid_customers[index].id === validate.id) {
				isUnique = false;
				//If customer exists, check if a field already broke a different type validation and exists in the invalid_fields array
				for (var field in jsonObj.invalid_customers[index].invalid_fields) {
					//If field has not broken any validation type prior, add the field name to invalid_fields array
					if (
						jsonObj.invalid_customers[index].invalid_fields[field] !==
						validationPropertyKeyName
					) {
						jsonObj.invalid_customers[index].invalid_fields.push(
							validationPropertyKeyName
						);
					}
				}
			}
		}
	}

	if (isUnique) {
		var invalid_customer = {
			id: validate.id,
			invalid_fields: [validationPropertyKeyName]
		};
		jsonObj.invalid_customers.push(invalid_customer);
	}
}

function printInvalidCustomerJSON(jsonObj) {
	document.getElementById("invalid_customers").innerHTML = JSON.stringify(
		jsonObj,
		null,
		2
	);
}
