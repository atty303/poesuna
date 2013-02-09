(function ($) {
    "use strict";

    $(window).on("keyup", function (e) {
        var ItemPopupCapture, c;

        ItemPopupCapture = (function () {
            function klass() {
            }

            klass.prototype.capture = function () {
                var $popup, rect;

                $popup = this.findTargetPopup();
                if ($popup.length === 0) {
                    return;
                }

                rect = this.calcPopupRect($popup);

                $popup.css('background', '#000');
                window.setTimeout(function () {
                    chrome.extension.sendMessage({ popupRect: rect }, function (response) {
                        window.open(response.popupImageUrl);
                        $popup.css('background', '');
                    });
                }, 1000);
            };

            klass.prototype.findTargetPopup = function () {
                return $("#poe-popup-container div.itemPopupContainer").filter(":visible").not(".gemPopup").first();
            };

            klass.prototype.calcPopupRect = function ($popup) {
                var scrollLeft = $(document).scrollLeft(),
                    scrollTop = $(document).scrollTop(),
                    containerPos = $("#poe-popup-container").position(),
                    popupPos = $popup.position(),
                    popupMarginLeft = parseFloat($popup.css("margin-left")),
                    popupRect;

                popupRect = {
                    left: containerPos.left + popupPos.left + popupMarginLeft - scrollLeft,
                    top: containerPos.top + popupPos.top - scrollTop,
                    width: $popup.outerWidth(),
                    height: $popup.outerHeight()
                };

                return popupRect;
            };

            return klass;
        }());

        if (e.which === 67 && e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            c = new ItemPopupCapture();
            c.capture();
        }
    });
}(jQuery));
