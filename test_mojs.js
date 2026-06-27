import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@mojs/core"></script>
    </head>
    <body>
      <div id="mojs-container"></div>
      <script>
        try {
          const burst = new mojs.Burst({
            parent: '#mojs-container',
            radius:   { 0: 120 },
            count:    15,
            children: {
              shape:      'circle',
              radius:     15,
              fill:       [ '#FF006E', '#8338EC', '#3A86FF', '#FB5607', '#FFBE0B' ],
              duration:   2000,
              delay:      'stagger(0, 30)',
              easing:     'expo.out',
            }
          });

          const ring = new mojs.Shape({
            parent: '#mojs-container',
            shape:        'circle',
            radius:       { 0: 150 },
            fill:         'none',
            stroke:       '#3A86FF',
            strokeWidth:  { 10 : 0 },
            opacity:      { 1 : 0 },
            duration:     1000,
            easing:       'sine.out'
          });

          const triangles = new mojs.Burst({
            parent: '#mojs-container',
            radius:   { 0: 180 },
            count:    8,
            children: {
              shape:        'polygon',
              points:       3,
              radius:       10,
              fill:         'none',
              stroke:       '#FFBE0B',
              strokeWidth:  2,
              angle:        { 0 : 360 },
              duration:     1500,
              easing:       'quint.out'
            }
          });

          const bgCircle = new mojs.Shape({
            parent: '#mojs-container',
            shape:        'circle',
            radius:       200,
            fill:         '#8338EC',
            opacity:      0.05,
            isYoyo:       true,
            isShowStart:  true,
            x: { [-200]: 200 },
            y: { [-100]: 100 },
            duration:     5000,
            easing:       'sine.inout'
          }).play();

          const timeline = new mojs.Timeline();
          timeline.add(burst, ring, triangles);

          console.log("Success!");
        } catch (e) {
          console.error("TRYCATCH ERROR:", e.message);
        }
      </script>
    </body>
    </html>
  `;
  
  await page.setContent(html);
  await browser.close();
})();
