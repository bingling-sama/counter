/**
 * Bundled client script content served directly at GET /counter.js
 */
export const CLIENT_SCRIPT = `/**
 * Counter.js - Drop-in replacement for busuanzi.pure.mini.js
 * Compatible with existing busuanzi DOM elements and bszCaller API.
 */
;(function () {
  if (typeof window === "undefined") return

  var currentScript =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script")
      return scripts[scripts.length - 1]
    })()

  var apiBase = ""
  if (currentScript && currentScript.src) {
    var a = document.createElement("a")
    a.href = currentScript.src
    apiBase = a.protocol + "//" + a.host
    if (currentScript.getAttribute("data-api")) {
      apiBase = currentScript.getAttribute("data-api")
    }
  }

  var bszTag = {
    bszs: ["site_pv", "page_pv", "site_uv", "page_uv"],
    texts: function (data) {
      this.bszs.forEach(function (key) {
        var el = document.getElementById("busuanzi_value_" + key)
        if (el && data[key] !== undefined) {
          el.innerHTML = String(data[key])
        }
      })
    },
    shows: function () {
      this.bszs.forEach(function (key) {
        var el = document.getElementById("busuanzi_container_" + key)
        if (el) {
          el.style.display = "inline-flex"
        }
      })
    },
    hides: function () {
      this.bszs.forEach(function (key) {
        var el = document.getElementById("busuanzi_container_" + key)
        if (el) {
          el.style.display = "none"
        }
      })
    }
  }

  var bszCaller = {
    fetch: function (customUrl, callback) {
      var callbackName = "CounterCallback_" + Math.floor(1099511627776 * Math.random())
      var targetUrl = (customUrl || apiBase || "") + "/?jsonpCallback=" + callbackName

      window[callbackName] = function (data) {
        try {
          if (callback && typeof callback === "function") {
            callback(data)
          } else {
            bszTag.texts(data)
            bszTag.shows()
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

  window.bszTag = bszTag
  window.bszCaller = bszCaller

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      bszCaller.fetch()
    })
  } else {
    bszCaller.fetch()
  }
})()
`
