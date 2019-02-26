const fs = require('fs');
const puppeteer = require('puppeteer');
const selectors = require("./selectors.js");


async function getModels() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto('http://motoride.sk/?P=motodb');
    await page.setViewport({
        width: 1248,
        height: 678
    })
    await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: './'
    });
    
    // all brands
    const options = await getSelectOptions(page, selectors.options);

    for (let key in options) {
        //console.log(` ${options[key].value}`);
        let brand = options[key].value;
        let data = JSON.parse(fs.readFileSync('./data.json', 'utf8'));

        await dropDown (selectors.brand, brand);
        console.log(brand);
        //await page.screenshot({ path: 'image_0.png' });

        await clickButton (selectors.show);

        await page.waitForNavigation()
        //await page.screenshot({ path: 'image_1.png' });

        let cars = await scrapeModels(page, selectors.table, selectors.tableRow, brand)

        data.table.push(...cars);

        let newBrandModels = JSON.stringify(data, null, 2);
        fs.writeFileSync('./data.json', newBrandModels, 'utf8', function (err) {
            if (err) {
                return console.log(err);
            }
        
            console.log("The file was saved!");
        });
    

    }

    await browser.close();

    async function dropDown (selector, value) {

        await page.waitForSelector(selector);
        await page.select(selector, value);
    }

    async function clickButton (selector) {

        await page.waitForSelector(selector);
        await page.click(selector);
    }


};

getModels();

async function getSelectOptions(page, selector) {
    const dropDownValues = await page.evaluate ( (selector) => {
        const results = Array.from(document.querySelectorAll(selector));
        return  results.filter(o => o.value).map ( result => {
            return { 
                name: result.text,
                value: result.value
            }
        });
    }, selector);

    return dropDownValues;
}

async function scrapeModels(page, table, tableRow, brand) {
    await page.waitForSelector(table);

    return await page.evaluate((tableRow, brand) => {
        const results = Array.from(document.querySelectorAll(tableRow));
        
        //.filter( result => result.querySelector('td.darkbigblue') === null )

        return results.filter( result => { 
                if ( result.querySelector('td.darkbigblue') === null && result.querySelector('td:nth-child(1) > b') === null ) {
                    return result;
                } 
            }).map ( result => {
            return {
                brand: brand,
                category: result.querySelector('td:nth-child(1)').innerText,
                model: result.querySelector('td:nth-child(2) a').innerText,
                link: result.querySelector('td:nth-child(2) a').href,
                year: result.querySelector('td:nth-child(3)').innerText
            }
        } );
    }, tableRow, brand);
}

