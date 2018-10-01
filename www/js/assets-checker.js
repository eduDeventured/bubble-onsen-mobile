var appURL = "https://onsen-adri-test.bubbleapps.io/hbmtest";
const LOCALDIR = 'local/';
const LOCALPROJDIR = LOCALDIR + 'www/';
var oldIndex;

var indexOb

function initialize() {
    window.resolveLocalFileSystemURL(cordova.file.dataDirectory, function(rootDir) {
    	rootDir.getDirectory(LOCALDIR, {create: true}, function(localDir) {
    		localDir.getDirectory('www', {}, function(dir) {
    			dir.getFile("index.html", {}, function(fileEntry) {
			      indexOb = fileEntry;
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
			        
			      })
			    }, function(err) {
			    	alert(err.code)
			    	copyAppToLocal()
			    });
    		}, function(err) {
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
		var destination = cordova.file.dataDirectory,
			name = "local";
		copyDir(appDir, destination, name, initialize, fail);
	})
}

function restartCordovaApp() {
	alert("about to restart cordova")
	window.open(cordova.file.dataDirectory + LOCALPROJDIR + "index.html");

}

function downloadAssets(newJsFiles, newCssFiles, successCallback) {
	downloadFilesFromListOfURLs(newJsFiles, LOCALPROJDIR + 'js', 'js', function(jsFilesDownloaded) {
		downloadFilesFromListOfURLs(newCssFiles, LOCALPROJDIR + 'css', 'css', function(cssFilesDownloaded) {
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

function getFileNames(str, type) {
	var start, end, stop, typeStop, filenames;
	start = 0;
	filenames = [];
  	var elType = getElementTagType(type);
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
			}	//ensures that the tag is the correct type ex. stylesheet
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
	return filenames;
}

function getFileFromServer(url, successCallback) {
  var tempIndexPath = 'www/temp/index.html';
  downloadFileFromURL(url, tempIndexPath, successCallback)
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
	var tag = '<script type="text/javascript" data-js-url="' + url + '" src="' + source + '"></script>';
	// alert(tag);
	return tag;
}

function getLinkTag(source, url) {
	var tag = '<link type="text/css" data-css-url="' + url + '" href="' + source + '" rel="stylesheet">';
	return tag;
}

//LEAVE THISE FOR FUTURE CONTROL OF FOLDERS
function listDir(path){
  window.resolveLocalFileSystemURL(path,
    function (fileSystem) {
      var reader = fileSystem.createReader();
      reader.readEntries(
        function (entries) {
          console.log(entries);
        },
        function (err) {
          console.log(err);
        }
      );
    }, function (err) {
      console.log(err);
    }
  );
}

function getElementTagType(type) {
	var result;
	switch(type) {
		case 'newjs':
			result = {
				tag: '<script',
				source: 'data-js-url'
			}
			break;
		case 'newcss':
			result = {
				tag: '<link',
				source: 'data-css-url',
				type: 'stylesheet'
			}
			break;
		case 'js':
			result = {
				tag: '<script',
				source: 'src'
			}
			break;
		case 'css':
			result = {
				tag: '<link',
				source: 'href',
				type: 'stylesheet'
			}
			break;
		default:
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
					filesDownloaded.push({
						url: url, 
						name: hashedFileName, 
						path: destination.replace(LOCALPROJDIR, '') + '/'
					})
					if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
						successCallback(filesDownloaded);
					}
				}, function(error) {
					filesNotDownloaded += 1;
					alert("error downloading \n" + url)
					if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
						successCallback(filesDownloaded);
					}
				});
			} else {
				filesToOmit += 1;
				alert("ommiting file \n" + url)
				if (list.length == filesToDownload + filesToOmit + filesNotDownloaded) {
					successCallback(filesDownloaded);
				}
			}
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

function fail(e) {
	console.log("FileSystem Error");
	console.dir(e);
}

function writeFile(fileEntry, str, successCallback) {
    fileEntry.createWriter(function (fileWriter) {

        fileWriter.onwriteend = function() {
            console.log("Successful file write...");
            successCallback();
        };

        fileWriter.onerror = function (e) {
          console.log("Failed file write: " + e.toString());
          console.log(e)
        };

        var dataObj = new Blob([str], { type: 'text/plain' });

        fileWriter.write(dataObj);
    });
}

function readFile(fileEntry, successCallback) {

	fileEntry.file(function(file) {
		var reader = new FileReader();

		reader.onloadend = function(e) {
      		successCallback(this.result);
		}

		reader.readAsText(file);
	});

}

function copyDir(entry, path, folderName, success, failed) {
    window.resolveLocalFileSystemURL(path, function(parentEntry) {
	    // copy the directory to a new directory and rename it
	    entry.copyTo(parentEntry, folderName, function() {
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