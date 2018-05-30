	try {
		ChromeUtils.import("resource:///modules/mailServices.js");
		ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
		ChromeUtils.import("resource://gre/modules/Services.jsm");
		ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	}
	catch(e) {
		Components.utils.import("resource:///modules/mailServices.js");
		Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
		Components.utils.import("resource://gre/modules/Services.jsm");
		Components.utils.import("chrome://cardbook/content/cardbookRepository.js");
	}

XPCOMUtils.defineLazyModuleGetter(this, "LDAPAbCardFormatter", "resource://cardbook-modules/formatter.jsm");

const ACR = Components.interfaces.nsIAutoCompleteResult;

function cardbookAutocompleteResult(aSearchString) {
	this._searchResults = [];
	this.searchString = aSearchString;
}

cardbookAutocompleteResult.prototype = {
	_searchResults: null,

	searchString: null,
	searchResult: ACR.RESULT_NOMATCH,
	defaultIndex: -1,
	errorDescription: null,
	listUpdated: false,

	get matchCount() {
		return this._searchResults.length;
	},

	getValueAt: function getValueAt(aIndex) {
		return this._searchResults[aIndex].value;
	},

	getLabelAt: function getLabelAt(aIndex) {
		return this.getValueAt(aIndex);
	},

	getCommentAt: function getCommentAt(aIndex) {
		return this._searchResults[aIndex].comment;
	},

	getStyleAt: function getStyleAt(aIndex) {
		return this._searchResults[aIndex].style;
		// return "local-abook";
	},

	getImageAt: function getImageAt(aIndex) {
		if (this._searchResults[aIndex].style.startsWith("local_")) {
			return "chrome://cardbook/skin/ABLocal.png";
		} else if (this._searchResults[aIndex].style.startsWith("remote_")) {
			return "chrome://cardbook/skin/ABRemote.png";
		} else {
			return "chrome://messenger/skin/addressbook/icons/addrbook.png";
		}
	},

	getFinalCompleteValueAt: function(aIndex) {
		// need to collect popularity for lists
		// when CardBook collects popularities lists are still splitted into emails
		if (!this.listUpdated && this.getTypeAt(aIndex) == "CB_LIST") {
			cardbookMailPopularity.updateMailPopularity(this.getEmailToUse(aIndex));
			// this function getFinalCompleteValueAt is called many times so to update only once we need this variable
			this.listUpdated = true;
				return this.getValueAt(aIndex);
			} else if (this.getTypeAt(aIndex) == "CB_CAT") {
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			var myCardList = [] ;
			var myDirPrefId = this.getDirPrefIdAt(aIndex);
			var myCategory = this.getValueAt(aIndex);
			for (var i = 0; i < cardbookRepository.cardbookDisplayCards[myDirPrefId+"::"+myCategory].length; i++) {
				var myCard = cardbookRepository.cardbookDisplayCards[myDirPrefId+"::"+myCategory][i];
				myCardList.push(myCard);
			}
			var result = cardbookUtils.getMimeEmailsFromCardsAndLists(myCardList, useOnlyEmail).notEmptyResults;
			return cardbookRepository.arrayUnique(result).join(" , ");
		} else {
			return this.getValueAt(aIndex);
		}
	},

	removeValueAt: function removeValueAt(aRowIndex, aRemoveFromDB) {
	},

	getCardAt: function getCardAt(aIndex) {
		return this._searchResults[aIndex].card;
	},

	getEmailToUse: function getEmailToUse(aIndex) {
		return this._searchResults[aIndex].emailToUse;
	},

	getTypeAt: function getTypeAt(aIndex) {
		return this._searchResults[aIndex].type;
	},

	getDirPrefIdAt: function getTypeAt(aIndex) {
		return this._searchResults[aIndex].dirPrefId;
	},

	/* nsISupports */
	QueryInterface: XPCOMUtils.generateQI([ACR])
};

var cardbookAutocompleteSearchClassID = Components.ID("0DE07280-EE68-11E4-B66F-4AD01D5D46B0");
var cardbookAutocompleteSearchInterfaces = [Components.interfaces.nsIAutoCompleteSearch];

function cardbookAutocompleteSearch() {
	Services.obs.addObserver(this, "quit-application", false);
	this.searchTimeout = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
}

cardbookAutocompleteSearch.prototype = {

	classID: cardbookAutocompleteSearchClassID,
	QueryInterface: XPCOMUtils.generateQI(cardbookAutocompleteSearchInterfaces),
	classInfo: XPCOMUtils.generateCI({
		classID: cardbookAutocompleteSearchClassID,
		contractID: "@mozilla.org/autocomplete/search;1?name=addrbook-cardbook",
		classDescription: "Autocompletion search by CardBook",
		interfaces: cardbookAutocompleteSearchInterfaces,
		flags: 0
	}),

	debugMode: false,
	showAddressbookComments: false,
	proposeConcatEmails: false,
	sortUsePopularity: true,
	ABInclRestrictions: {},
	ABExclRestrictions: {},
	catInclRestrictions: {},
	catExclRestrictions: {},
	LDAPContexts: {},
	searchListener: null,
	searchResult: null,
	searchTimeout: null,
	
	addResult: function addResult(aResult, aEmailValue, aComment, aPopularity, aType, aStyle, aLowerFn, aDirPrefId) {
		if (aEmailValue != null && aEmailValue !== undefined && aEmailValue != "") {
			var myComment = "";
			if (aComment != null && aComment !== undefined) {
				myComment = aComment;
			}
			if (this.debugMode) {
				myComment += " [" + aType + ":" + aPopularity + "]";
			}

			if (aResult._searchResults.length === 0) {
				aResult._searchResults.push({
											 value: aEmailValue,
											 comment: myComment,
											 card: null,
											 isPrimaryEmail: true,
											 emailToUse: aEmailValue,
											 popularity: aPopularity,
											 style: aStyle,
											 fn: aLowerFn,
											 dirPrefId: aDirPrefId,
											 type: aType,
										 });
			} else {
				var done = 0;
				for (var i = aResult._searchResults.length - 1 ; i >= 0; i--) {
					if (this.sortUsePopularity) {
						if (Number(aPopularity) < Number(aResult._searchResults[i].popularity)) {
							aResult._searchResults.splice(i+1, 0, {
														 value: aEmailValue,
														 comment: myComment,
														 card: null,
														 isPrimaryEmail: true,
														 emailToUse: aEmailValue,
														 popularity: aPopularity,
														 style: aStyle,
														 fn: aLowerFn,
														 dirPrefId: aDirPrefId,
														 type: aType
													 });
							done = 1;
							break;
						} else if (Number(aPopularity) == Number(aResult._searchResults[i].popularity)) {
							if (aLowerFn > aResult._searchResults[i].fn) {
								aResult._searchResults.splice(i+1, 0, {
															 value: aEmailValue,
															 comment: myComment,
															 card: null,
															 isPrimaryEmail: true,
															 emailToUse: aEmailValue,
															 popularity: aPopularity,
															 style: aStyle,
															 fn: aLowerFn,
															 dirPrefId: aDirPrefId,
															 type: aType
														 });
								done = 1;
								break;
							}
						}
					} else {
						if (aLowerFn > aResult._searchResults[i].fn) {
							aResult._searchResults.splice(i+1, 0, {
														 value: aEmailValue,
														 comment: myComment,
														 card: null,
														 isPrimaryEmail: true,
														 emailToUse: aEmailValue,
														 popularity: aPopularity,
														 style: aStyle,
														 fn: aLowerFn,
														 dirPrefId: aDirPrefId,
														 type: aType
													 });
							done = 1;
							break;
						} else if (aLowerFn == aResult._searchResults[i].fn) {
							if (Number(aPopularity) < Number(aResult._searchResults[i].popularity)) {
								aResult._searchResults.splice(i+1, 0, {
															 value: aEmailValue,
															 comment: myComment,
															 card: null,
															 isPrimaryEmail: true,
															 emailToUse: aEmailValue,
															 popularity: aPopularity,
															 style: aStyle,
															 fn: aLowerFn,
															 dirPrefId: aDirPrefId,
															 type: aType
														 });
								done = 1;
								break;
							}
						}
					}
				}
				if (done === 0) {
					aResult._searchResults.splice(0, 0, {
												 value: aEmailValue,
												 comment: myComment,
												 card: null,
												 isPrimaryEmail: true,
												 emailToUse: aEmailValue,
												 popularity: aPopularity,
												 style: aStyle,
												 fn: aLowerFn,
												 dirPrefId: aDirPrefId,
												 type: aType
											 });
				}
			}
		}
	},

	loadRestrictions: function (aMsgIdentity) {
		var result = [];
		result = cardbookPreferences.getAllRestrictions();
		this.ABInclRestrictions = {};
		this.ABExclRestrictions = {};
		this.catInclRestrictions = {};
		this.catExclRestrictions = {};
		if (aMsgIdentity == "") {
			this.ABInclRestrictions["length"] = 0;
			return;
		}
		for (var i = 0; i < result.length; i++) {
			var resultArray = result[i].split("::");
			if ((resultArray[0] == "true") && ((resultArray[2] == aMsgIdentity) || (resultArray[2] == "allMailAccounts"))) {
				if (resultArray[1] == "include") {
					this.ABInclRestrictions[resultArray[3]] = 1;
					if (resultArray[4] && resultArray[4] != null && resultArray[4] !== undefined && resultArray[4] != "") {
						if (!(this.catInclRestrictions[resultArray[3]])) {
							this.catInclRestrictions[resultArray[3]] = {};
						}
						this.catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
					}
				} else {
					if (resultArray[4] && resultArray[4] != null && resultArray[4] !== undefined && resultArray[4] != "") {
						if (!(this.catExclRestrictions[resultArray[3]])) {
							this.catExclRestrictions[resultArray[3]] = {};
						}
						this.catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
					} else {
						this.ABExclRestrictions[resultArray[3]] = 1;
					}
				}
			}
		}
		this.ABInclRestrictions["length"] = cardbookUtils.sumElements(this.ABInclRestrictions);
	},
	
	/**
	 * Starts a search based on the given parameters.
	 *
	 * @see nsIAutoCompleteSearch for parameter details.
	 *
	 * It is expected that aSearchParam contains the identity (if any) to use
	 * for determining if an address book should be autocompleted against.
	 *
	 * aPreviousResult not used because always empty
	 * popularity not used because not found how to set
	 */
	startSearch: function startSearch(aSearchString, aSearchParam, aPreviousResult, aListener) {
		var result = new cardbookAutocompleteResult(aSearchString);
		result.fireOnce = 0;
		
		// If the search string isn't value, or contains a comma, or the user
		// hasn't enabled autocomplete, then just return no matches / or the
		// result ignored.
		// The comma check is so that we don't autocomplete against the user
		// entering multiple addresses.
		if (!aSearchString || /,/.test(aSearchString)) {
			result.searchResult = ACR.RESULT_IGNORED;
			aListener.onSearchResult(this, result);
			return;
		}

		this.stopSearch();
		
		aSearchString = cardbookRepository.makeSearchString(aSearchString);

		this.debugMode = cardbookPreferences.getBoolPref("extensions.cardbook.debugMode");
		this.sortUsePopularity = cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteSortByPopularity");
		this.showAddressbookComments = cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteShowAddressbook");
		this.useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
		this.proposeConcatEmails = cardbookPreferences.getBoolPref("extensions.cardbook.proposeConcatEmails");
		if (cardbookRepository.autocompleteRestrictSearch) {
			var mySearchArray = cardbookRepository.cardbookCardShortSearch;
		} else {
			var mySearchArray = cardbookRepository.cardbookCardLongSearch;
		}

		var mySearchParamObj = JSON.parse(aSearchParam);
		this.loadRestrictions(mySearchParamObj.idKey);
		
		// add Cards
		for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
			if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && cardbookRepository.cardbookAccounts[i][6] != "SEARCH") {
				var myDirPrefId = cardbookRepository.cardbookAccounts[i][4];
				if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", this.ABExclRestrictions, this.ABInclRestrictions)) {
					var myStyle = cardbookRepository.getABIconType(cardbookRepository.cardbookAccounts[i][6]) + "_color_" + myDirPrefId;
					var myComment = null;
					if (this.showAddressbookComments) {
						// display addressbook name in the comments column
						myComment = cardbookRepository.cardbookAccounts[i][0];
					}
					for (var j in mySearchArray[myDirPrefId]) {
						if (j.indexOf(aSearchString) >= 0 || aSearchString == "") {
							for (var k = 0; k < mySearchArray[myDirPrefId][j].length; k++) {
								var myCard = mySearchArray[myDirPrefId][j][k];
								if (this.catExclRestrictions[myDirPrefId]) {
									var add = true;
									for (var l in this.catExclRestrictions[myDirPrefId]) {
										if (myCard.categories.includes(l)) {
											add = false;
											break;
										}
									}
									if (!add) {
										continue;
									}
								}
								if (this.catInclRestrictions[myDirPrefId]) {
									var add = false;
									for (var l in this.catInclRestrictions[myDirPrefId]) {
										if (myCard.categories.includes(l)) {
											add = true;
											break;
										}
									}
									if (!add) {
										continue;
									}
								}
								var myMinPopularity = 0;
								var first = true;
								for (var l = 0; l < myCard.email.length; l++) {
									var myCurrentPopularity = 0;
									if (cardbookRepository.cardbookMailPopularityIndex[myCard.email[l][0][0].toLowerCase()]) {
										myCurrentPopularity = parseInt(cardbookRepository.cardbookMailPopularityIndex[myCard.email[l][0][0].toLowerCase()]);
										if (first) {
											myMinPopularity = myCurrentPopularity;
											first = false;
										}
									}
									if (myMinPopularity > myCurrentPopularity) {
										myMinPopularity = myCurrentPopularity;
									}
									if (this.useOnlyEmail) {
										this.addResult(result, myCard.email[l][0][0], myComment, myCurrentPopularity, "CB_ONE", myStyle, myCard.fn.toLowerCase(), myDirPrefId);
									} else {
										var myCurrentEmail = MailServices.headerParser.makeMimeAddress(myCard.fn, myCard.email[l][0][0]);
										this.addResult(result, myCurrentEmail, myComment, myCurrentPopularity, "CB_ONE", myStyle, myCard.fn.toLowerCase(), myDirPrefId);
									}
								}
								// add Lists
								if (myCard.isAList) {
									if (cardbookRepository.cardbookMailPopularityIndex[myCard.fn.toLowerCase()]) {
										myCurrentPopularity = cardbookRepository.cardbookMailPopularityIndex[myCard.fn.toLowerCase()];
									}
									this.addResult(result, myCard.fn + " <" + myCard.fn + ">", myComment, myCurrentPopularity, "CB_LIST", myStyle, myCard.fn.toLowerCase(), myDirPrefId);
								} else {
									// otherwise it is already fetched above
									if (this.proposeConcatEmails && myCard.emails.length > 1) {
										if (this.useOnlyEmail) {
											this.addResult(result, myCard.emails.join(" , "), myComment, myMinPopularity, "CB_ALL", myStyle, myCard.fn.toLowerCase(), myDirPrefId);
										} else {
											this.addResult(result, cardbookUtils.getMimeEmailsFromCards([myCard]).join(" , "), myComment, myMinPopularity, "CB_ALL", myStyle, myCard.fn.toLowerCase(), myDirPrefId);
										}
									}
								}
							}
						}
					}
				}
			}
		}
		
		// add Categories
		for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
			if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && cardbookRepository.cardbookAccounts[i][6] != "SEARCH") {
				var myDirPrefId = cardbookRepository.cardbookAccounts[i][4];
				if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", this.ABExclRestrictions, this.ABInclRestrictions)) {
					var myStyle = cardbookRepository.getABIconType(cardbookPreferences.getType(myDirPrefId)) + "_color_" + myDirPrefId;
					var myComment = null;
					if (this.showAddressbookComments) {
						// display addressbook name in the comments column
						myComment = cardbookPreferences.getName(myDirPrefId);
					}
					for (var j = 0; j < cardbookRepository.cardbookAccountsCategories[myDirPrefId].length; j++) {
						var myCategory = cardbookRepository.cardbookAccountsCategories[myDirPrefId][j];
						if (((!(this.catInclRestrictions[myDirPrefId])) && (myCategory != cardbookRepository.cardbookUncategorizedCards)) ||
								((this.catInclRestrictions[myDirPrefId]) && (this.catInclRestrictions[myDirPrefId][myCategory]))) {
							if (cardbookRepository.makeSearchString(myCategory).indexOf(aSearchString) >= 0) {
								if (this.catExclRestrictions[myDirPrefId]) {
									var add = true;
									for (var l in this.catExclRestrictions[myDirPrefId]) {
										if (myCard.categories.includes(l)) {
											add = false;
											break;
										}
									}
									if (!add) {
										continue;
									}
								}
								this.addResult(result, myCategory, myComment, 0, "CB_CAT", myStyle, myCategory.toLowerCase(), myDirPrefId);
							}
						}
					}
				}
			}
		}

		var performLDAPSearch = false;
		var ldapSearchURIs = [];
		
		// add Thunderbird standard emails
		if (!cardbookPreferences.getBoolPref("extensions.cardbook.exclusive")) {
			var contactManager = MailServices.ab;
			var contacts = contactManager.directories;
			var myStyle = "standard-abook";
			while ( contacts.hasMoreElements() ) {
				var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
				if (cardbookRepository.verifyABRestrictions(contact.dirPrefId, "allAddressBooks", this.ABExclRestrictions, this.ABInclRestrictions)) {
					if (contact.isRemote && contact.dirType === 0) {
						// remote LDAP directory
						ldapSearchURIs.push({
								name: contact.dirName,
								uri: contact.URI
						});
						performLDAPSearch = true;
					} else {
						var myComment = null;
						if (this.showAddressbookComments) {
							// display addressbook name in the comments column
							myComment = contact.dirName;
						}
						var abCardsEnumerator = contact.childCards;
						while (abCardsEnumerator.hasMoreElements()) {
							var myABCard = abCardsEnumerator.getNext();
							myABCard = myABCard.QueryInterface(Components.interfaces.nsIAbCard);
							var myDisplayName = myABCard.getProperty("DisplayName","");
							if (!myABCard.isMailList) {
								var myPrimaryEmail = myABCard.getProperty("PrimaryEmail","");
								if (myPrimaryEmail != "") {
									var lSearchString = myABCard.getProperty("FirstName","") + myABCard.getProperty("LastName","") + myDisplayName + myABCard.getProperty("NickName","") + myPrimaryEmail;
									lSearchString = cardbookRepository.makeSearchString(lSearchString);
									if (lSearchString.indexOf(aSearchString) >= 0) {
										if (myDisplayName == "") {
											var delim = myPrimaryEmail.indexOf("@",0);
											myDisplayName = myPrimaryEmail.substr(0,delim);
										}
										var myPopularity = myABCard.getProperty("PopularityIndex", "0");
										if (this.useOnlyEmail) {
											this.addResult(result,  myPrimaryEmail, myComment, myPopularity, "TH_CARD", myStyle, myDisplayName.toLowerCase(), contact.dirPrefId);
										} else {
											this.addResult(result,  MailServices.headerParser.makeMimeAddress(myDisplayName, myPrimaryEmail), myComment, myPopularity, "TH_CARD", myStyle, myDisplayName.toLowerCase(), contact.dirPrefId);
										}
									}
								}
								var mySecondEmail = myABCard.getProperty("SecondEmail","");
								if (mySecondEmail != "") {
									var lSearchString = myABCard.getProperty("FirstName","") + myABCard.getProperty("LastName","") + myDisplayName + myABCard.getProperty("NickName","") + mySecondEmail;
									lSearchString = cardbookRepository.makeSearchString(lSearchString);
									if (lSearchString.indexOf(aSearchString) >= 0) {
										if (myDisplayName == "") {
											var delim = mySecondEmail.indexOf("@",0);
											myDisplayName = mySecondEmail.substr(0,delim);
										}
										var myPopularity = myABCard.getProperty("PopularityIndex", "0");
										if (this.useOnlyEmail) {
											this.addResult(result,  mySecondEmail, myComment, myPopularity, "TH_CARD", myStyle, myDisplayName.toLowerCase(), contact.dirPrefId);
										} else {
											this.addResult(result,  MailServices.headerParser.makeMimeAddress(myDisplayName, mySecondEmail), myComment, myPopularity, "TH_CARD", myStyle, myDisplayName.toLowerCase(), contact.dirPrefId);
										}
									}
								}
							} else {
								var myABList = contactManager.getDirectory(myABCard.mailListURI);
								var lSearchString = myDisplayName + myABList.listNickName + myABList.description;
								lSearchString = cardbookRepository.makeSearchString(lSearchString);
								if (lSearchString.indexOf(aSearchString) >= 0) {
									var myPopularity = myABCard.getProperty("PopularityIndex", "0");
									this.addResult(result,  MailServices.headerParser.makeMimeAddress(myDisplayName, myDisplayName), myComment, myPopularity, "TH_LIST", myStyle, myDisplayName.toLowerCase(), contact.dirPrefId);
								}
							}
						}
					}
				}
			}
		}

		if (performLDAPSearch) {
			var myStyle = "remote"; //"standard-abook";
			this.searchListener = aListener;
			this.searchResult = result;
			this.searchTimeout.init(this, 60000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
			ldapSearchURIs.forEach(function(aDirEntry) {
				this.startSearchFor(aSearchString, aDirEntry, myStyle);
			}, this);
		} else {
			// since there is no pending LDAP search we can immediately return results
			if (result.matchCount) {
				result.searchResult = ACR.RESULT_SUCCESS;
				result.defaultIndex = 0;
			}

			aListener.onSearchResult(this, result);
		}
	},

	startSearchFor: function startSearchFor(aSearchString, aDirEntry, aStyle) {
		var uri = aDirEntry.uri;
		var context;
		if (uri in this.LDAPContexts) {
			context = this.LDAPContexts[uri];
		} else {
			context = {};
			
			context.style = aStyle;
			context.showAddressbookComments = cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteShowAddressbook");
			
			context.bookName = aDirEntry.name;
			context.book = MailServices.ab.getDirectory(uri).QueryInterface(Components.interfaces.nsIAbLDAPDirectory);
			
			context.numQueries = 0;
			context.query = Components.classes["@mozilla.org/addressbook/ldap-directory-query;1"]
					.createInstance(Components.interfaces.nsIAbDirectoryQuery);
			context.attributes = Components.classes["@mozilla.org/addressbook/ldap-attribute-map;1"]
					.createInstance(Components.interfaces.nsIAbLDAPAttributeMap);
			context.attributes.setAttributeList("DisplayName", context.book.attributeMap.getAttributeList("DisplayName", {}), true);
			context.attributes.setAttributeList("PrimaryEmail", context.book.attributeMap.getAttributeList("PrimaryEmail", {}), true);
			LDAPAbCardFormatter.requiredPropertiesFromBook(context.book).forEach(function(aProperty) {
				var alreadyMapped = context.attributes.getAttributeList(aProperty);
				if (alreadyMapped) {
					return;
				}
				context.attributes.setAttributeList(aProperty, context.book.attributeMap.getAttributeList(aProperty, {}), true);
			}, this);
			
			context.listener = {
				// nsIAbDirSearchListener
				
				onSearchFinished: (function onSearchFinished(aResult, aErrorMsg) {
					context.numQueries--;
					if (!context || context.stopped || context.numQueries > 0) {
						return;
					}

					context.finished = true;
					context.result = aResult;
					context.errorMsg = aErrorMsg;

					if (Object.keys(this.LDAPContexts).some(function(aURI) {
							return !this.LDAPContexts[aURI].finished;
						}, this)) {
						return;
					}

					return this.onSearchFinished(aResult, aErrorMsg, context);
				}).bind(this),
				
				onSearchFoundCard: (function onSearchFoundCard(aCard) {
					if (!context || context.stopped) {
						return;
					}
					return this.onSearchFoundCard(aCard, context);
				}).bind(this)
			};
			
			this.LDAPContexts[uri] = context;
		}

		let args = Components.classes["@mozilla.org/addressbook/directory/query-arguments;1"]
				.createInstance(Components.interfaces.nsIAbDirectoryQueryArguments);

		let filterTemplate = context.book.getStringValue("autoComplete.filterTemplate", "");
		if (!filterTemplate) {
			filterTemplate = "(|(cn=%v1*%v2-*)(mail=%v1*%v2-*)(sn=%v1*%v2-*))";
		}

		let ldapSvc = Components.classes["@mozilla.org/network/ldap-service;1"]
				.getService(Components.interfaces.nsILDAPService);
		let filter = ldapSvc.createFilter(1024, filterTemplate, "", "", "", aSearchString);
		if (!filter) {
			throw new Error("Filter string is empty, check if filterTemplate variable is valid in prefs.js.");
		}
		args.typeSpecificArg = context.attributes;
		args.querySubDirectories = true;
		args.filter = filter;

		context.finished = false;
		context.stopped = false;
		context.result = null;
		context.errorMsg = null;
		context.numQueries++;
		try {
			context.contextId = context.query.doQuery(context.book, args, context.listener, context.book.maxHits, 0);
		} catch(error) {
			Components.utils.reportError("cardbookAutocompleteSearch.startSearchFor context.query.doQuery : " + error);
			context.listener.onSearchFinished(context.result, error);
		}
	},
	
	stopSearch: function stopSearch() {
		if (this.searchListener) {
			Object.keys(this.LDAPContexts).forEach(function(aURI) {
				var context = this.LDAPContexts[aURI];
				if (context && !context.stopped && !context.finished) {
					if (context.query) {
						context.query.stopQuery(context.contextId);
					}
					context.stopped = true;
				}
			}, this);
			this.searchListener = null;
			this.searchResult = null;
		}
	},

	onSearchFinished: function onSearchFinished(aResult, aErrorMsg, aContext) {
		if (!this.searchListener) {
			return;
		}

		if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultError) {
			this.searchResult.searchResult = ACR.RESULT_FAILURE;
			this.searchResult.defaultIndex = 0;
		}
		
		if (this.searchResult.matchCount > 0) {
			// treat as success if there are matches, regardless of LDAP errors
			this.searchResult.searchResult = ACR.RESULT_SUCCESS;
			this.searchResult.defaultIndex = 0;
		} else {
			if (aResult == Components.interfaces.nsIAbDirectoryQueryResultListener.queryResultComplete) {
				// LDAP completed but there were no matches (neither from LDAP nor from other address books)
				this.searchResult.searchResult = ACR.RESULT_NOMATCH;
			}
		}
		
		this.searchListener.onSearchResult(this, this.searchResult);
		this.searchListener = null;
		this.searchResult = null;
	},

	onSearchFoundCard: function onSearchFoundCard(aCard, aContext) {
		if (!this.searchListener) {
			return;
		}

		var myComment = null;
		if (aContext.showAddressbookComments) {
			myComment = LDAPAbCardFormatter.commentFromCard(aCard, aContext.book, aContext.bookName);
		}
		if (this.useOnlyEmail) {
			this.addResult(this.searchResult, aCard.primaryEmail, myComment, 0, "TH_LDAP", aContext.style, aCard.displayName.toLowerCase(), "");
		} else {
			this.addResult(this.searchResult, MailServices.headerParser.makeMimeAddress(aCard.displayName, aCard.primaryEmail), myComment, 0, "TH_LDAP", aContext.style, aCard.displayName.toLowerCase(), "");
		}
	},

	observe: function observer(subject, topic, data) {
		if (topic == "quit-application") {
			Services.obs.removeObserver(this, "quit-application");
		} else if (topic != "timer-callback") {
			return;
		}

		this.stopSearch();
		// free resources once we reached the timeout
		Object.keys(this.LDAPContexts).forEach(function(aURI) {
			var context = this.LDAPContexts[aURI];
			context.book = null;
			context.query = null;
			context.attributes = null;
			context.result = null;
			context.errorMsg = null;
			delete this.LDAPContexts[aURI];
		}, this);
		this.LDAPContexts = {};
	},
	
	getInterfaces: function(aCount) {
		let ifaces = [ Components.interfaces.nsIAutoCompleteSearch,
					   Components.interfaces.nsIObserver,
					   Components.interfaces.nsIClassInfo,
					   Components.interfaces.nsISupports ];
		aCount.value = ifaces.length;

		return ifaces;
	},

	getHelperForLanguage: function(language) {
		return null;
	}
};


var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/wdw_log.js");
loader.loadSubScript("chrome://cardbook/content/cardbookUtils.js");
loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js");
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronization.js");
loader.loadSubScript("chrome://cardbook/content/cardbookMailPopularity.js");

function NSGetFactory(cid) {
	return (XPCOMUtils.generateNSGetFactory([cardbookAutocompleteSearch]))(cid);
}
