(() => {

  /**
   * Get value of a rule's property and remove surrounding parentheses, if present.
   * @param {CSSStyleRule} rule The CSSStyleRule, which to select from.
   * @param {String} propertyName The name/key which to select.
   * @returns {String} The contents of the given property, or empty if no such
   * rule exists.
   **/
  function getPureProperty(rule, propertyName) {
    const raw = rule.style.getPropertyValue(propertyName);
    return raw.trim().replace(/^\(([\s\S]*)\)$/g,'$1');
  }

  /**
   * Get the rule list for a given stylesheet
   *
   * @param {CSSStyleSheet} styleSheet The stylesheet in to get the rules from.
   * @returns {CSSRuleList} The rules of this stylesheet.
   */
  function ruleList(styleSheet) {
    try {
      return styleSheet.rules || styleSheet.cssRules;
    } catch (e) {
      if (e.name !== "SecurityError") throw e;
      return undefined;
    }
  }

  /**
   * Run all the CJSS rules in a stylesheet.
   * 
   * This will parse and execute properties `--html`, `--js` and `--data`.
   * 
   * @param {CSSStyleSheet} styleSheet The stylesheet to parse for CJSS rules.
   **/
  function cjss(styleSheet) {
    const rules = ruleList(styleSheet);
    for (const rule of rules || []) {
      // Handle imports recursively
      if (rule instanceof CSSImportRule) {
        try {
          const importedRules = rule.styleSheet.cssRules;
          if (importedRules) cjss(importedRules);
        } catch (e) {
          if (e.name !== "SecurityError") throw e;
        }
      }

      else if (rule instanceof CSSStyleRule) {
        const selector = rule.style.parentRule.selectorText;
        const elements = document.querySelectorAll(selector);

        const js = getPureProperty(rule, '--js');
        const html = getPureProperty(rule, '--html');
        const rawData = getPureProperty(rule, '--data');

        const data = rawData ? JSON.parse(`{ ${rawData} }`) : {};
        if (html) {
          const renderHTML = new Function('yield,data',
            `return \`${html}\`;`);
          for (const element of elements) {
            element.innerHTML = renderHTML(element.innerHTML, data);
          }
        }

        if (js) {
          const action = new Function('data', js);
          if (selector === 'script') action(data);
          else for (const element of elements) {
            action.call(element, data);
          }
        }
      }
    }
  }

  /**
   * Plug every stylesheet in the document into the cjss function.
   */
  function initialize() {
    for (const styleSheet of document.styleSheets) {
      cjss(styleSheet);
    }
  }

  document.addEventListener('DOMContentLoaded', initialize);
})();