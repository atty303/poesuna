(function () {
    "use strict";

    var trimPopupImage = function (wholeImageUrl, popupRect, callback) {
        var canvas, c, wholeImage;

        canvas = document.createElement('canvas');
        canvas.width = popupRect.width;
        canvas.height = popupRect.height;

        c = canvas.getContext('2d');

        wholeImage = new Image();
        wholeImage.onload = function () {
            c.drawImage(wholeImage,
                popupRect.left, popupRect.top, popupRect.width, popupRect.height,
                0, 0, popupRect.width, popupRect.height);
            callback(canvas.toDataURL('image/png'));
        };
        wholeImage.src = wholeImageUrl;
    };

    var captureMessageListener = function (request, sender, sendResponse) {
        chrome.tabs.captureVisibleTab(null, {format: "png"}, function (imageUrl) {
            trimPopupImage(imageUrl, request.popupRect, function (popupImageUrl) {
                sendResponse({ popupImageUrl: popupImageUrl });
            });
        });
        return true;
    };

    chrome.extension.onMessage.addListener(captureMessageListener);
}());
