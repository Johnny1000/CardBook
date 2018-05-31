if ("undefined" == typeof(cardbookElementTools)) {
	try {
		ChromeUtils.import("resource:///modules/mailServices.js");
		ChromeUtils.import("resource://gre/modules/Services.jsm");
	}
	catch(e) {
		Components.utils.import("resource:///modules/mailServices.js");
		Components.utils.import("resource://gre/modules/Services.jsm");
	}

	var cardbookElementTools = {
		
		deleteRowsAllTypes: function (aType) {
			cardbookElementTools.deleteRows(aType + 'classicalGroupbox');
			cardbookElementTools.deleteRows(aType + 'modernGroupbox');
		},

		deleteRowsType: function (aType) {
			cardbookElementTools.deleteRows(aType + 'Groupbox');
		},

		deleteRows: function (aObjectName) {
			// for anonid this does not work
			try {
				var aListRows = document.getElementById(aObjectName);
				while (aListRows.firstChild) {
					aListRows.removeChild(aListRows.firstChild);
				}
			} catch (e) {}
		},

		addCaption: function (aType, aParent) {
			var strBundle = document.getElementById("cardbook-strings");
			var aCaption = document.createElement('caption');
			aParent.appendChild(aCaption);
			aCaption.setAttribute('id', aType + '_caption');
			aCaption.setAttribute('label', strBundle.getString(aType + "GroupboxLabel"));
			aCaption.setAttribute('class', 'header');
		},
		
		addTreeSplitter: function (aParent, aParameters) {
			var aSplitter = document.createElement('splitter');
			aParent.appendChild(aSplitter);
			aSplitter.setAttribute('class', 'tree-splitter');

			for (var prop in aParameters) {
				aSplitter.setAttribute(prop, aParameters[prop]);
			}
		},
		
		addTreecol: function (aParent, aId, aLabel, aParameters) {
			var aTreecol = document.createElement('treecol');
			aParent.appendChild(aTreecol);
			aTreecol.setAttribute('id', aId);
			aTreecol.setAttribute('label', aLabel);

			for (var prop in aParameters) {
				aTreecol.setAttribute(prop, aParameters[prop]);
			}
		},

		addProgressmeter: function (aParent, aId, aParameters) {
			var aProgressmeter = document.createElement('progressmeter');
			aParent.appendChild(aProgressmeter);
			aProgressmeter.setAttribute('id', aId);

			for (var prop in aParameters) {
				aProgressmeter.setAttribute(prop, aParameters[prop]);
			}
		},

		addHBox: function (aType, aIndex, aParent) {
			var aHBox = document.createElement('hbox');
			aParent.appendChild(aHBox);
			aHBox.setAttribute('id', aType + '_' + aIndex + '_hbox');
			aHBox.setAttribute('flex', '1');
			aHBox.setAttribute('align', 'center');
			// dirty hack to have the lines not shrinked on Linux only with blue.css
			aHBox.setAttribute('style', 'min-height:36px;');
			return aHBox;
		},
		
		addGridRow: function (aParent, aId, aParameters) {
			var aGridRow = document.createElement('row');
			aParent.appendChild(aGridRow);
			aGridRow.setAttribute('id', aId);

			for (var prop in aParameters) {
				aGridRow.setAttribute(prop, aParameters[prop]);
			}
			return aGridRow;
		},

		addLabel: function (aOrigBox, aId, aValue, aControl, aParameters) {
			var aLabel = document.createElement('label');
			aOrigBox.appendChild(aLabel);
			aLabel.setAttribute('id', aId);
			aLabel.setAttribute('value', aValue);
			aLabel.setAttribute('control', aControl);
			for (var prop in aParameters) {
				aLabel.setAttribute(prop, aParameters[prop]);
			}
		},

		addKeyTextbox: function (aParent, aId, aValue, aParameters, aVersion, aIndex) {
			var myKexTextBox = cardbookElementTools.addTextbox(aParent, aId, aValue, aParameters);
			myKexTextBox.version = aVersion;

			if (aIndex == 0) {
				function checkKeyTextBox(event) {
					var myIdArray = this.id.split('_');
					if (!document.getElementById(myIdArray[0] + '_1_' + this.version + '_cardbookaddButton')) {
						if (this.value == "") {
							document.getElementById(myIdArray[0] + '_0_' + this.version + '_cardbookaddButton').disabled = true;
							document.getElementById(myIdArray[0] + '_0_' + this.version + '_cardbookremoveButton').disabled = true;
						} else {
							document.getElementById(myIdArray[0] + '_0_' + this.version + '_cardbookaddButton').disabled = false;
							document.getElementById(myIdArray[0] + '_0_' + this.version + '_cardbookremoveButton').disabled = false;
						}
					}
				};
				myKexTextBox.addEventListener("input", checkKeyTextBox, false);
			}
		},

		addTextbox: function (aParent, aId, aValue, aParameters) {
			var aTextbox = document.createElement('textbox');
			aParent.appendChild(aTextbox);
			aTextbox.setAttribute('id', aId);
			aTextbox.setAttribute('value', aValue);

			for (var prop in aParameters) {
				aTextbox.setAttribute(prop, aParameters[prop]);
			}
			return aTextbox;
		},

		loadAccountsOrCatsTreeMenu: function (aPopupName, aMenuName, aDefaultId) {
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var typeName = [ 'all', 'enabled', 'disabled', 'local', 'remote', 'search' ];
			for (var i = 0; i < typeName.length; i++) {
				var menuItem = document.getElementById(aMenuName).appendItem(strBundle.GetStringFromName(typeName[i] + "AccountsLabel"), typeName[i]);
				menuItem.setAttribute("type", "radio");
				menuItem.setAttribute("checked", "false");
				myPopup.appendChild(menuItem);
				if (typeName[i] == aDefaultId) {
					defaultIndex=j;
					menuItem.setAttribute("checked", "true");
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadInclExcl: function (aPopupName, aMenuName, aDefaultId) {
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var typeName = [ 'include', 'exclude' ];
			for (var i = 0; i < typeName.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", strBundle.GetStringFromName(typeName[i] + "Label"));
				menuItem.setAttribute("value", typeName[i]);
				myPopup.appendChild(menuItem);
				if (typeName[i] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadGender: function (aPopupName, aMenuName, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var myResult = [["", ""]];
			myResult = myResult.concat(cardbookPreferences.getAllTypesByType("gender"));
			for (var i = 0; i < myResult.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", myResult[i][1]);
				menuItem.setAttribute("value", myResult[i][0]);
				myPopup.appendChild(menuItem);
				if (myResult[i][0] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadMailAccounts: function (aPopupName, aMenuName, aDefaultId, aAddAllMailAccounts) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aAddAllMailAccounts) {
				var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", strBundle.GetStringFromName("allMailAccounts"));
				menuItem.setAttribute("value", "allMailAccounts");
				myPopup.appendChild(menuItem);
				if ("allMailAccounts" == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			var sortedEmailAccounts = [];
			var accounts = MailServices.accounts.accounts;
			var accountsLength = (typeof accounts.Count === 'undefined') ? accounts.length : accounts.Count();
			for (var i = 0; i < accountsLength; i++) {
				var account = accounts.queryElementAt ? accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount) : accounts.GetElementAt(i).QueryInterface(Components.interfaces.nsIMsgAccount);
				if (!account.incomingServer) {
					continue;
				}
				var identitiesLength = (typeof account.identities.Count === 'undefined') ? account.identities.length : account.identities.Count();
				for (var k = 0; k < identitiesLength; k++) {
					var identity = account.identities.queryElementAt ? account.identities.queryElementAt(k, Components.interfaces.nsIMsgIdentity) : account.identities.GetElementAt(k).QueryInterface(Components.interfaces.nsIMsgIdentity);
					var mailAccountServer = account.incomingServer;
					if (mailAccountServer.type == "pop3" || mailAccountServer.type == "imap") {
						sortedEmailAccounts.push([identity.email, identity.key]);
					}
				}
			}
			sortedEmailAccounts = cardbookUtils.sortArrayByString(sortedEmailAccounts,0,1);
			for (var i = 0; i < sortedEmailAccounts.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", sortedEmailAccounts[i][0]);
				menuItem.setAttribute("value", sortedEmailAccounts[i][1]);
				myPopup.appendChild(menuItem);
				if (sortedEmailAccounts[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadAddressBooks: function (aPopup, aMenu, aDefaultId, aExclusive, aAddAllABs, aIncludeReadOnly, aIncludeSearch, aIncludeDisabled,
										aInclRestrictionList, aExclRestrictionList) {
			cardbookElementTools.deleteRows(aPopup.id);
			var defaultIndex = 0;
			var j = 0;
			if (aAddAllABs) {
				var strBundle = Services.strings.createBundle("chrome://messenger/locale/addressbook/addressBook.properties");
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", strBundle.GetStringFromName("allAddressBooks"));
				menuItem.setAttribute("value", "allAddressBooks");
				aPopup.appendChild(menuItem);
				if ("allAddressBooks" == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			var sortedAddressBooks = [];
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][1] && (aIncludeDisabled || cardbookRepository.cardbookAccounts[i][5])
						&& (aIncludeReadOnly || !cardbookRepository.cardbookAccounts[i][7])
						&& (aIncludeSearch || (cardbookRepository.cardbookAccounts[i][6] !== "SEARCH"))) {
					if (aExclRestrictionList && aExclRestrictionList[cardbookRepository.cardbookAccounts[i][4]]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[cardbookRepository.cardbookAccounts[i][4]]) {
							sortedAddressBooks.push([cardbookRepository.cardbookAccounts[i][0], cardbookRepository.cardbookAccounts[i][4], cardbookRepository.getABIconType(cardbookRepository.cardbookAccounts[i][6])]);
						}
					} else {
						sortedAddressBooks.push([cardbookRepository.cardbookAccounts[i][0], cardbookRepository.cardbookAccounts[i][4], cardbookRepository.getABIconType(cardbookRepository.cardbookAccounts[i][6])]);
					}
				}
			}
			if (!aExclusive) {
				var contactManager = MailServices.ab;
				var contacts = contactManager.directories;
				while ( contacts.hasMoreElements() ) {
					var contact = contacts.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
					// remote LDAP directory
					if (contact.isRemote && contact.dirType === 0) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList.length > 0) {
						if (aInclRestrictionList[contact.dirPrefId]) {
							sortedAddressBooks.push([contact.dirName, contact.dirPrefId, "standard-abook"]);
						}
					} else {
						sortedAddressBooks.push([contact.dirName, contact.dirPrefId, "standard-abook"]);
					}
				}
			}
			sortedAddressBooks = cardbookUtils.sortArrayByString(sortedAddressBooks,0,1);
			for (var i = 0; i < sortedAddressBooks.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", sortedAddressBooks[i][0]);
				menuItem.setAttribute("value", sortedAddressBooks[i][1]);
				menuItem.setAttribute("ABtype", sortedAddressBooks[i][2]);
				menuItem.setAttribute("class", "menuitem-iconic");
				aPopup.appendChild(menuItem);
				if (sortedAddressBooks[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			aMenu.selectedIndex = defaultIndex;
		},

		loadCategories: function (aPopupName, aMenuName, aDefaultPrefId, aDefaultCatId, aAddAllCats, aAddOnlyCats, aAddNoCats, aAddEmptyCats, aInclRestrictionList, aExclRestrictionList) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aAddEmptyCats) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				myPopup.appendChild(menuItem);
				j++;
			}
			if (!(aInclRestrictionList && aInclRestrictionList[aDefaultPrefId])) {
				if (aAddAllCats) {
					var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
					var menuItem = document.createElement("menuitem");
					menuItem.setAttribute("label", strBundle.GetStringFromName("allCategories"));
					menuItem.setAttribute("value", "allCategories");
					myPopup.appendChild(menuItem);
					if ("allCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddOnlyCats) {
					var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
					var menuItem = document.createElement("menuitem");
					menuItem.setAttribute("label", strBundle.GetStringFromName("onlyCategories"));
					menuItem.setAttribute("value", "onlyCategories");
					myPopup.appendChild(menuItem);
					if ("onlyCategories" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
				if (aAddNoCats) {
					var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
					var menuItem = document.createElement("menuitem");
					menuItem.setAttribute("label", strBundle.GetStringFromName("noCategory"));
					menuItem.setAttribute("value", "noCategory");
					myPopup.appendChild(menuItem);
					if ("noCategory" == aDefaultCatId) {
						defaultIndex=j;
					}
					j++;
				}
			}
			var sortedCategories = [];
			if (cardbookRepository.cardbookAccountsCategories[aDefaultPrefId]) {
				for (var i = 0; i < cardbookRepository.cardbookAccountsCategories[aDefaultPrefId].length; i++) {
					var myCategory = cardbookRepository.cardbookAccountsCategories[aDefaultPrefId][i];
					if (aExclRestrictionList && aExclRestrictionList[aDefaultPrefId] && aExclRestrictionList[aDefaultPrefId][myCategory]) {
						continue;
					}
					if (aInclRestrictionList && aInclRestrictionList[aDefaultPrefId]) {
						if (aInclRestrictionList[aDefaultPrefId][myCategory]) {
							sortedCategories.push([myCategory, aDefaultPrefId+"::"+myCategory]);
						}
					} else {
						sortedCategories.push([myCategory, aDefaultPrefId+"::"+myCategory]);
					}
				}
			}
			sortedCategories = cardbookUtils.sortArrayByString(sortedCategories,0,1);
			for (var i = 0; i < sortedCategories.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", sortedCategories[i][0]);
				menuItem.setAttribute("value", sortedCategories[i][1]);
				myPopup.appendChild(menuItem);
				if (sortedCategories[i][1] == aDefaultCatId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadContacts: function (aPopupName, aMenuName, aDirPrefId, aDefaultId) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			var sortedContacts = [];
			for (var i = 0; i < cardbookRepository.cardbookDisplayCards[aDirPrefId].length; i++) {
				sortedContacts.push([cardbookRepository.cardbookDisplayCards[aDirPrefId][i].fn, cardbookRepository.cardbookDisplayCards[aDirPrefId][i].uid]);
			}
			sortedContacts = cardbookUtils.sortArrayByString(sortedContacts,0,1);
			for (var i = 0; i < sortedContacts.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", sortedContacts[i][0]);
				menuItem.setAttribute("value", sortedContacts[i][1]);
				myPopup.appendChild(menuItem);
				if (sortedContacts[i][1] == aDefaultId) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadDateFormats: function (aPopupName, aMenuName, aDefaultValue) {
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var myD = "";			
			var myM = "";			
			var myY = "";			
			try {
				myD = strBundle.GetStringFromName("dateFormatsDLabel");
				myM = strBundle.GetStringFromName("dateFormatsMLabel");
				myY = strBundle.GetStringFromName("dateFormatsYLabel");
			}
			catch (e) {
				myD = "";			
				myM = "";			
				myY = "";			
			}
			var j = 0;
			for (var i = 0; i < cardbookRepository.dateFormats.length; i++) {
				var menuItem = document.createElement("menuitem");
				if (myD != "") {
					menuItem.setAttribute("label", cardbookRepository.dateFormats[i].replace(/D/g, myD).replace(/M/g, myM).replace(/Y/g, myY));
				} else {
					menuItem.setAttribute("label", cardbookRepository.dateFormats[i]);
				}
				menuItem.setAttribute("value", cardbookRepository.dateFormats[i]);
				myPopup.appendChild(menuItem);
				if (cardbookRepository.dateFormats[i] == aDefaultValue) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		loadVCardVersions: function (aPopupName, aMenuName, aDefaultList) {
			var myPopup = document.getElementById(aPopupName);
			cardbookElementTools.deleteRows(aPopupName);
			var defaultIndex = 0;
			var j = 0;
			if (aDefaultList && aDefaultList.length && aDefaultList.length > 0) {
				var versions = aDefaultList;
			} else {
				var versions = cardbookRepository.supportedVersion;
			}
			if (versions.includes("4.0")) {
				var defaultValue = "4.0";
			} else {
				var defaultValue = "3.0";
			}

			for (var i in versions) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", versions[i]);
				menuItem.setAttribute("value", versions[i]);
				myPopup.appendChild(menuItem);
				if (versions[i] == defaultValue) {
					defaultIndex=j;
				}
				j++;
			}
			document.getElementById(aMenuName).selectedIndex = defaultIndex;
		},

		addMenuIMPPlist: function (aParent, aType, aIndex, aArray, aCode, aProtocol) {
			var aMenulist = document.createElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistIMPP');
			var aMenupopup = document.createElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupIMPP');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var found = false;
			for (var i = 0; i < aArray.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemIMPP_' + i);
				menuItem.setAttribute("label", aArray[i][1]);
				menuItem.setAttribute("value", aArray[i][0]);
				aMenupopup.appendChild(menuItem);
				if (aCode != "") {
					if (aArray[i][0].toLowerCase() == aCode.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				} else if (aProtocol != "") {
					if (aArray[i][2].toLowerCase() == aProtocol.toLowerCase()) {
						aMenulist.selectedIndex = i;
						found = true;
					}
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}
			return found;
		},

		addPrefStar: function (aParent, aType, aIndex, aValue) {
			var strBundle = document.getElementById("cardbook-strings");
			var aPrefButton = document.createElement('button');
			aParent.appendChild(aPrefButton);
			aPrefButton.setAttribute('id', aType + '_' + aIndex + '_PrefImage');
			aPrefButton.setAttribute('class', 'small-button cardbookPrefStarClass');
			if (aValue) {
				aPrefButton.setAttribute('haspref', 'true');
			} else {
				aPrefButton.removeAttribute('haspref');
			}
			aPrefButton.setAttribute('tooltiptext', strBundle.getString("prefLabel"));

			function firePrefCheckBox(event) {
				var myIdArray = this.id.split('_');
				var myPrefWeightBoxLabel = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBoxLabel');
				var myPrefWeightBox = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_prefWeightBox');
				if (this.getAttribute('haspref')) {
					this.removeAttribute('haspref');
					myPrefWeightBoxLabel.disabled = true;
					myPrefWeightBox.disabled = true;
				} else {
					this.setAttribute('haspref', 'true');
					myPrefWeightBoxLabel.disabled = false;
					myPrefWeightBox.disabled = false;
				}
				myPrefWeightBox.value = "";
			};
			aPrefButton.addEventListener("command", firePrefCheckBox, false);
			return aPrefButton;
		},

		addMenuTypelist: function (aParent, aType, aIndex, aArray, aCheckedArray) {
			var aMenulist = document.createElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_MenulistType');
			aMenulist.setAttribute('type', 'cardbookPanelMenulist');
			var aPanel = document.createElement('panel');
			aPanel.setAttribute('id', aType + '_' + aIndex + '_PanelType');
			aPanel.setAttribute('type', 'cardbookItemPanel');
			aMenulist.appendChild(aPanel);
			// need to wait this end of load to populate
			aPanel.addEventListener("load", function() {
				this.loadItems(aType + '_' + aIndex, aArray, aCheckedArray, true);
				cardbookUtils.updatePanelMenulist("type", this);
			}, false);
			function firePopuphiding(event) {
				cardbookUtils.updatePanelMenulist('type', this);
			};
			aPanel.addEventListener("popuphiding", firePopuphiding, false);
			function fireKeyDown(aEvent) {
				cardbookUtils.enterPanelMenulist('type', aEvent, this);
			};
			aMenulist.addEventListener("keydown", fireKeyDown, false);
		},

		addMenuCaselist: function (aParent, aType, aIndex, aValue, aParameters) {
			var strBundle = document.getElementById("cardbook-strings");
			var aMenulist = document.createElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistCase');
			aMenulist.setAttribute('sizetopopup', 'none');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupCase');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var found = false;
			var caseOperators = [['dig', 'ignoreCaseIgnoreDiacriticLabel'], ['ig', 'ignoreCaseMatchDiacriticLabel'],
									['dg', 'matchCaseIgnoreDiacriticLabel'], ['g', 'matchCaseMatchDiacriticLabel']]
			for (var i = 0; i < caseOperators.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemCase_' + i);
				menuItem.setAttribute("label", strBundle.getString(caseOperators[i][1]));
				menuItem.setAttribute("value", caseOperators[i][0]);
				aMenupopup.appendChild(menuItem);
				if (aValue == caseOperators[i][0]) {
					aMenulist.selectedIndex = i;
					found = true;
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}
		},

		addMenuObjlist: function (aParent, aType, aIndex, aValue, aParameters) {
			var aMenulist = document.createElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_menulistObj');
			aMenulist.setAttribute('sizetopopup', 'none');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupObj');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var myColumns = cardbookUtils.getAllAvailableColumns("search");
			var found = false;
			for (var i = 0; i < myColumns.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemObj_' + i);
				menuItem.setAttribute("label", myColumns[i][1]);
				menuItem.setAttribute("value", myColumns[i][0]);
				aMenupopup.appendChild(menuItem);
				if (aValue == myColumns[i][0]) {
					aMenulist.selectedIndex = i;
					found = true;
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}
		},

		addMenuTermlist: function (aParent, aType, aIndex, aVersion, aValue, aParameters) {
			var aMenulist = document.createElement('menulist');
			aParent.appendChild(aMenulist);
			aMenulist.setAttribute('id', aType + '_' + aIndex + '_' + aVersion + '_menulistTerm');
			for (var prop in aParameters) {
				aMenulist.setAttribute(prop, aParameters[prop]);
			}
			
			var aMenupopup = document.createElement('menupopup');
			aMenulist.appendChild(aMenupopup);
			aMenupopup.setAttribute('id', aType + '_' + aIndex + '_menupopupTerm');
			cardbookElementTools.deleteRows(aMenupopup.id);
			var strBundle = Services.strings.createBundle("chrome://messenger/locale/search-operators.properties");
			var found = false;
			var operators = ['Contains', 'DoesntContain', 'Is', 'Isnt', 'BeginsWith', 'EndsWith', 'IsEmpty', 'IsntEmpty']
			for (var i = 0; i < operators.length; i++) {
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute('id', aType + '_' + aIndex + '_menuitemTerm_' + i);
				menuItem.setAttribute("label", strBundle.GetStringFromName(Components.interfaces.nsMsgSearchOp[operators[i]]));
				menuItem.setAttribute("value", operators[i]);
				aMenupopup.appendChild(menuItem);
				if (aValue == operators[i]) {
					aMenulist.selectedIndex = i;
					found = true;
				}
			}
			if (!found) {
				aMenulist.selectedIndex = 0;
			}

			function fireMenuTerm(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				cardbookComplexSearch.showOrHideForEmpty(this.id);
				var myIdArray = this.id.split('_');
				cardbookComplexSearch.disableButtons(myIdArray[0], myIdArray[1], myIdArray[2]);
			};
			aMenulist.addEventListener("command", fireMenuTerm, false);
		},

		addEditButton: function (aParent, aType, aIndex, aVersion, aButtonType, aFunction) {
			var strBundle = document.getElementById("cardbook-strings");
			var aEditButton = document.createElement('button');
			aParent.appendChild(aEditButton);
			aEditButton.setAttribute('id', aType + '_' + aIndex + '_' + aVersion + '_cardbook' + aButtonType + 'Button');
			if (aButtonType == "add") {
				aEditButton.setAttribute('label', '+');
			} else if (aButtonType == "remove") {
				aEditButton.setAttribute('label', '-');
			} else if (aButtonType == "up") {
				aEditButton.setAttribute('label', '↑');
			} else if (aButtonType == "down") {
				aEditButton.setAttribute('label', '↓');
			}
			aEditButton.setAttribute('class', 'small-button');
			aEditButton.setAttribute('tooltiptext', strBundle.getString(aButtonType + "EntryTooltip"));
			aEditButton.addEventListener("click", aFunction, false);
			aEditButton.addEventListener("command", aFunction, false);
		}
	};

};
