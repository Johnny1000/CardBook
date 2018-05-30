if ("undefined" == typeof(wdw_cardbook)) {
	try {
		ChromeUtils.import("resource:///modules/mailServices.js");
		ChromeUtils.import("resource://gre/modules/Services.jsm");
		ChromeUtils.import("resource://gre/modules/PluralForm.jsm");
		ChromeUtils.import("resource://gre/modules/AddonManager.jsm");
		ChromeUtils.import("chrome://cardbook/content/cardbookRepository.js");
	}
	catch(e) {
		Components.utils.import("resource:///modules/mailServices.js");
		Components.utils.import("resource://gre/modules/Services.jsm");
		Components.utils.import("resource://gre/modules/PluralForm.jsm");
		Components.utils.import("resource://gre/modules/AddonManager.jsm");
		Components.utils.import("chrome://cardbook/content/cardbookRepository.js");
	}

	var wdw_cardbook = {
		
		nIntervId : 0,
		currentType : "",
		currentIndex : "",
		currentValue : "",
		currentFirstVisibleRow : 0,
		currentLastVisibleRow : 0,
		currentAccountId : "",
		cutAndPaste : "",
		currentCopiedEntry : [],
		cardbookrefresh : false,
		writeButtonFired : false,

		firstOpen: function () {
			var firstOpen = cardbookPreferences.getBoolPref("extensions.cardbook.firstOpen");
			if (firstOpen && cardbookRepository.cardbookAccounts.length == 0) {
				wdw_cardbook.addAddressbook("first");
				cardbookPreferences.setBoolPref("extensions.cardbook.firstOpen", false);
				cardbookPreferences.setBoolPref("extensions.cardbook.mailPopularityTabView", false);
				cardbookPreferences.setBoolPref("extensions.cardbook.technicalTabView", false);
				cardbookPreferences.setBoolPref("extensions.cardbook.vcardTabView", false);
			}
			wdw_cardbook.showCorrectTabs();
		},

	// otherwise buttons get lost
   	migrateIcons: function () {
		var iconsMigrated = cardbookPreferences.getBoolPref("extensions.cardbook.iconsMigrated");
		if (!iconsMigrated) {
			var toolbar = document.getElementById("cardbook-toolbar");
			if (toolbar) {
				toolbar.setAttribute("currentset", "cardbookToolbarAppMenuButton,cardbookToolbarSyncButton,cardbookToolbarWriteButton,cardbookToolbarConfigurationButton,spring,cardbookToolbarSearchBox,cardbookToolbarAddContactButton,cardbookToolbarAddListButton,cardbookToolbarEditButton,cardbookToolbarRemoveButton,cardbookToolbarThMenuButton");
			}
			cardbookPreferences.setBoolPref("extensions.cardbook.iconsMigrated", true);
		}
	},

   	setToolbarCustom: function () {
		var toolbox = document.getElementById("cardbook-toolbox");
		if (toolbox) {
			toolbox.customizeDone = function(aEvent) {
				MailToolboxCustomizeDone(aEvent, "CustomizeCardBookToolbar");
			};
			toolbox.setAttribute('toolbarHighlight','true');
		}
	},

   	showCorrectTabs: function () {
		document.getElementById('mailPopularityTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.mailPopularityTabView"));
		document.getElementById('technicalTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.technicalTabView"));
		document.getElementById('vcardTab').setAttribute("collapsed", !cardbookPreferences.getBoolPref("extensions.cardbook.vcardTabView"));
		document.getElementById('cardbookTabbox').selectedTab = document.getElementById("generalTab");
	},

		addTreeColumns: function () {
			if (cardbookRepository.cardbookReorderMode == "NOREORDER") {
				cardbookRepository.cardbookReorderMode = "REORDER";
				var myTreecols = document.getElementById('cardsTreecols');
				var myColumns = cardbookUtils.getAllAvailableColumns("cardstree");
				cardbookElementTools.deleteRows(myTreecols.id)
				
				var myOrdinal = 0;
				for (var i = 0; i < myColumns.length; i++) {
					var myCode = myColumns[i][0];
					var myLabel = myColumns[i][1];
					cardbookElementTools.addTreeSplitter(myTreecols, {ordinal: myOrdinal++});
					if (myCode == "cardIcon") {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {fixed: 'true', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														class: 'sortDirectionIndicator', sortDirection: 'ascending', ordinal: myOrdinal++});
					} else {
						cardbookElementTools.addTreecol(myTreecols, myCode, myLabel, {flex: '1', persist: 'width ordinal hidden', style: 'text-align:left', hidden: 'true',
														class: 'sortDirectionIndicator', sortDirection: 'ascending', ordinal: myOrdinal++});
					}
				}
			}
			cardbookRepository.cardbookReorderMode = "NOREORDER";
		},

		setAccountsTreeMenulist: function () {
			var accountsShown = cardbookPreferences.getStringPref("extensions.cardbook.accountsShown");
			cardbookElementTools.loadAccountsOrCatsTreeMenu("accountsOrCatsTreeMenupopup", "accountsOrCatsTreeMenulist", accountsShown);
		},

		loadFirstWindow: function () {
			cardBookPrefObserver.register();
			cardBookWindowObserver.register();
			cardBookWindowMutationObserver.register();
			// for versions <= 20.4
			wdw_cardbook.migrateIcons();
			wdw_cardbook.setSyncControl();
			wdw_cardbook.setToolbarCustom();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setAccountsTreeMenulist();
			wdw_cardbook.clearCard();
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.firstOpen();
			// for the standalone window
			ovl_cardbookLayout.orientPanes();
			ovl_cardbookLayout.resizePanes();
			// in case of opening a new window without having a reload
			wdw_cardbook.loadCssRules();
			wdw_cardbook.addTreeColumns();
			wdw_cardbook.refreshAccountsInDirTree();
			var accountShown = cardbookPreferences.getStringPref("extensions.cardbook.accountShown");
			wdw_cardbook.currentAccountId = accountShown;
			cardbookUtils.setColumnsStateForAccount(accountShown);
			cardbookUtils.setSelectedAccount(accountShown, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);
			wdw_cardbook.refreshWindow();
		},

		syncAccountFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
				
				cardbookSynchronization.syncAccount(myPrefId);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.syncAccountFromAccountsOrCats error : " + e, "Error");
			}
		},

		canDropOnContactBox: function (aEvent) {
			if (cardbookRepository.cardbookSearchMode != "SEARCH" && cardbookRepository.cardbookComplexSearchMode != "SEARCH") {
				var myDirPrefId = cardbookUtils.getAccountId(wdw_cardbook.currentAccountId);
				if (cardbookPreferences.getEnabled(myDirPrefId) && !cardbookPreferences.getReadOnly(myDirPrefId)) {
					aEvent.preventDefault();
				}
			}
		},

		displayAccountOrCat: function (aCardList) {
			var accountsOrCatsTreeView = {
				get rowCount() { return aCardList.length; },
				isContainer: function(row) { return false },
				cycleHeader: function(row) { return false },
				getRowProperties: function(row) {
					if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
						if (aCardList[row].isAList) {
							return "SEARCH MailList color_" + aCardList[row].dirPrefId;
						} else {
							return "SEARCH color_" + aCardList[row].dirPrefId;
						}
					} else {
						if (aCardList[row].isAList) {
							return "MailList";
						} else {
							return "";
						}
					}
				},
				getCellProperties: function(row, column) {
					return this.getRowProperties(row);
				},
				getCellText: function(row, column){
					if (column.id == "cardIcon") return "";
					else if (column.id == "name") return cardbookUtils.getName(aCardList[row]);
					else if (column.id == "gender") return cardbookRepository.currentTypes.gender[aCardList[row].gender];
					else if (column.id == "bday") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "anniversary") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else if (column.id == "deathdate") return cardbookDates.getFormattedDateForCard(aCardList[row], column.id);
					else return cardbookUtils.getCardValueByField(aCardList[row], column.id);
				}
			}
			cardbookRepository.showNameAs = cardbookPreferences.getStringPref("extensions.cardbook.showNameAs");
			cardbookRepository.dateDisplayedFormat = cardbookPreferences.getStringPref("extensions.cardbook.dateDisplayedFormat");
			document.getElementById('cardsTree').view = accountsOrCatsTreeView;
		},

		clearCard: function () {
			cardbookUtils.clearCard();
			var typesList = [ 'email', 'tel', 'impp', 'url', 'adr' ];
			for (var i in typesList) {
				cardbookElementTools.deleteRowsAllTypes(typesList[i]);
			}
			document.getElementById('categoriesclassicalTextBox').value = "";
			document.getElementById('categoriesmodernTextBox').value = "";
			cardbookUtils.adjustFields();
		},
		
		displayCard: function (aCard) {
			wdw_cardbook.clearCard();
			cardbookUtils.displayCard(aCard, true, true);
			document.getElementById('vcardTextBox').value = cardbookUtils.cardToVcardData(aCard, false);
			document.getElementById('vcardTextBox').setAttribute('readonly', 'true');
			var panesView = cardbookPreferences.getStringPref("extensions.cardbook.panesView");
			document.getElementById('categories' + panesView + 'TextBox').value = cardbookUtils.formatCategories(aCard.categories);
			document.getElementById('categories' + panesView + 'TextBox').setAttribute('readonly', 'true');
			document.getElementById('note' + panesView + 'TextBox').value = aCard.note;
			document.getElementById('note' + panesView + 'TextBox').setAttribute('readonly', 'true');
			var re = /[\n\u0085\u2028\u2029]|\r\n?/;
			var noteArray = aCard.note.split(re);
			document.getElementById('note' + panesView + 'TextBox').setAttribute('rows', noteArray.length);
			cardbookUtils.adjustFields();
		},
		
		selectAccountOrCatInNoSearch: function (aForceRefresh) {
			wdw_cardbook.setNoSearchMode();
			if (cardbookRepository.cardbookAccounts.length == 0) {
				return;
			}
			var myTree = document.getElementById('accountsOrCatsTree');
			var mySelectedIndex = myTree.currentIndex;
			if (mySelectedIndex != -1) {
				var myAccountId = myTree.view.getCellText(mySelectedIndex, {id: "accountId"});
			} else {
				var myAccountId = myTree.view.getCellText(0, {id: "accountId"});
			}
			if (!(aForceRefresh != null && aForceRefresh !== undefined && aForceRefresh != "")) {
				if (wdw_cardbook.currentAccountId == myAccountId) {
					return;
				}
			}
			wdw_cardbook.currentAccountId = myAccountId;
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			var myDirPrefId = cardbookUtils.getAccountId(myAccountId);
			cardbookPreferences.setStringPref("extensions.cardbook.accountShown", myDirPrefId);
			cardbookUtils.setColumnsStateForAccount(myDirPrefId);
			wdw_cardbook.refreshWindow("accountid:" + myAccountId);
		},

		selectAccountOrCat: function (aAccountOrCat, aListOfCards) {
			if (cardbookRepository.cardbookAccounts.length == 0) {
				wdw_cardbook.clearAccountOrCat();
				return;
			}
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				wdw_cardbook.startSearch(aListOfCards);
				return;
			}

			// for the colors
			var myCurrentDirPrefId = cardbookUtils.getAccountId(aAccountOrCat);
			wdw_cardbook.setNoComplexSearchMode();
			if (cardbookPreferences.getType(myCurrentDirPrefId) == "SEARCH" && cardbookPreferences.getEnabled(myCurrentDirPrefId)) {
				wdw_cardbook.setComplexSearchMode(myCurrentDirPrefId);
			}
			
			cardbookUtils.setSelectedAccount(aAccountOrCat, wdw_cardbook.currentFirstVisibleRow, wdw_cardbook.currentLastVisibleRow);

			// for the columns
			if (wdw_cardbook.currentAccountId == aAccountOrCat) {
				return;
			}
			wdw_cardbook.currentAccountId = aAccountOrCat;
			cardbookPreferences.setStringPref("extensions.cardbook.accountShown", myCurrentDirPrefId);
			cardbookUtils.setColumnsStateForAccount(myCurrentDirPrefId);
		},

		displaySearch: function (aListOfCards) {
			var myTree = document.getElementById('cardsTree');
			var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				wdw_cardbook.sortCardsTreeCol();
				if (cardbookRepository.cardbookDisplayCards[mySelectedAccount].length == 1) {
					wdw_cardbook.displayCard(cardbookRepository.cardbookCards[cardbookRepository.cardbookDisplayCards[mySelectedAccount][0].cbid]);
					if (myTree.currentIndex != 0) {
						myTree.view.selection.select(0);
					}
				} else {
					if (aListOfCards) {
						cardbookUtils.setSelectedCards(aListOfCards, myTree.boxObject.getFirstVisibleRow(), myTree.boxObject.getLastVisibleRow());
						if (aListOfCards.length == 1) {
							if (cardbookRepository.cardbookCards[aListOfCards[0].cbid]) {
								wdw_cardbook.displayCard(aListOfCards[0]);
							}
						}
					}
				}
			}
		},

		selectCard: function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var numRanges = myTree.view.selection.getRangeCount();
			var start = new Object();
			var end = new Object();
			var numberOfSelectedCard = 0;
			var positionOfSelectedCard = 0;
			for (let i = 0; i < numRanges; i++) {
				myTree.view.selection.getRangeAt(i,start,end);
				for (let k = start.value; k <= end.value; k++) {
					numberOfSelectedCard++;
					positionOfSelectedCard = k;
				}
			}
			if ( numberOfSelectedCard != 1 ) {
				wdw_cardbook.clearCard();
			} else {
				var mySelectedCard = myTree.view.getCellText(positionOfSelectedCard, myTree.columns.getNamedColumn("cbid"));
				if (cardbookRepository.cardbookCards[mySelectedCard]) {
					wdw_cardbook.displayCard(cardbookRepository.cardbookCards[mySelectedCard]);
				} else {
					wdw_cardbook.clearCard();
				}
			}
			if (aEvent) {
				aEvent.stopPropagation();
			}
		},

		changeAddressbookTreeMenu: function () {
			cardbookPreferences.setStringPref("extensions.cardbook.accountsShown", document.getElementById('accountsOrCatsTreeMenulist').selectedItem.value);
			wdw_cardbook.selectAccountOrCatInNoSearch(true);
		},

		clearAccountOrCat: function () {
			wdw_cardbook.displayAccountOrCat([]);
			var myTree = document.getElementById('accountsOrCatsTree');
			myTree.view.selection.clearSelection();
			wdw_cardbook.updateStatusInformation();
		},

		refreshAccountsInDirTree: function() {
			try {
				if (document.getElementById('accountsOrCatsTree')) {
					var myTree = document.getElementById('accountsOrCatsTree');
					wdw_cardbook.currentFirstVisibleRow = myTree.boxObject.getFirstVisibleRow();
					wdw_cardbook.currentLastVisibleRow = myTree.boxObject.getLastVisibleRow();
					
					// collect open container
					var listOfOpenedContainer = [];			
					for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
						if (cardbookRepository.cardbookAccounts[i][2] && !cardbookRepository.cardbookAccounts[i][3]) {
							listOfOpenedContainer.push(cardbookRepository.cardbookAccounts[i][4]);
						}
					}
						
					cardbookDirTree.visibleData = cardbookDirTreeUtils.filterTree();
					cardbookDirTree.childData = cardbookRepository.cardbookAccountsCategories;
					myTree.view = cardbookDirTree;
						
					// open opened container
					for (var i = 0; i < listOfOpenedContainer.length; i++) {
						var treeIndex = cardbookUtils.getPositionOfAccountId(listOfOpenedContainer[i]);
						if (treeIndex != -1)  {
							myTree.view.toggleOpenState(treeIndex);
							myTree.view.toggleOpenState(treeIndex);
						}
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.refreshAccountsInDirTree error : " + e, "Error");
			}
		},

		cancelCard: function () {
			wdw_cardbook.selectCard();
		},

		createContact: function () {
			var myNewCard = new cardbookCardParser();
			wdw_cardbook.createCard(myNewCard, "CreateContact");
		},

		createList: function () {
			var myNewCard = new cardbookCardParser();
			myNewCard.isAList = true;
			wdw_cardbook.createCard(myNewCard, "CreateList");
		},

		createCard: function (aCard, aEditionMode) {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myCurrentAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				// to be sure that this accountId is defined : in search mode, it's possible to have weird results
				if (myCurrentAccountId != "false") {
					aCard.dirPrefId = cardbookUtils.getAccountId(myCurrentAccountId);
					var mySepPosition = myCurrentAccountId.indexOf("::",0);
					if (mySepPosition != -1) {
						var myCategory = myCurrentAccountId.substr(mySepPosition+2, myCurrentAccountId.length);
						cardbookRepository.addCategoryToCard(aCard, myCategory);
					}
				} else {
					for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
						if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && cardbookRepository.cardbookAccounts[i][6] != "SEARCH"
							&& !cardbookRepository.cardbookAccounts[i][7]) {
							aCard.dirPrefId = cardbookRepository.cardbookAccounts[i][4];
							break;
						}
					}
				}
			} else {
				return;
			}
			cardbookUtils.openEditionWindow(aCard, aEditionMode, "cardbook.cardAddedDirect");
		},

		editCard: function () {
			var listOfSelectedCard = cardbookUtils.getCardsFromCards();
			if (listOfSelectedCard.length == 1) {
				var myCard = cardbookUtils.getCardsFromCards()[0];
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
					cardbookUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookUtils.openEditionWindow(myOutCard, "Edit" + myType, "cardbook.cardModifiedDirect");
				}
			}
		},

		editCardFromCard: function (aCard) {
			if (aCard) {
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(aCard, myOutCard);
				if (myOutCard.isAList) {
					var myType = "List";
				} else {
					var myType = "Contact";
				}
				if (cardbookPreferences.getReadOnly(aCard.dirPrefId)) {
					cardbookUtils.openEditionWindow(myOutCard, "View" + myType);
				} else {
					cardbookUtils.openEditionWindow(myOutCard, "Edit" + myType, "cardbook.cardModifiedDirect");
				}
			}
		},

		editCardFromList: function () {
			var myCardToDisplay = cardbookRepository.cardbookCards[wdw_cardbook.currentIndex];
			wdw_cardbook.editCardFromCard(myCardToDisplay)
		},

		mergeCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromCards();

				var myArgs = {cardsIn: listOfSelectedCard, cardsOut: [], hideCreate: false, action: ""};
				var myWindow = window.openDialog("chrome://cardbook/content/wdw_mergeCards.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.action == "CREATE") {
					var myNullCard = new cardbookCardParser();
					cardbookRepository.saveCard(myNullCard, myArgs.cardsOut[0], "cardbook.cardAddedDirect");
					cardbookRepository.reWriteFiles([myArgs.cardsOut[0].dirPrefId]);
				} else if (myArgs.action == "CREATEANDREPLACE") {
					var myNullCard = new cardbookCardParser();
					cardbookRepository.saveCard(myNullCard, myArgs.cardsOut[0], "cardbook.cardAddedDirect");
					cardbookRepository.deleteCards(myArgs.cardsIn, "cardbook.cardRemovedDirect");
					cardbookRepository.reWriteFiles([myArgs.cardsOut[0].dirPrefId]);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.mergeCards error : " + e, "Error");
			}
		},

		duplicateCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				var listOfFileToRewrite = [];

				cardbookRepository.importConflictChoice = "duplicate";
				cardbookRepository.importConflictChoicePersist = true;
				var askUser = false;
				var dataLength = listOfSelectedCard.length;
				for (var i = 0; i < dataLength; i++) {
					if (i == dataLength - 1) {
						cardbookSynchronization.importCard(listOfSelectedCard[i], listOfSelectedCard[i].dirPrefId, askUser, "cardbook.cardAddedDirect");
					} else {
						cardbookSynchronization.importCard(listOfSelectedCard[i], listOfSelectedCard[i].dirPrefId, askUser);
					}
				}
				cardbookRepository.reWriteFiles(listOfFileToRewrite);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.duplicateCards error : " + e, "Error");
			}
		},

		findDuplicatesFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myDirPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
					wdw_cardbook.findDuplicates(myDirPrefId);
				} else {
					return;
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		findDuplicates: function (aDirPrefId) {
			try {
				var myArgs = {dirPrefId: aDirPrefId};
				var myWindow = window.openDialog("chrome://cardbook/content/findDuplicates/wdw_findDuplicates.xul", "", cardbookRepository.modalWindowParams, myArgs);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.findDuplicates error : " + e, "Error");
			}
		},

		generateFnFromAccountsOrCats: function () {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
					wdw_cardbook.generateFn(myAccountId);
				} else {
					return;
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.findDuplicatesFromAccountsOrCats error : " + e, "Error");
			}
		},

		generateFn: function (aAccountId) {
			try {
				var myCards = cardbookRepository.cardbookDisplayCards[aAccountId];
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					var myFn = myOutCard.fn;
					cardbookUtils.getDisplayedName(myOutCard, myOutCard.dirPrefId,
														[myOutCard.prefixname, myOutCard.firstname, myOutCard.othername, myOutCard.lastname, myOutCard.suffixname, myOutCard.nickname],
														[myOutCard.org, myOutCard.title, myOutCard.role]);
					if (myFn != myOutCard.fn && myOutCard.fn != "") {
						cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
					}
				}
				
				var myDirPrefId = cardbookUtils.getAccountId(aAccountId);
				cardbookRepository.reWriteFiles([myDirPrefId]);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.generateFn error : " + e, "Error");
			}
		},


		deleteCardsAndValidate: function (aSource, aCardList, aMessage) {
			try {
				var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
				var confirmTitle = strBundle.GetStringFromName("confirmTitle");
				if (aCardList && aCardList.constructor === Array) {
					var listOfSelectedCard = aCardList;
				} else {
					var listOfSelectedCard = cardbookUtils.getCardsFromCards();
				}
				var cardsCount = listOfSelectedCard.length;
				if (aMessage != null && aMessage !== undefined && aMessage != "") {
					var confirmMsg = aMessage;
				} else {
					var confirmMsg = PluralForm.get(cardsCount, strBundle.GetStringFromName("selectedCardsDeletionConfirmMessagePF"));
					confirmMsg = confirmMsg.replace("%1", cardsCount);
				}
				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					cardbookRepository.deleteCards(listOfSelectedCard, aSource);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.deleteCardsAndValidate error : " + e, "Error");
			}
		},

		exportCardsFromAccountsOrCats: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
				if (aMenu.id == "cardbookAccountMenuExportToFile" || aMenu.id == "exportCardsToFileFromAccountsOrCats") {
					if (cardbookRepository.cardbookSearchMode === "SEARCH") {
						var defaultFileName = cardbookRepository.cardbookSearchValue + ".vcf";
					} else {
						var myTree = document.getElementById('accountsOrCatsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, {id: "accountName"}) + ".vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "cardbookAccountMenuExportToDir" || aMenu.id == "exportCardsToDirFromAccountsOrCats") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		exportCardsFromCards: function (aMenu) {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				if (aMenu.id == "exportCardsToFileFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToFile") {
					if (listOfSelectedCard.length == 1) {
						var myTree = document.getElementById('cardsTree');
						var defaultFileName = myTree.view.getCellText(myTree.currentIndex, {id: "fn"}) + ".vcf";
					} else {
						var defaultFileName = "export.vcf";
					}
					wdw_cardbook.exportCardsToFile(listOfSelectedCard, defaultFileName);
				} else if (aMenu.id == "exportCardsToDirFromCards" || aMenu.id == "cardbookContactsMenuExportCardsToDir") {
					wdw_cardbook.exportCardsToDir(listOfSelectedCard);
				}
					
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsFromCards error : " + e, "Error");
			}
		},

		exportCardsToFile: function (aListOfSelectedCard, aDefaultFileName) {
			try {
				cardbookUtils.callFilePicker("fileSaveTitle", "SAVE", "EXPORTFILE", aDefaultFileName, wdw_cardbook.exportCardsToFileNext, aListOfSelectedCard);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFile error : " + e, "Error");
			}
		},

		exportCardsToFileNext: function (aFile, aListOfSelectedCard) {
			try {
				if (!(aFile.exists())) {
					aFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
				}

				if (cardbookUtils.isFileAlreadyOpen(aFile.path)) {
					cardbookUtils.formatStringForOutput("fileAlreadyOpen", [aFile.leafName]);
					return;
				}

				if (cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					cardbookSynchronization.writeCardsToCSVFile(aFile.path, aFile.leafName, aListOfSelectedCard);
				} else {
					cardbookSynchronization.writeCardsToFile(aFile.path, aListOfSelectedCard, true);
					if (aListOfSelectedCard.length > 1) {
						cardbookUtils.formatStringForOutput("exportsOKIntoFile", [aFile.leafName]);
					} else {
						cardbookUtils.formatStringForOutput("exportOKIntoFile", [aFile.leafName]);
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsToFileNext error : " + e, "Error");
			}
		},

		exportCardsToDir: function (aListOfSelectedCard) {
			try {
				cardbookUtils.callDirPicker("dirSaveTitle", wdw_cardbook.exportCardsToDirNext, aListOfSelectedCard);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDir error : " + e, "Error");
			}
		},

		exportCardsToDirNext: function (aDirectory, aListOfSelectedCard) {
			try {
				if (aDirectory != null && aDirectory !== undefined && aDirectory != "") {
					if (aDirectory.exists() == false){
						aDirectory.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0o774);
					}
	
					if (cardbookUtils.isDirectoryAlreadyOpen(aDirectory.path)) {
						cardbookUtils.formatStringForOutput("directoryAlreadyOpen", [aDirectory.leafName]);
						return;
					}
	
					cardbookSynchronization.writeCardsToDir(aDirectory.path, aListOfSelectedCard, true);

					if (aListOfSelectedCard.length > 1) {
						cardbookUtils.formatStringForOutput("exportsOKIntoDir", [aDirectory.leafName]);
					} else {
						cardbookUtils.formatStringForOutput("exportOKIntoDir", [aDirectory.leafName]);
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.exportCardsToDirNext error : " + e, "Error");
			}
		},

		importCardsFromFile: function () {
			try {
				cardbookUtils.callFilePicker("fileImportTitle", "OPEN", "EXPORTFILE", "", wdw_cardbook.importCardsFromFileNext);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFile error : " + e, "Error");
			}
		},

		importCardsFromFileNext: function (aFile) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);

				// search if file is already open
				if (aFile.path == myDirPrefIdUrl) {
					cardbookUtils.formatStringForOutput("importNotIntoSameFile");
					return;
				}
				cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookFileRequest[myDirPrefId]++;
				wdw_cardbook.bulkOperation();
				if (cardbookUtils.getFileNameExtension(aFile.leafName).toLowerCase() == "csv") {
					cardbookSynchronization.loadCSVFile(aFile, myTarget, "WINDOW", "cardbook.cardImportedFromFile");
				} else {
					cardbookSynchronization.loadFile(aFile, myTarget, "WINDOW", "IMPORTFILE", "cardbook.cardImportedFromFile");
				}
				cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.importCardsFromFileNext error : " + e, "Error");
			}
		},

		importCardsFromDir: function () {
			try {
				cardbookUtils.callDirPicker("dirImportTitle", wdw_cardbook.importCardsFromDirNext);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDir error : " + e, "Error");
			}
		},

		importCardsFromDirNext: function (aDirectory) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				var myDirPrefIdUrl = cardbookPreferences.getUrl(myDirPrefId);
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);

				// search if dir is already open
				if (aDirectory.path == myDirPrefIdUrl) {
					cardbookUtils.formatStringForOutput("importNotIntoSameDir");
					return;
				}
				cardbookSynchronization.initMultipleOperations(myDirPrefId);
				cardbookRepository.cardbookDirRequest[myDirPrefId]++;
				wdw_cardbook.bulkOperation();
				cardbookSynchronization.loadDir(aDirectory, myTarget, "WINDOW", "IMPORTDIR", "cardbook.cardImportedFromFile");
				cardbookSynchronization.waitForImportFinished(myDirPrefId, myDirPrefIdName);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.importCardsFromDirNext error : " + e, "Error");
			}
		},

		cutCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		copyCardsFromAccountsOrCats: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromAccountsOrCats error : " + e, "Error");
			}
		},

		cutCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "CUT");
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.cutCardsFromCards error : " + e, "Error");
			}
		},

		copyCardsFromCards: function () {
			try {
				var listOfSelectedCard = [];
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				wdw_cardbook.copyCards(listOfSelectedCard, "COPY");
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.copyCardsFromCards error : " + e, "Error");
			}
		},

		copyCards: function (aListOfSelectedCard, aMode) {
			try {
				var listOfSelectedUid = [];
				for (var i = 0; i < aListOfSelectedCard.length; i++) {
					listOfSelectedUid.push(aListOfSelectedCard[i].cbid);
				}
				var myText = listOfSelectedUid.join("@@@@@");
				if (myText != null && myText !== undefined && myText != "") {
					var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
					if (listOfSelectedUid.length > 1) {
						var myMessage = strBundle.GetStringFromName("contactsCopied");
					} else {
						var myMessage = strBundle.GetStringFromName("contactCopied");
					}
					cardbookClipboard.clipboardSetText('text/x-moz-cardbook-id', myText, myMessage);
					if (aMode == "CUT") {
						wdw_cardbook.cutAndPaste = "CUT";
					} else {
						wdw_cardbook.cutAndPaste = "";
					}
					wdw_cardbooklog.updateStatusProgressInformation(myMessage);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.copyCards error : " + e, "Error");
			}
		},

		pasteCards: function () {
			try {
				var myType = "CARDS";
                if (cardbookClipboard.clipboardCanPaste(myType)) {
                    var data = cardbookClipboard.clipboardGetData(myType);
                    if (data.flavor === "text/x-moz-cardbook-id") {
                        var myText = data.data.QueryInterface(Components.interfaces.nsISupportsString).data;

                    	var myTree = document.getElementById('accountsOrCatsTree');
                    	var myTarget = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
                    	var mySepPosition = myTarget.indexOf("::",0);
                    	var myCategory = "";
                    	if (mySepPosition != -1) {
                    		myCategory = myTarget.substr(mySepPosition+2, myTarget.length);
                    	}
                    	var myDirPrefId = cardbookUtils.getAccountId(myTarget);
                    	var myDirPrefIdType = cardbookPreferences.getType(myDirPrefId);
                    	var myDirPrefIdEnabled = cardbookPreferences.getEnabled(myDirPrefId);
                    	var myDirPrefIdReadOnly = cardbookPreferences.getReadOnly(myDirPrefId);
                    	var myCreatedEvent = "";
                    	var myDeletedEvent = "";

                    	if (myDirPrefIdType !== "SEARCH") {
                    		if (myDirPrefIdEnabled) {
                    			if (!myDirPrefIdReadOnly) {
                    				cardbookRepository.importConflictChoicePersist = false;
                    				cardbookRepository.importConflictChoice = "overwrite";
                    				var dataArray = myText.split("@@@@@");
                    				if (dataArray.length) {
                    					var dataLength = dataArray.length
                    					for (var i = 0; i < dataLength; i++) {
                    						if (cardbookRepository.cardbookCards[dataArray[i]]) {
                    							var myCard = cardbookRepository.cardbookCards[dataArray[i]];
                    							if (cardbookRepository.cardbookSearchMode === "SEARCH") {
                    								var myTarget = myCard.dirPrefId;
                    								var myDirPrefId = myCard.dirPrefId;
                    							}
                    							if (myDirPrefId == myCard.dirPrefId) {
                    								if (myCategory != "" && myCard.categories.includes(myCategory)) {
                    									cardbookRepository.importConflictChoice = "duplicate";
                    									var askUser = false;
                    								} else if (myCategory == "") {
                    									cardbookRepository.importConflictChoice = "duplicate";
                    									var askUser = false;
                    								} else {
                    									cardbookRepository.importConflictChoice = "update";
                    									var askUser = false;
                    								}
                    							} else {
                    								var askUser = true;
                    							}
                    							// performance reason
                    							// update the UI only at the end
                    							if (i == dataLength - 1) {
                    								myCreatedEvent = "cardbook.cardPasted";
                    								myDeletedEvent = "cardbook.cardRemovedIndirect";
                    							}
                    							Services.tm.currentThread.dispatch({ run: function() {
                    								cardbookSynchronization.importCard(myCard, myTarget, askUser, myCreatedEvent);
                    								if (myDirPrefId != myCard.dirPrefId) {
                    									if (wdw_cardbook.cutAndPaste != "") {
                    										cardbookRepository.deleteCards([myCard], myDeletedEvent);
                    									}
                    								}
                    							}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
                    						} else {
                    							cardbookUtils.formatStringForOutput("clipboardWrong");
                    						}
                    					}
                    					cardbookRepository.reWriteFiles([myDirPrefId]);
                    					wdw_cardbook.cutAndPaste = "";
                    				} else {
                    					cardbookUtils.formatStringForOutput("clipboardEmpty");
                    				}
                    			} else {
                    				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
                    				cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
                    			}
                    		} else {
                    			var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
                    			cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
                    		}
                    	}
                    }
                }
            }
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.pasteCards error : " + e, "Error");
			}
		},

		bulkOperation: function () {
			var myArgs = {};
			openDialog("chrome://cardbook/content/wdw_bulkOperation.xul", "", cardbookRepository.windowParams, myArgs);
		},

		chooseActionTreeForClick: function (aEvent) {
			wdw_cardbook.setCurrentTypeFromEvent(aEvent);
			// only left click
			if (aEvent.button == 0) {
				if (wdw_cardbook.currentType == "email") {
					wdw_cardbook.emailCardFromTree("to");
				} else if (wdw_cardbook.currentType == "url") {
					wdw_cardbook.openURLFromTree();
				} else if (wdw_cardbook.currentType == "adr") {
					wdw_cardbook.localizeCardFromTree();
				} else if (wdw_cardbook.currentType == "impp") {
					wdw_cardbook.openIMPPFromTree();
				} else if (wdw_cardbook.currentType == "tel") {
					wdw_cardbook.openTelFromTree();
				} else if (wdw_cardbook.currentType == "fn") {
					wdw_cardbook.editCardFromList();
				}
			}
			aEvent.stopPropagation();
		},
		
		chooseActionForKey: function (aEvent) {
			if (aEvent.ctrlKey && !aEvent.shiftKey) {
				switch(aEvent.key) {
					case "k":
					case "K":
						wdw_cardbook.editComplexSearch();
						aEvent.stopPropagation();
						break;
				}
			} else {
				if (aEvent.key == "Enter") {
					wdw_cardbook.returnKey();
					aEvent.stopPropagation();
				}
			}
		},
		
		emailCardFromTree: function (aAction) {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			wdw_cardbook.emailCards(null, [myCard.fn.replace(/,/g, " ").replace(/;/g, " "), wdw_cardbook.currentValue], aAction);
		},
		
		findEmailsFromTree: function () {
			ovl_cardbookFindEmails.findEmails(null, [wdw_cardbook.currentValue]);
		},
		
		findEventsFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			var myEmail = myCard.email[wdw_cardbook.currentIndex][0][0]
			ovl_cardbookFindEvents.findEvents(null, [myEmail], myEmail, "mailto:" + myEmail, myCard.fn);
		},

		localizeCardFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			wdw_cardbook.localizeCards(null, [myCard.adr[wdw_cardbook.currentIndex][0]]);
		},

		openURLFromTree: function () {
			wdw_cardbook.openURLCards(null, [wdw_cardbook.currentValue]);
		},

		openIMPPFromTree: function () {
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
				var myResult = myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex];
				cardbookUtils.openIMPP(myResult);
			}
		},

		openTelFromTree: function () {
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				var telProtocolLine = cardbookPreferences.getStringPref("extensions.cardbook.tels.0");
				var telProtocolLineArray = telProtocolLine.split(':');
				var telProtocol = telProtocolLineArray[2];
				var myResult = telProtocol + ":" + wdw_cardbook.currentValue;
				cardbookUtils.openExternalURL(cardbookUtils.formatTelForOpenning(myResult));
			}
		},

		doubleClickCardsTree: function (aEvent) {
			var myTree = document.getElementById('cardsTree');
			var row = { }, col = { }, child = { };
			myTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, col, child);
			if (row.value != -1) {
				wdw_cardbook.chooseActionCardsTree();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myTarget = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				if (!cardbookPreferences.getReadOnly(myDirPrefId) && cardbookPreferences.getEnabled(myDirPrefId)) {
					if (cardbookUtils.getAvailableAccountNumber() !== 0) {
						wdw_cardbook.createContact();
					}
				}
			}
		},

		chooseActionCardsTree: function () {
			var preferEmailEdition = cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailEdition");
			if (preferEmailEdition) {
				wdw_cardbook.editCard();
			} else {
				wdw_cardbook.emailCardsFromCards("to");
			}
		},

		// when choosing a menu entry, the command action is also fired
		// so this function is intended not to have two emails sent
		emailCardsFromWriteButton: function (aSource, aAction) {
			var listOfSelectedCard = [];
			if (aSource == "1") {
				wdw_cardbook.writeButtonFired = true;
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
			} else {
				if (wdw_cardbook.writeButtonFired) {
					wdw_cardbook.writeButtonFired = false;
					return;
				}
				listOfSelectedCard = cardbookUtils.getCardsFromCards();
				wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
			}
		},

		emailCardsFromAccountsOrCats: function (aAction) {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
			wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		emailCardsFromCards: function (aAction) {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			wdw_cardbook.emailCards(listOfSelectedCard, null, aAction);
		},

		shareCardsByEmailFromAccountsOrCats: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		shareCardsByEmailFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			wdw_cardbook.shareCardsByEmail(listOfSelectedCard);
		},

		openURLFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			wdw_cardbook.openURLCards(listOfSelectedCard, null);
		},

		print: function () {
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				var myTree = document.getElementById('cardsTree');
				if (myTree.currentIndex != -1) {
					wdw_cardbook.printFromCards();
				}
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					wdw_cardbook.printFromAccountsOrCats();
				}
			}
		},

		printFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			var defaultTitle = "";
			if (listOfSelectedCard.length == 1) {
				defaultTitle = listOfSelectedCard[0].fn;
			}
			wdw_cardbook.openPrintEdition(listOfSelectedCard, defaultTitle);
		},

		printFromAccountsOrCats: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromAccountsOrCats();
			var myTree = document.getElementById('accountsOrCatsTree');
			var defaultTitle = myTree.view.getCellText(myTree.currentIndex, {id: "accountName"});
			wdw_cardbook.openPrintEdition(listOfSelectedCard, defaultTitle);
		},

		findEmailsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			ovl_cardbookFindEmails.findEmails(listOfSelectedCard, null);
		},

		findEventsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			var myCard = listOfSelectedCard[0];
			ovl_cardbookFindEvents.findEvents([myCard], null, myCard.fn, "mailto:" + myCard.emails[0], myCard.fn);
		},

		localizeCardsFromCards: function () {
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			wdw_cardbook.localizeCards(listOfSelectedCard, null);
		},

		warnEmptyEmailContacts: function(aListOfEmptyFn, aListOfNotEmptyEmails) {
			var result = true;
			if (cardbookPreferences.getBoolPref("extensions.cardbook.warnEmptyEmails")) {
				var strBundle = document.getElementById("cardbook-strings");
				var warningTitle = strBundle.getString("warningTitle");
				if (aListOfEmptyFn.length > 1) {
					var warningMsg = strBundle.getFormattedString("emptyEmailsCardsConfirmMessage", [aListOfEmptyFn.join(', ')]);
				} else {
					var warningMsg = strBundle.getFormattedString("emptyEmailsCardConfirmMessage", [aListOfEmptyFn.join(', ')]);
				}
				var rememberFlag = {value: false};
				var rememberMsg = strBundle.getString("doNotShowAnymore");
				var result = false;
				if (aListOfNotEmptyEmails.length == 0) {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_CANCEL;
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, "", "", "", rememberMsg, rememberFlag);
				} else {
					var flags = Services.prompt.BUTTON_POS_0 * Services.prompt.BUTTON_TITLE_IS_STRING + Services.prompt.BUTTON_POS_1 * Services.prompt.BUTTON_TITLE_CANCEL;
					var sendButtonLabel = strBundle.getString("sendButtonLabel");
					var returnButton = Services.prompt.confirmEx(window, warningTitle, warningMsg, flags, sendButtonLabel, "", "", rememberMsg, rememberFlag);
					if (returnButton == 0) {
						var result = true;
					}
				}
				if (rememberFlag.value) {
					cardbookPreferences.setBoolPref("extensions.cardbook.warnEmptyEmails", false);
				}
			}
			return result;
		},

		emailCards: function (aListOfSelectedCard, aListOfSelectedMails, aMsgField) {
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			var result = {};
			if (aListOfSelectedCard != null && aListOfSelectedCard !== undefined && aListOfSelectedCard != "") {
				result = cardbookUtils.getMimeEmailsFromCardsAndLists(aListOfSelectedCard, useOnlyEmail);
			} else if (aListOfSelectedMails != null && aListOfSelectedMails !== undefined && aListOfSelectedMails != "") {
				result.emptyResults = [];
				result.notEmptyResults = [];
				if (useOnlyEmail) {
					result.notEmptyResults.push(aListOfSelectedMails[1]);
				} else {
					result.notEmptyResults.push(MailServices.headerParser.makeMimeAddress(aListOfSelectedMails[0], aListOfSelectedMails[1]));
				}
			// possbility to send email to nobody for the write button
			} else {
				result.emptyResults = [];
				result.notEmptyResults = [""];
			}

			var warnCheck = true;
			if (result.emptyResults.length != 0) {
				warnCheck = wdw_cardbook.warnEmptyEmailContacts(result.emptyResults, result.notEmptyResults);
			}
			
			if (result.notEmptyResults.length != 0 && warnCheck) {
				var msgComposeType = Components.interfaces.nsIMsgCompType;
				var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
				var msgComposeService = MailServices.compose;
				var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
				msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
				if (params) {
					params.type = msgComposeType.New;
					params.format = msgComposFormat.Default;
					var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
					if (composeFields) {
						composeFields[aMsgField] = result.notEmptyResults.join(" , ");
						params.composeFields = composeFields;
						msgComposeService.OpenComposeWindowWithParams(null, params);
					}
				}
			}
		},

		shareCardsByEmail: function (aListOfSelectedCard) {
			if (aListOfSelectedCard.length != 0) {
				var msgComposeType = Components.interfaces.nsIMsgCompType;
				var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
				var msgComposeService = MailServices.compose;
				var params = Components.classes["@mozilla.org/messengercompose/composeparams;1"].createInstance(Components.interfaces.nsIMsgComposeParams);
				msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);
				if (params) {
					params.type = msgComposeType.New;
					params.format = msgComposFormat.Default;
					var composeFields = Components.classes["@mozilla.org/messengercompose/composefields;1"].createInstance(Components.interfaces.nsIMsgCompFields);
					if (composeFields) {
						// purge temporary files used :
						// for sharing contacts
						// for attaching vCard files
						var myTmpDir = cardbookUtils.getTempFile();
						myTmpDir.append("cardbook-send-messages");
						if (myTmpDir.exists() && myTmpDir.isDirectory()) {
							myTmpDir.remove(true);
						}
						for (var i = 0; i < aListOfSelectedCard.length; i++) {
							var myCard = aListOfSelectedCard[i];
							var myTempFileName = cardbookUtils.getFreeFileName(myTmpDir.path, myCard.fn, myCard.uid.replace(/^urn:uuid:/i, ""), ".vcf");
							var myTempFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myTempFile.initWithPath(myTmpDir.path);
							myTempFile.append(myTempFileName);
							var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
							attachment.contentType = "text/vcard";
							attachment.name = myTempFileName;
							cardbookSynchronization.writeContentToFile(myTempFile.path, cardbookUtils.getvCardForEmail(myCard), "UTF8");
							if (myTempFile.exists() && myTempFile.isFile()) {
								attachment.url = "file:///" + myTempFile.path;
								composeFields.addAttachment(attachment);
							} else {
								cardbookUtils.formatStringForOutput("errorAttachingFile", [myTempFile.path], "Error");
							}
						}
						params.composeFields = composeFields;
						msgComposeService.OpenComposeWindowWithParams(null, params);
					}
				}
			}
		},

		localizeCards: function (aListOfSelectedCard, aListOfSelectedAddresses) {
			var listOfAddresses = [];
			if (aListOfSelectedCard != null && aListOfSelectedCard !== undefined && aListOfSelectedCard != "") {
				listOfAddresses = cardbookUtils.getAddressesFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedAddresses != null && aListOfSelectedAddresses !== undefined && aListOfSelectedAddresses != "") {
				listOfAddresses = JSON.parse(JSON.stringify(aListOfSelectedAddresses));
			}
			
			var localizeEngine = cardbookPreferences.getStringPref("extensions.cardbook.localizeEngine");
			var urlEngine = "";
			if (localizeEngine === "GoogleMaps") {
				urlEngine = "https://www.google.com/maps?q=";
			} else if (localizeEngine === "OpenStreetMap") {
				urlEngine = "https://www.openstreetmap.org/search?query=";
			} else if (localizeEngine === "BingMaps") {
				urlEngine = "https://www.bing.com/maps/?q=";
			} else {
				return;
			}

			for (var i = 0; i < listOfAddresses.length; i++) {
				var url = urlEngine + cardbookUtils.undefinedToBlank(listOfAddresses[i][2]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][3]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][4]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][5]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+") + "+"
									+ cardbookUtils.undefinedToBlank(listOfAddresses[i][6]).replace(/[\n\u0085\u2028\u2029]|\r\n?/g, "+").replace(/ /g, "+");
				cardbookUtils.openURL(url);
			}
		},

		openURLCards: function (aListOfSelectedCard, aListOfSelectedURLs) {
			var listOfURLs = [];
			if (aListOfSelectedCard != null && aListOfSelectedCard !== undefined && aListOfSelectedCard != "") {
				listOfURLs = cardbookUtils.getURLsFromCards(aListOfSelectedCard);
			} else if (aListOfSelectedURLs != null && aListOfSelectedURLs !== undefined && aListOfSelectedURLs != "") {
				listOfURLs = JSON.parse(JSON.stringify(aListOfSelectedURLs));
			}
			
			for (var i = 0; i < listOfURLs.length; i++) {
				var url = listOfURLs[i];
				if (!url.startsWith("http://") && !url.startsWith("https://")) {
					url = "http://" + url;
				}
				cardbookUtils.openURL(url);
			}
		},

		sortTrees: function (aEvent) {
			if (aEvent.button != 0) {
				return;
			}
			var target = aEvent.originalTarget;
			if (target.localName == "treecol") {
				wdw_cardbook.sortCardsTreeCol(target);
			} else {
				wdw_cardbook.selectCard(aEvent);
			}
		},

		sortCardsTreeCol: function (aColumn) {
			var myTree = document.getElementById('cardsTree');
			var myFirstVisibleRow = myTree.boxObject.getFirstVisibleRow();
			var myLastVisibleRow = myTree.boxObject.getLastVisibleRow();

			// get selected cards
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getSelectedCards();

			var columnName;
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
			
			if (cardbookRepository.cardbookSearchMode === "SEARCH") {
				var mySelectedAccount = cardbookRepository.cardbookSearchValue;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var mySelectedAccount = myTree.view.getCellText(myTree.currentIndex, myTree.columns.getNamedColumn("accountId"));
				} else {
					return;
				}
			}
			if (cardbookRepository.cardbookDisplayCards[mySelectedAccount]) {
				cardbookRepository.cardbookDisplayCards[mySelectedAccount] = cardbookUtils.sortCardsTreeArrayByString(cardbookRepository.cardbookDisplayCards[mySelectedAccount], columnName, order);
			} else {
				return;
			}

			//setting these will make the sort option persist
			var myTree = document.getElementById('cardsTree');
			myTree.setAttribute("sortDirection", order == 1 ? "ascending" : "descending");
			myTree.setAttribute("sortResource", columnName);
			
			wdw_cardbook.displayAccountOrCat(cardbookRepository.cardbookDisplayCards[mySelectedAccount]);
			
			//set the appropriate attributes to show to indicator
			var cols = myTree.getElementsByTagName("treecol");
			for (var i = 0; i < cols.length; i++) {
				cols[i].removeAttribute("sortDirection");
			}
			document.getElementById(columnName).setAttribute("sortDirection", order == 1 ? "ascending" : "descending");

			// select Cards back
			listOfSelectedCard = cardbookUtils.sortCardsTreeArrayByString(listOfSelectedCard, columnName, order);
			cardbookUtils.setSelectedCards(listOfSelectedCard, myFirstVisibleRow, myLastVisibleRow);
		},

		startDrag: function (aEvent) {
			function CardBookDataProvider() {}
			CardBookDataProvider.prototype = {
				QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsIFlavorDataProvider]),
			
				getFlavorData: function(aTransferable, aFlavor, aData, aDataLen) {
					//don't know why, this function is never called 
					// if (aFlavor == 'application/x-moz-file-promise') {
					// 	var primitive = {};
					// 	aTransferable.getTransferData("text/vcard", primitive, {});
					// 	var vCard = primitive.value.QueryInterface(Components.interfaces.nsISupportsString);
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dest-filename", primitive, {});
					// 	var leafName = primitive.value.QueryInterface(Components.interfaces.nsISupportsString).data;
					// 	aTransferable.getTransferData("application/x-moz-file-promise-dir", primitive, {});
					// 	var localFile = primitive.value.QueryInterface(Components.interfaces.nsIFile).clone();
					// 	localFile.append(leafName);
					// 	var ofStream = Components.classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream);
					// 	ofStream.init(localFile, -1, -1, 0);
					// 	var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream);
					// 	converter.init(ofStream, null);
					// 	converter.writeString(vCard);
					// 	converter.close();
					// 	// cardbookSynchronization.writeContentToFile(localFile.path, vCard, "UTF8");
					// }
				}
			};
			
			var aTreeChildren = aEvent.target;
			var listOfUid = [];
			var myCount = 0;
			var useOnlyEmail = cardbookPreferences.getBoolPref("extensions.cardbook.useOnlyEmail");
			if (aTreeChildren.id == "cardsTreeChildren") {
				var myTree = document.getElementById('cardsTree');
				var numRanges = myTree.view.selection.getRangeCount();
				var start = new Object();
				var end = new Object();
				for (var i = 0; i < numRanges; i++) {
					myTree.view.selection.getRangeAt(i,start,end);
					for (var j = start.value; j <= end.value; j++){
						var myId = myTree.view.getCellText(j, {id: "cbid"});
						listOfUid.push(myId);
						var myCard = cardbookRepository.cardbookCards[myId];
						var vCard = encodeURIComponent(cardbookUtils.getvCardForEmail(myCard));
						var emails = cardbookUtils.getMimeEmailsFromCardsAndLists([myCard], useOnlyEmail);
						aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
						aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
						aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", myCard.fn + ".vcf", myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
						aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
						myCount++;
					}
				}
			} else if (aTreeChildren.id == "accountsOrCatsTreeChildren") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountPrefId = cardbookRepository.cardbookSearchValue;
				} else {
					var myAccountPrefId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				}
				for (var i = 0; i < cardbookRepository.cardbookDisplayCards[myAccountPrefId].length; i++) {
					var myId = cardbookRepository.cardbookDisplayCards[myAccountPrefId][i].cbid;
					listOfUid.push(myId);
					var myCard = cardbookRepository.cardbookDisplayCards[myAccountPrefId][i];
					var vCard = encodeURIComponent(cardbookUtils.getvCardForEmail(myCard));
					var emails = cardbookUtils.getMimeEmailsFromCardsAndLists([myCard], useOnlyEmail);
					aEvent.dataTransfer.mozSetDataAt("text/vcard", vCard, myCount);
					aEvent.dataTransfer.mozSetDataAt("text/unicode", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-address", emails.notEmptyResults.join(" , "), myCount);
					aEvent.dataTransfer.mozSetDataAt("text/x-moz-cardbook-id", myId, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-dest-filename", myCard.fn + ".vcf", myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise-url","data:text/vcard," + vCard, myCount);
					aEvent.dataTransfer.mozSetDataAt("application/x-moz-file-promise", new CardBookDataProvider(), myCount);
					myCount++;
				}
			}
			
			// add a little image
			var myCanvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
			var myContext = myCanvas.getContext('2d');
			var myImage = new Image();
			var myIconMaxSize = 26;
			var myIconMaxNumber = 5;
			myCanvas.id = 'dragCanvas';
			myCanvas.height = myIconMaxSize;
			// need to know the canvas size before
			if (listOfUid.length >= myIconMaxNumber) {
				var myLength = myIconMaxNumber;
			} else {
				var myLength = listOfUid.length;
			}
			myCanvas.width = (myLength + 1) * myIconMaxSize;
			// concatenate images
			for (var i = 0; i < myLength; i++) {
				var myId = listOfUid[i];
				var myPhoto = cardbookRepository.cardbookCards[myId].photo.localURI;
				if (myPhoto != null && myPhoto !== undefined && myPhoto != "") {
					myImage.src = myPhoto;
				} else {
					myImage.src = "chrome://cardbook/skin/missing_photo_200_214.png";
				}
				myContext.drawImage(myImage, i*myIconMaxSize, 0, myIconMaxSize, myIconMaxSize);
			}
			if (listOfUid.length > myIconMaxNumber) {
				// Concatenate a triangle
				var path=new Path2D();
				path.moveTo(myIconMaxSize*myIconMaxNumber,0);
				path.lineTo(myIconMaxSize*(myIconMaxNumber+1),myIconMaxSize/2);
				path.lineTo(myIconMaxSize*myIconMaxNumber,myIconMaxSize);
				myContext.fill(path);
			}
			aEvent.dataTransfer.setDragImage(myCanvas, 0, 0);
		},
		
		dragCards: function (aEvent) {
			var aTargetObject = aEvent.target;
			if (aTargetObject.id == "cardsTreeChildren" || aTargetObject.id == "rightPaneUpHbox") {
				var myTarget = wdw_cardbook.currentAccountId;
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var row = { }, col = { }, child = { };
				myTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, col, child);
				var myTarget = myTree.view.getCellText(row.value, {id: "accountId"});
			}
			var mySepPosition = myTarget.indexOf("::",0);
			var myCategory = "";
			if (mySepPosition != -1) {
				myCategory = myTarget.substr(mySepPosition+2, myTarget.length);
			}

			var myDirPrefId = cardbookUtils.getAccountId(myTarget);
			var myCreatedEvent = "";
			var myDeletedEvent = "";
			cardbookRepository.importConflictChoicePersist = false;
			cardbookRepository.importConflictChoice = "overwrite";
			aEvent.preventDefault();
			for (var i = 0; i < aEvent.dataTransfer.mozItemCount; i++) {
				var types = aEvent.dataTransfer.mozTypesAt(i);
				for (var j = 0; j < types.length; j++) {
					if (types[j] == "text/x-moz-cardbook-id") {
						var myId = aEvent.dataTransfer.mozGetDataAt("text/x-moz-cardbook-id", i);
						var myCard = cardbookRepository.cardbookCards[myId];
						if (myDirPrefId == myCard.dirPrefId) {
							if (myCategory != "" && myCard.categories.includes(myCategory)) {
								continue;
							} else if (myCategory == "") {
								continue;
							} else {
								cardbookRepository.importConflictChoice = "update";
								var askUser = false;
							}
						} else {
							var askUser = true;
						}
						// performance reason
						// update the UI only at the end
						if (i == aEvent.dataTransfer.mozItemCount - 1) {
							myCreatedEvent = "cardbook.cardDragged";
							myDeletedEvent = "cardbook.cardRemovedIndirect";
						}
						Services.tm.currentThread.dispatch({ run: function() {
							cardbookSynchronization.importCard(myCard, myTarget, askUser, myCreatedEvent);
							if (myDirPrefId != myCard.dirPrefId) {
								if (!aEvent.ctrlKey) {
									cardbookRepository.deleteCards([myCard], myDeletedEvent);
								}
							}
						}}, Components.interfaces.nsIEventTarget.DISPATCH_SYNC);
					} else if (types[j] == "application/x-moz-file") {
						var myFile1 = aEvent.dataTransfer.mozGetDataAt("application/x-moz-file", i);
						var myFile = myFile1.QueryInterface(Components.interfaces.nsIFile);
						if (cardbookUtils.getFileExtension(myFile.path).toLowerCase() == "vcf" ) {
							// performance reason
							// update the UI only at the end
							if (i == aEvent.dataTransfer.mozItemCount - 1) {
								cardbookSynchronization.loadFile(myFile, myTarget, "WINDOW", "IMPORTFILE", "cardbook.cardDragged");
							} else {
								cardbookSynchronization.loadFile(myFile, myTarget, "WINDOW", "IMPORTFILE");
							}
						}
					}
				}
			}
			cardbookRepository.reWriteFiles([myDirPrefId]);
			aEvent.stopPropagation();
		},

		editComplexSearch: function () {
			wdw_cardbook.addAddressbook("search");
		},

		startSearch: function (aListOfCards) {
			wdw_cardbook.setSearchMode();
			var listOfSelectedCard = [];
			if (!(aListOfCards)) {
				listOfSelectedCard = cardbookUtils.getSelectedCards();
			} else {
				listOfSelectedCard = aListOfCards;
			}
			
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.clearCard();
			cardbookRepository.cardbookSearchValue = cardbookRepository.makeSearchString(document.getElementById('cardbookSearchInput').value);

			var myRegexp = new RegExp(cardbookRepository.cardbookSearchValue.replace("*", "(.*)"), "i");
			cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue] = [];
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][1] && cardbookRepository.cardbookAccounts[i][5] && cardbookRepository.cardbookAccounts[i][6] != "SEARCH") {
					var myDirPrefId = cardbookRepository.cardbookAccounts[i][4];
					for (var j in cardbookRepository.cardbookCardLongSearch[myDirPrefId]) {
						if (cardbookRepository.cardbookSearchValue == "" || j.search(myRegexp) != -1) {
							for (var k = 0; k < cardbookRepository.cardbookCardLongSearch[myDirPrefId][j].length; k++) {
								cardbookRepository.cardbookDisplayCards[cardbookRepository.cardbookSearchValue].push(cardbookRepository.cardbookCardLongSearch[myDirPrefId][j][k]);
							}
						}
					}
				}
			}
			// need to verify that the selected cards are always found
			var myListOfSelectedCards = [];
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				// selected cards may have been deleted
				if (cardbookRepository.cardbookCards[listOfSelectedCard[i].cbid]) {
					var myCard = listOfSelectedCard[i];
					if (cardbookRepository.getLongSearchString(myCard).indexOf(cardbookRepository.cardbookSearchValue) >= 0) {
						myListOfSelectedCards.push(myCard);
					}
				}
			}
			wdw_cardbook.displaySearch(myListOfSelectedCards);
		},

		displayBirthdayList: function() {
			if (cardbookRepository.cardbookBirthdayPopup == 0) {
				cardbookRepository.cardbookBirthdayPopup++;
				var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdayList.xul", "", cardbookRepository.modalWindowParams);
				cardbookRepository.cardbookBirthdayPopup--;
			}
		},
	
		displaySyncList: function() {
			var MyWindows = window.openDialog("chrome://cardbook/content/birthdays/wdw_birthdaySync.xul", "", cardbookRepository.modalWindowParams);
		},

		setSyncControl: function () {
			if (wdw_cardbook.nIntervId == 0) {
				wdw_cardbook.nIntervId = setInterval(wdw_cardbook.windowControlShowing, 1000);
			}
		},

		setComplexSearchMode: function (aDirPrefId) {
			wdw_cardbook.setNoSearchMode();
			cardbookRepository.cardbookComplexSearchMode = "SEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = aDirPrefId;
		},

		setSearchMode: function () {
			// for the navigation
			document.getElementById('cardbookSearchInput').setAttribute('tabindex', '1');
			document.getElementById('cardsTree').setAttribute('tabindex', '2');
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.currentAccountId = "";
			cardbookRepository.cardbookSearchMode = "SEARCH";
		},

		setNoComplexSearchMode: function () {
			cardbookRepository.cardbookComplexSearchMode = "NOSEARCH";
			cardbookRepository.cardbookComplexSearchPrefId = "";
		},

		setNoSearchMode: function () {
			// in search mode the next field after the search textbox is cardsTree
			document.getElementById('cardbookSearchInput').removeAttribute('tabindex');
			document.getElementById('cardsTree').removeAttribute('tabindex');
			cardbookRepository.cardbookSearchMode = "NOSEARCH";
			cardbookRepository.cardbookSearchValue = "";
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').value = "";
				var strBundle = document.getElementById("cardbook-strings");
				document.getElementById('cardbookSearchInput').placeholder = strBundle.getString("cardbookSearchInputDefault");
			}
		},

		openLogEdition: function () {
			if (cardbookUtils.getBroadcasterOnCardBook()) {
				var windowsList = Services.wm.getEnumerator("CardBook:logEditionWindow");
				var found = false;
				while (windowsList.hasMoreElements()) {
					var myWindow = windowsList.getNext();
					myWindow.focus();
					found = true;
					break;
				}
				if (!found) {
					var myWindow = window.openDialog("chrome://cardbook/content/wdw_logEdition.xul", "", cardbookRepository.windowParams);
				}
			}
		},

		openOptionsEdition: function () {
			var myWindow = window.openDialog("chrome://cardbook/content/configuration/wdw_cardbookConfiguration.xul", "", cardbookRepository.windowParams);
		},

		openPrintEdition: function (aListOfCards, aTitle) {
			var statusFeedback = Components.classes["@mozilla.org/messenger/statusfeedback;1"].createInstance();
			statusFeedback = statusFeedback.QueryInterface(Components.interfaces.nsIMsgStatusFeedback);
			var myArgs = {listOfCards: aListOfCards, title: aTitle, feedback: statusFeedback, doPrintPreview: true};
			var printEngineWindow = window.openDialog("chrome://cardbook/content/print/wdw_cardbookPrint.xul", "", cardbookRepository.windowParams, myArgs);
		},

		addAddressbook: function (aAction, aDirPrefId) {
			var myArgs = {action: aAction, dirPrefId: aDirPrefId, rootWindow: window};
			var myWindow = window.openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksAdd.xul", "", cardbookRepository.windowParams, myArgs);
		},
		
		editAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
				var myPrefIdType = cardbookPreferences.getType(myPrefId);
				if (myPrefIdType === "SEARCH") {
					wdw_cardbook.addAddressbook("search", myPrefId);
				} else {
					if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
						return;
					}
					cardbookSynchronization.initMultipleOperations(myPrefId);
					var myArgs = {dirPrefId: myPrefId, serverCallback: wdw_cardbook.modifyAddressbook};
					var myWindow = window.openDialog("chrome://cardbook/content/addressbooksconfiguration/wdw_addressbooksEdit.xul", "",
													   // Workaround for Bug 1151440 - the HTML color picker won't work
													   // in linux when opened from modal dialog
													   (Services.appinfo.OS == 'Linux') ? "chrome,resizable,centerscreen" : "modal,chrome,resizable,centerscreen"
													   , myArgs);
				}
			}
		},

		modifyAddressbook: function (aChoice, aDirPrefId, aName, aReadOnly) {
			if (aChoice == "SAVE") {
				wdw_cardbook.loadCssRules();
				for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
					if (cardbookRepository.cardbookAccounts[i][4] === aDirPrefId) {
						cardbookRepository.cardbookAccounts[i][0] = aName;
						cardbookRepository.cardbookAccounts[i][7] = aReadOnly;
						break;
					}
				}
				cardbookRepository.cardbookAccounts = cardbookUtils.sortArrayByString(cardbookRepository.cardbookAccounts,0,1);
				cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
				wdw_cardbooklog.addActivity("addressbookModified", [aName], "editItem");
				cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + aDirPrefId);
			}
			cardbookSynchronization.finishMultipleOperations(aDirPrefId);
		},

		modifySearchAddressbook: function (aDirPrefId, aName, aColor, aVCard, aReadOnly, aDateFormat, aUrnuuid, aSearchDef) {
			cardbookPreferences.setName(aDirPrefId, aName);
			cardbookPreferences.setColor(aDirPrefId, aColor);
			cardbookPreferences.setVCardVersion(aDirPrefId, aVCard);
			cardbookPreferences.setReadOnly(aDirPrefId, aReadOnly);
			cardbookPreferences.setDateFormat(aDirPrefId, aDateFormat);
			cardbookPreferences.setUrnuuid(aDirPrefId, aUrnuuid);
			wdw_cardbook.loadCssRules();
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][4] === aDirPrefId) {
					cardbookRepository.cardbookAccounts[i][0] = aName;
					cardbookRepository.cardbookAccounts[i][7] = aReadOnly;
					break;
				}
			}
			var myFile = cardbookRepository.getRuleFile(aDirPrefId);
			if (myFile.exists()) {
				myFile.remove(true);
			}
			myFile.create(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 420);
			cardbookSynchronization.writeContentToFile(myFile.path, aSearchDef, "UTF8");
			cardbookUtils.formatStringForOutput("addressbookModified", [aName]);
			wdw_cardbooklog.addActivity("addressbookModified", [aName], "editItem");
			cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + aDirPrefId);

			cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
			cardbookComplexSearch.loadComplexSearchAccount(aDirPrefId, true, "WINDOW");
		},

		removeAddressbook: function () {
			try {
				if (cardbookRepository.cardbookAccounts.length != 0) {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myParentIndex = myTree.view.getParentIndex(myTree.currentIndex);
						if (myParentIndex == -1) {
							var myParentAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
							var myParentAccountName = myTree.view.getCellText(myTree.currentIndex, {id: "accountName"});
							var myParentAccountType = myTree.view.getCellText(myTree.currentIndex, {id: "accountType"});
						} else {
							var myParentAccountId = myTree.view.getCellText(myParentIndex, {id: "accountId"});
							var myParentAccountName = myTree.view.getCellText(myParentIndex, {id: "accountName"});
							var myParentAccountType = myTree.view.getCellText(myParentIndex, {id: "accountType"});
						}
		
						if (cardbookUtils.isMyAccountSyncing(myParentAccountId)) {
							return;
						}
						cardbookSynchronization.initMultipleOperations(myParentAccountId);
						var myPrefUrl = cardbookPreferences.getUrl(myParentAccountId);
						
						var strBundle = document.getElementById("cardbook-strings");
						var confirmTitle = strBundle.getString("confirmTitle");
						var confirmMsg = strBundle.getFormattedString("accountDeletionConfirmMessage", [myParentAccountName]);
						var returnFlag = false;
						var deleteContentFlag = {value: false};
						
						if (myParentAccountType === "FILE") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = strBundle.getFormattedString("accountDeletiondeleteContentFileMessage", [myFile.leafName]);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else if (myParentAccountType === "DIRECTORY") {
							var myFile = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsIFile);
							myFile.initWithPath(myPrefUrl);
							var deleteContentMsg = strBundle.getFormattedString("accountDeletiondeleteContentDirMessage", [myFile.leafName]);
							returnFlag = Services.prompt.confirmCheck(window, confirmTitle, confirmMsg, deleteContentMsg, deleteContentFlag);
						} else {
							returnFlag = Services.prompt.confirm(window, confirmTitle, confirmMsg);
						}
						if (returnFlag) {
							wdw_cardbook.setNoComplexSearchMode();
							wdw_cardbook.setNoSearchMode();
							if (myParentAccountType !== "SEARCH") {
								cardbookSynchronization.removePeriodicSync(myParentAccountId);
								cardbookRepository.removeAccountFromComplexSearch(myParentAccountId);
								cardbookRepository.removeAccountFromRepository(myParentAccountId);
								// cannot be launched from cardbookRepository
								cardbookIndexedDB.removeAccount(myParentAccountId, myParentAccountName);
							} else {
								cardbookRepository.removeComplexSearchFromRepository(myParentAccountId);
							}
							cardbookPreferences.delBranch(myParentAccountId);
							wdw_cardbook.loadCssRules();
							cardbookUtils.formatStringForOutput("addressbookClosed", [myParentAccountName]);
							wdw_cardbooklog.addActivity("addressbookClosed", [myParentAccountName], "deleteMail");
							cardbookUtils.notifyObservers("cardbook.ABRemovedDirect");
							if (myFile && deleteContentFlag.value) {
								wdw_cardbooklog.updateStatusProgressInformationWithDebug2("debug mode : deleting : " + myFile.path);
								myFile.remove(true);
							}
						}
					}
					cardbookSynchronization.finishMultipleOperations(myParentAccountId);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.removeAddressbook error : " + e, "Error");
			}
		},

		enableOrDisableAddressbook: function (aDirPrefId, aValue) {
			if (cardbookUtils.isMyAccountSyncing(aDirPrefId)) {
				return;
			}
			cardbookSynchronization.initMultipleOperations(aDirPrefId);
			wdw_cardbook.setNoComplexSearchMode();
			wdw_cardbook.setNoSearchMode();
			if (!(aDirPrefId != null && aDirPrefId !== undefined && aDirPrefId != "")) {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					aDirPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
					var aValue = !cardbookPreferences.getEnabled(aDirPrefId);
				} else {
					return;
				}
			}
			if (!aValue) {
				cardbookSynchronization.removePeriodicSync(aDirPrefId);
				cardbookRepository.removeAccountFromCollected(aDirPrefId);
				cardbookRepository.removeAccountFromBirthday(aDirPrefId);
				cardbookRepository.removeAccountFromDiscovery(aDirPrefId);
			}
			var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
			var myDirPrefIdType = cardbookPreferences.getType(aDirPrefId);
			cardbookPreferences.setEnabled(aDirPrefId, aValue);
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][4] === aDirPrefId) {
					cardbookRepository.cardbookAccounts[i][5] = aValue;
					break;
				}
			}
			wdw_cardbook.clearAccountOrCat();
			wdw_cardbook.setNoSearchMode();
			wdw_cardbook.loadCssRules();
			if (aValue) {
				if (myDirPrefIdType == "SEARCH") {
					cardbookComplexSearch.loadComplexSearchAccount(aDirPrefId, true, "WINDOW");
				} else {
					cardbookSynchronization.loadAccount(aDirPrefId, true, false, "INITIAL");
				}
				cardbookUtils.formatStringForOutput("addressbookEnabled", [myDirPrefIdName]);
				wdw_cardbooklog.addActivity("addressbookEnabled", [myDirPrefIdName], "editItem");
				cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + aDirPrefId);
			} else {
				if (myDirPrefIdType != "SEARCH") {
					cardbookRepository.removeAccountFromComplexSearch(aDirPrefId);
					cardbookRepository.emptyAccountFromRepository(aDirPrefId);
				} else {
					cardbookRepository.emptyComplexSearchFromRepository(aDirPrefId);
				}
				cardbookUtils.formatStringForOutput("addressbookDisabled", [myDirPrefIdName]);
				wdw_cardbooklog.addActivity("addressbookDisabled", [myDirPrefIdName], "editItem");
				cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + aDirPrefId);
				cardbookSynchronization.finishMultipleOperations(aDirPrefId);
			}
		},

		readOnlyOrReadWriteAddressbook: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myDirPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
				var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
				var myValue = !cardbookPreferences.getReadOnly(myDirPrefId);
			} else {
				return;
			}
			if (cardbookUtils.isMyAccountSyncing(myDirPrefId)) {
				return;
			}
			cardbookSynchronization.initMultipleOperations(myDirPrefId);
			if (myValue) {
				cardbookRepository.removeAccountFromCollected(myDirPrefId);
			}
			cardbookPreferences.setReadOnly(myDirPrefId, myValue);
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][4] === myDirPrefId) {
					cardbookRepository.cardbookAccounts[i][7] = myValue;
					break;
				}
			}
			wdw_cardbook.loadCssRules();
			if (myValue) {
				cardbookUtils.formatStringForOutput("addressbookReadOnly", [myDirPrefIdName]);
				wdw_cardbooklog.addActivity("addressbookReadOnly", [myDirPrefIdName], "editItem");
				cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + myDirPrefId);
			} else {
				cardbookUtils.formatStringForOutput("addressbookReadWrite", [myDirPrefIdName]);
				wdw_cardbooklog.addActivity("addressbookReadWrite", [myDirPrefIdName], "editItem");
				cardbookUtils.notifyObservers("cardbook.ABModifiedDirect", "accountid:" + myDirPrefId);
			}
			cardbookSynchronization.finishMultipleOperations(myDirPrefId);
		},

		expandOrContractAddressbook: function (aDirPrefId, aValue) {
			var myDirPrefIdType = cardbookPreferences.getType(aDirPrefId);
			cardbookPreferences.setExpanded(aDirPrefId, aValue);
			for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
				if (cardbookRepository.cardbookAccounts[i][4] == aDirPrefId) {
					cardbookRepository.cardbookAccounts[i][2] = aValue;
				}
			}
		},

		returnKey: function () {
			if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
				wdw_cardbook.chooseActionCardsTree();
			} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.editAddressbook();
					} else {
						var myAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
						var mySepPosition = myAccountId.indexOf("::",0);
						var myDirPrefId = myAccountId.substr(0, mySepPosition);
						var myCategoryName = myAccountId.substr(mySepPosition+2, myAccountId.length);
						wdw_cardbook.renameCategory(myDirPrefId, myCategoryName, "cardbook.catModifiedDirect", true);
					}
				}
			}
		},

		newKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myTarget = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				var myDirPrefId = cardbookUtils.getAccountId(myTarget);
				if (!cardbookPreferences.getReadOnly(myDirPrefId) && cardbookPreferences.getEnabled(myDirPrefId)) {
					wdw_cardbook.createContact();
				}
			}
		},

		deleteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					var myPrefId = cardbookUtils.getAccountId(myAccountId);
					if (cardbookPreferences.getEnabled(myPrefId)) {
						if (!cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.deleteCardsAndValidate("cardbook.cardRemovedDirect");
						}
					}
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					if (myTree.view.isContainer(myTree.currentIndex)) {
						wdw_cardbook.removeAddressbook();
					} else {
						var mySepPosition = myAccountId.indexOf("::",0);
						var myDirPrefId = myAccountId.substr(0, mySepPosition);
						var myCategoryName = myAccountId.substr(mySepPosition+2, myAccountId.length);
						wdw_cardbook.removeCategory(myDirPrefId, myCategoryName, "cardbook.catRemovedDirect", true);
					}
				}
			}
		},

		selectAllKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				var myCardsTree = document.getElementById('cardsTree');
				myCardsTree.view.selection.selectAll();
			}
		},

		F9Key: function () {
			if (document.getElementById('cardbook-menupopup')) {
				document.getElementById('cardbook-menupopup').openPopup(document.getElementById('cardbook-menupopup'), "after_start", 0, 0, false, false);
			}
		},

		copyKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.copyCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.copyCardsFromAccountsOrCats();
				}
			}
		},

		pasteKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				wdw_cardbook.pasteCards();
			}
		},

		cutKey: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (myTree.currentIndex != -1) {
				if (document.commandDispatcher.focusedElement.getAttribute('id') == "cardsTree") {
					wdw_cardbook.cutCardsFromCards();
				} else if (document.commandDispatcher.focusedElement.getAttribute('id') == "accountsOrCatsTree") {
					wdw_cardbook.cutCardsFromAccountsOrCats();
				}
			}
		},

		findKey: function () {
			if (document.getElementById('cardbookSearchInput')) {
				document.getElementById('cardbookSearchInput').focus();
				wdw_cardbook.startSearch();
			}
		},

		doubleClickAccountOrCat: function (aEvent) {
			var myTree = document.getElementById('accountsOrCatsTree');
			var row = { }, col = { }, child = { };
			myTree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, col, child);
			var myTarget = myTree.view.getCellText(row.value, {id: "accountId"});
			if (myTarget == "false") {
				wdw_cardbook.addAddressbook();
			} else if (myTarget == cardbookUtils.getAccountId(myTarget)) {
				wdw_cardbook.editAddressbook();
			} else {
				wdw_cardbook.selectCategoryToAction('RENAME');
			}
		},

		addNewCategory: function () {
			var selectedUid = cardbookUtils.getSelectedCardsId();
			var myFirstCard = cardbookRepository.cardbookCards[selectedUid[0]];
			var myValidationList = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[myFirstCard.dirPrefId]));
			var myArgs = {type: "", context: "AddCat", typeAction: "", validationList: myValidationList};
			var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
			if (myArgs.typeAction == "SAVE" && myArgs.type != "") {
				wdw_cardbook.addCategoryToSelectedCards(myArgs.type, "cardbook.catAddedDirect", true);
			}
		},

		addCategoryToSelectedCards: function (aCategory, aTopic, aCategorySelect) {
			var selectedUid = cardbookUtils.getSelectedCardsId();
			var listOfFileToRewrite = [];
			for (var i = 0; i < selectedUid.length; i++) {
				if (cardbookRepository.cardbookCards[selectedUid[i]]) {
					var myCard = cardbookRepository.cardbookCards[selectedUid[i]];
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.addCategoryToCard(myOutCard, aCategory);
					cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
					listOfFileToRewrite.push(myOutCard.dirPrefId);
				}
			}
			cardbookRepository.reWriteFiles(listOfFileToRewrite);
			if (aCategorySelect) {
				if (cardbookRepository.cardbookComplexSearchPrefId != "") {
					var myDisplayPrefId = cardbookRepository.cardbookComplexSearchPrefId;
				} else {
					var myDisplayPrefId = myOutCard.dirPrefId;
				}
				var dirPrefName = cardbookUtils.getPrefNameFromPrefId(myOutCard.dirPrefId);
				cardbookUtils.formatStringForOutput("categoryCreatedOK", [dirPrefName, aCategory]);
				wdw_cardbooklog.addActivity("categoryCreatedOK", [dirPrefName, aCategory], "addItem");
				cardbookUtils.notifyObservers(aTopic, "accountid:" + myDisplayPrefId+"::"+aCategory);
			}
		},

		removeCategoryFromSelectedCards: function (aCategory) {
			function filterCategories(element) {
				return (element != aCategory);
			}
			var selectedUid = cardbookUtils.getSelectedCardsId();
			var listOfFileToRewrite = [];
			for (var i = 0; i < selectedUid.length; i++) {
				if (cardbookRepository.cardbookCards[selectedUid[i]]) {
					var myCard = cardbookRepository.cardbookCards[selectedUid[i]];
					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					myOutCard.categories = myOutCard.categories.filter(filterCategories);
					cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
					listOfFileToRewrite.push(myOutCard.dirPrefId);
				}
			}
			cardbookRepository.reWriteFiles(listOfFileToRewrite);
		},

		loadCssRules: function () {
			for (var prop in document.styleSheets) {
				var styleSheet = document.styleSheets[prop];
				if (styleSheet.href == "chrome://cardbook/skin/cardbookTreeChildrens.css") {
					if (!(cardbookRepository.cardbookDynamicCssRules[styleSheet.href])) {
						cardbookRepository.cardbookDynamicCssRules[styleSheet.href] = [];
					}
					cardbookRepository.deleteCssAllRules(styleSheet);
					var createSearchRules = cardbookRepository.isthereSearchRulesToCreate();
					for (var i = 0; i < cardbookRepository.cardbookAccounts.length; i++) {
						if (cardbookRepository.cardbookAccounts[i][1]) {
							var dirPrefId = cardbookRepository.cardbookAccounts[i][4];
							var color = cardbookPreferences.getColor(dirPrefId)
							cardbookRepository.createCssAccountRules(styleSheet, dirPrefId, color);
							if (createSearchRules && cardbookRepository.cardbookAccounts[i][5]) {
								cardbookRepository.createCssCardRules(styleSheet, dirPrefId, color);
							}
						}
					}
					cardbookRepository.reloadCss(styleSheet.href);
				}
			}
		},

		renameCategory: function (aDirPrefId, aCategoryName, aTopic, aCategorySelect) {
			try {
				var uncategorized = (aCategoryName == cardbookRepository.cardbookUncategorizedCards) ? true : false;
				if (cardbookPreferences.getReadOnly(aDirPrefId) && !uncategorized) {
					return;
				}
				var myValidationList = JSON.parse(JSON.stringify(cardbookRepository.cardbookAccountsCategories[aDirPrefId]));
				function filterOriginal(element) {
					return (element != aCategoryName);
				}
				myValidationList = myValidationList.filter(filterOriginal);
				var myArgs = {type: aCategoryName, context: "EditCat", typeAction: "", validationList: myValidationList};
				var myWindow = window.openDialog("chrome://cardbook/content/wdw_cardbookRenameField.xul", "", cardbookRepository.modalWindowParams, myArgs);
				if (myArgs.typeAction == "SAVE" && myArgs.type != "" && myArgs.type != aCategoryName) {
					var myNewCategoryName = myArgs.type;
					if (uncategorized) {
						cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", myNewCategoryName);
						cardbookRepository.renameUncategorized(aCategoryName, myNewCategoryName);
					} else {
						var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
						
						var myCards = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCategoryName];
						for (var i = 0; i < myCards.length; i++) {
							var myCard = myCards[i];
							// as it is possible to rename a category from a virtual folder
							// should avoid to modify cards belonging to a read-only address book
							if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
								continue;
							}
							var myOutCard = new cardbookCardParser();
							cardbookUtils.cloneCard(myCard, myOutCard);
							cardbookRepository.renameCategoryFromCard(myOutCard, aCategoryName, myNewCategoryName);
							cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
							cardbookUtils.formatStringForOutput("cardRemovedFromCategory", [myDirPrefIdName, myOutCard.fn, aCategoryName]);
						}
						cardbookRepository.reWriteFiles([aDirPrefId]);
					}
					cardbookUtils.formatStringForOutput("categoryRenamedOK", [myDirPrefIdName, aCategoryName]);
					wdw_cardbooklog.addActivity("categoryRenamedOK", [myDirPrefIdName, aCategoryName], "editItem");
					if (aCategorySelect) {
						cardbookUtils.notifyObservers(aTopic, "accountid:" + aDirPrefId+"::"+myNewCategoryName);
					} else {
						cardbookUtils.notifyObservers(aTopic);
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.renameCategory error : " + e, "Error");
			}
		},

		removeCategory: function (aDirPrefId, aCategoryName, aTopic, aCategorySelect) {
			try {
				if (aCategoryName == cardbookRepository.cardbookUncategorizedCards) {
					return;
				}
				if (cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}
				var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
				var confirmTitle = strBundle.GetStringFromName("confirmTitle");
				var cardsCount = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCategoryName].length;
				var confirmMsg = PluralForm.get(cardsCount, strBundle.GetStringFromName("catDeletionsConfirmMessagePF"));
				confirmMsg = confirmMsg.replace("%1", cardsCount).replace("%2", aCategoryName);

				if (Services.prompt.confirm(window, confirmTitle, confirmMsg)) {
					var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
					
					var myCards = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCategoryName];
					for (var i = 0; i < myCards.length; i++) {
						var myCard = myCards[i];
						// as it is possible to remove a category from a virtual folder
						// should avoid to modify cards belonging to a read-only address book
						if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
							continue;
						}
						var myOutCard = new cardbookCardParser();
						cardbookUtils.cloneCard(myCard, myOutCard);
						cardbookRepository.removeCategoryFromCard(myOutCard, aCategoryName);
						cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
						cardbookUtils.formatStringForOutput("cardRemovedFromCategory", [myDirPrefIdName, myOutCard.fn, aCategoryName]);
					}
					
					cardbookRepository.reWriteFiles([aDirPrefId]);
					cardbookUtils.formatStringForOutput("categoryDeletedOK", [myDirPrefIdName, aCategoryName]);
					wdw_cardbooklog.addActivity("categoryDeletedOK", [myDirPrefIdName, aCategoryName], "deleteMail");
					if (aCategorySelect) {
						cardbookUtils.notifyObservers(aTopic, "accountid:" + aDirPrefId);
					} else {
						cardbookUtils.notifyObservers(aTopic);
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.removeCategory error : " + e, "Error");
			}
		},

		convertCategory: function (aDirPrefId, aCategoryName, aTopic) {
			try {
				if (aCategoryName == cardbookRepository.cardbookUncategorizedCards) {
					return;
				}
				if (cardbookPreferences.getReadOnly(aDirPrefId)) {
					return;
				}

				var myCards = cardbookRepository.cardbookDisplayCards[aDirPrefId+"::"+aCategoryName];
				var myDirPrefIds = {}
				for (var i = 0; i < myCards.length; i++) {
					var myCard = myCards[i];
					// as it is possible to remove a category from a virtual folder
					// should avoid to modify cards belonging to a read-only address book
					if (cardbookPreferences.getReadOnly(myCard.dirPrefId)) {
						continue;
					}
					if (!myDirPrefIds[myCard.dirPrefId]) {
						var myNewList = new cardbookCardParser();
						myNewList.dirPrefId = myCard.dirPrefId;
						myNewList.uid = cardbookUtils.getUUID();
						myNewList.version = cardbookPreferences.getVCardVersion(myCard.dirPrefId);
						myNewList.fn = aCategoryName;
						myDirPrefIds[myCard.dirPrefId] = {};
						myDirPrefIds[myCard.dirPrefId].list = myNewList;
						myDirPrefIds[myCard.dirPrefId].members = [];
					}
					myDirPrefIds[myCard.dirPrefId].members.push(["urn:uuid:" + myCard.uid]);

					var myOutCard = new cardbookCardParser();
					cardbookUtils.cloneCard(myCard, myOutCard);
					cardbookRepository.removeCategoryFromCard(myOutCard, aCategoryName);
					cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardModifiedDirect");
					cardbookUtils.formatStringForOutput("cardRemovedFromCategory", [cardbookPreferences.getName(myCard.dirPrefId), myOutCard.fn, aCategoryName]);
				}
				for (var i in myDirPrefIds) {
					cardbookUtils.parseLists(myDirPrefIds[i].list, myDirPrefIds[i].members, "group");
					var myNullCard = new cardbookCardParser();
					cardbookRepository.saveCard(myNullCard, myDirPrefIds[i].list, "cardbook.cardAddedDirect");
					cardbookRepository.reWriteFiles([i]);
				}
				
				var myDirPrefIdName = cardbookPreferences.getName(aDirPrefId);
				cardbookUtils.formatStringForOutput("categoryDeletedOK", [myDirPrefIdName, aCategoryName]);
				wdw_cardbooklog.addActivity("categoryDeletedOK", [myDirPrefIdName, aCategoryName], "deleteMail");
				cardbookUtils.notifyObservers(aTopic, "accountid:" + aDirPrefId);
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.convertCategory error : " + e, "Error");
			}
		},

		selectCategoryToAction: function (aAction) {
			try {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.view.isContainer(myTree.currentIndex)) {
					return;
				} else {
					var myCategory = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
					var mySepPosition = myCategory.indexOf("::",0);
					if (mySepPosition != -1) {
						var myDirPrefId = myCategory.substr(0, mySepPosition);
						var myCategoryName = myCategory.substr(mySepPosition+2, myCategory.length);
						if (aAction === "REMOVE") {
							wdw_cardbook.removeCategory(myDirPrefId, myCategoryName, "cardbook.catRemovedDirect", true);
						} else if (aAction === "CONVERT") {
							wdw_cardbook.convertCategory(myDirPrefId, myCategoryName, "cardbook.catRemovedDirect");
						} else if (aAction === "RENAME") {
							wdw_cardbook.renameCategory(myDirPrefId, myCategoryName, "cardbook.catModifiedDirect", true);
						}
					}
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.selectCategoryToAction error : " + e, "Error");
			}
		},

		convertListToCategory: function () {
			try {
				var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
				var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
				if (!myCard.isAList || cardbookPreferences.getReadOnly(myDirPrefId)) {
					return;
				} else {
					var myDirPrefIdName = cardbookPreferences.getName(myDirPrefId);
					var myDirPrefIdType = cardbookPreferences.getType(myDirPrefId);
					var myCategoryName = myCard.fn;
					if (myCard.version == "4.0") {
						for (var k = 0; k < myCard.member.length; k++) {
							var uid = myCard.member[k].replace("urn:uuid:", "");
							if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid]) {
								var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+uid];
								var myOutCard = new cardbookCardParser();
								cardbookUtils.cloneCard(myTargetCard, myOutCard);
								cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
								cardbookRepository.saveCard(myTargetCard, myOutCard, "cardbook.cardAddedDirect");
								cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
							}
						}
					} else if (myCard.version == "3.0") {
						var memberCustom = cardbookPreferences.getStringPref("extensions.cardbook.memberCustom");
						for (var k = 0; k < myCard.others.length; k++) {
							var localDelim1 = myCard.others[k].indexOf(":",0);
							if (localDelim1 >= 0) {
								var header = myCard.others[k].substr(0,localDelim1);
								var trailer = myCard.others[k].substr(localDelim1+1,myCard.others[k].length);
								if (header == memberCustom) {
									if (cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")]) {
										var myTargetCard = cardbookRepository.cardbookCards[myCard.dirPrefId+"::"+trailer.replace("urn:uuid:", "")];
										var myOutCard = new cardbookCardParser();
										cardbookUtils.cloneCard(myTargetCard, myOutCard);
										cardbookRepository.addCategoryToCard(myOutCard, myCategoryName);
										cardbookRepository.saveCard(myTargetCard, myOutCard, "cardbook.cardAddedDirect");
										cardbookUtils.formatStringForOutput("cardAddedToCategory", [myDirPrefIdName, myOutCard.fn, myCategoryName]);
									}
								}
							}
						}
					}
					cardbookRepository.deleteCards([myCard], "cardbook.cardRemovedDirect");
					cardbookUtils.formatStringForOutput("categoryCreatedOK", [myDirPrefIdName, myCategoryName]);
					wdw_cardbooklog.addActivity("categoryCreatedOK", [myDirPrefIdName, myCategoryName], "addItem");
					cardbookUtils.notifyObservers("cardbook.catAddedDirect", "accountid:" + myOutCard.dirPrefId+"::"+myCategoryName);
					cardbookRepository.reWriteFiles([myDirPrefId]);
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_cardbook.convertListToCategory error : " + e, "Error");
			}
		},

		copyEntryFromTree: function () {
			var myCard = cardbookRepository.cardbookCards[document.getElementById('dirPrefIdTextBox').value+"::"+document.getElementById('uidTextBox').value];
			if (wdw_cardbook.currentType == "adr") {
				var myResult = cardbookUtils.formatAddress(myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex][0]);
				myResult = document.getElementById('fnTextBox').value + "\n" + myResult;
			} else {
				var myResult = myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex][0][0];
			}
			wdw_cardbook.currentCopiedEntry = [];
			wdw_cardbook.currentCopiedEntry.push([wdw_cardbook.currentType, myCard[wdw_cardbook.currentType][wdw_cardbook.currentIndex]]);
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var myMessage = strBundle.GetStringFromName("lineCopied");
			cardbookClipboard.clipboardSetText('text/unicode', myResult, myMessage);
		},

		pasteEntryFromTree: function () {
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var listOfSelectedCard = [];
			listOfSelectedCard = cardbookUtils.getCardsFromCards();
			if (wdw_cardbook.currentCopiedEntry.length == 0) {
				cardbookUtils.formatStringForOutput("clipboardEmpty");
				return;
			}
			for (var i = 0; i < listOfSelectedCard.length; i++) {
				var myCard = listOfSelectedCard[i];
				var myOutCard = new cardbookCardParser();
				cardbookUtils.cloneCard(myCard, myOutCard);
				cardbookUtils.addTypeToCard(myOutCard, wdw_cardbook.currentCopiedEntry[0][0], wdw_cardbook.currentCopiedEntry[0][1]);
				cardbookRepository.saveCard(myCard, myOutCard, "cardbook.cardAddedDirect");
				wdw_cardbooklog.updateStatusProgressInformation(strBundle.formatStringFromName("linePastedToCard", [myOutCard.fn], 1));
			}
		},

		setCurrentTypeFromEvent: function (aEvent) {
			var myElement = document.elementFromPoint(aEvent.clientX, aEvent.clientY);
			var myTempArray = myElement.id.split('_');
			wdw_cardbook.currentType = myTempArray[0];
			wdw_cardbook.currentIndex = myTempArray[1];
			wdw_cardbook.currentValue = myElement.value;
		},

		cardListContextShowing: function (aEvent) {
			wdw_cardbook.setCurrentTypeFromEvent(aEvent);
		},

		setElementAttribute: function (aElement, aAttribute, aValue) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).setAttribute(aAttribute, aValue);
			}
		},

		removeElementAttribute: function (aElement, aAttribute) {
			if (document.getElementById(aElement)) {
				document.getElementById(aElement).removeAttribute(aAttribute);
			}
		},

		enableOrDisableElement: function (aArray, aValue) {
			for (var i = 0; i < aArray.length; i++) {
				if (document.getElementById(aArray[i])) {
					document.getElementById(aArray[i]).disabled=aValue;
				}
			}
		},

		setElementLabelWithBundle: function (aElementId, aValue) {
			var strBundle = document.getElementById("cardbook-strings");
			wdw_cardbook.setElementLabel(aElementId, strBundle.getString(aValue));
		},

		setElementLabel: function (aElementId, aValue) {
			if (document.getElementById(aElementId)) {
				document.getElementById(aElementId).label=aValue;
			}
		},

		cardbookAccountMenuContextShowing: function () {
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint',
													'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
													'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			} else if (myTree.currentIndex != -1) {
				var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook', 'cardbookAccountMenuReadOnlyOrReadWriteAddressbook'], false);
				if (cardbookPreferences.getEnabled(myPrefId)) {
					var myType = cardbookPreferences.getType(myPrefId);
					if (myType === "FILE" || myType === "CACHE" || myType === "DIRECTORY" || myType === "LOCALDB") {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], false);
					}
					wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuSync'], true);
					wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "enableFromAccountsOrCats");
				}
				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readOnlyFromAccountsOrCats");
				}
				if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
															'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync'], true);
				}

				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					}
				} else if (cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], false);
					}
					if (document.getElementById('cardsTree').view.rowCount == 0) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], true);
					} else if (document.getElementById('cardsTree').view.rowCount == 1) {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir'], false);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
															'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
														'cardbookAccountMenuPrint', 'cardbookAccountMenuExportToFile', 'cardbookAccountMenuExportToDir', ''], false);
					wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuImportFromFile', 'cardbookAccountMenuImportFromDir'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookAccountMenuEditServer', 'cardbookAccountMenuCloseServer', 'cardbookAccountMenuEnableOrDisableAddressbook',
													'cardbookAccountMenuReadOnlyOrReadWriteAddressbook', 'cardbookAccountMenuSync', 'cardbookAccountMenuPrint', 
													'cardbookAccountMenuExportToFile', 'cardbookAccountMenuImportFromFile',
													'cardbookAccountMenuExportToDir', 'cardbookAccountMenuImportFromDir'], true);
				wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuEnableOrDisableAddressbook', "disableFromAccountsOrCats");
				wdw_cardbook.setElementLabelWithBundle('cardbookAccountMenuReadOnlyOrReadWriteAddressbook', "readWriteFromAccountsOrCats");
			}
		},
	
		cardbookContactsMenuContextShowing: function () {
			cardbookUtils.addCardsToCategoryMenuSubMenu('cardbookContactsMenuCategoriesMenuPopup');
			wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEvents'], true);
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
													'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
													'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
													'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				if (cardbookUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], true);
				} else if (cardbookUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuFindEmails', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuMergeCards'], true);
					AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID, wdw_cardbook.cardbookContactsMenuLightningContextShowing);
				} else {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuToEmailCards', 'cardbookContactsMenuCcEmailCards', 'cardbookContactsMenuBccEmailCards', 'cardbookContactsMenuLocalizeCards',
														'cardbookContactsMenuOpenURL', 'cardbookContactsMenuCutCards', 'cardbookContactsMenuCopyCards', 'cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry',
														'cardbookContactsMenuPrint', 'cardbookContactsMenuExportCardsToFile',
														'cardbookContactsMenuExportCardsToDir', 'cardbookContactsMenuMergeCards', 'cardbookContactsMenuDuplicateCards', 'cardbookContactsMenuCategories'], false);
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
				}
				if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards'], true);
				} else {
					if (myTree.currentIndex != -1) {
						var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
						if (cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
							} else {
								wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], false);
							}
						} else {
							wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuPasteCards', 'cardbookContactsMenuPasteEntry', 'cardbookContactsMenuCategories'], true);
					}
				}
				if (!cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['cardbookContactsMenuFindEmails'], true);
				}
			}
		},

		cardbookContactsMenuLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("cardbookContactsMenuFindEvents").disabled = false;
			}
		},

		cardbookToolsMenuSyncLightning: function(addon) {
			if (addon && addon.isActive) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolsSyncLightning'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookToolsSyncLightning'], true);
			}
		},

		cardbookToolsMenuContextShowing: function () {
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID, wdw_cardbook.cardbookToolsMenuSyncLightning);
		},

		accountsOrCatsTreeContextShowing: function () {
			wdw_cardbook.setElementLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
			wdw_cardbook.setElementLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
			var myTree = document.getElementById('accountsOrCatsTree');
			if (cardbookDirTree.visibleData.length != 0 && myTree.currentIndex != -1) {
				var myAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
				var myPrefId = cardbookUtils.getAccountId(myAccountId);
				if (cardbookPreferences.getEnabled(myPrefId)) {
					if (cardbookPreferences.getReadOnly(myPrefId)) {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats'], true);
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats'], false);
					}
					wdw_cardbook.setElementLabelWithBundle('enableOrDisableFromAccountsOrCats', "disableFromAccountsOrCats");
					var myType = cardbookPreferences.getType(myPrefId);
					if (myType === "FILE" || myType === "CACHE" || myType === "DIRECTORY" || myType === "LOCALDB") {
						wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
					} else {
						if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['syncAccountFromAccountsOrCats'], false);
						}
					}
				} else {
					wdw_cardbook.setElementLabelWithBundle('enableOrDisableFromAccountsOrCats', "enableFromAccountsOrCats");
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats', 'syncAccountFromAccountsOrCats'], true);
				}
				if (myTree.view.isContainer(myTree.currentIndex)) {
					wdw_cardbook.enableOrDisableElement(['removeCatFromAccountsOrCats', 'renameCatFromAccountsOrCats', 'convertCatFromAccountsOrCats'], true);
				} else {
					var mySepPosition = myAccountId.indexOf("::",0);
					var myCategoryName = myAccountId.substr(mySepPosition+2, myAccountId.length);
					if (myCategoryName == cardbookRepository.cardbookUncategorizedCards) {
						wdw_cardbook.enableOrDisableElement(['removeCatFromAccountsOrCats'], true);
						wdw_cardbook.enableOrDisableElement(['renameCatFromAccountsOrCats'], false);
						wdw_cardbook.enableOrDisableElement(['convertCatFromAccountsOrCats'], true);
					} else {
						if (cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['removeCatFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['renameCatFromAccountsOrCats'], true);
							wdw_cardbook.enableOrDisableElement(['convertCatFromAccountsOrCats'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['removeCatFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['renameCatFromAccountsOrCats'], false);
							wdw_cardbook.enableOrDisableElement(['convertCatFromAccountsOrCats'], false);
						}
					}
				}
				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], true);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], true);
					wdw_cardbook.setElementLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readWriteFromAccountsOrCats");
				} else {
					wdw_cardbook.enableOrDisableElement(['generateFnFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['cutCardsFromAccountsOrCats'], false);
					wdw_cardbook.setElementLabelWithBundle('readOnlyOrReadWriteFromAccountsOrCats', "readOnlyFromAccountsOrCats");
				}
				if (cardbookUtils.isMyAccountSyncing(myPrefId)) {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
															'readOnlyOrReadWriteFromAccountsOrCats'], true);
				} else {
					wdw_cardbook.enableOrDisableElement(['editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
															'readOnlyOrReadWriteFromAccountsOrCats'], false);
				}
				wdw_cardbook.enableOrDisableElement(['addAccountFromAccountsOrCats'], false);
				if (document.getElementById('cardsTree').view.rowCount == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'generateFnFromAccountsOrCats',
														'findDuplicatesFromAccountsOrCats', 'renameCatFromAccountsOrCats', 'removeCatFromAccountsOrCats', 'convertCatFromAccountsOrCats', 'printFromAccountsOrCats'], true);
				} else if (document.getElementById('cardsTree').view.rowCount == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats',
														'printFromAccountsOrCats'], false);
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats',
														'printFromAccountsOrCats'], false);
				}
				if (cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
														'copyCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats',
														'addAccountFromAccountsOrCats', 'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats',
														'printFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats'], false);
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats', 'importCardsFromDirFromAccountsOrCats',
														'readOnlyOrReadWriteFromAccountsOrCats', 'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats'], true);
				}
			} else {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromAccountsOrCats', 'ccEmailCardsFromAccountsOrCats', 'bccEmailCardsFromAccountsOrCats', 'shareCardsByEmailFromAccountsOrCats', 'cutCardsFromAccountsOrCats',
													'copyCardsFromAccountsOrCats', 'pasteCardsFromAccountsOrCats', 'exportCardsToFileFromAccountsOrCats', 'exportCardsToDirFromAccountsOrCats', 'importCardsFromFileFromAccountsOrCats',
													'importCardsFromDirFromAccountsOrCats', 'editAccountFromAccountsOrCats', 'removeAccountFromAccountsOrCats',
													'renameCatFromAccountsOrCats', 'removeCatFromAccountsOrCats', 'convertCatFromAccountsOrCats', 'enableOrDisableFromAccountsOrCats', 'readOnlyOrReadWriteFromAccountsOrCats',
													'syncAccountFromAccountsOrCats', 'generateFnFromAccountsOrCats', 'findDuplicatesFromAccountsOrCats', 'printFromAccountsOrCats'], true);
			}
		},
	
		cardsTreeContextShowing: function (aEvent) {
			if (cardbookUtils.displayColumnsPicker()) {
				wdw_cardbook.selectCard(aEvent);
				wdw_cardbook.cardsTreeContextShowingNext();
				return true;
			} else {
				return false;
			}
		},

		cardsTreeContextShowingNext: function () {
			if (cardbookDirTree.visibleData.length == 0) {
				wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
													'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
													'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards', 'categoriesFromCards', 'printFromCards'], true);
			} else {
				cardbookUtils.addCardsToCategoryMenuSubMenu('categoriesFromCardsMenuPopup');
				wdw_cardbook.enableOrDisableElement(['findEventsFromCards'], true);
				if (cardbookUtils.getSelectedCardsCount() == 0) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'convertListToCategoryFromCards',
														'categoriesFromCards', 'printFromCards'], true);
				} else if (cardbookUtils.getSelectedCardsCount() == 1) {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'findEmailsFromCards', 'findEventsFromCards',
														'localizeCardsFromCards', 'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'duplicateCardsFromCards', 'categoriesFromCards', 'printFromCards'], false);
					wdw_cardbook.enableOrDisableElement(['mergeCardsFromCards'], true);
					var myDirPrefId = document.getElementById('dirPrefIdTextBox').value;
					var myCard = cardbookRepository.cardbookCards[myDirPrefId+"::"+document.getElementById('uidTextBox').value];
					if (myCard) {
						if (!myCard.isAList || cardbookPreferences.getReadOnly(myDirPrefId)) {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards'], false);
					}
					AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID, wdw_cardbook.cardsTreeLightningContextShowing);
				} else {
					wdw_cardbook.enableOrDisableElement(['toEmailCardsFromCards', 'ccEmailCardsFromCards', 'bccEmailCardsFromCards', 'shareCardsByEmailFromCards', 'localizeCardsFromCards',
														'openURLFromCards', 'cutCardsFromCards', 'copyCardsFromCards', 'pasteCardsFromCards', 'pasteEntryFromCards', 'exportCardsToFileFromCards',
														'exportCardsToDirFromCards', 'mergeCardsFromCards', 'duplicateCardsFromCards', 'printFromCards'], false);
					wdw_cardbook.enableOrDisableElement(['convertListToCategoryFromCards', 'findEmailsFromCards', 'findEventsFromCards'], true);
				}
				var myTree = document.getElementById('accountsOrCatsTree');
				if (myTree.currentIndex != -1) {
					var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
					if (cardbookPreferences.getEnabled(myPrefId)) {
						if (cardbookPreferences.getReadOnly(myPrefId)) {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
						} else {
							wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], false);
						}
					} else {
						wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
					}
				} else {
					wdw_cardbook.enableOrDisableElement(['pasteCardsFromCards', 'pasteEntryFromCards', 'categoriesFromCards'], true);
				}
				if (!cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled")) {
					wdw_cardbook.enableOrDisableElement(['findEmailsFromCards', 'findEventsFromCards'], true);
				}
			}
		},
	
		cardsTreeLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("findEventsFromCards").disabled = false;
			}
		},

		emailTreeContextShowing: function () {
			wdw_cardbook.enableOrDisableElement(['findemailemailTree'], !cardbookPreferences.getBoolPref("mailnews.database.global.indexer.enabled"));
			document.getElementById("findeventemailTree").setAttribute("hidden", true);
			AddonManager.getAddonByID(cardbookRepository.LIGHTNING_ID, wdw_cardbook.emailTreeLightningContextShowing);
		},

		emailTreeLightningContextShowing: function (addon) {
			if (addon && addon.isActive) {
				document.getElementById("findeventemailTree").disabled = false;
			}
		},

		imppTreeContextShowing: function () {
			if (document.getElementById('impp_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connectimppTree'], true);
			}
		},

		telTreeContextShowing: function () {
			if (document.getElementById('tel_' + wdw_cardbook.currentIndex + '_valueBox').getAttribute('link') == "true") {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], false);
			} else {
				wdw_cardbook.enableOrDisableElement(['connecttelTree'], true);
			}
		},

		enableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], false);
			var selectedUid = cardbookUtils.getSelectedCardsId();
			cardbookUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedUid], 'IMPPCardFromCardsMenuPopup')
			cardbookUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedUid], 'cardbookContactsMenuIMPPCardsMenuPopup')
			wdw_cardbook.setElementAttribute('cardbookToolbarChatButton', 'type', 'menu-button');
			cardbookUtils.addCardToIMPPMenuSubMenu(cardbookRepository.cardbookCards[selectedUid], 'cardbookToolbarChatButtonMenuPopup')
		},
	
		enableCardDeletion: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardDeletion();
			} else {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], false);
			}
		},
	
		enableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList',
													'addContactFromCards', 'addListFromCards', 'cardbookContactsMenuDuplicateCards', 'duplicateCardsFromCards'], false);
		},
	
		enableCardModification: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.disableCardModification();
			} else {
				var myTree = document.getElementById('accountsOrCatsTree');
				var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
				if (cardbookPreferences.getReadOnly(myPrefId)) {
					wdw_cardbook.setElementLabelWithBundle('cardbookToolbarEditButton', "viewCardButtonLabel");
					wdw_cardbook.setElementLabelWithBundle('cardbookContactsMenuEditContact', "viewCardButtonLabel");
					wdw_cardbook.setElementLabelWithBundle('editCardFromCards', "viewCardButtonLabel");
				} else {
					wdw_cardbook.setElementLabelWithBundle('cardbookToolbarEditButton', "editCardButtonLabel");
					wdw_cardbook.setElementLabelWithBundle('cardbookContactsMenuEditContact', "editCardButtonLabel");
					wdw_cardbook.setElementLabelWithBundle('editCardFromCards', "editCardButtonLabel");
				}
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], false);
			}
		},
	
		disableCardIM: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarChatButton', 'cardbookContactsMenuIMPPCards', 'IMPPCardFromCards'], true);
			wdw_cardbook.removeElementAttribute('cardbookToolbarChatButton', 'type');
		},
		
		disableCardDeletion: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarRemoveButton', 'cardbookContactsMenuRemoveCard', 'removeCardFromCards'], true);
		},
		
		disableCardCreation: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddContactButton', 'cardbookToolbarAddListButton', 'cardbookContactsMenuAddContact', 'cardbookContactsMenuAddList', 'addContactFromCards',
													'addListFromCards', 'cardbookContactsMenuDuplicateCards', 'duplicateCardsFromCards'], true);
		},
		
		disableCardModification: function () {
			wdw_cardbook.enableOrDisableElement(['cardbookToolbarEditButton', 'cardbookContactsMenuEditContact', 'editCardFromCards'], true);
		},

		onViewToolbarsPopupShowing: function (aEvent, aToolboxArray) {
			var result = [];
			for (var i = 0; i < aToolboxArray.length; i++) {
				if (document.getElementById(aToolboxArray[i])) {
					if (aToolboxArray[i] == "cardbook-toolbox") {
						document.getElementById(aToolboxArray[i]).externalToolbars = [document.getElementById("cardbook-folderPane-toolbar")];
					}
					result.push(aToolboxArray[i]);
				}
			}
			onViewToolbarsPopupShowing(aEvent, result);
		},

		updateStatusProgressInformationField: function() {
			if (cardbookUtils.getBroadcasterOnCardBook()) {
				if (cardbookUtils.getAvailableAccountNumber() === 0) {
					wdw_cardbook.setElementLabel('totalMessageCount', "");
				} else {
					if (cardbookRepository.statusInformation.length == 0) {
						wdw_cardbook.setElementLabel('totalMessageCount', '');
					} else if (cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0] == cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,150)) {
						wdw_cardbook.setElementLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0]);
					} else {
						wdw_cardbook.setElementLabel('totalMessageCount', cardbookRepository.statusInformation[cardbookRepository.statusInformation.length - 1][0].substr(0,147) + "…");
	
					}
				}
				document.getElementById("totalMessageCount").hidden=false;
			}
		},
	
		updateStatusInformation: function() {
			if (cardbookUtils.getBroadcasterOnCardBook()) {
				var myTree = document.getElementById('accountsOrCatsTree');
				var strBundle = document.getElementById("cardbook-strings");
				if (cardbookRepository.cardbookSearchMode === "SEARCH") {
					var myAccountId = cardbookRepository.cardbookSearchValue;
					if (cardbookRepository.cardbookDisplayCards[myAccountId]) {
						var myMessage = strBundle.getFormattedString("numberContactsFound", [cardbookRepository.cardbookDisplayCards[myAccountId].length]);
					} else {
						var myMessage = "";
					}
				} else {
					try {
						var myAccountId = myTree.view.getCellText(myTree.currentIndex, {id: "accountId"});
						var myMessage = strBundle.getFormattedString("numberContacts", [cardbookRepository.cardbookDisplayCards[myAccountId].length]);
					}
					catch(e) {
						var myMessage = "";
					}
				}
				document.getElementById("statusText").hidden=false;
				document.getElementById("unreadMessageCount").hidden=true;
				wdw_cardbook.setElementLabel('statusText', myMessage);
			}
		},
	
		windowControlShowing: function () {
			if (cardbookUtils.getAvailableAccountNumber() === 0) {
				wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], true);
				wdw_cardbook.disableCardCreation();
				wdw_cardbook.disableCardModification();
				wdw_cardbook.disableCardDeletion();
				wdw_cardbook.disableCardIM();
			} else {
				if (cardbookDirTree.visibleData.length == 0) {
					wdw_cardbook.disableCardCreation();
					wdw_cardbook.disableCardModification();
					wdw_cardbook.disableCardDeletion();
					wdw_cardbook.disableCardIM();
				} else if (cardbookRepository.cardbookSearchMode === "SEARCH" || cardbookRepository.cardbookComplexSearchMode === "SEARCH") {
					wdw_cardbook.enableCardCreation();
					if (cardbookUtils.getSelectedCardsCount() >= 2 || cardbookUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardIM();
					} else {
						wdw_cardbook.enableCardModification();
						wdw_cardbook.enableCardIM();
					}
					if (cardbookUtils.getSelectedCardsCount() == 0) {
						wdw_cardbook.disableCardDeletion();
					} else {
						wdw_cardbook.enableCardDeletion();
					}
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookUtils.isThereNetworkAccountToSync());
				} else {
					var myTree = document.getElementById('accountsOrCatsTree');
					if (myTree.currentIndex != -1) {
						var myPrefId = cardbookUtils.getAccountId(myTree.view.getCellText(myTree.currentIndex, {id: "accountId"}));
						if (cardbookPreferences.getEnabled(myPrefId)) {
							if (cardbookPreferences.getReadOnly(myPrefId)) {
								wdw_cardbook.disableCardCreation();
								wdw_cardbook.disableCardDeletion();
							} else {
								wdw_cardbook.enableCardCreation();
								if (cardbookUtils.getSelectedCardsCount() == 0) {
									wdw_cardbook.disableCardDeletion();
								} else {
									wdw_cardbook.enableCardDeletion();
								}
							}
							if (cardbookUtils.getSelectedCardsCount() >= 2 || cardbookUtils.getSelectedCardsCount() == 0) {
								wdw_cardbook.disableCardModification();
								wdw_cardbook.disableCardIM();
							} else {
								wdw_cardbook.enableCardModification();
								wdw_cardbook.enableCardIM();
							}
						} else {
							wdw_cardbook.disableCardCreation();
							wdw_cardbook.disableCardModification();
							wdw_cardbook.disableCardDeletion();
							wdw_cardbook.disableCardIM();
						}
					} else {
						wdw_cardbook.disableCardCreation();
						wdw_cardbook.disableCardModification();
						wdw_cardbook.disableCardDeletion();
						wdw_cardbook.disableCardIM();
					}
					wdw_cardbook.enableOrDisableElement(['cardbookToolbarSyncButton', 'cardbookAccountMenuSyncs'], !cardbookUtils.isThereNetworkAccountToSync());
				}
			}

			wdw_cardbook.enableOrDisableElement(['cardbookToolbarAddServerButton', 'cardbookToolbarConfigurationButton', 'cardbookToolbarWriteButton', 'accountsOrCatsTreeContextMenu', 'cardsTreeContextMenu',
												'cardbookAccountMenu', 'cardbookContactsMenu', 'cardbookToolsMenu', 'cardbookToolbarComplexSearch', 'cardbookToolbarPrintButton'], false);
			wdw_cardbook.updateStatusInformation();
			wdw_cardbook.updateStatusProgressInformationField();
		},

		refreshWindow: function (aParams) {
			// get selected account
			var myAccountId = "";
			if (cardbookRepository.cardbookSearchMode !== "SEARCH") {
				if (aParams && aParams.search(/^accountid:/) != -1) {
					myAccountId = aParams.replace(/^accountid:/, "");
				} else {
					myAccountId = wdw_cardbook.currentAccountId;
				}
				// if it does not exist anymore, take the first one if it exists
				if (!(cardbookRepository.cardbookDisplayCards[cardbookUtils.getAccountId(myAccountId)])) {
					if (cardbookRepository.cardbookAccounts.length != 0) {
						var myTree = document.getElementById('accountsOrCatsTree');
						myAccountId = myTree.view.getCellText(0, {id: "accountId"});
					} else {
						myAccountId = "";
					}
				}
			}
			
			// get selected cards
			var listOfSelectedCard = [];
			if (aParams && aParams.search(/^cardid:/) != -1) {
				var myId = aParams.replace(/^cardid:/, "");
				if (cardbookRepository.cardbookCards[myId]) {
					listOfSelectedCard.push(cardbookRepository.cardbookCards[myId]);
				}
			} else {
				listOfSelectedCard = cardbookUtils.getSelectedCards();
			}
			
			wdw_cardbook.refreshAccountsInDirTree();
			
			// select account back
			wdw_cardbook.selectAccountOrCat(myAccountId, listOfSelectedCard);

			// no need to refresh cards for others syncing dirprefid
			if (aParams && aParams.search(/^syncaccountid:/) != -1) {
				var mySyncAccountId = aParams.replace(/^syncaccountid:/, "");
				var mySyncCondition = (mySyncAccountId == myAccountId || cardbookRepository.cardbookComplexSearchMode == "SEARCH");
			} else {
				var mySyncCondition = true;
			}
			
			// for search mode the reselection is done inside their functions
			if (cardbookRepository.cardbookSearchMode !== "SEARCH" && mySyncCondition) {
				wdw_cardbook.sortCardsTreeCol();
	
				// select cards back
				if (listOfSelectedCard.length == 1) {
					var myTree = document.getElementById('cardsTree');
					cardbookUtils.setSelectedCards(listOfSelectedCard, myTree.boxObject.getFirstVisibleRow(), myTree.boxObject.getLastVisibleRow());
					if (cardbookRepository.cardbookCards[listOfSelectedCard[0].cbid]) {
						wdw_cardbook.displayCard(listOfSelectedCard[0]);
					}
				}
				if (cardbookRepository.cardbookDisplayCards[myAccountId]) {
					if (cardbookRepository.cardbookDisplayCards[myAccountId].length == 1) {
						var myTree = document.getElementById('cardsTree');
						cardbookUtils.setSelectedCards([cardbookRepository.cardbookDisplayCards[myAccountId][0]], myTree.boxObject.getFirstVisibleRow(), myTree.boxObject.getLastVisibleRow());
						wdw_cardbook.displayCard(cardbookRepository.cardbookDisplayCards[myAccountId][0]);
					}
				}
			}
		}

	};
};
