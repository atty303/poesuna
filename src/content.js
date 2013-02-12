(function ($) {
    "use strict";

    var hotkey;

    var ItemPopupCapture = (function () {
        function klass() {
        }

        klass.prototype.capture = function (opts) {
            var self = this, $popup, rect;

            $popup = this.findTargetPopup(opts.target);
            if ($popup.length === 0) {
                return;
            }

            rect = this.calcPopupRect($popup);

            this.preparePageBeforeCapture($popup);

            // ページのスタイルを変更した後、少し待ってからキャプチャを開始する。
            // ウェイトが無い(タイムアウトを 0 に設定、または setTimeout しない)と、スタイル変更前の状態がキャプチャされることがある。
            // ウェイト無しで確実にキャプチャできる方法があれば取り入れたい。
            window.setTimeout(function () {
                chrome.extension.sendMessage({ popupRect: rect }, function (response) {
                    self.cleanupPageAfterCapture($popup);

                    window.open(response.popupImageUrl);
                });
            }, 100);
        };

        klass.prototype.blockPopupActivityHandler = function (e) {
            e.stopPropagation();
        };

        /*
         * キャプチャの前に必要なページに対する準備を行う。
         *
         * - ポップアップの背景が半透明になっており、そのままキャプチャするとインベントリが透けて不恰好なので、背景を不透明の黒に変更する。
         * - ページ内要素全ての mouseover/mouseout イベントを無効化する。
         *   これにより、キャプチャ開始待ちの間にカーソルが動かされることで、キャプチャ対象のポップアップが閉じてしまうことを防ぐ。
         */
        klass.prototype.preparePageBeforeCapture = function ($popup) {
            $popup.css('background', '#000');

            // これはイベントをキャプチャしているためか、ページコンテキストで実行しなくとも、ページ側のイベントハンドラの実行を防げる。
            document.addEventListener('mouseover', this.blockPopupActivityHandler, true);
            document.addEventListener('mouseout', this.blockPopupActivityHandler, true);
        };

        /*
         * キャプチャの後に必要なページに対する後始末を行う。
         *
         * - preparePageBeforeCapture で行った変更を元に戻す。
         * - キャプチャ開始待ちの間にカーソルをアイテム外へ動かした場合、キャプチャ完了後にもポップアップが表示されたままになっているが、
         *   そのまま別のアイテムにカーソルを合わせると、ポップアップが多重表示されて不恰好なことになるため、
         *   キャプチャ完了時点で開いていたポップアップは全て閉じる。
         *   カーソルをアイテムに載せたままでもポップアップが閉じてしまうが、キャプチャ完了時には別タブが開いて現ページは見えなくなり、
         *   別タブから現ページに表示を切り替える頃にはカーソルは移動しているであろうから、違和感はない。
         */
        klass.prototype.cleanupPageAfterCapture = function ($popup) {
            $popup.css('background', '');

            document.removeEventListener('mouseover', this.blockPopupActivityHandler, true);
            document.removeEventListener('mouseout', this.blockPopupActivityHandler, true);

            this.closeActivePopups();
        };

        /*
         * 全てのポップアップを閉じる。
         *
         * 全てのアイテム要素の mouseout イベントを発生させることで、アイテムからカーソルを外すことでポップアップが閉じる動作をシミュレートする。
         * Content Script の実行コンテキストでイベントを trigger してもページ由来のイベントハンドラは実行されないことに注意する。
         * また、ページに jQuery がロードされていることを前提としている。
         */
        klass.prototype.closeActivePopups = function () {
            this.runScriptInPageContext(["jQuery('div.newItemContainer').add('div.socketed').trigger('mouseout');"]);
        };

        /*
         * JSコードをページ本来のJS環境で実行する。
         *
         * http://stackoverflow.com/questions/9515704/building-a-chrome-extension-inject-code-in-a-page-using-a-content-script
         */
        klass.prototype.runScriptInPageContext = function (lines) {
            var actualCode = lines.join('\n'),
                script = document.createElement('script');
            script.textContent = actualCode;
            (document.head || document.documentElement).appendChild(script);
            script.parentNode.removeChild(script);
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
