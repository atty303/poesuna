(function ($) {
    "use strict";

    var hotkey;

    var ItemPopupCapture = (function () {
        function klass() {
        }

        klass.prototype.capture = function (opts) {
            var $popup, rect;

            $popup = this.findTargetPopup(opts.target);
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
            }, 100);
        };

        klass.prototype.findTargetPopup = function (target) {
            // #poe-popup-container にはページのライフタイムにおいて生成された全てのポップアップが含まれているが、
            // visible なポップアップは高々1つ〜2つしかない。
            var $visiblePopups = $("#poe-popup-container div.itemPopupContainer").filter(":visible");
            // ソケットされているジェムにカーソルを当てたとき、アイテムとジェム両方のポップアップが表示されるので、
            // どちらか片方のポップアップのみを対象とする。
            if ($visiblePopups.length > 1) {
                return ((target === 'gem') ? $visiblePopups.filter('.gemPopup') : $visiblePopups.not('.gemPopup')).first();
            }
            return $visiblePopups.first();
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

    chrome.storage.sync.get("hotkey", function (items) {
        if (chrome.runtime.lastError) { return; }

        hotkey = items.hotkey;
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        if (changes.hotkey && namespace === 'sync') {
            hotkey = changes.hotkey.newValue;
        }
    });

    $(document).on('dblclick', 'div.newItemContainer', function (e) {
        var c = new ItemPopupCapture();
        c.capture({ target: 'item' });
    });

/*
    $(document).on('dblclick', 'div.newItemContainer div.socketed', function (e) {
        var c = new ItemPopupCapture();
        c.capture({ target: 'gem' });
        e.stopPropagation();
    });
*/

    $(window).on("keyup", function (e) {
        var c;

        if (hotkey &&
            e.which === hotkey.which &&
            !!e.shiftKey === hotkey.shift &&
            !!e.ctrlKey === hotkey.ctrl &&
            !!e.altKey === hotkey.alt &&
            !!e.metaKey === hotkey.meta) {

            c = new ItemPopupCapture();
            c.capture({ target: 'item' });
        }
    });
}(jQuery));
