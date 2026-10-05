// A quick puppeteer script to test clicking pfEdit
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // We can just load the local index.html using file://
  await page.goto('http://localhost:8080'); // Assuming the dev server is running
  
  // wait for it to load
  await page.waitForSelector('.board');
  
  // open profile
  await page.evaluate(() => {
    // candela exposes S or app? No, we can just click the profile button
    document.querySelector('.avatar').click();
  });
  
  await page.waitForSelector('#pfEdit');
  
  console.log("Clicking pfEdit...");
  await page.click('#pfEdit');
  
  await new Promise(r => setTimeout(r, 1000));
  
  // Check if we are on settings page
  const html = await page.evaluate(() => document.body.innerHTML);
  if (html.includes("Contul meu") && html.includes("pfLast")) {
    console.log("Settings page opened successfully!");
  } else {
    console.log("Settings page did NOT open.");
    // check console errors
  }
  
  await browser.close();
})();
