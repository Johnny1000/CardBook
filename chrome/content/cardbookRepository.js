var EXPORTED_SYMBOLS = ["cardbookRepository"];
try {
	ChromeUtils.import("resource://gre/modules/Services.jsm");
}
catch(e) {
	Components.utils.import("resource://gre/modules/Services.jsm");
}

var cardbookRepository = {
	cardbookDatabase : {},
	cardbookDatabaseVersion : "6",
	cardbookDatabaseName : "CardBook",
	
	LIGHTNING_ID : "{e2fda1a4-762b-4020-b5ad-a41df1933103}",
	
	windowParams : "chrome,titlebar,resizable,all,dialog=no",
	modalWindowParams : "modal,chrome,titlebar,resizable,minimizable=no",
	
	allColumns : { "display": ["fn"],
					"personal": ["prefixname", "firstname", "othername", "lastname", "suffixname", "nickname", "gender", "bday",
									"birthplace", "anniversary", "deathdate", "deathplace"],
					"org": ["org", "title", "role"],
					"categories": ["categories"],
					"arrayColumns": [ ["email", ["email"] ],
						["adr", ["postOffice", "extendedAddr", "street", "locality", "region", "postalCode", "country"] ],
						["impp", ["impp"] ],
						["tel", ["tel"] ],
						["url", ["url"] ] ],
					"note": ["note"],
					"calculated": ["age", "ABName"],
					"technical": ["version", "rev"],
					"technicalForTree": ["cardIcon", "name", "dirPrefId", "uid", "cbid", "class1", "etag", "geo", "mailer",
											"prodid", "tz", "sortstring", "kind"] },

	dateFormats : ["YYYY-MM-DD", "YYYY.MM.DD", "YYYY/MM/DD", "YYYYMMDD", "DD-MM-YYYY", "DD.MM.YYYY", "DD/MM/YYYY", "DDMMYYYY", "MM-DD-YYYY", "MM.DD.YYYY", "MM/DD/YYYY", "MMDDYYYY"],

	defaultDisplayedColumns : "cardIcon,fn,email.0.all,tel.0.all,bday,rev",
	defaultAutocompleteRestrictSearchFields : "firstname|lastname",
	defaultFnFormula : "({{1}} |)({{2}} |)({{3}} |)({{4}} |)({{5}} |)({{6}} |)({{7}}|)",
	defaultAdrFormula : "",
	defaultKindCustom : "X-ADDRESSBOOKSERVER-KIND",
	defaultMemberCustom : "X-ADDRESSBOOKSERVER-MEMBER",

	typesSeed : {"adr": ["HOME", "WORK"], "email": ["HOME", "WORK"], "impp": ["HOME", "WORK"], "tel": ["CELL", "FAX", "HOME","WORK"], "url": ["HOME", "WORK"],
					"gender": ["F", "M", "N", "O", "U"]},
	currentTypes : {},

	supportedVersion : ["3.0", "4.0"],

	preferEmailPref : true,
	preferIMPPPref : true,
	
	addonVersion : "",
	userAgent : "",
	prodid : "",
	
	autocompleteRestrictSearch : false,
	autocompleteRestrictSearchFields : [],

	cardbookAccounts : [],
	cardbookAccountsCategories : {},
	cardbookCards : {},
	cardbookDisplayCards : {},
	cardbookCardLongSearch : {},
	cardbookCardShortSearch : {},
	cardbookCardEmails : {},
	cardbookFileCacheCards : {},
	cardbookComplexSearch : {},

	cardbookMailPopularityIndex : {},
	cardbookDuplicateIndex : {},

	cardbookDirRequest : {},
	cardbookDirResponse : {},
	cardbookFileRequest : {},
	cardbookFileResponse : {},
	cardbookDBRequest : {},
	cardbookDBResponse : {},
	cardbookComplexSearchRequest : {},
	cardbookComplexSearchResponse : {},
	cardbookComplexSearchReloadRequest : {},
	cardbookComplexSearchReloadResponse : {},
	filesFromCacheDB : {},
	
	cardbookServerValidation : {},

	cardbookAccessTokenRequest : {},
	cardbookAccessTokenResponse : {},
	cardbookAccessTokenError : {},
	cardbookRefreshTokenRequest : {},
	cardbookRefreshTokenResponse : {},
	cardbookRefreshTokenError : {},
	cardbookServerDiscoveryRequest : {},
	cardbookServerDiscoveryResponse : {},
	cardbookServerDiscoveryError : {},
	cardbookServerSyncRequest : {},
	cardbookServerSyncResponse : {},
	cardbookServerSyncEmptyCache : {},
	cardbookServerSyncLoadCacheDone : {},
	cardbookServerSyncLoadCacheTotal : {},
	cardbookServerSyncDone : {},
	cardbookServerSyncTotal : {},
	cardbookServerSyncError : {},
	cardbookServerSyncNotUpdated : {},
	cardbookServerSyncNewOnServer : {},
	cardbookServerSyncNewOnDisk : {},
	cardbookServerSyncUpdatedOnServer : {},
	cardbookServerSyncUpdatedOnDisk : {},
	cardbookServerSyncUpdatedOnBoth : {},
	cardbookServerSyncUpdatedOnDiskDeletedOnServer : {},
	cardbookServerSyncDeletedOnDisk : {},
	cardbookServerSyncDeletedOnDiskUpdatedOnServer : {},
	cardbookServerSyncDeletedOnServer : {},
	cardbookServerSyncAgain : {},
	cardbookServerSyncCompareWithCacheDone : {},
	cardbookServerSyncCompareWithCacheTotal : {},
	cardbookServerSyncHandleRemainingDone : {},
	cardbookServerSyncHandleRemainingTotal : {},
	cardbookServerGetRequest : {},
	cardbookServerGetResponse : {},
	cardbookServerGetError : {},
	cardbookServerGetForMergeRequest : {},
	cardbookServerGetForMergeResponse : {},
	cardbookServerGetForMergeError : {},
	cardbookServerMultiGetArray : {},
	cardbookServerMultiGetParams : {},
	cardbookServerMultiGetRequest : {},
	cardbookServerMultiGetResponse : {},
	cardbookServerMultiGetError : {},
	cardbookServerUpdatedRequest : {},
	cardbookServerUpdatedResponse : {},
	cardbookServerUpdatedError : {},
	cardbookServerCreatedRequest : {},
	cardbookServerCreatedResponse : {},
	cardbookServerCreatedError : {},
	cardbookServerDeletedRequest : {},
	cardbookServerDeletedResponse : {},
	cardbookServerDeletedError : {},
	cardbookImageGetRequest : {},
	cardbookImageGetResponse : {},
	cardbookImageGetError : {},
	cardbookSyncMode : {},
	
	cardbookServerChangedPwd : {},
	
	cardbookReorderMode : "NOREORDER",
	cardbookSearchMode : "NOSEARCH",
	cardbookSearchValue : "",
	cardbookComplexSearchMode : "NOSEARCH",
	cardbookComplexSearchPrefId : "",

	autoSync : {},
	autoSyncInterval : {},
	autoSyncId : {},

	lTimerLoadCacheAll : {},
	lTimerDirAll : {},
	lTimerSyncAll : {},
	lTimerImportAll : {},
	lComplexSearchAll : {},
	lTimerNoSyncModeAll : {},
	
	// used to ensure that the initial load is done only once
	firstLoad : false,

	// used to remember the choice of overriding or not cards
	// while importing, dragging, copying or duplicating
	importConflictChoice : "",
	importConflictChoicePersist : false,

	// used to store the msgIdentityKey by window
	composeMsgIdentity : {},
	
	// used to remember the choice of name and dates format
	showNameAs : "",
	dateDisplayedFormat : "0",

	cardbookDynamicCssRules : {},

	cardbookUncategorizedCards : "",
	
	cardbookMailPopularityFile : "mailPopularityIndex.txt",
	cardbookDuplicateFile : "duplicateIndex.txt",

	customFields : {},
									
	statusInformation : [],

	cardbookOAuthData : {"GOOGLE": {
							CLIENT_ID:                  "779554755808-957jloa2c3c8n0rrm1a5304fkik7onf0.apps.googleusercontent.com",
							CLIENT_SECRET:              "h3NUkhofCKAW2E1X_NKSn4C_",
							REDIRECT_URI:               "urn:ietf:wg:oauth:2.0:oob",
							REDIRECT_TITLE:             "Success code=",
							RESPONSE_TYPE:              "code",
							SCOPE:                      "https://www.googleapis.com/auth/carddav",
							OAUTH_URL:                  "https://accounts.google.com/o/oauth2/auth",
							TOKEN_REQUEST_URL:          "https://accounts.google.com/o/oauth2/token",
							TOKEN_REQUEST_TYPE:         "POST",
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://accounts.google.com/o/oauth2/token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://www.googleapis.com"},
						"YAHOO": {
							CLIENT_ID:                  "dj0yJmk9eWRXYWc2QmNYWndYJmQ9WVdrOVZuVkdlazl3TXpZbWNHbzlNQS0tJnM9Y29uc3VtZXJzZWNyZXQmeD0xOQ--",
							CLIENT_SECRET:              "a2d17e955c6c96e4d3ec08cff76f4c39fe084f78",
							REDIRECT_URI:               "oob",
							REDIRECT_TITLE:             "Sharing approval",
							RESPONSE_TYPE:              "code",
							LANGUAGE:                   "en-us",
							OAUTH_URL:                  "https://api.login.yahoo.com/oauth2/request_auth",
							TOKEN_REQUEST_URL:          "https://api.login.yahoo.com/oauth2/get_token",
							TOKEN_REQUEST_TYPE:         "POST",
							TOKEN_REQUEST_GRANT_TYPE:   "authorization_code",
							REFRESH_REQUEST_URL:        "https://api.login.yahoo.com/oauth2/get_token",
							REFRESH_REQUEST_TYPE:       "POST",
							REFRESH_REQUEST_GRANT_TYPE: "refresh_token",
							ROOT_API:                   "https://carddav.address.yahoo.com"}
						},

	APPLE_API : "https://contacts.icloud.com",
	
	cardbookBirthdayPopup : 0,
	
    loadCustoms: function () {
		// for file opened with version <= 19.6
		var typeList = [ 'Name', 'Org' ];
		var numberList = [ '1', '2' ];
		for (var i in typeList) {
			var myTargetNumber = 0;
			for (var j in numberList) {
				try {
					var mySourceField = "extensions.cardbook.customs.customField" + numberList[j] + typeList[i];
					var mySourceValue = cardbookPreferences.getStringPref(mySourceField);
					if (typeList[i] === "Name") {
						var myTargetType = "pers";
					} else {
						var myTargetType = "org";
					}
					if (mySourceValue != "") {
						cardbookPreferences.setCustomFields(myTargetType, myTargetNumber, mySourceValue);
						myTargetNumber++;
					}
					Services.prefs.deleteBranch(mySourceField);
				}
				catch (e) {}
			}
		}
		cardbookRepository.customFields = {};
		cardbookRepository.customFields = cardbookPreferences.getAllCustomFields();
	},
		
    setCollected: function () {
		try {
			// for file opened with version <= 18.7
			var emailsCollection = cardbookPreferences.getStringPref("extensions.cardbook.emailsCollection");
			var emailsCollectionCat = "";
			try {
				emailsCollectionCat = cardbookPreferences.getStringPref("extensions.cardbook.emailsCollectionCat");
			}
			catch (e) {}
			if (emailsCollection != "") {
				emailsCollectionList = emailsCollection.split(',');
				for (var i = 0; i < emailsCollectionList.length; i++) {
					cardbookPreferences.setEmailsCollection(i.toString(), "true::include::allMailAccounts::" + emailsCollectionList[i] + "::" + emailsCollectionCat);
				}
				cardbookPreferences.setStringPref("extensions.cardbook.emailsCollection", "");
				cardbookPreferences.setStringPref("extensions.cardbook.emailsCollectionCat", "");
			}
		}
		catch (e) {
			return "";
		}
	},
		
    setTypes: function () {
		var myTypes = [];
		var myOldTypes = [];
		myTypes = cardbookPreferences.getAllTypesCategory();
		// for file opened with version <= 4.0
		for (var i = 0; i < myTypes.length; i++) {
			if (!myTypes[i].includes(".")) {
				myOldTypes.push(cardbookPreferences.getTypes(myTypes[i]));
				cardbookPreferences.delTypes(myTypes[i]);
				myTypes.splice(i,1);
				i--;
			}
		}
		for (var i = 0; i < myOldTypes.length; i++) {
				cardbookPreferences.setTypes("adr", i, myOldTypes[i]);
				cardbookPreferences.setTypes("email", i, myOldTypes[i]);
				cardbookPreferences.setTypes("tel", i, myOldTypes[i]);
				cardbookPreferences.setTypes("impp", i, myOldTypes[i]);
				cardbookPreferences.setTypes("url", i, myOldTypes[i]);
		}
		// for file opened with version <= 4.8
		var myPhoneTypes = [];
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("phone.")) {
				myPhoneTypes.push(cardbookPreferences.getTypes(myTypes[i]));
				cardbookPreferences.delTypes(myTypes[i]);
				myTypes.splice(i,1);
				i--;
			}
		}
		for (var i = 0; i < myPhoneTypes.length; i++) {
			cardbookPreferences.setTypes("tel", i, myPhoneTypes[i]);
		}
		// for file opened with version <= 4.8
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("url.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.url.length; i++) {
				cardbookPreferences.setTypes("url", i, cardbookRepository.typesSeed.url[i]);
			}
		}
		// for file opened with version <= 4.8
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("tel.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.tel.length; i++) {
				cardbookPreferences.setTypes("tel", i, cardbookRepository.typesSeed.tel[i]);
			}
		}
		// for file opened with version <= 4.8
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("impp.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.impp.length; i++) {
				cardbookPreferences.setTypes("impp", i, cardbookRepository.typesSeed.impp[i]);
			}
		}
		// for file opened with version <= 4.8
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("email.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.email.length; i++) {
				cardbookPreferences.setTypes("email", i, cardbookRepository.typesSeed.email[i]);
			}
		}
		// for file opened with version <= 11.6
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("adr.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.adr.length; i++) {
				cardbookPreferences.setTypes("adr", i, cardbookRepository.typesSeed.adr[i]);
			}
		}
		// for file opened with version <= 15.3
		var myIMPPs = [];
		myIMPPs = cardbookPreferences.getAllIMPPs();
		if (myIMPPs.length == 0) {
			cardbookPreferences.insertIMPPsSeed();
		}
		// for file opened with version <= 23.4
		var notfound = true;
		myTypes = cardbookPreferences.getAllTypesCategory();
		for (var i = 0; i < myTypes.length; i++) {
			if (myTypes[i].includes("gender.")) {
				notfound = false;
				break;
			}
		}
		if (notfound) {
			for (var i = 0; i < cardbookRepository.typesSeed.gender.length; i++) {
				cardbookPreferences.setTypes("gender", i, cardbookRepository.typesSeed.gender[i]);
			}
		}
	},

	setCalendarEntryAlarm: function() {
		try {
			// for file opened with version <= 24.2
			var calendarEntryAlarmMigrated = cardbookPreferences.getBoolPref("extensions.cardbook.calendarEntryAlarmMigrated");
			if (!calendarEntryAlarmMigrated) {
				var calendarEntryAlarm = cardbookPreferences.getStringPref("extensions.cardbook.calendarEntryAlarm");
				if (calendarEntryAlarm != "168") {
					cardbookPreferences.setStringPref("extensions.cardbook.calendarEntryAlarm", parseInt(calendarEntryAlarm) * 24);
				}
				cardbookPreferences.setBoolPref("extensions.cardbook.calendarEntryAlarmMigrated", true);
			}
		}
		catch (e) {
			return "";
		}
	},

	migrateFnFormula: function() {
		try {
			// for file opened with version <= 28.0
			var fnFormulaMigrated = cardbookPreferences.getBoolPref("extensions.cardbook.fnFormulaMigrated");
			if (!fnFormulaMigrated) {
				var result = [];
				result = cardbookPreferences.getAllPrefIds();
				for (let i = 0; i < result.length; i++) {
					var myFnFormula = cardbookPreferences.getFnFormula(result[i]);
					if (myFnFormula == "({{1}} |)({{2}} |)({{3}} |)({{4}} |)({{5}} |)({{6}} |)") {
						cardbookPreferences.setFnFormula(result[i], cardbookRepository.defaultFnFormula);
					} else {
						for (var j = 30; j >= 6; j--) {
							var k = j + 1;
							if (myFnFormula.includes("{{" + j + "}}")) {
								myFnFormula = myFnFormula.replace("{{" + j + "}}", "{{" + k + "}}");
							}
						}
						cardbookPreferences.setFnFormula(result[i], myFnFormula);
					}
				}
				cardbookPreferences.setBoolPref("extensions.cardbook.fnFormulaMigrated", true);
			}
		}
		catch (e) {
			return "";
		}
	},

	setEventEntryTitle: function() {
		try {
			// for file opened with version <= 25.4
			var eventEntryTitleMigrated = cardbookPreferences.getBoolPref("extensions.cardbook.eventEntryTitleMigrated");
			if (!eventEntryTitleMigrated) {
				var eventEntryTitle = cardbookPreferences.getStringPref("extensions.cardbook.eventEntryTitle");
				cardbookPreferences.setStringPref("extensions.cardbook.eventEntryTitle", eventEntryTitle.replace("%S","%1$S").replace("%S","%2$S"));
				cardbookPreferences.setBoolPref("extensions.cardbook.eventEntryTitleMigrated", true);
			}
		}
		catch (e) {
			return "";
		}
	},

	setSolveConflicts: function() {
		try {
			// for file opened with version <= 14.0
			var preferDisk = cardbookPreferences.getBoolPref("extensions.cardbook.preferDisk");
			if (preferDisk) {
				var strData = "Local";
			} else {
				var strData = "Remote";
			}
			cardbookPreferences.setStringPref("extensions.cardbook.solveConflicts", strData);
			Services.prefs.deleteBranch("extensions.cardbook.preferDisk");
		}
		catch (e) {
			return "";
		}
	},

	getLocalDirectory: function() {
		let directoryService = Services.dirsvc;
		// this is a reference to the profile dir (ProfD) now.
		let localDir = directoryService.get("ProfD", Components.interfaces.nsIFile);
		
		localDir.append("cardbook");
		
		if (!localDir.exists() || !localDir.isDirectory()) {
			// read and write permissions to owner and group, read-only for others.
			localDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		return localDir;
	},

	arrayUnique: function (array) {
		var a = array.concat();
		for (var i=0; i<a.length; ++i) {
			for (var j=i+1; j<a.length; ++j) {
				if (a[i] == a[j])
					a.splice(j--, 1);
			}
		}
		return a;
	},

	normalizeString: function (aString) {
		return aString.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	},

	makeSearchString: function (aString) {
		return cardbookRepository.normalizeString(aString.replace(/[\s+\-+\.+\,+\;+]/g, "").toUpperCase());
	},

	getLongSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		lResult = lResult + aCard.lastname + sep;
		lResult = lResult + aCard.firstname + sep;
		lResult = lResult + aCard.othername + sep;
		lResult = lResult + aCard.prefixname + sep;
		lResult = lResult + aCard.suffixname + sep;
		lResult = lResult + aCard.fn + sep;
		lResult = lResult + aCard.nickname + sep;
		lResult = lResult + aCard.bday + sep;
		// lResult = lResult + aCard.categories.join();
		for (let i = 0; i < aCard.adr.length; i++) {
			lResult = lResult + aCard.adr[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.tel.length; i++) {
			lResult = lResult + aCard.tel[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.email.length; i++) {
			lResult = lResult + aCard.email[i][0].join() + sep;
		}
		lResult = lResult + aCard.title + sep;
		lResult = lResult + aCard.role + sep;
		lResult = lResult + aCard.org + sep;
		lResult = lResult + aCard.note + sep;
		for (let i = 0; i < aCard.url.length; i++) {
			lResult = lResult + aCard.url[i][0].join() + sep;
		}
		for (let i = 0; i < aCard.impp.length; i++) {
			lResult = lResult + aCard.impp[i][0].join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	getShortSearchString: function(aCard) {
		var lResult = "";
		var sep = "|";
		for (let i = 0; i < cardbookRepository.autocompleteRestrictSearchFields.length; i++) {
			lResult = lResult + cardbookUtils.getCardValueByField(aCard, cardbookRepository.autocompleteRestrictSearchFields[i]).join() + sep;
		}
		lResult = lResult.slice(0, -1);
		return cardbookRepository.makeSearchString(lResult);
	},

	setEmptyContainer: function(aAccountId) {
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			if (cardbookRepository.cardbookAccountsCategories[aAccountId].length > 0) {
				for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
					if (cardbookRepository.cardbookAccounts[i][4] == aAccountId) {
						cardbookRepository.cardbookAccounts[i][3] = false;
						return;
					}
				}
			} else {
				for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
					if (cardbookRepository.cardbookAccounts[i][4] == aAccountId) {
						cardbookRepository.cardbookAccounts[i][3] = true;
						cardbookRepository.cardbookAccounts[i][2] = false;
						return;
					}
				}
			}
		}
	},
	
	addAccountToRepository: function(aAccountId, aAccountName, aAccountType, aAccountUrl, aAccountUser, aColor, aEnabled, aExpanded, aVCard, aReadOnly, aDateFormat, aUrnuuid,
										aDBcached, aAutoSyncEnabled, aAutoSyncInterval, aPrefInsertion) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (!cacheDir.exists() || !cacheDir.isDirectory()) {
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
			cacheDir.append("mediacache");
			cacheDir.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
		}
		if (aPrefInsertion) {
			cardbookPreferences.setId(aAccountId, aAccountId);
			cardbookPreferences.setName(aAccountId, aAccountName);
			cardbookPreferences.setType(aAccountId, aAccountType);
			cardbookPreferences.setUrl(aAccountId, aAccountUrl);
			cardbookPreferences.setUser(aAccountId, aAccountUser);
			cardbookPreferences.setColor(aAccountId, aColor);
			cardbookPreferences.setEnabled(aAccountId, aEnabled);
			cardbookPreferences.setExpanded(aAccountId, aExpanded);
			cardbookPreferences.setVCardVersion(aAccountId, aVCard);
			cardbookPreferences.setReadOnly(aAccountId, aReadOnly);
			cardbookPreferences.setDateFormat(aAccountId, aDateFormat);
			cardbookPreferences.setUrnuuid(aAccountId, aUrnuuid);
			cardbookPreferences.setDBCached(aAccountId, aDBcached);
			cardbookPreferences.setAutoSyncEnabled(aAccountId, aAutoSyncEnabled);
			cardbookPreferences.setAutoSyncInterval(aAccountId, aAutoSyncInterval);
		}
		
		cardbookRepository.cardbookAccounts.push([aAccountName, true, aExpanded, true, aAccountId, aEnabled, aAccountType, aReadOnly]);
		cardbookRepository.cardbookAccounts = cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccounts,0,1);
		cardbookRepository.cardbookDisplayCards[aAccountId] = [];
		cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
	},

	removeAccountFromRepository: function(aAccountId) {
		cardbookRepository.removeAccountFromCollected(aAccountId);
		cardbookRepository.removeAccountFromBirthday(aAccountId);
		cardbookRepository.removeAccountFromDiscovery(aAccountId);

		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (var i = 0; i < cardbookRepository.cardbookAccountsCategories[aAccountId].length; i++) {
				var myAccountId = aAccountId+"::"+cardbookRepository.cardbookAccountsCategories[aAccountId][i];
				function searchCard1(element) {
					return (element[4] != myAccountId);
				}
				cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard1);
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		for (var key in cardbookRepository.cardbookCards) {
			if (cardbookRepository.cardbookCards.hasOwnProperty(key)) {
				if (key.startsWith(aAccountId)) {
					cardbookRepository.removeCardFromLongSearch(cardbookRepository.cardbookCards[key]);
					cardbookRepository.removeCardFromShortSearch(cardbookRepository.cardbookCards[key]);
					if (cardbookRepository.cardbookFileCacheCards[aAccountId] && cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri]) {
						delete cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri];
					}
					delete cardbookRepository.cardbookCards[key];
				}
			}
		}
	},
		
	removeComplexSearchFromRepository: function(aAccountId) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aAccountId);
		if (cacheDir.exists() && cacheDir.isDirectory()) {
			cacheDir.remove(true);
		}

		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (var i = 0; i < cardbookRepository.cardbookAccountsCategories[aAccountId].length; i++) {
				var myAccountId = aAccountId+"::"+cardbookRepository.cardbookAccountsCategories[aAccountId][i];
				function searchCard1(element) {
					return (element[4] != myAccountId);
				}
				cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard1);
				delete cardbookRepository.cardbookDisplayCards[myAccountId];
			}
			delete cardbookRepository.cardbookAccountsCategories[aAccountId];
			delete cardbookRepository.cardbookDisplayCards[aAccountId];
		}

		function searchCard2(element) {
			return (element[4] != aAccountId);
		}
		cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard2, aAccountId);

		delete cardbookRepository.cardbookComplexSearch[aAccountId];
	},
		
	emptyAccountFromRepository: function(aAccountId) {
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (var i = 0; i < cardbookRepository.cardbookAccountsCategories[aAccountId].length; i++) {
				var myAccountId = aAccountId+"::"+cardbookRepository.cardbookAccountsCategories[aAccountId][i];
				function searchCard1(element) {
					return (element[4] != myAccountId);
				}
				cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard1);
				cardbookRepository.cardbookDisplayCards[myAccountId] = [];
			}
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
			cardbookRepository.cardbookDisplayCards[aAccountId] = [];
		}
		cardbookRepository.setEmptyContainer(aAccountId);

		for (var key in cardbookRepository.cardbookCards) {
			if (cardbookRepository.cardbookCards.hasOwnProperty(key)) {
				if (key.startsWith(aAccountId)) {
					cardbookRepository.removeCardFromLongSearch(cardbookRepository.cardbookCards[key]);
					cardbookRepository.removeCardFromShortSearch(cardbookRepository.cardbookCards[key]);
					if (cardbookRepository.cardbookFileCacheCards[aAccountId] && cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri]) {
						delete cardbookRepository.cardbookFileCacheCards[aAccountId][cardbookRepository.cardbookCards[key].cacheuri];
					}
					delete cardbookRepository.cardbookCards[key];
				}
			}
		}
	},

	emptyComplexSearchFromRepository: function(aAccountId) {
		if (cardbookRepository.cardbookAccountsCategories[aAccountId]) {
			for (var i = 0; i < cardbookRepository.cardbookAccountsCategories[aAccountId].length; i++) {
				var myAccountId = aAccountId+"::"+cardbookRepository.cardbookAccountsCategories[aAccountId][i];
				function searchCard1(element) {
					return (element[4] != myAccountId);
				}
				cardbookRepository.cardbookAccounts = cardbookRepository.cardbookAccounts.filter(searchCard1);
				cardbookRepository.cardbookDisplayCards[myAccountId] = [];
			}
			cardbookRepository.cardbookAccountsCategories[aAccountId] = [];
			cardbookRepository.cardbookDisplayCards[aAccountId] = [];
		}
		cardbookRepository.setEmptyContainer(aAccountId);
	},

	removeAccountFromComplexSearch: function (aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			for (var i in cardbookRepository.cardbookComplexSearch) {
				if (cardbookRepository.cardbookDisplayCards[i].length != 0) {
					for (var j = 0; j < cardbookRepository.cardbookDisplayCards[aDirPrefId].length; j++) {
						var myCard = cardbookRepository.cardbookDisplayCards[aDirPrefId][j];
						cardbookRepository.removeCardFromCategories(myCard, i);
						cardbookRepository.removeCardFromDisplay(myCard, i);
					}
				}
			}
		}
	},

	removeAccountFromCollected: function (aDirPrefId) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookPreferences.getAllEmailsCollections();
		for (var i = 0; i < allEmailsCollections.length; i++) {
			var resultArray = allEmailsCollections[i].split("::");
			if (aDirPrefId !== resultArray[3]) {
				result.push([resultArray[0], resultArray[1], resultArray[2], resultArray[3], resultArray[4]]);
			}
		}
		cardbookPreferences.delEmailsCollection();
		for (var i = 0; i < result.length; i++) {
			cardbookPreferences.setEmailsCollection(i.toString(), result[i][0] + "::" + result[i][1] + "::" + result[i][2] + "::" + result[i][3] + "::" + result[i][4]);
		}
	},

	// only used from the import of Thunderbird standard address books
	addAccountToCollected: function (aDirPrefId) {
		var result = [];
		var allEmailsCollections = [];
		allEmailsCollections = cardbookPreferences.getAllEmailsCollections();
		for (var i = 0; i < allEmailsCollections.length; i++) {
			var resultArray = allEmailsCollections[i].split("::");
			result.push([resultArray[0], resultArray[1], resultArray[2], resultArray[3], resultArray[4]]);
		}
		result.push(["true", "include", "allMailAccounts", aDirPrefId, ""]);

		for (var i = 0; i < result.length; i++) {
			cardbookPreferences.setEmailsCollection(i.toString(), result[i][0] + "::" + result[i][1] + "::" + result[i][2] + "::" + result[i][3] + "::" + result[i][4]);
		}
	},

	removeAccountFromBirthday: function (aDirPrefId) {
		var addressBooks = cardbookPreferences.getStringPref("extensions.cardbook.addressBooksNameList");
		var addressBooksList = [];
		addressBooksList = addressBooks.split(',');
		function filterAccount(element) {
			return (element != aDirPrefId);
		}
		addressBooksList = addressBooksList.filter(filterAccount);
		cardbookPreferences.setStringPref("extensions.cardbook.addressBooksNameList", addressBooksList.join(','));
	},

	removeAccountFromDiscovery: function (aDirPrefId) {
		var allDiscoveryAccounts = [];
		allDiscoveryAccounts = cardbookDiscovery.getAllURLsToDiscover();
		var withoutDiscoveryAccounts = [];
		withoutDiscoveryAccounts = cardbookDiscovery.getAllURLsToDiscover(aDirPrefId);
		if (allDiscoveryAccounts.length != withoutDiscoveryAccounts.length) {
			var addressBooks = cardbookPreferences.getStringPref("extensions.cardbook.discoveryAccountsNameList");
			var addressBooksList = [];
			addressBooksList = addressBooks.split(',');
			var myUser = cardbookPreferences.getUser(aDirPrefId);
			var myURL = cardbookSynchronization.getShortUrl(cardbookPreferences.getUrl(aDirPrefId));
			function filterAccount(element) {
				return (element != myUser + "::" + myURL);
			}
			addressBooksList = addressBooksList.filter(filterAccount);
			cardbookPreferences.setStringPref("extensions.cardbook.discoveryAccountsNameList", addressBooksList.join(','));
		}
	},

	removeCardFromRepository: function (aCard, aCacheDeletion) {
		try {
			cardbookRepository.removeCardFromLongSearch(aCard);
			cardbookRepository.removeCardFromShortSearch(aCard);
			cardbookRepository.removeCardFromEmails(aCard);
			cardbookRepository.removeCardFromCategories(aCard, aCard.dirPrefId);
			cardbookRepository.removeCardFromDisplay(aCard, aCard.dirPrefId);
			for (var i in cardbookRepository.cardbookComplexSearch) {
				cardbookRepository.removeCardFromCategories(aCard, i);
				cardbookRepository.removeCardFromDisplay(aCard, i);
			}
			if (aCacheDeletion) {
				cardbookRepository.removeCardFromCache(aCard);
			}
			cardbookRepository.removeCardFromList(aCard);
			aCard = null;
		}
		catch (e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.removeCardFromRepository error : " + e, "Error");
		}
	},

	addCardToRepository: function (aCard, aMode, aFileName) {
		try {
			cardbookRepository.addCardToEmails(aCard);
			cardbookRepository.addCardToLongSearch(aCard);
			cardbookRepository.addCardToShortSearch(aCard);
			cardbookRepository.addCardToList(aCard);
			cardbookRepository.addCardToCache(aCard, aMode, aFileName);
			cardbookRepository.addCardToCategories(aCard, aCard.dirPrefId);
			cardbookRepository.addCardToDisplay(aCard, aCard.dirPrefId);
			for (var i in cardbookRepository.cardbookComplexSearch) {
				if (cardbookComplexSearch.isMyCardFound(aCard, i)) {
					cardbookRepository.addCardToCategories(aCard, i);
					cardbookRepository.addCardToDisplay(aCard, i);
				}
			}
		}
		catch (e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.addCardToRepository error : " + e, "Error");
		}
	},

	addCardToList: function(aCard) {
		cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid] = aCard;
	},
		
	removeCardFromList: function(aCard) {
		delete cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+aCard.uid];
	},
		
	addCardToCache: function(aCard, aMode, aFileName) {
		try {
			var myDirPrefIdName = cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookPreferences.getUrl(aCard.dirPrefId);

			cardbookSynchronization.cachePutMediaCard(aCard, "photo", myDirPrefIdType);
			cardbookSynchronization.cachePutMediaCard(aCard, "logo", myDirPrefIdType);
			cardbookSynchronization.cachePutMediaCard(aCard, "sound", myDirPrefIdType);

			if (myDirPrefIdType === "DIRECTORY") {
				aCard.cacheuri = aFileName;
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(myDirPrefIdUrl);
				myFile.append(aFileName);
				if (aMode === "INITIAL") {
					if (!myFile.exists()) {
						cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], true);
						wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to directory");
					}
				} else {
					cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], true);
					wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to directory");
				}
			} else if (myDirPrefIdType === "FILE" || myDirPrefIdType === "SEARCH") {
				return;
			} else if (myDirPrefIdType === "GOOGLE" || myDirPrefIdType === "APPLE" || myDirPrefIdType === "YAHOO" || myDirPrefIdType === "CARDDAV" || myDirPrefIdType === "LOCALDB") {
				aCard.cacheuri = aFileName;
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId]) {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				} else {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId] = {};
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				}
				if (aMode === "INITIAL") {
					cardbookIndexedDB.addItemIfMissing(myDirPrefIdName, aCard);
				} else {
					cardbookIndexedDB.addItem(myDirPrefIdName, aCard);
				}
			} else if (myDirPrefIdType === "CACHE") {
				var myFile = cardbookRepository.getLocalDirectory();
				myFile.append(aCard.dirPrefId);
				myFile.append(aFileName);
				if (aMode === "INITIAL") {
					if (!myFile.exists()) {
						cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], false);
						wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to cache");
					}
				} else {
					if (myFile.exists() && myFile.isFile()) {
						myFile.remove(true);
					}
					cardbookSynchronization.writeCardsToFile(myFile.path, [aCard], false);
					wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " written to cache");
				}
				aCard.cacheuri = aFileName;
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId]) {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				} else {
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId] = {};
					cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aFileName] = aCard;
				}
			}
		}
		catch(e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.addCardToCache error : " + e, "Error");
		}
	},

	removeCardFromCache: function(aCard) {
		try {
			cardbookSynchronization.cacheDeleteMediaCard(aCard);
			
			var myDirPrefIdName = cardbookPreferences.getName(aCard.dirPrefId);
			var myDirPrefIdType = cardbookPreferences.getType(aCard.dirPrefId);
			var myDirPrefIdUrl = cardbookPreferences.getUrl(aCard.dirPrefId);
			if (myDirPrefIdType === "DIRECTORY") {
				var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
				myFile.initWithPath(myDirPrefIdUrl);
				myFile.append(aCard.cacheuri);
				if (myFile.exists() && myFile.isFile()) {
					myFile.remove(true);
					wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " deleted from directory");
				}
			} else if (myDirPrefIdType === "FILE" || myDirPrefIdType === "SEARCH") {
				return;
			} else if (myDirPrefIdType === "GOOGLE" || myDirPrefIdType === "APPLE" || myDirPrefIdType === "YAHOO" || myDirPrefIdType === "CARDDAV" || myDirPrefIdType === "LOCALDB") {
				cardbookIndexedDB.removeItem(myDirPrefIdName, aCard);
				if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri]) {
					delete cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri];
				}
			} else if (myDirPrefIdType === "CACHE") {
				var myFile = cardbookRepository.getLocalDirectory();
				myFile.append(aCard.dirPrefId);
				myFile.append(aCard.cacheuri);
				if (myFile.exists() && myFile.isFile()) {
					myFile.remove(true);
					wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myDirPrefIdName + " : debug mode : Contact " + aCard.fn + " deleted from cache");
					if (cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri]) {
						delete cardbookRepository.cardbookFileCacheCards[aCard.dirPrefId][aCard.cacheuri];
					}
				}
			}
		}
		catch(e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.removeCardFromCache error : " + e, "Error");
		}
	},

	addCardToCategories: function(aCard, aDirPrefId) {
		if (aCard.categories.length != 0) {
			cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.arrayUnique(cardbookRepository.cardbookAccountsCategories[aDirPrefId].concat(aCard.categories));
		} else {
			var uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.arrayUnique(cardbookRepository.cardbookAccountsCategories[aDirPrefId].concat([uncategorizedCards]));
		}
		cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccountsCategories[aDirPrefId],-1,1);
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},
		
	removeCardFromCategories: function(aCard, aDirPrefId) {
		if (aCard.categories.length != 0) {
			for (var j = 0; j < aCard.categories.length; j++) {
				if (cardbookRepository.cardbookAccountsCategories[aDirPrefId]) {
					function searchCategory(element) {
						if (element != aCard.categories[j]) {
							return true;
						} else if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+element].length > 1) {
							return true;
						} else if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+element].length == 1) {
							if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+element][0].dirPrefId+"::"+cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+element][0].uid == aCard.dirPrefId+"::"+aCard.uid) {
								return false;
							} else {
								return true;
							}
						}
					}
					cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.cardbookAccountsCategories[aDirPrefId].filter(searchCategory);
				}
			}
		} else {
			var uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			if (cardbookRepository.cardbookAccountsCategories[aDirPrefId]) {
				function searchCategory(element) {
					return ((element == uncategorizedCards && cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards].length > 1)
							|| (element != uncategorizedCards));
				}
				cardbookRepository.cardbookAccountsCategories[aDirPrefId] = cardbookRepository.cardbookAccountsCategories[aDirPrefId].filter(searchCategory);
			}
		}
		cardbookRepository.setEmptyContainer(aDirPrefId);
	},

	addCategoryToCard: function(aCard, aCategoryName) {
		aCard.categories.push(aCategoryName);
		aCard.categories = cardbookUtils.cleanCategories(aCard.categories);
	},

	removeCategoryFromCard: function(aCard, aCategoryName) {
		function searchCategory(element) {
			return (element !== aCategoryName);
		}
		aCard.categories = aCard.categories.filter(searchCategory);
	},

	renameCategoryFromCard: function(aCard, aOldCategoryName, aNewCategoryName) {
		cardbookRepository.removeCategoryFromCard(aCard, aOldCategoryName);
		cardbookRepository.addCategoryToCard(aCard, aNewCategoryName);
	},

	renameUncategorized: function(aOldCategoryName, aNewCategoryName) {
		for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
			if (!cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][0] == aOldCategoryName) {
				cardbookRepository.cardbookAccounts[i][0] = aNewCategoryName;
				cardbookRepository.cardbookAccounts[i][4] = cardbookRepository.cardbookAccounts[i][4].replace("::"+aOldCategoryName,"::"+aNewCategoryName);
			} else if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5]) {
				for (var j = 0; j < cardbookRepository.cardbookAccountsCategories[cardbookRepository.cardbookAccounts[i][4]].length; j++) {
					if (cardbookRepository.cardbookAccountsCategories[cardbookRepository.cardbookAccounts[i][4]][j] == aOldCategoryName) {
						cardbookRepository.cardbookAccountsCategories[cardbookRepository.cardbookAccounts[i][4]][j] = aNewCategoryName;
					}
				}
			}
		}
		cardbookRepository.cardbookUncategorizedCards = aNewCategoryName;
	},

	addCardToDisplay: function(aCard, aDirPrefId) {
		cardbookRepository.cardbookDisplayCards[aDirPrefId].push(aCard);
		if (aCard.categories.length != 0) {
			for (let j = 0; j < aCard.categories.length; j++) {
				if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]]) {
					cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]].push(aCard);
				} else {
					cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]] = [];
					cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]].push(aCard);
				}
			}
		} else {
			var uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
			if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards]) {
				cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards].push(aCard);
			} else {
				cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards] = [];
				cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards].push(aCard);
			}
		}
		var myPrefName = cardbookUtils.getPrefNameFromPrefId(aDirPrefId);
		wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myPrefName + " : debug mode : Contact " + aCard.fn + " added to display");

		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			if (cardbookRepository.getLongSearchString(aCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
				cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].push(aCard);
			}
			wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myPrefName + " : debug mode : Contact " + aCard.fn + " added to display search");
		}
	},
	
	removeCardFromDisplay: function(aCard, aDirPrefId) {
		if (cardbookRepository.cardbookDisplayCards[aDirPrefId]) {
			function searchCard(element) {
				return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
			}
			cardbookRepository.cardbookDisplayCards[aDirPrefId] = cardbookRepository.cardbookDisplayCards[aDirPrefId].filter(searchCard);
			if (aCard.categories.length != 0) {
				for (let j = 0; j < aCard.categories.length; j++) {
					if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]]) {
						function searchCard(element) {
							return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
						}
						cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]] = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]].filter(searchCard);
						if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]].length == 0) {
							delete cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCard.categories[j]];
						}
					}
				}
			} else {
				var uncategorizedCards = cardbookRepository.cardbookUncategorizedCards;
				if (cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards]) {
					function searchCard(element) {
						return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
					}
					cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards] = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+uncategorizedCards].filter(searchCard);
				}
			}
			var myPrefName = cardbookUtils.getPrefNameFromPrefId(aDirPrefId);
			wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myPrefName + " : debug mode : Contact " + aCard.fn + " deleted from display");
		}
		if (cardbookRepository.cardbookSearchMode === "SEARCH") {
			function searchCard(element) {
				return (element.dirPrefId+"::"+element.uid != aDirPrefId+"::"+aCard.uid);
			}
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue] = cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].filter(searchCard);
			var myPrefName = cardbookUtils.getPrefNameFromPrefId(aDirPrefId);
			wdw_cardbooklog.updateStatusProgressInformationWithDebug2(myPrefName + " : debug mode : Contact " + aCard.fn + " deleted from display search");
		}
	},
	
	addCardToEmails: function(aCard) {
		for (var i = 0; i < aCard.email.length; i++) {
			var myEmail = aCard.email[i][0][0].toLowerCase();
			if (myEmail != null && myEmail !== undefined && myEmail != "") {
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
					cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = [];
				}
				cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].push(aCard);
			}
		}
	},
		
	removeCardFromEmails: function(aCard) {
		if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId]) {
			for (var i = 0; i < aCard.email.length; i++) {
				var myEmail = aCard.email[i][0][0].toLowerCase();
				if (myEmail != null && myEmail !== undefined && myEmail != "") {
					if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail]) {
						if (cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].length == 1) {
							delete cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail];
						} else {
							function searchCard(element) {
								return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
							}
							cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail] = cardbookRepository.cardbookCardEmails[aCard.dirPrefId][myEmail].filter(searchCard);
						}
					}
				}
			}
		}
	},

	addCardFromDisplayAndEmail: function (aDirPrefId, aDisplayName, aEmail, aCategory) {
		if (!(aDisplayName != null && aDisplayName !== undefined && aDisplayName != "")) {
			if (!(aEmail != null && aEmail !== undefined && aEmail != "")) {
				return;
			} else {
				aDisplayName = aEmail;
			}
		}
		var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
		var myDirPrefIdType = cardbookPreferences.getType(aDirPrefId);
		var myDirPrefIdUrl = cardbookPreferences.getUrl(aDirPrefId);
		var myDirPrefIdVCard = cardbookPreferences.getVCardVersion(aDirPrefId);
		var myDirPrefIdReadOnly = cardbookPreferences.getReadOnly(aDirPrefId);
		if (!myDirPrefIdReadOnly) {
			var myNewCard = new cardbookCardParser();
			myNewCard.dirPrefId = aDirPrefId;
			myNewCard.version = myDirPrefIdVCard;
			cardbookUtils.setCardUUID(myNewCard);
			myNewCard.fn = aDisplayName;
			if (myNewCard.fn == "") {
				myNewCard.fn = aEmail.substr(0, aEmail.indexOf("@")).replace("."," ").replace("_"," ");
			}
			var myDisplayNameArray = aDisplayName.split(" ");
			if (myDisplayNameArray.length > 1) {
				myNewCard.lastname = myDisplayNameArray[myDisplayNameArray.length - 1];
				var removed = myDisplayNameArray.splice(myDisplayNameArray.length - 1, 1);
				myNewCard.firstname = myDisplayNameArray.join(" ");
			}
			myNewCard.email = [ [ [aEmail], [] ,"", [] ] ];
			if (aCategory != null && aCategory !== undefined && aCategory != "") {
				cardbookRepository.addCategoryToCard(myNewCard, aCategory);
			}
			var myNullCard = new cardbookCardParser();
			cardbookRepository.saveCard(myNullCard, myNewCard, "cardbook.cardAddedIndirect");
			cardbookRepository.reWriteFiles([aDirPrefId]);
		} else {
			cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
		}
	},

	verifyABRestrictions: function (aDirPrefId, aSearchAB, aABExclRestrictions, aABInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (((aABInclRestrictions.length == 0) && ((aSearchAB == aDirPrefId) || (aSearchAB === "allAddressBooks"))) ||
			((aABInclRestrictions.length > 0) && ((aSearchAB == aDirPrefId) || ((aSearchAB === "allAddressBooks") && aABInclRestrictions[aDirPrefId])))) {
			return true;
		} else {
			return false;
		}
	},
	
	verifyCatRestrictions: function (aDirPrefId, aCategory, aSearchInput, aABExclRestrictions, aCatExclRestrictions, aCatInclRestrictions) {
		if (aABExclRestrictions[aDirPrefId]) {
			return false;
		}
		if (aCatExclRestrictions[aDirPrefId] && aCatExclRestrictions[aDirPrefId][aCategory]) {
			return false;
		}
		if (((!(aCatInclRestrictions[aDirPrefId])) && (aCategory.replace(/[\s+\-+\.+\,+\;+]/g, "").toUpperCase().indexOf(aSearchInput) >= 0 || aSearchInput == "")) ||
				((aCatInclRestrictions[aDirPrefId]) && (aCatInclRestrictions[aDirPrefId][aCategory]))) {
			return true;
		} else {
			return false;
		}
	},

	isEmailRegistered: function(aEmail, aIdentityKey) {
		var ABInclRestrictions = {};
		var ABExclRestrictions = {};
		var catInclRestrictions = {};
		var catExclRestrictions = {};

		function _loadRestrictions(aIdentityKey) {
			var result = [];
			result = cardbookPreferences.getAllRestrictions();
			ABInclRestrictions = {};
			ABExclRestrictions = {};
			catInclRestrictions = {};
			catExclRestrictions = {};
			if (aIdentityKey == "") {
				ABInclRestrictions["length"] = 0;
				return;
			}
			for (var i = 0; i < result.length; i++) {
				var resultArray = result[i].split("::");
				if ((resultArray[0] == "true") && ((resultArray[2] == aIdentityKey) || (resultArray[2] == "allMailAccounts"))) {
					if (resultArray[1] == "include") {
						ABInclRestrictions[resultArray[3]] = 1;
						if (resultArray[4] && resultArray[4] != null && resultArray[4] !== undefined && resultArray[4] != "") {
							if (!(catInclRestrictions[resultArray[3]])) {
								catInclRestrictions[resultArray[3]] = {};
							}
							catInclRestrictions[resultArray[3]][resultArray[4]] = 1;
						}
					} else {
						if (resultArray[4] && resultArray[4] != null && resultArray[4] !== undefined && resultArray[4] != "") {
							if (!(catExclRestrictions[resultArray[3]])) {
								catExclRestrictions[resultArray[3]] = {};
							}
							catExclRestrictions[resultArray[3]][resultArray[4]] = 1;
						} else {
							ABExclRestrictions[resultArray[3]] = 1;
						}
					}
				}
			}
			ABInclRestrictions["length"] = cardbookUtils.sumElements(ABInclRestrictions);
		};
		
		_loadRestrictions(aIdentityKey);
		
		if (aEmail != null && aEmail !== undefined && aEmail != "") {
			var myEmail = aEmail.toLowerCase();
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && (cardbookRepository.cardbookAccounts[i][6] != "SEARCH")) {
					var myDirPrefId = cardbookRepository.cardbookAccounts[i][4];
					if (cardbookRepository.verifyABRestrictions(myDirPrefId, "allAddressBooks", ABExclRestrictions, ABInclRestrictions)) {
						if (cardbookRepository.cardbookCardEmails[myDirPrefId]) {
							if (cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail]) {
								for (var j = 0; j < cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail].length; j++) {
									var myCard = cardbookRepository.cardbookCardEmails[myDirPrefId][myEmail][j];
									if (catExclRestrictions[myDirPrefId]) {
										var add = true;
										for (var l in catExclRestrictions[myDirPrefId]) {
											if (myCard.categories.includes(l)) {
												add = false;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									if (catInclRestrictions[myDirPrefId]) {
										var add = false;
										for (var l in catInclRestrictions[myDirPrefId]) {
											if (myCard.categories.includes(l)) {
												add = true;
												break;
											}
										}
										if (!add) {
											continue;
										}
									}
									return true;
								}
							}
						}
					}
				}
			}
		}
		return false;
	},

	// this function is only used by the CardBook filters
	// as mail account restrictions do not apply to filters
	isEmailInPrefIdRegistered: function(aDirPrefId, aEmail) {
		if (aEmail != null && aEmail !== undefined && aEmail != "") {
			var myTestString = aEmail.toLowerCase();
			if (cardbookRepository.cardbookCardEmails[aDirPrefId]) {
				if (cardbookRepository.cardbookCardEmails[aDirPrefId][myTestString]) {
					return true;
				}
			}
		}
		return false;
	},
		
	addCardToLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText != null && myLongText !== undefined && myLongText != "") {
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId] = {};
			}
			if (!cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = [];
			}
			cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].push(aCard);
		}
	},
		
	removeCardFromLongSearch: function(aCard) {
		var myLongText = cardbookRepository.getLongSearchString(aCard);
		if (myLongText != null && myLongText !== undefined && myLongText != "") {
			if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText]) {
				if (cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].length == 1) {
					delete cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText];
				} else {
					function searchCard(element) {
						return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
					}
					cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText] = cardbookRepository.cardbookCardLongSearch[aCard.dirPrefId][myLongText].filter(searchCard);
				}
			}
		}
	},

	addCardToShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText != null && myShortText !== undefined && myShortText != "") {
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId] = {};
				}
				if (!cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = [];
				}
				cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].push(aCard);
			}
		} else {
			cardbookRepository.cardbookCardShortSearch = {};
		}
	},
		
	removeCardFromShortSearch: function(aCard) {
		if (cardbookRepository.autocompleteRestrictSearch) {
			var myShortText = cardbookRepository.getShortSearchString(aCard);
			if (myShortText != null && myShortText !== undefined && myShortText != "") {
				if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText]) {
					if (cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].length == 1) {
						delete cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText];
					} else {
						function searchCard(element) {
							return (element.dirPrefId+"::"+element.uid != aCard.dirPrefId+"::"+aCard.uid);
						}
						cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText] = cardbookRepository.cardbookCardShortSearch[aCard.dirPrefId][myShortText].filter(searchCard);
					}
				}
			}
		}
	},

	saveCard: function(aOldCard, aNewCard, aSource) {
		try {
			var myDirPrefIdType = cardbookPreferences.getType(aNewCard.dirPrefId);
			var myDirPrefIdName = cardbookPreferences.getName(aNewCard.dirPrefId);
			var myDirPrefIdUrl = cardbookPreferences.getUrl(aNewCard.dirPrefId);
			if (cardbookPreferences.getReadOnly(aNewCard.dirPrefId)) {
				return;
			}

			var newCats = [];
			for (var i = 0; i < aNewCard.categories.length; i++) {
				var found = false;
				for (var j = 0; !found && j < cardbookRepository.cardbookAccountsCategories[aNewCard.dirPrefId].length; j++) {
					if (cardbookRepository.cardbookAccountsCategories[aNewCard.dirPrefId][j] == aNewCard.categories[i]) {
						found = true;
					}
				}
				if (!found) {
					newCats.push(aNewCard.categories[i]);
				}
			}

			cardbookUtils.setCalculatedFields(aNewCard);
			// Existing card
			if (cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId == aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					// if aOldCard and aNewCard have the same cached medias
					cardbookUtils.changeMediaFromFileToContent(aNewCard);
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					// if aOldCard and aNewCard have the same cached medias
					cardbookUtils.changeMediaFromFileToContent(aNewCard);
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					// if aOldCard and aNewCard have the same cached medias
					cardbookUtils.changeMediaFromFileToContent(aNewCard);
					if (!(cardbookUtils.searchTagCreated(aNewCard))) {
						cardbookUtils.addTagUpdated(aNewCard);
					}
					cardbookRepository.removeCardFromRepository(myCard, true);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookUtils.formatStringForOutput("cardUpdatedOK", [myDirPrefIdName, aNewCard.fn]);
				cardbookUtils.notifyObservers(aSource, "cardid:" + aNewCard.dirPrefId + "::" + aNewCard.uid);
			// Moved card
			} else if (aOldCard.dirPrefId != "" && cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid] && aOldCard.dirPrefId != aNewCard.dirPrefId) {
				var myCard = cardbookRepository.cardbookCards[aOldCard.dirPrefId+"::"+aNewCard.uid];
				var myDirPrefIdName = cardbookPreferences.getName(myCard.dirPrefId);
				var myDirPrefIdType = cardbookPreferences.getType(myCard.dirPrefId);
				if (myDirPrefIdType === "FILE") {
					cardbookRepository.removeCardFromRepository(myCard, false);
				} else if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.removeCardFromRepository(myCard, true);
				} else {
					if (cardbookUtils.searchTagCreated(myCard)) {
						cardbookRepository.removeCardFromRepository(myCard, true);
					} else {
						cardbookUtils.addTagDeleted(myCard);
						cardbookRepository.addCardToCache(myCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(myCard));
						cardbookRepository.removeCardFromRepository(myCard, false);
					}
				}
				cardbookUtils.formatStringForOutput("cardDeletedOK", [myDirPrefIdName, myCard.fn]);
				wdw_cardbooklog.addActivity("cardDeletedOK", [myDirPrefIdName, myCard.fn], "deleteMail");
				cardbookUtils.notifyObservers("cardbook.cardRemovedIndirect");
				
				var myDirPrefIdName = cardbookPreferences.getName(aNewCard.dirPrefId);
				var myDirPrefIdType = cardbookPreferences.getType(aNewCard.dirPrefId);
				aNewCard.cardurl = "";
				cardbookUtils.setCardUUID(aNewCard);
				if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					cardbookUtils.addTagCreated(aNewCard);
					cardbookUtils.addEtag(aNewCard, "0");
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookUtils.formatStringForOutput("cardCreatedOK", [myDirPrefIdName, aNewCard.fn]);
				wdw_cardbooklog.addActivity("cardCreatedOK", [myDirPrefIdName, aNewCard.fn], "addItem");
				cardbookUtils.notifyObservers(aSource, "cardid:" + aNewCard.dirPrefId + "::" + aNewCard.uid);
			// New card
			} else {
				if (aNewCard.uid == "") {
					cardbookUtils.setCardUUID(aNewCard);
				}
				if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				} else if (myDirPrefIdType === "FILE") {
					cardbookUtils.nullifyTagModification(aNewCard);
					cardbookUtils.nullifyEtag(aNewCard);
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW");
				} else {
					cardbookUtils.addTagCreated(aNewCard);
					cardbookUtils.addEtag(aNewCard, "0");
					cardbookRepository.addCardToRepository(aNewCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aNewCard, myDirPrefIdType));
				}
				cardbookUtils.formatStringForOutput("cardCreatedOK", [myDirPrefIdName, aNewCard.fn]);
				wdw_cardbooklog.addActivity("cardCreatedOK", [myDirPrefIdName, aNewCard.fn], "addItem");
				cardbookUtils.notifyObservers(aSource, "cardid:" + aNewCard.dirPrefId + "::" + aNewCard.uid);
			}
			aOldCard = null;
			for (var i = 0; i < newCats.length; i++) {
				cardbookUtils.formatStringForOutput("categoryCreatedOK", [myDirPrefIdName, newCats[i]]);
				wdw_cardbooklog.addActivity("categoryCreatedOK", [myDirPrefIdName, newCats[i]], "addItem");
				cardbookUtils.notifyObservers("cardbook.catAddedIndirect", "accountid:" + aNewCard.dirPrefId+"::"+newCats[i]);
			}
		}
		catch (e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.saveCard error : " + e, "Error");
		}
	},

	deleteCard: function (aCard, aSource) {
		try {
			if (!cardbookPreferences.getReadOnly(aCard.dirPrefId)) {
				var myDirPrefIdName = cardbookPreferences.getName(aCard.dirPrefId);
				var myDirPrefIdType = cardbookPreferences.getType(aCard.dirPrefId);
				if (myDirPrefIdType === "FILE") {
					listOfFileToRewrite.push(aCard.dirPrefId);
					cardbookRepository.removeCardFromRepository(aCard, false);
				} else if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
					cardbookRepository.removeCardFromRepository(aCard, true);
				} else {
					if (cardbookUtils.searchTagCreated(aCard)) {
						cardbookRepository.removeCardFromRepository(aCard, true);
					} else {
						cardbookUtils.addTagDeleted(aCard);
						cardbookRepository.addCardToCache(aCard, "WINDOW", cardbookUtils.getFileCacheNameFromCard(aCard));
						cardbookRepository.removeCardFromRepository(aCard, false);
					}
				}
				cardbookUtils.formatStringForOutput("cardDeletedOK", [myDirPrefIdName, aCard.fn]);
				wdw_cardbooklog.addActivity("cardDeletedOK", [myDirPrefIdName, aCard.fn], "deleteMail");
				cardbookUtils.notifyObservers(aSource);
			}
		}
		catch (e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.deleteCard error : " + e, "Error");
		}
	},

	deleteCards: function (aListOfCards, aSource) {
		try {
			Services.tm.currentThread.dispatch({ run: function() {
				var listOfFileToRewrite = [];
				for (var i = 0; i < aListOfCards.length; i++) {
					Services.tm.currentThread.dispatch({ run: function() {
						if (!cardbookPreferences.getReadOnly(aListOfCards[i].dirPrefId)) {
							var myDirPrefIdName = cardbookPreferences.getName(aListOfCards[i].dirPrefId);
							var myDirPrefIdType = cardbookPreferences.getType(aListOfCards[i].dirPrefId);
							if (myDirPrefIdType === "FILE") {
								listOfFileToRewrite.push(aListOfCards[i].dirPrefId);
								cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
							} else if (myDirPrefIdType === "CACHE" || myDirPrefIdType === "DIRECTORY" || myDirPrefIdType === "LOCALDB") {
								cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
							} else {
								if (cardbookUtils.searchTagCreated(aListOfCards[i])) {
									cardbookRepository.removeCardFromRepository(aListOfCards[i], true);
								} else {
									cardbookUtils.addTagDeleted(aListOfCards[i]);
									cardbookRepository.addCardToCache(aListOfCards[i], "WINDOW", cardbookUtils.getFileCacheNameFromCard(aListOfCards[i]));
									cardbookRepository.removeCardFromRepository(aListOfCards[i], false);
								}
							}
							cardbookUtils.formatStringForOutput("cardDeletedOK", [myDirPrefIdName, aListOfCards[i].fn]);
							wdw_cardbooklog.addActivity("cardDeletedOK", [myDirPrefIdName, aListOfCards[i].fn], "deleteMail");
							// performance reason
							// update the UI only at the end
							if (i == aListOfCards.length - 1) {
								cardbookUtils.notifyObservers(aSource);
							}
						}
					}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
				}
				cardbookRepository.reWriteFiles(listOfFileToRewrite);
			}}, Components.interfaces.nsIEventTarget.DISPATCH_NORMAL);
		}
		catch (e) {
			wdw_cardbooklog.updateStatusProgressInformation("cardbookRepository.deleteCards error : " + e, "Error");
		}
	},

	reWriteFiles: function (aListOfFiles) {
		var listOfFilesToRewrite = cardbookRepository.arrayUnique(aListOfFiles);
		for (var i = 0; i < listOfFilesToRewrite.length; i++) {
			if (cardbookPreferences.getType(listOfFilesToRewrite[i]) === "FILE" && !cardbookPreferences.getReadOnly(listOfFilesToRewrite[i])) {
				cardbookSynchronization.writeCardsToFile(cardbookPreferences.getUrl(listOfFilesToRewrite[i]), cardbookRepository.cardbookDisplayCards[listOfFilesToRewrite[i]], true);
			}
		}
	},

	isthereSearchRulesToCreate: function () {
		var todo = 0;
		var allRules = false;
		for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
			if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && (cardbookRepository.cardbookAccounts[i][6] != "SEARCH")) {
				todo++;
			}
			if (todo >= 2) {
				allRules = true;
				break;
			}
		}
		return allRules;
	},

	getRuleFile: function (aPrefId) {
		var cacheDir = cardbookRepository.getLocalDirectory();
		cacheDir.append(aPrefId);
		cacheDir.append(aPrefId + ".rul");
		return cacheDir;
	},

	deleteCssAllRules: function (aStyleSheet) {
		for (var i = cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].length - 1 ; i >= 0; i--) {
			try {
				aStyleSheet.deleteRule(cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href][i]);
			} catch(e) {}
		}
		cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href] = [];
	},

	createCssAccountRules: function (aStyleSheet, aDirPrefId, aColor) {
		var ruleString = ".cardbookAccountTreeClass treechildren::-moz-tree-cell(accountColor odd container color_" + aDirPrefId + ") {}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
		aStyleSheet.cssRules[ruleIndex].style.backgroundColor = aColor;
		cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
		var ruleString = ".cardbookAccountTreeClass treechildren::-moz-tree-cell(accountColor even container color_" + aDirPrefId + ") {}";
		var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
		aStyleSheet.cssRules[ruleIndex].style.backgroundColor = aColor;
		cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
	},

	createCssCardRules: function (aStyleSheet, aDirPrefId, aColor) {
		var useColor = cardbookPreferences.getStringPref("extensions.cardbook.useColor");
		if (useColor == "text") {
			var ruleString = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH odd color_" + aDirPrefId + ") {color: " + aColor + ";}";
			var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
			cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
			var ruleString = ".cardbookCardsTreeClass treechildren::-moz-tree-cell-text(SEARCH even color_" + aDirPrefId + ") {color: " + aColor + ";}";
			var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
			cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
		} else {
			var ruleString = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH odd color_" + aDirPrefId + ") {background-color: " + aColor + ";}";
			var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
			cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
			var ruleString = ".cardbookCardsTreeClass treechildren::-moz-tree-row(SEARCH even color_" + aDirPrefId + ") {background-color: " + aColor + ";}";
			var ruleIndex = aStyleSheet.insertRule(ruleString, aStyleSheet.cssRules.length);
			cardbookRepository.cardbookDynamicCssRules[aStyleSheet.href].push(ruleIndex);
		}
	},

	unregisterCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
	},

	reloadCss: function (aChromeUri) {
		var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);
		var uri = Services.io.newURI(aChromeUri, null, null);
		if (sss.sheetRegistered(uri, sss.AUTHOR_SHEET)) {
			sss.unregisterSheet(uri, sss.AUTHOR_SHEET);
		}
		sss.loadAndRegisterSheet(uri, sss.AUTHOR_SHEET);
	},

	getABIconType: function (aType) {
		switch(aType) {
			case "CACHE":
			case "DIRECTORY":
			case "FILE":
			case "LOCALDB":
				return "local";
				break;
			case "APPLE":
			case "CARDDAV":
			case "GOOGLE":
			case "YAHOO":
				return "remote";
				break;
			case "SEARCH":
				return "search";
				break;
		};
		return aType;
	},

	getABStatusType: function (aDirPrefId) {
		if (cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return "syncing";
		} else if (cardbookPreferences.getReadOnly(aDirPrefId)) {
			return "readonly";
		} else {
			return "readwrite";
		}
	}

};

var loader = Services.scriptloader;
loader.loadSubScript("chrome://cardbook/content/cardbookCardParser.js");
loader.loadSubScript("chrome://cardbook/content/cardbookDates.js");
loader.loadSubScript("chrome://cardbook/content/cardbookIndexedDB.js");
loader.loadSubScript("chrome://cardbook/content/cardbookSynchronization.js");
loader.loadSubScript("chrome://cardbook/content/cardbookUtils.js");
loader.loadSubScript("chrome://cardbook/content/complexSearch/cardbookComplexSearch.js");
loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js");
loader.loadSubScript("chrome://cardbook/content/wdw_log.js");
