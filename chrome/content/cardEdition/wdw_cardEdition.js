if ("undefined" == typeof(wdw_cardEdition)) {
	try {
		ChromeUtils.import("resource://gre/modules/Services.jsm");
		ChromeUtils.import("resource://gre/modules/FormHistory.jsm");
		ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
		ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	}
	catch(e) {
		Components.utils.import("resource://gre/modules/Services.jsm");
		Components.utils.import("resource://gre/modules/FormHistory.jsm");
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		Components.utils.import("chrome://cardbook/content/cardbookRepository.js");
	}

	var wdw_cardEdition = {

		contactNotLoaded : true,
		panel : 0,
		currentAdrId : [],
		emailToAdd : [],
		listOfCategories : [],
		cardbookeditlists : {},
		workingCard : {},

		displayListTrees: function (aTreeName) {
			var availableCardsTreeView = {
				get rowCount() { return wdw_cardEdition.cardbookeditlists[aTreeName].length; },
				isContainer: function(idx) { return false },
				cycleHeader: function(idx) { return false },
				isEditable: function(idx, column) { return false },
				getCellText: function(idx, column) {
					if (column.id == aTreeName + "Uid") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx].uid;
					}
					else if (column.id == aTreeName + "Name") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return cardbookUtils.getName(wdw_cardEdition.cardbookeditlists[aTreeName][idx]);
					}
					else if (column.id == aTreeName + "Fn") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx].fn;
					}
					else if (column.id == aTreeName + "Firstname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx].firstname;
					}
					else if (column.id == aTreeName + "Lastname") {
						if (wdw_cardEdition.cardbookeditlists[aTreeName][idx]) return wdw_cardEdition.cardbookeditlists[aTreeName][idx].lastname;
					}
				}
			}
			document.getElementById(aTreeName + 'Tree').view = availableCardsTreeView;
		},

		displayLists: function (aCard) {
			document.getElementById('searchAvailableCardsInput').value = "";
			document.getElementById('kindTextBox').value = "";
			wdw_cardEdition.cardbookeditlists.availableCards = [];
			wdw_cardEdition.cardbookeditlists.addedCards = [];
			if (aCard.version == "4.0") {
				document.getElementById('kindTextBox').value = aCard.kind;
				for (var i = 0; i < aCard.member.length; i++) {
					var uid = aCard.member[i].replace("urn:uuid:", "");
					if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]) {
						wdw_cardEdition.cardbookeditlists.addedCards.push(cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+uid]);
					}
				}
			} else if (aCard.version == "3.0") {
				document.getElementById('kindTextBox').value = "";
				var kindCustom = cardbookPreferences.getStringPref("extensions.cardbook.kindCustom");
				var memberCustom = cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
				for (var i = 0; i < aCard.others.length; i++) {
					var localDelim1 = aCard.others[i].indexOf(":",0);
					if (localDelim1 >= 0) {
						var header = aCard.others[i].substr(0,localDelim1);
						var trailer = aCard.others[i].substr(localDelim1+1,aCard.others[i].length);
						if (header == kindCustom) {
							document.getElementById('kindTextBox').value = trailer;
						} else if (header == memberCustom) {
							if (cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
								wdw_cardEdition.cardbookeditlists.addedCards.push(cardbookRepository.cardbookCards[aCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]);
							}
						}
					}
				}
			}
			wdw_cardEdition.sortCardsTreeCol('addedCards', null, null);
			wdw_cardEdition.searchAvailableCards();
		},

		sortTrees: function (aEvent, aTreeName) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardEdition.sortCardsTreeCol(aTreeName, target);
			}
		},

		sortCardsTreeCol: function (aTreeName, aColumn, aSelectedList) {
			var myTree = document.getElementById(aTreeName + 'Tree');
			
			// get selected cards
			var listOfUid = {};
			if (!(aSelectedList != null && aSelectedList !== undefined && aSelectedList != "")) {
				listOfUid[aTreeName] = cardbookUtils.getSelectedCardsForList(myTree);
			} else {
				listOfUid[aTreeName] = aSelectedList;
			}

			var columnName;
			var columnArray;
			var order = myTree.getAttribute("sortDirection") == "ascending" ? 1 : -1;
			
			// if the column is passed and it's already sorted by that column, reverse sort
			if (aColumn) {
				columnName = aColumn.id;
				if (myTree.getAttribute("sortResource") == columnName) {
					order *= -1;
				}
			} else {
				columnName = myTree.getAttribute("sortResource");
			}
			
			var sortColumnName = columnName.replace(aTreeName, "").toLowerCase();
			if (wdw_cardEdition.cardbookeditlists[aTreeName]) {
				wdw_cardEdition.cardbookeditlists[aTreeName] = cardbookUtils.sortCardsTreeArrayByString(wdw_cardEdition.cardbookeditlists[aTreeName], sortColumnName, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);

			wdw_cardEdition.displayListTrees(aTreeName);

			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select Cards back
			cardbookUtils.setSelectedCardsForList(myTree, listOfUid[aTreeName]);
		},

		addUidToAdded: function (aCardUid) {
			var found = false;
			for (var j = 0; j < wdw_cardEdition.cardbookeditlists.addedCards.length; j++) {
				if (wdw_cardEdition.cardbookeditlists.addedCards[j].uid == aCardUid) {
					found = true;
					break;
				}
			}
			if (!found) {
				wdw_cardEdition.cardbookeditlists.addedCards.splice(0, 0, cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+aCardUid]);
			}
		},

		removeUidFromAdded: function (aCardUid) {
			function removeCardList(element) {
				return (element.uid != aCardUid);
			}
			wdw_cardEdition.cardbookeditlists.addedCards = wdw_cardEdition.cardbookeditlists.addedCards.filter(removeCardList);
		},

		modifyLists: function (aMenuOrTree) {
			switch (aMenuOrTree.id) {
				case "availableCardsTreeChildren":
					var myAction = "appendlistavailableCardsTree";
					break;
				case "addedCardsTreeChildren":
					var myAction = "deletelistaddedCardsTree";
					break;
				default:
					var myAction = aMenuOrTree.id.replace("Menu", "").replace("Button", "");
					break;
			}
			var myAvailableCardsTree = document.getElementById('availableCardsTree');
			var myAddedCardsTree = document.getElementById('addedCardsTree');
			var myAvailableCards = cardbookUtils.getSelectedCardsForList(myAvailableCardsTree);
			var myAddedCards = cardbookUtils.getSelectedCardsForList(myAddedCardsTree);
			switch (myAction) {
				case "appendlistavailableCardsTree":
					for (var i = 0; i < myAvailableCards.length; i++) {
						wdw_cardEdition.addUidToAdded(myAvailableCards[i]);
					}
					break;
				case "deletelistaddedCardsTree":
					for (var i = 0; i < myAddedCards.length; i++) {
						wdw_cardEdition.removeUidFromAdded(myAddedCards[i]);
					}
					break;
				default:
					break;
			}
			wdw_cardEdition.sortCardsTreeCol('addedCards', null, myAddedCards);
			wdw_cardEdition.searchAvailableCards(myAvailableCards);
		},

		searchAvailableCards: function (aSelectedList) {
			var listOfUid = [];
			if (!(aSelectedList != null && aSelectedList !== undefined && aSelectedList != "")) {
				var myTree = document.getElementById('availableCardsTree');
				listOfUid = cardbookUtils.getSelectedCardsForList(myTree);
			} else {
				listOfUid = aSelectedList;
			}
			var searchValue = cardbookRepository.makeSearchString(document.getElementById('searchAvailableCardsInput').value);
			wdw_cardEdition.cardbookeditlists.availableCards = [];
			var myCurrentDirPrefId = document.getElementById('dirPrefIdTextBox').value;
			if (myCurrentDirPrefId != "") {
				for (var i in cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId]) {
					if (i.includes(searchValue) || searchValue == "") {
						for (var j = 0; j < cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId][i].length; j++) {
							var myCard = cardbookRepository.cardbookCardLongSearch[myCurrentDirPrefId][i][j];
							if (myCard.dirPrefId == myCurrentDirPrefId) {
								var found = false;
								for (var k = 0; k < wdw_cardEdition.cardbookeditlists.addedCards.length; k++) {
									if (wdw_cardEdition.cardbookeditlists.addedCards[k].uid == myCard.uid) {
										found = true;
										break;
									}
								}
								if (!found && myCard.uid != document.getElementById('uidTextBox').value) {
									wdw_cardEdition.cardbookeditlists.availableCards.push(myCard);
								}
							}
						}
					}
				}
			}
			wdw_cardEdition.sortCardsTreeCol('availableCards', null, listOfUid);
		},

		loadCategories: function (aCategoryList) {
			var categoryPanel = document.getElementById("categoriesPanel");
			var itemsList = [];
			for (var i = 0; i < wdw_cardEdition.listOfCategories.length; i++) {
				itemsList.push([wdw_cardEdition.listOfCategories[i], wdw_cardEdition.listOfCategories[i]]);
			}
			categoryPanel.loadItems("", itemsList, aCategoryList, false);
			cardbookUtils.updatePanelMenulist("category", categoryPanel);
		},

		getCategories: function () {
			var categoryPanel = document.getElementById("categoriesPanel");
			return categoryPanel.itemsLabel;
		},

		loadSourceCategories: function (aDirPrefId) {
			wdw_cardEdition.listOfCategories = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[aDirPrefId]));
			wdw_cardEdition.listOfCategories = cardbookUtils.cleanCategories(wdw_cardEdition.listOfCategories);
		},

		display40: function (aCardVersion, aReadOnly) {
			if (aCardVersion == "4.0") {
				document.getElementById('birthplaceLabel').removeAttribute('hidden');
				document.getElementById('birthplaceTextBox').removeAttribute('hidden');
				document.getElementById('anniversaryLabel').removeAttribute('hidden');
				document.getElementById('anniversaryTextBox').removeAttribute('hidden');
				document.getElementById('deathdateLabel').removeAttribute('hidden');
				document.getElementById('deathdateTextBox').removeAttribute('hidden');
				document.getElementById('deathplaceLabel').removeAttribute('hidden');
				document.getElementById('deathplaceTextBox').removeAttribute('hidden');
				if (aReadOnly) {
					if (document.getElementById('genderRow1') && document.getElementById('genderRow2')) {
						document.getElementById('genderRow1').setAttribute('hidden', 'true');
						document.getElementById('genderRow2').removeAttribute('hidden');
					}
					document.getElementById('genderTextBox').setAttribute('readonly', 'true');
					document.getElementById('birthplaceTextBox').setAttribute('readonly', 'true');
					document.getElementById('anniversaryTextBox').setAttribute('readonly', 'true');
					document.getElementById('deathdateTextBox').setAttribute('readonly', 'true');
					document.getElementById('deathplaceTextBox').setAttribute('readonly', 'true');
				} else {
					if (document.getElementById('genderRow1') && document.getElementById('genderRow2')) {
						document.getElementById('genderRow1').removeAttribute('hidden');
						document.getElementById('genderRow2').setAttribute('hidden', 'true');
					}
					document.getElementById('genderTextBox').removeAttribute('readonly');
					document.getElementById('birthplaceTextBox').removeAttribute('readonly');
					document.getElementById('anniversaryTextBox').removeAttribute('readonly');
					document.getElementById('deathdateTextBox').removeAttribute('readonly');
					document.getElementById('deathplaceTextBox').removeAttribute('readonly');
				}
			} else {
				if (document.getElementById('genderRow1') && document.getElementById('genderRow2')) {
					document.getElementById('genderRow1').setAttribute('hidden', 'true');
					document.getElementById('genderRow2').setAttribute('hidden', 'true');
				}
				if (document.getElementById('genderLabel') && document.getElementById('genderTextBox')) {
					document.getElementById('genderLabel').setAttribute('hidden', 'true');
					document.getElementById('genderTextBox').setAttribute('hidden', 'true');
				}
				document.getElementById('birthplaceLabel').setAttribute('hidden', 'true');
				document.getElementById('birthplaceTextBox').setAttribute('hidden', 'true');
				document.getElementById('anniversaryLabel').setAttribute('hidden', 'true');
				document.getElementById('anniversaryTextBox').setAttribute('hidden', 'true');
				if (document.getElementById('anniversaryCardbookCalendar')) {
					document.getElementById('anniversaryRow').setAttribute('hidden', 'true');
					document.getElementById('anniversaryCardbookCalendar').setAttribute('hidden', 'true');
				}
				document.getElementById('deathdateLabel').setAttribute('hidden', 'true');
				document.getElementById('deathdateTextBox').setAttribute('hidden', 'true');
				if (document.getElementById('deathdateCardbookCalendar')) {
					document.getElementById('deathdateRow').setAttribute('hidden', 'true');
					document.getElementById('deathdateCardbookCalendar').setAttribute('hidden', 'true');
				}
				document.getElementById('deathplaceLabel').setAttribute('hidden', 'true');
				document.getElementById('deathplaceTextBox').setAttribute('hidden', 'true');
			}
		},

		loadEditionMode: function () {
			var strBundle = document.getElementById("cardbook-strings");
			document.title=strBundle.getString("wdw_cardEdition" + window.arguments[0].editionMode + "Title");
			if (window.arguments[0].editionMode == "ViewResult") {
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').label = strBundle.getString("addToAddressbook");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "ViewResultHideCreate") {
				document.getElementById('addressbookMenulist').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistLabel').setAttribute('hidden', 'true');
				document.getElementById('addressbookMenulistGroupbox').setAttribute('hidden', 'true');
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'false');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('bdayCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('anniversaryCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('deathdateCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('noteCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList") {
				document.getElementById('addressbookMenulist').disabled = true;
				document.getElementById('addressbookMenulistLabel').label = strBundle.getString("ABLabel");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('listReadOnlyGroupbox').removeAttribute('hidden');
				document.getElementById('categoriesReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadWriteGroupbox').setAttribute('hidden', 'true');
				document.getElementById('defaultCardImage').removeAttribute('context');
				document.getElementById('defaultCardImage').removeAttribute('ondblclick');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('saveEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonDown').setAttribute('hidden', 'true');
				document.getElementById('cardbookSwitchButtonUp').setAttribute('hidden', 'true');
				document.getElementById('bdayCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('anniversaryCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('deathdateCardbookCalendar').setAttribute('hidden', 'true');
				document.getElementById('noteCardbookCalendar').setAttribute('hidden', 'true');
				var panesView = cardbookPreferences.getStringPref("extensions.cardbook.panesView");
				if (panesView == "classical") {
					document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
				} else {
					document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				}
				document.getElementById('readWriteVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "EditContact" || window.arguments[0].editionMode == "EditList") {
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').label = strBundle.getString("ABLabel");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "CreateContact" || window.arguments[0].editionMode == "CreateList") {
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').label = strBundle.getString("addToAddressbook");
				document.getElementById('existingDataGroupbox').setAttribute('hidden', 'true');
				document.getElementById('contactMenulist').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
			} else if (window.arguments[0].editionMode == "AddEmail") {
				wdw_cardEdition.emailToAdd = wdw_cardEdition.workingCard.email[0];
				document.getElementById('addressbookMenulist').disabled = false;
				document.getElementById('addressbookMenulistLabel').label = strBundle.getString("addToAddressbook");
				document.getElementById('existingDataGroupbox').removeAttribute('hidden');
				document.getElementById('contactMenulist').removeAttribute('hidden');
				document.getElementById('categoriesReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listReadOnlyGroupbox').setAttribute('hidden', 'true');
				document.getElementById('categoriesReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('listReadWriteGroupbox').removeAttribute('hidden');
				document.getElementById('createEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('createAndReplaceEditionLabel').setAttribute('hidden', 'true');
				document.getElementById('readOnlyClassicalVbox').setAttribute('hidden', 'true');
				document.getElementById('readOnlyModernVbox').setAttribute('hidden', 'true');
			}
			if (window.arguments[0].cardIn.isAList) {
				document.getElementById('contactGroupbox').setAttribute('hidden', 'true');
				document.getElementById('listGroupbox').removeAttribute('hidden');
				wdw_cardEdition.expandButton(document.getElementById('expandPersImage'));
				wdw_cardEdition.expandButton(document.getElementById('expandOrgImage'));
				document.getElementById('firstTabSpacer').setAttribute('hidden', 'true');
			} else {
				document.getElementById('contactGroupbox').removeAttribute('hidden');
				document.getElementById('listGroupbox').setAttribute('hidden', 'true');
				document.getElementById('firstTabSpacer').removeAttribute('hidden');
			}
			document.getElementById('lastnameTextBox').focus();
			document.getElementById('addressbookMenulistLabel').scrollIntoView();
		},

		loadDefaultVersion: function () {
			if (wdw_cardEdition.workingCard.version == "") {
				var myDirPrefId = document.getElementById('addressbookMenulist').selectedItem.value;
				document.getElementById("versionTextBox").value = cardbookPreferences.getVCardVersion(myDirPrefId);
				wdw_cardEdition.workingCard.version = document.getElementById("versionTextBox").value;
			} else {
				document.getElementById("versionTextBox").value = wdw_cardEdition.workingCard.version;
			}
		},

		removeContacts: function () {
			document.getElementById('contactMenulist').selectedIndex = 0;
			cardbookElementTools.deleteRows('contactMenupopup');
			wdw_cardEdition.contactNotLoaded = true;
		},

		loadContacts: function () {
			if (wdw_cardEdition.contactNotLoaded) {
				var myPopup = document.getElementById("contactMenupopup");
				var myAddressBookId = document.getElementById('addressbookMenulist').selectedItem.value;
				var menuItem = document.createElement("menuitem");
				menuItem.setAttribute("label", "");
				menuItem.setAttribute("value", "");
				myPopup.appendChild(menuItem);
				document.getElementById('contactMenulist').selectedIndex = 0;
				var mySortedContacts = [];
				for (var i = 0; i < cardbookRepository.cardbookDisplayCards[myAddressBookId].length; i++) {
					var myCard = cardbookRepository.cardbookDisplayCards[myAddressBookId][i];
					if (!myCard.isAList) {
						mySortedContacts.push([myCard.fn, myCard.uid]);
					}
				}
				mySortedContacts = cardbookUtils.sortArrayByString(mySortedContacts,0,1);
				for (var i = 0; i < mySortedContacts.length; i++) {
					var menuItem = document.createElement("menuitem");
					menuItem.setAttribute("label", mySortedContacts[i][0]);
					menuItem.setAttribute("value", mySortedContacts[i][1]);
					myPopup.appendChild(menuItem);
				}
				wdw_cardEdition.contactNotLoaded = false;
			}
		},

		changeAddressbook: function () {
			wdw_cardEdition.removeContacts();
			document.getElementById('dirPrefIdTextBox').value = document.getElementById('addressbookMenulist').selectedItem.value;
			wdw_cardEdition.loadSourceCategories(document.getElementById('addressbookMenulist').selectedItem.value);
			wdw_cardEdition.workingCard = null;
			wdw_cardEdition.workingCard = new cardbookCardParser();
			cardbookUtils.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').selectedItem.value;
			wdw_cardEdition.loadDefaultVersion();
			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		changeContact: function () {
			var myDirPrefId = document.getElementById('addressbookMenulist').selectedItem.value;
			var myUid = document.getElementById('contactMenulist').selectedItem.value;
			if (myUid != null && myUid !== undefined && myUid != "") {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				cardbookUtils.cloneCard(cardbookRepository.cardbookCards[myDirPrefId+"::"+myUid], wdw_cardEdition.workingCard);
				if (window.arguments[0].editionMode == "AddEmail" ) {
					wdw_cardEdition.workingCard.email.push(wdw_cardEdition.emailToAdd);
				}
			} else {
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.workingCard = new cardbookCardParser();
				cardbookUtils.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			}
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
		},

		switchLastnameAndFirstname: function () {
			var tmpValue = document.getElementById('lastnameTextBox').value;
			document.getElementById('lastnameTextBox').value = document.getElementById('firstnameTextBox').value;
			document.getElementById('firstnameTextBox').value = tmpValue;
			document.getElementById('lastnameTextBox').focus();
			wdw_cardEdition.setDisplayName();
		},

		expandButton: function (aImage) {
			var myGrid = document.getElementById(aImage.id.replace(/^expand/, "").replace(/Image$/, "").toLowerCase() + "Grid");
			if (!aImage.getAttribute('expanded')) {
				myGrid.removeAttribute('hidden');
				aImage.setAttribute('expanded', 'true');
			} else {
				myGrid.setAttribute('hidden', 'true');
				aImage.removeAttribute('expanded');
			}
		},

		openCalendarPanel: function (aType) {
			if (aType == "note") {
				var myStartField = document.getElementById('noteCardbookCalendar');
			} else {
				var myStartField = document.getElementById(aType + 'TextBox');
			}
			if (wdw_cardEdition.panel === 1) {
				document.getElementById(aType + 'LightningPanel').openPopup(myStartField, 'after_start', 0, 0, false, false);
			} else {
				document.getElementById(aType + 'BasePanel').openPopup(myStartField, 'after_start', 0, 0, false, false);
			}
		},

		validateCalendarPanel: function (aValue, aType) {
			var dateFormat = cardbookPreferences.getDateFormat(document.getElementById('dirPrefIdTextBox').value);
			if (wdw_cardEdition.panel === 1) {
				var myValue = cardbookDates.convertDateToDateString(aValue, dateFormat);
				document.getElementById(aType + 'LightningPanel').hidePopup();
			} else {
				var myDate = cardbookDates.convertDateStringToDate(aValue, 'YYYY-MM-DD');
				var myValue = cardbookDates.convertDateToDateString(myDate, dateFormat);
				document.getElementById(aType + 'BasePanel').hidePopup();
			}
			var myTextbox = document.getElementById(aType + 'TextBox');
			if (aType == "note") {
				var strBundle = document.getElementById("cardbook-strings");
				if (wdw_cardEdition.panel === 1) {
					var myPrefix = strBundle.getString("eventInNoteEventPrefix") + ":" + document.getElementById('desc1TextBox').value + ":";
				} else {
					var myPrefix = strBundle.getString("eventInNoteEventPrefix") + ":" + document.getElementById('desc2TextBox').value + ":";
				}
				if (myTextbox.value == "" ) {
					myTextbox.value = myPrefix + myValue;
				} else {
					myTextbox.value = myPrefix + myValue + "\r\n" + myTextbox.value;
				}
			} else {
				myTextbox.value = myValue;
			}
			document.getElementById(aType + 'TextBox').focus();
		},

		chooseCalendarPanelEnd: function (addon) {
			if (addon && addon.isActive) {
				wdw_cardEdition.panel = 1;
			} else {
				wdw_cardEdition.panel = 0;
			}
		},

		chooseCalendarPanel: function () {
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID, wdw_cardEdition.chooseCalendarPanelEnd);
		},

		openAdrPanel: function (aAdrLine, aIdArray) {
			wdw_cardEdition.currentAdrId = JSON.parse(JSON.stringify(aIdArray));
			document.getElementById('adrPostOfficeTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][0]);
			document.getElementById('adrExtendedAddrTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][1]);
			document.getElementById('adrStreetTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][2]);
			document.getElementById('adrLocalityTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][3]);
			document.getElementById('adrRegionTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][4]);
			document.getElementById('adrPostalCodeTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][5]);
			document.getElementById('adrCountryTextBox').value = cardbookUtils.undefinedToBlank(aAdrLine[0][6]);
			document.getElementById('adrPanel').openPopup(document.getElementById(wdw_cardEdition.currentAdrId.join("_")), 'after_start', 0, 0, false, false);
		},

		closeAdrPanel: function () {
			document.getElementById('adrPanel').hidePopup();
		},

		validateAdrPanel: function () {
			var myId = wdw_cardEdition.currentAdrId.join("_");
			document.getElementById(myId + '_' + '0').value = document.getElementById('adrPostOfficeTextBox').value.trim();
			document.getElementById(myId + '_' + '1').value = document.getElementById('adrExtendedAddrTextBox').value.trim();
			document.getElementById(myId + '_' + '2').value = document.getElementById('adrStreetTextBox').value.replace(/\n/g, "\\n").trim();
			document.getElementById(myId + '_' + '3').value = document.getElementById('adrLocalityTextBox').value.trim();
			document.getElementById(myId + '_' + '4').value = document.getElementById('adrRegionTextBox').value.trim();
			document.getElementById(myId + '_' + '5').value = document.getElementById('adrPostalCodeTextBox').value.trim();
			document.getElementById(myId + '_' + '6').value = document.getElementById('adrCountryTextBox').value.trim();

			var myTmpArray = [];
			for (var i = 0; i < 7; i++) {
				if (document.getElementById(myId + '_' + i).value != "") {
					myTmpArray.push(document.getElementById(myId + '_' + i).value.replace(/\\n/g, " "));
				}
			}
			document.getElementById(myId).value = myTmpArray.join(" ");
		},

		cancelAdrPanel: function () {
			cardbookTypes.disableButtons(wdw_cardEdition.currentAdrId[0], wdw_cardEdition.currentAdrId[1], document.getElementById("versionTextBox").value);
		},

		displayCard: function (aCard) {
			wdw_cardEdition.clearCard();
			var aReadOnly = cardbookPreferences.getReadOnly(aCard.dirPrefId);
			var aFollowLink = false;
			cardbookUtils.displayCard(aCard, aReadOnly, aFollowLink);
			
			// specific
			document.getElementById('categoriesTextBox').value = cardbookUtils.formatCategories(aCard.categories);
			wdw_cardEdition.loadCategories(aCard.categories);
			
			document.getElementById('photoExtensionTextBox').value = aCard.photo.extension;
			if (!aReadOnly) {
				cardbookTypes.display40(aCard.version);
			} else {
				cardbookUtils.adjustFields();
				document.getElementById('dirPrefIdTextBox').setAttribute('hidden', 'true');
				document.getElementById('uidTextBox').setAttribute('hidden', 'true');
				document.getElementById('versionTextBox').setAttribute('hidden', 'true');
				document.getElementById('othersTextBox').setAttribute('hidden', 'true');
				document.getElementById('photolocalURITextBox').setAttribute('hidden', 'true');
				document.getElementById('photoURITextBox').setAttribute('hidden', 'true');
				document.getElementById('photoExtensionTextBox').setAttribute('hidden', 'true');
			}
		},

		clearCard: function () {
			cardbookUtils.clearCard();
			var typesList = [ 'email', 'tel', 'impp', 'url', 'adr' ];
			for (var i in typesList) {
				cardbookElementTools.deleteRows(typesList[i] + 'Groupbox');
			}
			wdw_cardEdition.loadCategories([]);
		},

		getOrg: function (aTrimArray) {
			var myOrg = [];
			var result = "";
			var aListRows = document.getElementById('orgRows');
			var i = 0;
			while (true) {
				if (document.getElementById('orgRow_' + i)) {
					myOrg.push(cardbookUtils.escapeStringSemiColon(document.getElementById('orgTextBox_' + i).value.trim()));
					i++;
				} else {
					break;
				}
			}
			if (aTrimArray) {
				// trim the array
				for (var i = myOrg.length-1; i >= 0; i--) {
					if (myOrg[i] == "") {
						myOrg.pop();
					} else {
						break;
					}
				}
			}
			result = cardbookUtils.unescapeStringSemiColon(myOrg.join(";"));
			return result;
		},

		setDisplayName: function () {
			var myNewOrg = wdw_cardEdition.getOrg(false);
			var myNewFn = cardbookUtils.getDisplayedNameFromFormula(document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																document.getElementById('firstnameTextBox').value.trim(),
																document.getElementById('othernameTextBox').value.trim(),
																document.getElementById('lastnameTextBox').value.trim(),
																document.getElementById('suffixnameTextBox').value.trim(),
																document.getElementById('nicknameTextBox').value.trim()],
																[myNewOrg,
																document.getElementById('titleTextBox').value.trim(),
																document.getElementById('roleTextBox').value.trim()]);
			document.getElementById('fnTextBox').value = myNewFn;
			wdw_cardEdition.workingCard.lastname = document.getElementById('lastnameTextBox').value.trim();
			wdw_cardEdition.workingCard.firstname = document.getElementById('firstnameTextBox').value.trim();
			wdw_cardEdition.workingCard.othername = document.getElementById('othernameTextBox').value.trim();
			wdw_cardEdition.workingCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
			wdw_cardEdition.workingCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
			wdw_cardEdition.workingCard.nickname = document.getElementById('nicknameTextBox').value.trim();
			wdw_cardEdition.workingCard.org = myNewOrg;
			wdw_cardEdition.workingCard.fn = myNewFn;
		},

		loadRichContext: function(aEvent)
		{
			if (aEvent.target.inputField) {
				var strBundle = document.getElementById("cardbook-strings");
				var myMenu = document.getAnonymousElementByAttribute(aEvent.target.inputField.parentNode, "anonid", "input-box-contextmenu");
				if (document.getElementById('cardbookSeparator::' + aEvent.target.id)) {
					myMenu.removeChild(document.getElementById('cardbookSeparator::' + aEvent.target.id));
				}
				if (document.getElementById('cardbookToUpperCase::' + aEvent.target.id)) {
					myMenu.removeChild(document.getElementById('cardbookToUpperCase::' + aEvent.target.id));
				}
				if (document.getElementById('cardbookToLowerCase::' + aEvent.target.id)) {
					myMenu.removeChild(document.getElementById('cardbookToLowerCase::' + aEvent.target.id));
				}
	
				var myMenuSeparator = document.createElement("menuseparator");
				myMenuSeparator.setAttribute("id", 'cardbookSeparator::' + aEvent.target.id);
				myMenu.appendChild(myMenuSeparator);
	
				var myMenuItem = document.createElement("menuitem");
				myMenuItem.setAttribute("id", 'cardbookToUpperCase::' + aEvent.target.id);
				myMenuItem.addEventListener("command", function(aEvent)
					{
						var tmpArray = this.id.split('::');
						var myTextbox = document.getElementById(tmpArray[1]);
						var myTextboxValue = myTextbox.value;
						var result = "";
						for (var i = 0; i < myTextboxValue.length; i++) {
							if (i >= myTextbox.selectionStart && i < myTextbox.selectionEnd) {
								result = result + myTextboxValue[i].toUpperCase();
							} else {
								result = result + myTextboxValue[i];
							}
						}
						myTextbox.value = result;
						if (myTextbox.oninput) {
							myTextbox.oninput();
						}
					}, false);
				myMenuItem.setAttribute("label", strBundle.getString("toUpperCase"));
				myMenu.appendChild(myMenuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					myMenuItem.disabled = true;
				} else if (aEvent.target.selectionStart == aEvent.target.selectionEnd) {
					myMenuItem.disabled = true;
				} else {
					myMenuItem.disabled = false;
				}
				
				var myMenuItem = document.createElement("menuitem");
				myMenuItem.setAttribute("id", 'cardbookToLowerCase::' + aEvent.target.id);
				myMenuItem.addEventListener("command", function(aEvent)
					{
						var tmpArray = this.id.split('::');
						var myTextbox = document.getElementById(tmpArray[1]);
						var myTextboxValue = myTextbox.value;
						var result = "";
						for (var i = 0; i < myTextboxValue.length; i++) {
							if (i >= myTextbox.selectionStart && i < myTextbox.selectionEnd) {
								result = result + myTextboxValue[i].toLowerCase();
							} else {
								result = result + myTextboxValue[i];
							}
						}
						myTextbox.value = result;
						if (myTextbox.oninput) {
							myTextbox.oninput();
						}
					}, false);
				myMenuItem.setAttribute("label", strBundle.getString("toLowerCase"));
				myMenu.appendChild(myMenuItem);
				if (aEvent.target.getAttribute("readonly") == "true") {
					myMenuItem.disabled = true;
				} else if (aEvent.target.selectionStart == aEvent.target.selectionEnd) {
					myMenuItem.disabled = true;
				} else {
					myMenuItem.disabled = false;
				}
			}
		},

		loadDateFormatLabels: function () {
			var dateFormat = cardbookPreferences.getDateFormat(wdw_cardEdition.workingCard.dirPrefId);
			var strBundle = document.getElementById("cardbook-strings");
			myD = strBundle.getString("dateFormatsDLabel");
			myM = strBundle.getString("dateFormatsMLabel");
			myY = strBundle.getString("dateFormatsYLabel");
			var fieldArray = [ "bday", "anniversary", "deathdate" ];
			for (var i = 0; i < fieldArray.length; i++) {
				if (document.getElementById(fieldArray[i] + 'Label')) {
					document.getElementById(fieldArray[i] + 'Label').value = strBundle.getString(fieldArray[i] + "Label") + " (" + dateFormat.replace(/D/g, myD).replace(/M/g, myM).replace(/Y/g, myY) + ")";
				}
			}
		},

		showCorrectTabs: function () {
			document.getElementById('advancedTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.advancedTabView"));
			document.getElementById('mailPopularityTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.mailPopularityTabView"));
		},

		load: function () {
			cardBookEditionPrefObserver.register();
			wdw_cardEdition.showCorrectTabs();
			cardbookUtils.purgeEditionPhotoTempFile();

			wdw_cardEdition.workingCard = new cardbookCardParser();
			cardbookUtils.cloneCard(window.arguments[0].cardIn, wdw_cardEdition.workingCard);
			var ABList = document.getElementById('addressbookMenulist');
			var ABPopup = document.getElementById('addressbookMenupopup');
			cardbookElementTools.loadAddressBooks(ABPopup, ABList, wdw_cardEdition.workingCard.dirPrefId, true, false,
													(window.arguments[0].editionMode == "ViewContact" || window.arguments[0].editionMode == "ViewList"), false, false);
			// the dirPrefId may be different from the one loaded in case of a complex search
			wdw_cardEdition.workingCard.dirPrefId = document.getElementById('addressbookMenulist').selectedItem.value;
			wdw_cardEdition.loadSourceCategories(wdw_cardEdition.workingCard.dirPrefId);
			
			cardbookElementTools.loadGender("genderMenupopup", "genderMenulist", wdw_cardEdition.workingCard.gender);

			wdw_cardEdition.chooseCalendarPanel();
			wdw_cardEdition.loadDefaultVersion();
			wdw_cardEdition.displayCard(wdw_cardEdition.workingCard);
			wdw_cardEdition.loadDateFormatLabels();
			wdw_cardEdition.loadEditionMode();
			
			// address panel behaviour
			function firePopupShownAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					document.getElementById('adrStreetTextBox').focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popupshown", firePopupShownAdr, false);
			// save the information in case of a hiding (especially when another window opens up
			function firePopupHidingAdr() {
				wdw_cardEdition.validateAdrPanel();
				wdw_cardEdition.cancelAdrPanel();
			};
			document.getElementById('adrPanel').addEventListener("popuphiding", firePopupHidingAdr, false);
			function firePopupHiddenAdr(event) {
				//to avoid this would be fired by autocomplete popups
				if (event.target.id == 'adrPanel') {
					var myId = wdw_cardEdition.currentAdrId.join("_");
					document.getElementById(myId).focus();
				}
			};
			document.getElementById('adrPanel').addEventListener("popuphidden", firePopupHiddenAdr, false);
		},

		saveMailPopularity: function () {
			var i = 0;
			while (true) {
				if (document.getElementById('mailPopularity_' + i + '_row')) {
					var email = document.getElementById('email_' + i + '_Textbox').value;
					var emailValue = document.getElementById('popularity_' + i + '_Textbox').value;
					if (emailValue == "") {
						if (cardbookRepository.cardbookMailPopularityIndex[email]) {
							delete cardbookRepository.cardbookMailPopularityIndex[email];
						}
					} else {
						cardbookRepository.cardbookMailPopularityIndex[email] = emailValue;
					}
					i++;
				} else {
					break;
				}
			}
			if (i > 0) {
				cardbookMailPopularity.writeMailPopularity();
			}
		},

		updateFormHistory: function (aField) {
			var myValue = document.getElementById(aField).value;
			if (myValue == "") {
				return;
			}
			if (FormHistory.enabled) {
				FormHistory.update({
					op: "bump",
					fieldname: aField,
					value: myValue
				}, {handleError(aError) {
						Components.utils.reportError("Saving find to form history failed: " + aError.message);
					}
				});
			}
		},

		updateFormFields: function () {
			// first static fields
			var fieldHistorized = [ 'adrLocality', 'adrRegion', 'adrPostalCode', 'adrCountry', 'title', 'role' ];
			for (var i in fieldHistorized) {
				wdw_cardEdition.updateFormHistory(fieldHistorized[i] + 'TextBox');
			}
			// then dynamic fields
			var i = 0;
			while (true) {
				if (document.getElementById('orgTextBox_' + i)) {
					wdw_cardEdition.updateFormHistory('orgTextBox_' + i);
					i++;
				} else {
					break;
				}
			}
		},

		calculateResult: function (aCard) {
			cardbookUtils.cloneCard(wdw_cardEdition.workingCard, aCard);
			aCard.dirPrefId = document.getElementById('addressbookMenulist').selectedItem.value;

			aCard.version = document.getElementById("versionTextBox").value;
			aCard.categories = wdw_cardEdition.getCategories();
			
			aCard.org = wdw_cardEdition.getOrg(true);
			aCard.title = document.getElementById('titleTextBox').value.trim();
			aCard.role = document.getElementById('roleTextBox').value.trim();

			aCard.fn = document.getElementById('fnTextBox').value.trim();
			
			aCard.lastname = document.getElementById('lastnameTextBox').value.trim();
			aCard.firstname = document.getElementById('firstnameTextBox').value.trim();
			aCard.othername = document.getElementById('othernameTextBox').value.trim();
			aCard.suffixname = document.getElementById('suffixnameTextBox').value.trim();
			aCard.prefixname = document.getElementById('prefixnameTextBox').value.trim();
			aCard.nickname = document.getElementById('nicknameTextBox').value.trim();
			aCard.bday = document.getElementById('bdayTextBox').value.trim();
			aCard.gender = document.getElementById('genderMenulist').selectedItem.value.trim();
			aCard.birthplace = document.getElementById('birthplaceTextBox').value.trim();
			aCard.anniversary = document.getElementById('anniversaryTextBox').value.trim();
			aCard.deathdate = document.getElementById('deathdateTextBox').value.trim();
			aCard.deathplace = document.getElementById('deathplaceTextBox').value.trim();
			
			aCard.note = document.getElementById('noteTextBox').value.trim();

			aCard.photo = {};
			aCard.photo.types = [];
			aCard.photo.value = "";
			aCard.photo.URI = document.getElementById('photoURITextBox').value;
			aCard.photo.localURI = document.getElementById('photolocalURITextBox').value;
			aCard.photo.extension = document.getElementById('photoExtensionTextBox').value;

			var typesList = [ 'email', 'tel', 'url', 'adr' ];
			for (var i in typesList) {
				aCard[typesList[i]] = cardbookTypes.getAllTypes(typesList[i], true);
			}
			aCard.impp = cardbookTypes.getIMPPTypes();

			var othersTemp1 = [];
			for (var i in cardbookRepository.customFields) {
				for (var j = 0; j < cardbookRepository.customFields[i].length; j++) {
					if (document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox')) {
						var customValue = document.getElementById('customField' + cardbookRepository.customFields[i][j][2] + i + 'TextBox').value.trim();
						if (customValue != null && customValue !== undefined && customValue != "") {
							othersTemp1.push(cardbookRepository.customFields[i][j][0] + ":" + customValue);
						}
					}
				}
			}
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var othersTemp3 = [];
			var othersTemp2 = document.getElementById('othersTextBox').value;
			if (othersTemp2 != null && othersTemp2 !== undefined && othersTemp2 != "") {
				othersTemp3 = othersTemp2.split(re);
			}
			aCard.others = othersTemp1.concat(othersTemp3);

			// trying desesperately to find a Fn
			if (aCard.fn == "") {
				cardbookUtils.getDisplayedName(aCard, document.getElementById('dirPrefIdTextBox').value, [document.getElementById('prefixnameTextBox').value.trim(),
																document.getElementById('firstnameTextBox').value.trim(),
																document.getElementById('othernameTextBox').value.trim(),
																document.getElementById('lastnameTextBox').value.trim(),
																document.getElementById('suffixnameTextBox').value.trim(),
																document.getElementById('nicknameTextBox').value.trim()],
																[wdw_cardEdition.getOrg(false),
																document.getElementById('titleTextBox').value.trim(),
																document.getElementById('roleTextBox').value.trim()]);
			}
					
			cardbookUtils.setCalculatedFields(aCard);

			var myMembers = [];
			for (var i = 0; i < wdw_cardEdition.cardbookeditlists.addedCards.length; i++) {
				myMembers.push(["urn:uuid:" + wdw_cardEdition.cardbookeditlists.addedCards[i].uid]);
			}
			cardbookUtils.parseLists(aCard, myMembers, document.getElementById('kindTextBox').value.trim());
		},

		saveFinal: function () {
			if (cardbookTypes.validateDynamicTypes() && cardbookTypes.validateMailPopularity() && window.arguments[0].editionMode != "ViewContact" && window.arguments[0].editionMode != "ViewList") {
				var myOutCard = new cardbookCardParser();
				wdw_cardEdition.calculateResult(myOutCard);
				wdw_cardEdition.saveMailPopularity();
				window.arguments[0].cardOut = myOutCard;
				wdw_cardEdition.workingCard = null;
				wdw_cardEdition.updateFormFields();
				if (window.arguments[0].editionCallback) {
					window.arguments[0].editionCallback(window.arguments[0].cardIn, window.arguments[0].cardOut, window.arguments[0].editionSource);
				}
				cardBookEditionPrefObserver.unregister();
				close();
			}
		},

		create: function () {
			window.arguments[0].cardEditionAction = "CREATE";
			wdw_cardEdition.saveFinal();
		},

		createAndReplace: function () {
			window.arguments[0].cardEditionAction = "CREATEANDREPLACE";
			wdw_cardEdition.saveFinal();
		},

		save: function () {
			window.arguments[0].cardEditionAction = "SAVE";
			wdw_cardEdition.saveFinal();
		},

		returnKey: function () {
			if (window.arguments[0].editionMode == "ViewResult" || window.arguments[0].editionMode == "ViewResultHideCreate") {
				return;
			} else if (document.getElementById('adrPanel').state == 'open') {
				wdw_cardEdition.validateAdrPanel();
				return;
			}
			wdw_cardEdition.save();
		},

		cancel: function () {
			window.arguments[0].cardEditionAction = "CANCEL";
			cardBookEditionPrefObserver.unregister();
			close();
		}

	};

};

window.addEventListener("popupshowing", wdw_cardEdition.loadRichContext, true);
