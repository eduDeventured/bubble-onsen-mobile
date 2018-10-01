var appURL = "https://onsen-adri-test.bubbleapps.io/hbmtest";
const LOCALDIR = 'local/';
const LOCALPROJDIR = LOCALDIR + 'www/';
var oldIndex;

var indexOb

function initialize() {

    //TODO INSERT FLAG HERE TO AVOID RUNNING WHEN 
    // alert("initializing")
    // alert(cordova.file.dataDirectory + LOCALPROJDIR)
    // listDir(cordova.file.dataDirectory + LOCALPROJDIR + "js")
    // listDir(cordova.file.dataDirectory + LOCALPROJDIR + "css")
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(rootDir) {
    	rootDir.getDirectory(LOCALDIR, {create: true}, function(localDir) {
    		localDir.getDirectory('www', {}, function(dir) {
    			dir.getFile("index.html", {}, function(fileEntry) {
				// dir.getFile("index.html", {create:true}, function(fileEntry) {
			      // alert("found the file entry");
			      indexOb = fileEntry;
			      // alert(indexOb.fullPath)
			      readFile(fileEntry, function(result) {
			        oldIndex = result;
			        getFileFromServer(appURL, function(newIndex) {
			        	alert("downloaded new index file")
			        	if (!checkForUpdatesFromFiles(oldIndex, newIndex)) {
			        		alert("yes updates")
			        		downloadAllAssets(newIndex, function(jsDownloaded, cssDownloaded) {
			        			alert(jsDownloaded.length + " js files downloaded\n " + cssDownloaded.length + " css files downloaded");
			        			saveInRestDb(newIndex, "new index (before renameAssetsWithHashesOnIndex)")
			        			var cleanIndex = renameAssetsWithHashesOnIndex(newIndex, jsDownloaded, cssDownloaded);
			        			saveInRestDb(cleanIndex, "after renameAssetsWithHashesOnIndex")
			        			injectAssetsOnIndexFile(indexOb, cleanIndex)
			        		});
			        	} else {
			        		if (window.location.href.indexOf(LOCALPROJDIR + "index.html") != -1) {
			        			alert("NO UPDATES!!");	
			        		} else {
			        			restartCordovaApp();
			        		}
			        		
			        	}
			        })
			        
			        // console.log("new indexOb", indexOb)
			      })
			    }, function(err) {
			    	alert(err.code)
			    	copyAppToLocal()
			    });
    		}, function(err) {
		    	// alert("error getting folder!!!!")
		    	// alert(err.code)
		    	if (err.code == 1) {
		    		copyAppToLocal()
		    	} else {
		    		console.log("something went wrong")
		    	}
		    })
    	})
    })

}

function copyAppToLocal() {
	window.resolveLocalFileSystemURL(cordova.file.applicationDirectory, function(appDir) {
		// alert(appDir.fullPath);
		var destination = cordova.file.dataDirectory,
			name = "local";
		// alert("about to copy folder")
		copyDir(appDir, destination, name, initialize, fail);
	})
}

function finalize() {
	//set local storage variable to "complete"
}

function restartCordovaApp() {
	//TODO CHECK HERE TO RUN ONLY WHEN UPDATED
	alert("about to restart cordova")
	window.open(cordova.file.dataDirectory + LOCALPROJDIR + "index.html");
	// window.location = cordova.file.dataDirectory + LOCALPROJDIR + "index.html";
	// navigator.app.exitApp();
 //   	navigator.app.loadUrl(cordova.file.dataDirectory + LOCALPROJDIR + "index.html", {wait:2000, loadingDialog:“Wait,Loading App”, loadUrlTimeoutValue: 60000});

}

function downloadAssets(newJsFiles, newCssFiles, successCallback) {
	// alert("about to update assets")
	downloadFilesFromListOfURLs(newJsFiles, LOCALPROJDIR + 'js', 'js', function(jsFilesDownloaded) {
		downloadFilesFromListOfURLs(newCssFiles, LOCALPROJDIR + 'css', 'css', function(cssFilesDownloaded) {
			// alert("JS files downloaded: " + jsFilesDownloaded.length)
			// alert("CSS files downloaded: " + cssFilesDownloaded.length)
			// var newFormatedIndex = formatNewIndexFile(file, jsFilesDownloaded, oldJsFiles, cssFilesDownloaded, oldCssFiles);
			successCallback(jsFilesDownloaded, cssFilesDownloaded)
		});
	});
}

function checkForUpdatesFromLists(oldList, newList) {
	listToUpdate = [];
	newList.forEach(function(asset){
		if (oldList.indexOf(asset) == -1) {
			if (asset.indexOf("http") == 0) {	// Only returning valid links
				listToUpdate.push(asset);
			}
		}
	});
	return listToUpdate;
}

function formatListToDownload(oldList) {
	var formatedList = [];
	oldList.forEach(function(asset) {
		if (asset.indexOf("http") == 0) {
			formatedList.push({url: asset});
		}
	})
}

function getFileNames(str, type) {
	var start, end, stop, typeStop, filenames;
	start = 0;
	filenames = [];
  	var elType = getElementTagType(type);
  	// saveInRestDb(JSON.stringify(elType), "get files for: " + type)
	// var expresion = getElementTagType(type);
  // console.log(expresion)
  // filenames = expresion.exec(str)
  console.log(JSON.stringify(elType));
	while (start != -1) {
		start = str.indexOf(elType.tag, start);
		if (start == -1) {break;}
		stop = str.indexOf('>', start);
		if (elType.type) {
			typeStop = str.indexOf(elType.type, start)
			console.log("ENTERING TYPE STOP \n typeStop: " + typeStop + "\n stop: " + stop)
			if (typeStop == -1 || typeStop > stop) {
				start = stop;
				continue;
			}	//ensures that the tag is the correct type ex. text/css	
		}
		
		start = str.indexOf(elType.source, start);
		if (start == -1) {
			console.log("ENTERING SOURCE \n typeStop: " + typeStop + "\n stop: " + stop)
			start = stop;
			continue;
		}
		var oldStart = start
		start = str.indexOf('"', start) + 1;
		if (start == 0 || start > stop) {
			start = str.indexOf("'", oldStart) + 1;
			if (start == 0 || start > stop) {
				start = stop;
				continue;
			}
			console.log("Entering start with ' ")
		}
		end = str.indexOf('"', start);
		if (end == -1 || end > stop) {
			end = str.indexOf("'", start);
			if (end > stop){
				start = stop;
				continue;
			}
			console.log("Entering end with ' ")
		}
		filenames.push(str.substring(start, end));
	}
  // console.log(filenames);
  // filenames.forEach(function(itm){console.log(itm)})
	return filenames;
}

function getFileFromServer(url, successCallback) {
  var tempIndexPath = 'www/temp/index.html';
  downloadFileFromURL(url, tempIndexPath, successCallback)
}

function isValidCssUrl(url) {
	return (url.indexOf("http") == 0)
}

function isValidJsUrl(url) {
	return (url.indexOf("http") == 0)
}

function getValidUrls(urlList, type) {
	var validUrlList = [];
	var invalidUrlList = [];
	var isValid = type == "css" ? isValidCssUrl : isValidJsUrl
	alert(urlList.join(" ----- "))
	urlList.forEach(function(url) {
		alert("LOOOOOOK AT MEEEEEE")
		if (isValid(url)) {
			validUrlList.push(url);
		} else {
			invalidUrlList.push(url);
		}
	})
	// TODO FIND WHERE TO LOG THESE OR SEND TO 
	console.log("List on invalid URLs:\n" + invalidUrlList);
	saveInRestDb(invalidUrlList.join(" --- "), "invalidUrlList");
	return validUrlList;
}

function getFileNamesFromResult(newIndex, downloadAll) {
  	// $.get("index.html", function(oldIndex) {
  		// alert("OLD INDEX BEFORE COMPARING:::\n" + oldIndex)
  		var newJsFiles = getFileNames(newIndex, 'js');
		var newCssFiles = getFileNames(newIndex, 'css');


		var oldJsFiles = getFileNames(oldIndex, 'js').concat(getFileNames(oldIndex, 'newjs'));
		var oldCssFiles = getFileNames(oldIndex, 'css').concat(getFileNames(oldIndex, 'newcss'));
		// alert("New JS files \n" + newJsFiles)
		// alert("Old JS files \n" + oldJsFiles)
		// alert("New CSS files \n" + newCssFiles)
		// alert("OLD CSS files \n" + oldCssFiles)


		//TODO WE CAN OVERRIDE SOME VARIABLES INSTEAD OF CREATING NEW ONES
		var jsFiles, jsFilesToReplace, cssFiles, cssFilesToReplace;

		if (downloadAll) {
			jsFiles = getValidUrls(newJsFiles, 'js');
			jsFilesToReplace = getValidUrls(oldJsFiles, 'js');
			cssFiles = getValidUrls(newCssFiles, 'css');
			cssFilesToReplace = getValidUrls(oldCssFiles, 'css');
		} else {
			jsFiles = getValidUrls(checkForUpdatesFromLists(oldJsFiles, newJsFiles), 'js');
			jsFilesToReplace = getValidUrls(checkForUpdatesFromLists(newJsFiles, oldJsFiles), 'js');
			cssFiles = getValidUrls(checkForUpdatesFromLists(oldCssFiles, newCssFiles), 'css');
			cssFilesToReplace = getValidUrls(checkForUpdatesFromLists(newCssFiles, oldCssFiles), 'css');
		}

		saveInRestDb(newJsFiles.join(" --- "), "newJsFiles");
		saveInRestDb(newCssFiles.join(" --- "), "newCssFiles");
		saveInRestDb(oldJsFiles.join(" --- "), "oldJsFiles");
		saveInRestDb(oldCssFiles.join(" --- "), "oldCssFiles");
		saveInRestDb(jsFiles.join(" --- "), "JsFiles");
		saveInRestDb(jsFilesToReplace.join(" --- "), "jsFilesToReplace");
		saveInRestDb(cssFiles.join(" --- "), "cssFiles");
		saveInRestDb(cssFilesToReplace.join(" --- "), "cssFilesToReplace");


		console.log("JS FILES")
	    console.log(jsFiles)
	    alert("LIST OF NEW JS FILES: \n" + jsFiles)
	    console.log("CSS FILES")
		console.log(cssFiles)
		alert("LIST OF NEW CSS FILES: \n" + cssFiles)
		if (jsFiles.length > 0 || cssFiles.length > 0 ) {
			downloadAssets(jsFiles, cssFiles, function(newJsFilesObj, newCssFilesObj) {
				saveInRestDb(oldIndex, "Old index - " + indexOb.fullPath)
				var newFormatedIndex = formatNewIndexFile(oldIndex, newJsFilesObj, jsFilesToReplace, newCssFilesObj, cssFilesToReplace);
				saveInRestDb(newFormatedIndex, "Formated index")
				if (newFormatedIndex.indexOf("!!isOld!!") == -1) {
					newFormatedIndex += "<!-- !!isOld!! -->"
				}
			    alert("THE FORMATED NEW INDEX \n" + newFormatedIndex);
			    window.resolveLocalFileSystemURL(cordova.file.dataDirectory + LOCALDIR + "www", function(dir) {
				    dir.getFile("index.html", {}, function(fileEntry) {
				    	// alert("FOUND THE INDEX.HTML INSIDE THE LOCAL: " + fileEntry.fullPath)
					    writeFile(fileEntry, newFormatedIndex, function() {
					    	saveInRestDb(newFormatedIndex, fileEntry.fullPath)
					    	restartCordovaApp();
					    });
					})
				})
			})
		} else {
			// alert("No changes, hurray!!!");
			// alert(indexOb.fullPath)
			readFile(indexOb, alert)
			if (indexOb.fullPath != '/local/www/index.html'){
				restartCordovaApp();	
			} else {
				alert("Page is up to date!")
			}
			
			return;
		}
  	// })
	

}

function formatNewIndexFile(file, newJsFiles, oldJsFiles, newCssFiles, oldCssFiles) {
	var insertPosition;
	var cleanFile = file;
	//TODO FIX HERE FIX HERE FIX HERE GETTING INDEX -1 WHEN THERE ARE NO UPDATES
	oldJsFiles.forEach(function(url) {
		if (isRemovableAsset(url)) {
			var position = cleanFile.indexOf(url);
			var start = cleanFile.lastIndexOf("<script", position);
			insertPosition = insertPosition || start;
			var end = cleanFile.indexOf("/script>", position) + 8; //length of /script>
			cleanFile = removeSubstring(cleanFile, start, end);
		}
	})
	insertPosition = insertPosition == -1 ? file.indexOf("</head") : insertPosition;
	saveInRestDb(cleanFile, "after removing old js")
	// alert("inserting JS in..." + insertPosition)
	newJsFiles.reverse().forEach(function(asset) {
		cleanFile = appendLineInPosition(cleanFile, getScriptTag('js/' + asset.name, asset.url), insertPosition);
	})
	saveInRestDb(cleanFile, "after adding new js")
	insertPosition = null;
	oldCssFiles.forEach(function(url) {
		if (isRemovableAsset(url)) {
			var position = cleanFile.indexOf(url);
			var start = cleanFile.lastIndexOf("<link", position);
			insertPosition = insertPosition || start;
			var end = cleanFile.indexOf(">", position) + 1; //length of /script>
			cleanFile = removeSubstring(cleanFile, start, end);
		}
	})
	saveInRestDb(cleanFile, "after removing old css")
	insertPosition = insertPosition == -1 ? file.indexOf("</head") : insertPosition;
	// alert("inserting CSS in..." + insertPosition)
	newCssFiles.reverse().forEach(function(asset) {
		cleanFile = appendLineInPosition(cleanFile, getLinkTag('css/' + asset.name, asset.url), insertPosition);
	})
	saveInRestDb(cleanFile, "after adding new css")
	// alert("CLEAN FILE IS: \n" + cleanFile)
  console.log("CLEAN FILE IS: \n" + cleanFile)
	return cleanFile;
}

function isRemovableAsset(asset) {
	var staticAssets = ["js/assets-checker.js", "components/loader.js"],	//LIST OF STATIC ASSETS
		isRemovable = true
	staticAssets.forEach(function(staticAsset) {
		if (asset.indexOf(staticAsset) != -1) {
			isRemovable = false;
			return isRemovable;
		}
	})
	return isRemovable;
}

function appendLineInPosition(file, str, position) {
	return [file.slice(0, position), str, file.slice(position)].join('\n');
}

function removeSubstring(str, start, end) {
	return str.replace(str.substring(start, end), '');
}

function getScriptTag(source, url) {
	var tag = '<script type="text/javascript" class="LOOOOOOK AT MEEEEEE" data-js-url="' + url + '" src="' + source + '"></script>';
	// alert(tag);
	return tag;
}

function getLinkTag(source, url) {
	var tag = '<link type="text/css" class="LOOOOOOK AT MEEEEEE" data-css-url="' + url + '" href="' + source + '" rel="stylesheet">';
	// alert(tag);
	return tag;
}

function listDir(path){
  window.resolveLocalFileSystemURL(path,
    function (fileSystem) {
      var reader = fileSystem.createReader();
      reader.readEntries(
        function (entries) {
        	// alert("about to show list of entries")
        	entries.forEach(function(entry){
        		//DELETE DELETE DELETE
        		if (entry.name.indexOf("js") == 0) {
        			readFile(entry, function(str) {
        				// alert("TEXT FROM FILE: " + entry.name + " \n \n" + str)
        			})
        		}
        		// alert(entry.fullPath)
        	})
        	alert(entries)
          console.log(entries);
        },
        function (err) {
        	// alert(err)
          console.log(err);
        }
      );
    }, function (err) {
    	// alert(err)
      console.log(err);
    }
  );
}
//example: list of www/ folder in cordova/ionic app.
// listDir(cordova.file.applicationDirectory + "www/");

function getElementTagType(type) {
	var result;
	switch(type) {
		case 'newjs':
      // result = /(?<=<script (.*)src=")(.*?)(?="(.*)>)/g
			result = {
				tag: '<script',
				source: 'data-js-url'
			}
			break;
		case 'newcss':
      // result = /(?<=<link (.*)href=")(.*?)(?="(.*)>)/g
			result = {
				tag: '<link',
				source: 'data-css-url',
				type: 'stylesheet'
			}
			break;
		case 'js':
      // result = /(?<=<script (.*)src=")(.*?)(?="(.*)>)/g
			result = {
				tag: '<script',
				source: 'src'
			}
			break;
		case 'css':
      // result = /(?<=<link (.*)href=")(.*?)(?="(.*)>)/g
			result = {
				tag: '<link',
				source: 'href',
				type: 'stylesheet'
			}
			break;
		default:
      // result = /(?<=<script (.*)src=")(.*?)(?="(.*)>)/g
			result = {
				tag: '<script',
				source: 'src'
			}
	}
	return result;
}

// FILE MANAGER
function downloadFilesFromListOfURLs(list, destination, type, successCallback) {
	var filesToDownload = 0;
	var filesToOmit = 0;
	var filesNotDownloaded = 0;
	var filesDownloaded = [];
	if (list.length == 0) {
		successCallback(filesDownloaded);
	} else {
		list.forEach(function(url) {
			if (url.indexOf("http") == 0) {
				alert("about to download:\n" + url)
				var hashedFileName = type + hashString(url) + "." + type;
				var file = downloadFileFromURL(url, destination + "/" + hashedFileName, function(newFile) {
					filesToDownload += 1;
					// alert("path of downloaded file: " + newFile)
					// alert("Downloads: " + filesToDownload)
					filesDownloaded.push({
						url: url, 
						name: hashedFileName, 
						path: destination.replace(LOCALPROJDIR, '') + '/'
					})
					if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
						// alert(filesToDownload + " downloads complete")
						successCallback(filesDownloaded);
					}
				}, function(error) {
					filesNotDownloaded += 1;
					alert("error downloading \n" + url)
					if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
						// alert(filesToDownload + " downloads complete")
						successCallback(filesDownloaded);
					}
				});
			} else {
				filesToOmit += 1;
				alert("ommiting file \n" + url)
				if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
					// alert(filesToDownload + " downloads complete")
					successCallback(filesDownloaded);
				}
			}
			//TODO do not replace the js or css file, use the hash as a filename use early_js as folder and file inside it(cache issues)
		})
	}
}

function hashString(str) {
	var hash = 0, i, chr;
	if (str.length === 0) return hash;
	for (i = 0; i < str.length; i++) {
		chr   = str.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	// alert("Hashed string is: " + hash)
	return hash;
}

function downloadFileFromURL(webUrl, localUrl, successCallback, errorCallback) {
	var fileTransfer = new FileTransfer();
	var uri = encodeURI(webUrl);

	fileTransfer.download(
	    uri,
	    cordova.file.dataDirectory + localUrl,
	    function(entry) {
	        console.log("download complete: " + entry.toURL());
	        alert("Download complete")
          entry.file(
            function(file){
              var fileReader = new FileReader();
              fileReader.onloadend = function(evt) {
                successCallback(evt.target.result);
              }
              fileReader.readAsText(file);
            },
            function(err){
              console.log(err);
            },
            )
	    },
	    function(error) {
	    	// alert("Error downloading '" + error.source + "', please try again")
	        console.log("download error source " + error.source);
	        console.log("download error target " + error.target);
	        console.log("download error code" + error.code);
	        if (errorCallback) {
	        	errorCallback(error)
	        }
	    },
	    false,
	    {
	        headers: {
	            "Authorization": "Basic dGVzdHVzZXJuYW1lOnRlc3RwYXNzd29yZA=="
	        }
	    }
	);
}

function getFileFromLocal(path, successCallback) {
  
}

function fail(e) {
	console.log("FileSystem Error");
	// alert("fail callback")
  // alert(e.code)
	console.dir(e);
}

function writeFile(fileEntry, str, successCallback) {
    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function (fileWriter) {

        fileWriter.onwriteend = function() {
            console.log("Successful file write...");
            // alert("success writing file::::::");
            // readFile(fileEntry, alert);
            successCallback();
        };

        fileWriter.onerror = function (e) {
          // alert("error writing file:    " + e)
          console.log("Failed file write: " + e.toString());
          console.log(e)
        };

        var dataObj = new Blob([str], { type: 'text/plain' });
        // readBlob(dataObj, alert);

        fileWriter.write(dataObj);
    });
}

function readFile(fileEntry, successCallback) {

	fileEntry.file(function(file) {
		var reader = new FileReader();

		reader.onloadend = function(e) {
			// console.log("Text is: _____________________ \n"+this.result);
			// console.log("END OF FILE")
      		successCallback(this.result);
      		// alert(this.result.length)
		}

		reader.readAsText(file);
	});

}

//TODO CHECK WHAT NAMES WHEN DOWNLOADED
function renameFileListToHash(currentName, currentDir, newName, successFunction) {

    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function (fileSystem) {

        fileSystem.root.getFile(currentDir + currentName, null, function (fileEntry) {
            fileSystem.root.getDirectory(currentDir, {create: true}, function (dirEntry) {
                parentEntry = new DirectoryEntry(currentName, currentDir + currentName);

                fileEntry.moveTo(dirEntry, newName, function () {

                    successFunction();

                }, renameFail);
            }, renameFail);
        }, renameFail);

    }, renameFail);
}

function readBlob(blob, successCallback) {
	var reader = new FileReader();

	reader.onloadend = function(e) {
	  	var text = e.srcElement.result;
	  	// alert("reading BLOB..")
		successCallback(text);
		// alert(text.length)
	};

	// Start reading the blob as text.
	reader.readAsText(blob);
}

function copyDir(entry, path, folderName, success, failed) {
    window.resolveLocalFileSystemURL(path, function(parentEntry) {
    	// alert(parentEntry.fullPath);
	    // copy the directory to a new directory and rename it
	    entry.copyTo(parentEntry, folderName, function() {
	    	// alert("copy success");
	    	success()
	    }, failed);
    })
    
}

function saveInRestDb(html, url) {
	var jsondata = {"html": html,"path": url, "timestamp": new Date(Date.now())};
	var settings = {
	  "async": true,
	  "crossDomain": true,
	  "url": "https://monaca-704a.restdb.io/rest/index",
	  "method": "POST",
	  "headers": {
	    "content-type": "application/json",
	    "x-apikey": "378938abda797b473c6ca8f1b88e64a3113db",
	    "cache-control": "no-cache"
	  },
	  "processData": false,
	  "data": JSON.stringify(jsondata)
	}

	alert("about to save " + url + " in restDB")

	$.ajax(settings).done(function (response) {
		alert(response);
	});
}

//TODO what to call before downloadAllAssets

function checkForUpdatesFromFiles(oldIndexStr, newIndexStr) {
	var oldJsFiles = getFileNames(oldIndexStr, 'js').concat(getFileNames(oldIndexStr, 'newjs'));
	var oldCssFiles = getFileNames(oldIndexStr, 'css').concat(getFileNames(oldIndexStr, 'newcss'));

	var newJsFiles = getFileNames(newIndexStr, 'js');
	var newCssFiles = getFileNames(newIndexStr, 'css');


	alert("JS Files to be downloaded: " + newJsFiles.toString());
	alert("\n CSS Files to be downloaded: " + newCssFiles.toString());

	var jsUpdates = checkForUpdatesFromLists(oldJsFiles, newJsFiles);
	var cssUpdates = checkForUpdatesFromLists(oldCssFiles, newCssFiles);

	return (jsUpdates.length == 0 && cssUpdates.length == 0)
}

function downloadAllAssets(indexStr, successCallback) {
	var jsFiles = getFileNames(indexStr, 'js');
	var cssFiles = getFileNames(indexStr, 'css');
	alert("JS Files to be downloaded: " + jsFiles.toString());
	alert("\n CSS Files to be downloaded: " + cssFiles.toString());
	downloadAssets(jsFiles, cssFiles, successCallback)
}

function renameAssetsWithHashesOnIndex(indexStr, jsDownloaded, cssDownloaded) {
	var cleanFile = indexStr;
	jsDownloaded.forEach(function(asset) {
		cleanFile = replaceOldAssetWithNewTag(cleanFile, asset, 'js')
	})
	cssDownloaded.forEach(function(asset) {
		cleanFile = replaceOldAssetWithNewTag(cleanFile, asset, 'css')
	})
	return cleanFile;
}

function replaceOldAssetWithNewTag(indexStr, asset, type) {
	var tagType = getTagType(type);
	var position = indexStr.indexOf(asset.url);
	var start = indexStr.lastIndexOf(tagType.tagStart, position);
	var end = indexStr.indexOf(tagType.tagEnd, position) + tagType.tagEnd.length;
	indexStr = removeSubstring(indexStr, start, end);
	indexStr = appendLineInPosition(indexStr, tagType.generateFunction(asset.path + asset.name, asset.url), start);
	return indexStr
}

function getTagType(type) {
	switch(type) {
		case 'js':
			result = {
				tagStart: '<script',
				tagEnd: '/script>',
				generateFunction: getScriptTag
			}
			break;
		case 'css':
			result = {
				tagStart: '<link',
				tagEnd: '>',
				generateFunction: getLinkTag
			}
			break;
		default:
			result = {
				tagStart: '<script',
				tagEnd: '/script>',
				generateFunction: getScriptTag
			}
	}
	return result;
}

function injectAssetsOnIndexFile(entry, newIndex) {
	var newInjectedIndex = newIndex;
	var listOfAssetsToInject = getListOfAssetsToInject();
	var injectPosition = getInjectPosition(newInjectedIndex);
	listOfAssetsToInject.forEach(function(asset) {
		newInjectedIndex = appendLineInPosition(newInjectedIndex, asset, injectPosition);
	});
	saveInRestDb(newInjectedIndex, "new index after injection")
	writeFile(entry, newInjectedIndex, restartCordovaApp)
}

function getListOfAssetsToInject() {
	return ['<script type="text/javascript" src="js/assets-checker.js"></script>',
			'<script type="text/javascript">  window.web_url_equivalent_for_phonegap = "https://onsen-adri-test.bubbleapps.io/mbtest"</script>',
			'<script src="components/loader.js"></script>']
}

function getInjectPosition(indexStr) {
	return indexStr.indexOf("</title>") + 8
}

document.addEventListener("deviceready", initialize, false);