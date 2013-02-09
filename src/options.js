
jQuery(function ($) {
    "use strict";

    var currentHotkey;

    var toStringHotkey = function (hotkey) {
        if (!hotkey) { return ''; }

        var keys = [];

        if (hotkey.shift) { keys.push("SHIFT"); }
        if (hotkey.ctrl) { keys.push("CTRL"); }
        if (hotkey.alt) { keys.push("ALT"); }
        if (hotkey.meta) { keys.push("META"); }

        keys.push("<" + hotkey.which + ">");

        return keys.join(" + ");
    };

    var restoreHotkey = function (hotkey) {
        $('#hotkey').val(toStringHotkey(hotkey));
    };

    $('#hotkey')
        .on("keydown", function (e) {
            currentHotkey = { shift: !!e.shiftKey, ctrl: !!e.ctrlKey, alt: !!e.altKey, meta: !!e.metaKey, which: e.which };
            restoreHotkey(currentHotkey);
        })
        .on("keyup keypress", function (e) {
            e.preventDefault();
        });

    $('#btn-save').on('click', function (e) {
        if (!currentHotkey) {
            return;
        }

        chrome.storage.sync.set({ 'hotkey': currentHotkey }, function () {
            $('#alert')
                .removeClass().addClass("alert alert-success")
                .html('<p>Saved.</p>')
                .show();
        });
    });

    $('#btn-cancel').on('click', function (e) {
        window.close();
    });

    $('#alert').hide();

    chrome.storage.sync.get("hotkey", function (items) {
        if (chrome.runtime.lastError) {
            $('#alert')
                .removeClass().addClass("alert alert-error")
                .html('<p>Could not save options. : ' + chrome.runtimeStyle.lastError.message + '</p>')
                .show();
            return;
        }

        currentHotkey = items.hotkey;
        restoreHotkey(currentHotkey);
    });
});