/**
 * Counter.js - Drop-in replacement for busuanzi.pure.mini.js
 * Compatible with existing busuanzi DOM elements and bszCaller API.
 */
;(function () {
  if (typeof window === "undefined") return

  // Determine API base URL automatically from currentScript src or data-api
  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script")
      return scripts[scripts.length - 1]
    })()

  var apiBase = ""
  if (currentScript) {
    if (currentScript.getAttribute && currentScript.getAttribute("data-api")) {
      apiBase = currentScript.getAttribute("data-api")
    } else if (currentScript.src) {
      var a = document.createElement("a")
      a.href = currentScript.src
      apiBase = a.protocol + "//" + a.host
    }
  }

  var tag = {
    keys: ["site_pv", "page_pv", "site_uv", "page_uv"],
    bszs: ["site_pv", "page_pv", "site_uv", "page_uv"],
    texts: function (data) {
      if (!data) return
      var keys = (this && (this.keys || this.bszs)) || ["site_pv", "page_pv", "site_uv", "page_uv"]
      keys.forEach(function (key) {
        if (data[key] !== undefined) {
          var selector =
            '[data-counter="' + key + '"], ' +
            '[data-counter-value="' + key + '"], ' +
            '#counter_value_' + key + ', ' +
            '.counter_value_' + key + ', ' +
            '#busuanzi_value_' + key + ', ' +
            '[data-busuanzi-value="' + key + '"]'
          var elements = document.querySelectorAll(selector)
          for (var i = 0; i < elements.length; i++) {
            elements[i].innerHTML = String(data[key])
          }
        }
      })
    },
    shows: function () {
      var keys = (this && (this.keys || this.bszs)) || ["site_pv", "page_pv", "site_uv", "page_uv"]
      keys.forEach(function (key) {
        var selector =
          '[data-counter-container="' + key + '"], ' +
          '#counter_container_' + key + ', ' +
          '.counter_container_' + key + ', ' +
          '#busuanzi_container_' + key
        var elements = document.querySelectorAll(selector)
        for (var i = 0; i < elements.length; i++) {
          elements[i].style.display = "inline-flex"
        }
      })
    },
    hides: function () {
      var keys = (this && (this.keys || this.bszs)) || ["site_pv", "page_pv", "site_uv", "page_uv"]
      keys.forEach(function (key) {
        var selector =
          '[data-counter-container="' + key + '"], ' +
          '#counter_container_' + key + ', ' +
          '.counter_container_' + key + ', ' +
          '#busuanzi_container_' + key
        var elements = document.querySelectorAll(selector)
        for (var i = 0; i < elements.length; i++) {
          elements[i].style.display = "none"
        }
      })
    }
  }

  var caller = {
    fetch: function (customUrl, callback) {
      var callbackName = "CounterCallback_" + Math.floor(1099511627776 * Math.random())
      var targetUrl = (customUrl || apiBase || "").replace(/\/+$/, "") + "/?jsonpCallback=" + callbackName

      window[callbackName] = function (data) {
        try {
          if (callback && typeof callback === "function") {
            callback(data)
          } else {
            tag.texts(data)
            tag.shows()
          }
        } finally {
          try {
            delete window[callbackName]
          } catch (e) {
            window[callbackName] = undefined
          }
          if (script && script.parentNode) {
            script.parentNode.removeChild(script)
          }
        }
      }

      var script = document.createElement("script")
      script.type = "text/javascript"
      script.async = true
      script.referrerPolicy = "no-referrer-when-downgrade"
      script.src = targetUrl

      script.onerror = function () {
        try {
          delete window[callbackName]
        } catch (e) {
          window[callbackName] = undefined
        }
        if (script && script.parentNode) {
          script.parentNode.removeChild(script)
        }
      }

      document.head.appendChild(script)
    }
  }

  window.Counter = {
    tag: tag,
    caller: caller,
    fetch: caller.fetch,
    version: "1.0.0"
  }
  window.bszTag = tag
  window.bszCaller = caller

  // Initial fetch on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      caller.fetch()
    })
  } else {
    caller.fetch()
  }
})()
