if ("undefined" == typeof(cardbookComplexSearch)) {
	var cardbookComplexSearch = {
		
		isMyCardFoundInDirPrefId: function (aCard, aComplexSearchDirPrefId) {
			var myRegexp;
			var inverse;
			var myField = [];
			var result;
		
			function buildRegExp(aCard, aCase, aField, aTerm, aValue, aDiacritic) {
				myField = cardbookUtils.getCardValueByField(aCard, aField);
				if (aDiacritic && myField.length != 0) {
					for (var i = 0; i < myField.length; i++) {
						myField[i] = cardbookRepository.normalizeString(myField[i]);
					}
				}
				if (aTerm == "Contains") {
					myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
					inverse = false;
				} else if (aTerm == "DoesntContain") {
					myRegexp = new RegExp("(.*)" + aValue + "(.*)", aCase);
					inverse = true;
				} else if (aTerm == "Is") {
					myRegexp = new RegExp("^" + aValue + "$", aCase);
					inverse = false;
				} else if (aTerm == "Isnt") {
					myRegexp = new RegExp("^" + aValue + "$", aCase);
					inverse = true;
				} else if (aTerm == "BeginsWith") {
					myRegexp = new RegExp("^" + aValue + "(.*)", aCase);
					inverse = false;
				} else if (aTerm == "EndsWith") {
					myRegexp = new RegExp("(.*)" + aValue + "$", aCase);
					inverse = false;
				} else if (aTerm == "IsEmpty") {
					myRegexp = new RegExp("^$", aCase);
					inverse = false;
				} else if (aTerm == "IsntEmpty") {
					myRegexp = new RegExp("^$", aCase);
					inverse = true;
				}
			};

			for (var i = 0; i < cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules.length; i++) {
				var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0];
				if (myCaseOperator.startsWith("d")) {
					var myDiacritic = true;
					var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0].substr(1);
					var myValue = cardbookRepository.normalizeString(cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][3]);
				} else {
					var myDiacritic = false;
					var myCaseOperator = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][0];
					var myValue = cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][3];
				}
			
				buildRegExp(aCard, myCaseOperator, cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][1],
									cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2], myValue,
									myDiacritic);
				function searchArray(element) {
					return element.search(myRegexp) != -1;
				};
				if (myField.length == 0) {
					if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2] == "IsEmpty") {
						var found = true;
					} else if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].rules[i][2] == "IsntEmpty") {
						var found = true;
					} else {
						var found = false;
					}
				} else if (myField.find(searchArray) == undefined) {
					var found = false;
				} else {
					var found = true;
				}
				
				if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].matchAll) {
					result = true;
					if ((!found && !inverse) || (found && inverse)) {
						result = false;
						break;
					}
				} else {
					result = false;
					if ((found && !inverse) || (!found && inverse)) {
						result = true;
						break;
					}
				}
			}
			return result;
		},

		isMyCardFound: function (aCard, aComplexSearchDirPrefId) {
			if (!cardbookPreferences.getEnabled(aComplexSearchDirPrefId)) {
				return false;
			}
			if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
				if ((cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB == aCard.dirPrefId) || (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId].searchAB === "allAddressBooks")) {
					return cardbookComplexSearch.isMyCardFoundInDirPrefId(aCard, aComplexSearchDirPrefId);
				}
			}
			return false;
		},

		loadMatchAll: function (aDefaultValue) {
			if (aDefaultValue) {
				document.getElementById("booleanAndGroup").selectedIndex = 0;
			} else {
				document.getElementById("booleanAndGroup").selectedIndex = 1;
			}
		},

		getAllArray: function (aType, aVersion) {
			var i = 0;
			var myResult = [];
			while (true) {
				if (document.getElementById(aType + '_' + i + '_hbox')) {
					var mySearchCase = document.getElementById(aType + '_' + i + '_menulistCase').selectedItem.value;
					var mySearchObj = document.getElementById(aType + '_' + i + '_menulistObj').selectedItem.value;
					var mySearchTerm = document.getElementById(aType + '_' + i + '_' + aVersion + '_menulistTerm').selectedItem.value;
					var mySearchValue = document.getElementById(aType + '_' + i + '_valueBox').value;
					myResult.push([mySearchCase, mySearchObj, mySearchTerm, mySearchValue]);
					i++;
				} else {
					break;
				}
			}
			return myResult;
		},

		disableButtons: function (aType, aIndex, aVersion) {
			if (aIndex == 0) {
				if (document.getElementById(aType + '_' + aIndex + '_valueBox').value == "") {
					if (document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_menulistTerm').selectedItem.value == "IsntEmpty" ||
							document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_menulistTerm').selectedItem.value == "IsEmpty") {
						document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookaddButton').disabled = false;
						document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookremoveButton').disabled = false;
					} else {
						document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookaddButton').disabled = true;
						document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookremoveButton').disabled = true;
					}
				} else {
					document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookaddButton').disabled = false;
					document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookremoveButton').disabled = false;
				}
			} else {
				document.getElementById(aType + '_0_' + aVersion + '_cardbookremoveButton').disabled = false;
				for (var i = 0; i < aIndex; i++) {
					document.getElementById(aType + '_' + i + '_' + aVersion + '_cardbookaddButton').disabled = true;
					document.getElementById(aType + '_' + i + '_' + aVersion + '_cardbookdownButton').disabled = false;
				}
			}
			document.getElementById(aType + '_' + aIndex + '_' + aVersion + '_cardbookdownButton').disabled = true;
			document.getElementById(aType + '_0_' + aVersion + '_cardbookupButton').disabled = true;
		},

		showOrHideForEmpty: function (aId) {
			var myIdArray = aId.split('_');
			if (document.getElementById(aId).selectedItem.value == "IsEmpty" || document.getElementById(aId).selectedItem.value == "IsntEmpty") {
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_valueBox').hidden = true;
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_menulistCase').hidden = true;
			} else {
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_valueBox').hidden = false;
				document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_menulistCase').hidden = false;
			}
		},

		loadDynamicTypes: function (aType, aIndex, aArray, aVersion) {
			var strBundle = document.getElementById("cardbook-strings");
			var aOrigBox = document.getElementById(aType + 'Groupbox');
			
			if (aIndex == 0) {
				cardbookElementTools.addCaption(aType, aOrigBox);
			}
			
			var aHBox = cardbookElementTools.addHBox(aType, aIndex, aOrigBox);

			cardbookElementTools.addMenuCaselist(aHBox, aType, aIndex, aArray[0], {flex: "1"});
			cardbookElementTools.addMenuObjlist(aHBox, aType, aIndex, aArray[1], {flex: "1"});
			cardbookElementTools.addMenuTermlist(aHBox, aType, aIndex, aVersion, aArray[2], {flex: "1"});
			cardbookElementTools.addKeyTextbox(aHBox, aType + '_' + aIndex + '_valueBox', aArray[3], {flex: "1"}, aVersion, aIndex);

			function fireUpButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myIdArray = this.id.split('_');
				var myAllValuesArray = cardbookComplexSearch.getAllArray(myIdArray[0], myIdArray[2]);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[myIdArray[1]*1-1];
				myAllValuesArray[myIdArray[1]*1-1] = myAllValuesArray[myIdArray[1]];
				myAllValuesArray[myIdArray[1]] = temp;
				cardbookElementTools.deleteRowsType(myIdArray[0]);
				cardbookComplexSearch.constructDynamicRows(myIdArray[0], myAllValuesArray, myIdArray[2]);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, aVersion, "up", fireUpButton);
			
			function fireDownButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myIdArray = this.id.split('_');
				var myAllValuesArray = cardbookComplexSearch.getAllArray(myIdArray[0], myIdArray[2]);
				if (myAllValuesArray.length <= 1) {
					return;
				}
				var temp = myAllValuesArray[myIdArray[1]*1+1];
				myAllValuesArray[myIdArray[1]*1+1] = myAllValuesArray[myIdArray[1]];
				myAllValuesArray[myIdArray[1]] = temp;
				cardbookElementTools.deleteRowsType(myIdArray[0]);
				cardbookComplexSearch.constructDynamicRows(myIdArray[0], myAllValuesArray, myIdArray[2]);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, aVersion, "down", fireDownButton);

			function fireRemoveButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myIdArray = this.id.split('_');
				var myAllValuesArray = cardbookComplexSearch.getAllArray(myIdArray[0], myIdArray[2]);
				cardbookElementTools.deleteRowsType(myIdArray[0]);
				if (myAllValuesArray.length == 0) {
					cardbookComplexSearch.constructDynamicRows(myIdArray[0], myAllValuesArray, myIdArray[2]);
				} else {
					var removed = myAllValuesArray.splice(myIdArray[1], 1);
					cardbookComplexSearch.constructDynamicRows(myIdArray[0], myAllValuesArray, myIdArray[2]);
				}
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, aVersion, "remove", fireRemoveButton);
			
			function fireAddButton(event) {
				if (document.getElementById(this.id).disabled) {
					return;
				}
				var myIdArray = this.id.split('_');
				var myValue = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_valueBox').value;
				var myTerm = document.getElementById(myIdArray[0] + '_' + myIdArray[1] + '_' + myIdArray[2] + '_menulistTerm').selectedItem.value;
				if (myValue == "" && myTerm !== "IsEmpty" && myTerm !== "IsntEmpty") {
					return;
				}
				var myNextIndex = 1+ 1*myIdArray[1];
				cardbookComplexSearch.loadDynamicTypes(myIdArray[0], myNextIndex, ["","","",""], myIdArray[2]);
			};
			cardbookElementTools.addEditButton(aHBox, aType, aIndex, aVersion, "add", fireAddButton);

			cardbookComplexSearch.showOrHideForEmpty(aType + '_' + aIndex + '_' + aVersion + '_menulistTerm');
			cardbookComplexSearch.disableButtons(aType, aIndex, aVersion);
		},

		constructDynamicRows: function (aType, aArray, aVersion) {
			cardbookElementTools.deleteRowsType(aType);
			for (var i = 0; i < aArray.length; i++) {
				cardbookComplexSearch.loadDynamicTypes(aType, i, aArray[i], aVersion);
			}
			if (aArray.length == 0) {
				cardbookComplexSearch.loadDynamicTypes(aType, 0, ["","","",""], aVersion);
			}
		},

		loadCards: function (aComplexSearchDirPrefId) {
			if (cardbookRepository.cardbookComplexSearch[aComplexSearchDirPrefId]) {
				for (j in cardbookRepository.cardbookCards) {
					let myCard = cardbookRepository.cardbookCards[j];
					if (cardbookComplexSearch.isMyCardFound(myCard, aComplexSearchDirPrefId)) {
						cardbookRepository.addCardToCategories(myCard, aComplexSearchDirPrefId);
						cardbookRepository.addCardToDisplay(myCard, aComplexSearchDirPrefId);
					}
				}
			}
			cardbookRepository.cardbookComplexSearchReloadResponse[aComplexSearchDirPrefId]++;
		},

		parseRule: function (aData, aDirPrefId) {
			if (aData != null && aData !== undefined && aData != "") {
				cardbookRepository.cardbookComplexSearch[aDirPrefId] = {}
				var relative = aData.match("^searchAB:([^:]*):searchAll:([^:]*)(.*)");
				cardbookRepository.cardbookComplexSearch[aDirPrefId].searchAB = relative[1];
				if (relative[2] == "true") {
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = true;
				} else {
					cardbookRepository.cardbookComplexSearch[aDirPrefId].matchAll = false;
				}
				var tmpRuleArray = relative[3].split(/:case:/);
				cardbookRepository.cardbookComplexSearch[aDirPrefId].rules = [];
				for (var i = 1; i < tmpRuleArray.length; i++) {
					var relative = tmpRuleArray[i].match("([^:]*):field:([^:]*):term:([^:]*):value:([^:]*)");
					cardbookRepository.cardbookComplexSearch[aDirPrefId].rules.push([relative[1], relative[2], relative[3], relative[4]]);
				}
			}
		},

		loadComplexSearchAccountFinished: function (aData, aParams) {
			cardbookComplexSearch.parseRule(aData, aParams.aDirPrefId);
			cardbookRepository.cardbookComplexSearchResponse[aParams.aDirPrefId]++;
			if (aParams.aReload) {
				cardbookComplexSearch.loadCards(aParams.aDirPrefId);
			}
		},
		
		loadComplexSearchAccount: function (aDirPrefId, aReload, aMode) {
			cardbookSynchronization.initMultipleOperations(aDirPrefId);
			var myFile = cardbookRepository.getRuleFile(aDirPrefId);
			cardbookRepository.cardbookComplexSearchRequest[aDirPrefId]++;
			if (myFile.exists() && myFile.isFile()) {
				if (aReload) {
					cardbookRepository.cardbookComplexSearchReloadRequest[aDirPrefId]++;
				}
				var params = {};
				params["showError"] = true;
				params["aDirPrefId"] = aDirPrefId;
				params["aReload"] = aReload;
				cardbookSynchronization.getFileDataAsync(myFile.path, cardbookComplexSearch.loadComplexSearchAccountFinished, params);
			} else {
				cardbookRepository.cardbookComplexSearchResponse[aDirPrefId]++;
			}
			var myPrefName = cardbookPreferences.getName(aDirPrefId);
			cardbookSynchronization.waitForComplexSearchFinished(aDirPrefId, myPrefName, aMode);
		},
		
		getSearch: function () {
			var result = "searchAB:" + document.getElementById('addressbookMenulist').selectedItem.value;
			var searchAll = document.getElementById('booleanAndGroup').selectedItem.value == "and" ? "true" : "false";
			result = result + ":searchAll:" + searchAll;
			var found = false;
			var allRules = cardbookComplexSearch.getAllArray("searchTerms", "3.0");
			for (var i = 0; i < allRules.length; i++) {
				if (allRules[i][2] == "IsEmpty") {
					found = true;
				} else if (allRules[i][2] == "IsntEmpty") {
					found = true;
				} else if (allRules[i][3] != "") {
					found = true;
				}
				if (found) {
					result = result + ":case:" + allRules[i][0] + ":field:" + allRules[i][1] + ":term:" + allRules[i][2] + ":value:" + allRules[i][3];
				}
			}
			if (found) {
				return result;
			} else {
				return "";
			}
		}

	};
};
