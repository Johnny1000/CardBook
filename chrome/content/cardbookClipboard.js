if ("undefined" == typeof(cardbookClipboard)) {
	try {
		ChromeUtils.import("resource://gre/modules/Services.jsm");
	}
	catch(e) {
		Components.utils.import("resource://gre/modules/Services.jsm");
	}

	var cardbookClipboard = {

		clipboardSetImage: function (aURISpec) {
			try {
				var imgTools = Components.classes["@mozilla.org/image/tools;1"].getService(Components.interfaces.imgITools);
				var myFileURI = Services.io.newURI(aURISpec, null, null);

				// Thunderbird 52 and Linux
				if (imgTools.decodeImageData) {
					var myExtension = cardbookUtils.getFileNameExtension(aURISpec);
					var imagedata = 'data:image/' + myExtension + ';base64,' + btoa(cardbookSynchronization.getFileBinary(myFileURI));
					var channel = Services.io.newChannel2(imagedata, null, null, null, null, null, null, null);
					var input = channel.open();
					var container = {};
					imgTools.decodeImageData(input, channel.contentType, container);
					var wrapped = Components.classes["@mozilla.org/supports-interface-pointer;1"].createInstance(Components.interfaces.nsISupportsInterfacePointer);
					wrapped.data = container.value;
					var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
					trans.addDataFlavor(channel.contentType);
					trans.setTransferData(channel.contentType, wrapped, 0);
					var clipid = Components.interfaces.nsIClipboard;
					var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
					clipboard.setData(trans, null, clipid.kGlobalClipboard);
				// Thunderbird 60
				} else if (imgTools.decodeImageFromBuffer) {
					var myChannel = Services.io.newChannelFromURI2(myFileURI,
																	 null,
																	 Services.scriptSecurityManager.getSystemPrincipal(),
																	 null,
																	 Components.interfaces.nsILoadInfo.SEC_REQUIRE_SAME_ORIGIN_DATA_INHERITS,
																	 Components.interfaces.nsIContentPolicy.TYPE_OTHER);
					NetUtil.asyncFetch(myChannel, function (inputStream, status) {
						if (!Components.isSuccessCode(status)) {
							return;
						}
						var buffer = NetUtil.readInputStreamToString(inputStream, inputStream.available());
						var container = imgTools.decodeImageFromBuffer(buffer, buffer.length, myChannel.contentType);
						var wrapped = Components.classes["@mozilla.org/supports-interface-pointer;1"].createInstance(Components.interfaces.nsISupportsInterfacePointer);
						wrapped.data = container;
						var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
						trans.addDataFlavor(myChannel.contentType);
						trans.setTransferData(myChannel.contentType, wrapped, 0);
						var clipid = Components.interfaces.nsIClipboard;
						var clipboard = Components.classes["@mozilla.org/widget/clipboard;1"].getService(clipid);
						clipboard.setData(trans, null, clipid.kGlobalClipboard);
					});
				}
			}
			catch (e) {
				wdw_cardbooklog.updateStatusProgressInformation("wdw_imageEdition.copyImageCard error : " + e, "Error");
			}
		},

		clipboardSetText: function (aFlavor, aText, aMessage) {
			let ss = Components.classes['@mozilla.org/supports-string;1'].createInstance(Components.interfaces.nsISupportsString);
			let trans = Components.classes['@mozilla.org/widget/transferable;1'].createInstance(Components.interfaces.nsITransferable);
	
			let clipid = Components.interfaces.nsIClipboard;
			let clipboard   = Components.classes['@mozilla.org/widget/clipboard;1'].getService(clipid);
			if (!clipboard)
				return;
	
			ss.data = aText;
			trans.addDataFlavor(aFlavor);
			trans.setTransferData(aFlavor, ss, aText.length * 2);
			clipboard.setData(trans, null, clipid.kGlobalClipboard);
			
			if (aMessage != null && aMessage !== undefined && aMessage != "") {
				wdw_cardbooklog.updateStatusProgressInformation(aMessage);
			}
		},

		clipboardGetSupportedFlavors: function(aType) {
			var flavors = [];
			if (aType == "IMAGES") {
				flavors.push("image/jpeg");
				flavors.push("image/jpg");
				flavors.push("image/png");
				flavors.push("image/gif");
				flavors.push("application/x-moz-file");
				flavors.push("text/unicode");
				flavors.push("text/plain");
			} else if (aType == "CARDS") {
				flavors.push("text/x-moz-cardbook-id");
			}
			return flavors;
		},

		clipboardCanPaste: function(aType) {
            var flavors = cardbookClipboard.clipboardGetSupportedFlavors(aType);
            return Services.clipboard.hasDataMatchingFlavors(flavors, flavors.length, Services.clipboard.kGlobalClipboard);
		},

		clipboardGetData: function(aType) {
			var trans = Components.classes["@mozilla.org/widget/transferable;1"].createInstance(Components.interfaces.nsITransferable);
			var flavors = cardbookClipboard.clipboardGetSupportedFlavors(aType);
			for (i = 0; i < flavors.length; i++) {
				trans.addDataFlavor(flavors[i]);
			}
			Services.clipboard.getData(trans, Services.clipboard.kGlobalClipboard);

			var flavor = {};
			var data = {};
			var len = {};
			trans.getAnyTransferData(flavor, data, len);
			return { flavor: flavor.value, data: data.value, length: len.value }; 
		}
	};

	var loader = Services.scriptloader;
	loader.loadSubScript("chrome://cardbook/content/wdw_log.js");
};
