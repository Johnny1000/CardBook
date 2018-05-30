if ("undefined" == typeof(ovl_synchro)) {
	try {
		ChromeUtils.import("resource://gre/modules/Services.jsm");
	}
	catch(e) {
		Components.utils.import("resource://gre/modules/Services.jsm");
	}

	var ovl_synchro = {

		lTimerSync: null,
		
		initPrefs: function () {
			var strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
			var prefs = Services.prefs.getDefaultBranch("extensions.cardbook.");
			
			prefs.setBoolPref("autocompletion", true);
			prefs.setBoolPref("autocompleteSortByPopularity", true);
			prefs.setBoolPref("proposeConcatEmails", false);
			prefs.setBoolPref("autocompleteShowAddressbook", false);
			prefs.setBoolPref("autocompleteWithColor", true);
			prefs.setBoolPref("autocompleteRestrictSearch", false);
			prefs.setCharPref("autocompleteRestrictSearchFields", cardbookRepository.defaultAutocompleteRestrictSearchFields);
			prefs.setCharPref("useColor", "background");
			prefs.setBoolPref("exclusive", false);
			prefs.setCharPref("requestsTimeout", "120");
			prefs.setCharPref("statusInformationLineNumber", "250");
			prefs.setBoolPref("debugMode", false);
			
			prefs.setBoolPref("preferEmailEdition", true);
			prefs.setBoolPref("mailPopularityTabView", false);
			prefs.setBoolPref("technicalTabView", false);
			prefs.setBoolPref("vcardTabView", false);
			prefs.setBoolPref("advancedTabView", false);
			
			prefs.setCharPref("panesView", "modern");
			prefs.setBoolPref("initialSync", true);
			prefs.setCharPref("initialSyncDelay", "0");
			prefs.setCharPref("solveConflicts", "User");
			prefs.setCharPref("discoveryAccountsNameList", "");
			prefs.setCharPref("multiget", "40");
			prefs.setBoolPref("decodeReport", true);
			
			prefs.setBoolPref("preferEmailPref", true);
			prefs.setBoolPref("preferIMPPPref", true);
			prefs.setBoolPref("warnEmptyEmails", true);
			prefs.setBoolPref("useOnlyEmail", false);
			
			prefs.setBoolPref("usePreferenceValue", false);
			prefs.setCharPref("preferenceValueLabel", "");
			
			prefs.setBoolPref("firstRun", true);
			prefs.setBoolPref("firstOpen", true);
			prefs.setBoolPref("iconsMigrated", false);
			
			prefs.setCharPref("kindCustom", "X-ADDRESSBOOKSERVER-KIND");
			prefs.setCharPref("memberCustom", "X-ADDRESSBOOKSERVER-MEMBER");
			
			prefs.setCharPref("orgStructure", "");
			
			prefs.setCharPref("localizeEngine", "OpenStreetMap");
			prefs.setCharPref("localizeTarget", "out");
			prefs.setCharPref("showNameAs", "LF");
			prefs.setBoolPref("fnFormulaMigrated", false);
			
			// localized
			cardbookRepository.defaultAdrFormula = strBundle.GetStringFromName("addressFormatFormula");
			prefs.setCharPref("adrFormula", cardbookRepository.defaultAdrFormula);
			
			prefs.setCharPref("dateDisplayedFormat", "0");
			
			prefs.setCharPref("addressBooksNameList", "allAddressBooks");
			prefs.setCharPref("calendarsNameList", "");
			prefs.setBoolPref("searchInNote", true);
			prefs.setCharPref("numberOfDaysForSearching", "30");
			prefs.setBoolPref("showPopupOnStartup", false);
			prefs.setBoolPref("showPeriodicPopup", false);
			prefs.setCharPref("periodicPopupIime", "08:00");
			prefs.setBoolPref("showPopupEvenIfNoBirthday", true);
			prefs.setBoolPref("syncWithLightningOnStartup", false);
			prefs.setCharPref("numberOfDaysForWriting", "30");
			// localized
			prefs.setCharPref("eventEntryTitle", strBundle.GetStringFromName("eventEntryTitleMessage"));
			prefs.setBoolPref("eventEntryTitleMigrated", false);
			prefs.setCharPref("eventEntryTime", "00:00");
			prefs.setBoolPref("eventEntryWholeDay", false);
			prefs.setCharPref("calendarEntryAlarm", "168");
			prefs.setBoolPref("calendarEntryAlarmMigrated", false);
			prefs.setCharPref("calendarEntryCategories", "");
			
			prefs.setBoolPref("viewABPane", true);
			prefs.setBoolPref("viewABContact", true);
			
			prefs.setCharPref("accountsShown", "all");
			prefs.setCharPref("accountShown", "");
			prefs.setCharPref("uncategorizedCards", "");
			prefs.setCharPref("addonVersion", "29.2");
		},

		lEventTimerSync : { notify: function(lTimerSync) {
			if (!cardbookRepository.firstLoad) {
				// setting uncategorizedCards
				try {
					cardbookRepository.cardbookUncategorizedCards = cardbookPreferences.getStringPref("extensions.cardbook.uncategorizedCards");
					if (cardbookRepository.cardbookUncategorizedCards == "") {
						throw "CardBook no uncategorizedCards";
					}
				}
				catch (e) {
					let strBundle = Services.strings.createBundle("chrome://cardbook/locale/cardbook.properties");
					cardbookRepository.cardbookUncategorizedCards = strBundle.GetStringFromName("uncategorizedCards");
					cardbookPreferences.setStringPref("extensions.cardbook.uncategorizedCards", cardbookRepository.cardbookUncategorizedCards);
				}
				// setting preferEmailPref and preferIMPPPref for getting usefull emails and impps
				cardbookRepository.preferEmailPref = cardbookPreferences.getBoolPref("extensions.cardbook.preferEmailPref");
				cardbookRepository.preferIMPPPref = cardbookPreferences.getBoolPref("extensions.cardbook.preferIMPPPref");

				// setting addonVersion, userAgent and prodid
				cardbookRepository.addonVersion = cardbookPreferences.getStringPref("extensions.cardbook.addonVersion");
				cardbookRepository.userAgent = "Thunderbird CardBook/" + cardbookRepository.addonVersion;
				cardbookRepository.prodid = "-//Thunderbird.net/NONSGML Thunderbird CardBook V"+ cardbookRepository.addonVersion + "//EN";

				// setting autocompleteRestrictSearch and autocompleteRestrictSearchFields
				cardbookRepository.autocompleteRestrictSearch = cardbookPreferences.getBoolPref("extensions.cardbook.autocompleteRestrictSearch");
				cardbookRepository.autocompleteRestrictSearchFields = cardbookPreferences.getStringPref("extensions.cardbook.autocompleteRestrictSearchFields").split('|');

				// setting currentTypes for having lookups
				cardbookRepository.currentTypes = cardbookPreferences.getAllTypesCurrent();

				// migration functions (should be removed)
				// removed : cardbookRepository.setSolveConflicts();
				cardbookRepository.setCollected();
				cardbookRepository.setTypes();
				cardbookRepository.loadCustoms();
				cardbookRepository.setCalendarEntryAlarm();
				cardbookRepository.setEventEntryTitle();
				cardbookRepository.migrateFnFormula();
				
				// observers are needed not only UI but also for synchro
				// there is no unregister launched
				cardBookObserver.register();
				
				// add Cardbook into taskbar
				ovl_winTaskBar.add();
				
				// once openDB is finished, it will fire an event
				// and then load the cache and maybe sync the accounts
				cardbookIndexedDB.openDB();
				cardbookRepository.firstLoad = true;
			}
			}
		},
		
		runBackgroundSync: function () {
			ovl_synchro.lTimerSync = Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer);
			ovl_synchro.lTimerSync.initWithCallback(ovl_synchro.lEventTimerSync, 1000, Components.interfaces.nsITimer.TYPE_ONE_SHOT);
		}

	};

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/preferences/cardbookPreferences.js");

	// need to launch it a bit later
	if (!cardbookRepository.firstLoad) {
		ovl_synchro.initPrefs();
	}
	ovl_synchro.runBackgroundSync();

};
