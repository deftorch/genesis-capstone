const { JSDOM } = require("jsdom");

(async () => {
  const dom = new JSDOM(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@mojs/core"></script>
    </head>
    <body>
      <div id="mojs-container"></div>
      <script>
        window.onerror = function(msg) {
          console.error("WINDOW ERROR:", msg);
        };
        document.addEventListener("DOMContentLoaded", () => {
          try {
            console.log("mojs exists?", typeof mojs);
            console.log("window.mojs exists?", typeof window.mojs);
            if (typeof mojs !== 'undefined') {
              console.log("mojs keys:", Object.keys(mojs));
              const burst = new mojs.Burst({
                parent: '#mojs-container',
                radius: { 0: 120 },
                count: 15
              });
              console.log("Burst created:", !!burst);
            }
          } catch(e) {
            console.error("TRY CATCH ERROR:", e.message);
          }
        });
      </script>
    </body>
    </html>
  `, { runScripts: "dangerously", resources: "usable" });

  dom.window.console.log = (...args) => console.log("LOG:", ...args);
  dom.window.console.error = (...args) => console.error("ERROR:", ...args);

  await new Promise(resolve => setTimeout(resolve, 3000));
})();
