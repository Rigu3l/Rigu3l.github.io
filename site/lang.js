// English-only build. The reference engine uses L("ukrainian", "english") in a
// lot of places (canvas captions, OS dialogs, hints), so keep that API but always
// return the English string. All page copy now lives directly in the HTML.
(function () {
  document.documentElement.lang = "en";
  window.HW_LANG = "en";
  window.L = (uk, en) => en;
  // legacy hook called by the original template; nothing to translate any more
  window.hwApplyLang = () => {};
})();
